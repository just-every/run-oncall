import {
 generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
 type AuthenticationResponseJSON, type RegistrationResponseJSON,
} from '@simplewebauthn/server'
import { authConfig, clearWorkspaceSession, operatorAuth, type Bindings } from '../auth.server'
import { configure } from '../modules/operator-auth/config.mjs'
import { hashToken, opaqueToken } from '../modules/operator-auth/crypto.mjs'
import { AuthError } from '../modules/operator-auth/errors.mjs'
import { localCookieName, requirePost, securityHeaders, sessionCookie } from '../modules/operator-auth/http.mjs'
import { readInput } from '../modules/operator-auth/input.mjs'
import { personaSessions } from '../modules/operator-auth/dev/persona-entry.mjs'
import { PasskeyStore, type Operation } from './store'

const lifetimeSeconds = 300
export const passkeyDoor = '/auth/local/passkey'
export const localhost = (origin: string) => {
 const url = new URL(origin)
 return url.hostname === 'localhost' && url.protocol === 'http:'
}

export async function passkeyResponse(request: Request, env: Bindings, key: string): Promise<Response> {
 const headers = new Headers(securityHeaders())
 const config = configure(authConfig(env)), store = new PasskeyStore(env.DB)
 const cookieName = localCookieName('oncall_passkey_challenge', config.origin)
 const cookieConfig = { cookieName, secure: config.secure }
 const reject = (status: number) => Response.json({ error: 'passkey_refused' }, { status, headers })
 try {
  requirePost(request, config)
  const input = await readInput(request)
  if (input.operation !== 'enroll' && input.operation !== 'signin') return reject(400)
  const operation: Operation = input.operation
  const owner = await store.owner()
  if (!owner) return reject(403)
  const session = operation === 'enroll' ? await operatorAuth(env).getSession(request) : null
  if (operation === 'enroll' && session?.operator.id !== owner.id) return reject(403)
  const credential = await store.credential(owner.id)
  if (operation === 'enroll' ? credential : !credential) return reject(409)

  const rpID = 'localhost', verification = { expectedOrigin: config.origin, expectedRPID: rpID, requireUserVerification: true }
  if (input.credential === undefined) {
   const options = operation === 'enroll'
    ? await generateRegistrationOptions({ rpID, rpName: 'Oncall', userID: new TextEncoder().encode(owner.id),
      userName: owner.email, attestationType: 'none', authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
      supportedAlgorithmIDs: [-7, -257] })
    : await generateAuthenticationOptions({ rpID, userVerification: 'required', allowCredentials: [{ id: credential!.id }] })
   const id = await store.begin(operation, owner, session?.id ?? null, options.challenge, Date.now() + lifetimeSeconds * 1000)
   headers.append('Set-Cookie', sessionCookie(id, cookieConfig, lifetimeSeconds))
   return Response.json(options, { headers })
  }

  const challengeCookie = request.headers.get('cookie')?.split(';').map(cookie => cookie.trim()).filter(cookie => cookie.startsWith(cookieName + '='))
  if (challengeCookie?.length !== 1) return reject(400)
  const pending = await store.consume(challengeCookie[0].slice(cookieName.length + 1), operation, owner, session?.id ?? null)
  headers.append('Set-Cookie', sessionCookie('', cookieConfig, 0))
  if (!pending) return reject(400)
  const expectedChallenge = pending.challenge
  if (operation === 'enroll') {
   const proof = await verifyRegistrationResponse({ ...verification, expectedChallenge, response: input.credential as RegistrationResponseJSON }).catch(() => null)
   if (!proof?.verified || !proof.registrationInfo) return reject(400)
   if (!await store.enroll(owner, session!.id, proof.registrationInfo.credential)) return reject(409)
   return Response.json({ enrolled: true }, { headers })
  }

  const proof = await verifyAuthenticationResponse({ ...verification, expectedChallenge, credential: credential!, response: input.credential as AuthenticationResponseJSON }).catch(() => null)
  if (!proof?.verified) return reject(400)
  const id = crypto.randomUUID(), token = opaqueToken()
  const hash = await hashToken(config.SESSION_SECRET, 'session', token)
  if (!await store.signIn(owner, credential!, proof.authenticationInfo.newCounter,
   { id, hash, expiresAt: Date.now() + config.sessionSeconds * 1000 })) return reject(409)
  headers.append('Set-Cookie', sessionCookie(token, config))
  headers.append('Set-Cookie', await personaSessions(key, config.origin).cookie(id, config.sessionSeconds))
  return clearWorkspaceSession(Response.json({ signedIn: true }, { headers }), request)
 } catch (error) {
  return reject(error instanceof AuthError ? error.status : 503)
 }
}
