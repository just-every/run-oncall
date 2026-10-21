import { changeHash, equalSignature, openCredential, sealCredential, type Custody } from '../changes/credentials'

export const webhookCustody: Custody = {
  label: 'oncall-webhook-credentials-v1',
  unavailable: 'Installation key unavailable; finish setup before configuring webhook endpoints',
  unreadable: 'Webhook signing secret cannot be opened with this installation key; rotate the endpoint secret',
}
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
export const tokenPrefix = 'ocsa_'
/** Shown once at creation or rotation. Only its SHA-256 digest is stored. */
export const newToken = () => tokenPrefix + base64url(crypto.getRandomValues(new Uint8Array(32)))
/** Shown once at creation or rotation. Only its AES-GCM ciphertext under installation custody is stored. */
export const newSigningSecret = () => 'whsec_' + base64url(crypto.getRandomValues(new Uint8Array(32)))
export const tokenDigest = (token: string) => changeHash(token)
export { equalSignature, openCredential, sealCredential }
