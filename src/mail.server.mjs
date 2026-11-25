import { demoEffect } from './modules/demo/index.mjs'
import { demoEffectsEnabled } from './modules/demo/effects.mjs'
import { createMailSender } from './modules/mail/index.mjs'
import { hashToken } from './modules/operator-auth/crypto.mjs'
import { normalizeEmail } from './modules/operator-auth/policy.mjs'

// MAIL_RECIPIENTS=owner: the installation mails its owner (OWNER_EMAIL) and
// nobody else. Unset or 'any' keeps ordinary mail; any other value turns mail off.
export function mailRecipients(env) {
 const value = env.MAIL_RECIPIENTS?.trim() || 'any'
 return value === 'any' || value === 'owner' ? value : undefined
}
export function ownerAddress(env) {
 try { return normalizeEmail(env.OWNER_EMAIL) } catch { return undefined }
}
// The last guard before the provider: a message to any other address, or to the
// owner with anyone copied, is refused and the provider is never called.
function ownerOnly(env, sender) {
 const owner = ownerAddress(env)
 return { ...sender, async send(message) {
  const recipients = [...(message.to ?? []), ...(message.cc ?? []), ...(message.bcc ?? [])].map(String)
  if (!owner || recipients.length !== 1 || recipients[0].trim().toLowerCase() !== owner) throw Error('recipient_not_owner')
  return sender.send(message)
 } }
}

function productionMailOptions(env) {
 const provider = env.MAIL_PROVIDER
 const apiKey = env.MAIL_API_KEY || (provider === 'sendgrid' ? env.SENDGRID_API_KEY : provider === 'resend' ? env.RESEND_API_KEY : undefined)
 if (!provider || provider === 'none' || !apiKey || !env.MAIL_FROM) return undefined
 return { provider, mode: 'production', apiKey, ...(provider === 'rer' ? { relayUrl: env.MAIL_RELAY_URL } : {}), ...(provider === 'cloudflare' ? { accountId: env.MAIL_ACCOUNT_ID } : {}) }
}

const senderDigest = (env, options) => hashToken(env.SESSION_SECRET, 'oncall-sign-in-mail', JSON.stringify([env.MAIL_FROM.trim(), options]))

export async function hostedSignInMailSender(env) {
 const options = productionMailOptions(env)
 if (!options || !env.MAIL_FROM.trim()) return undefined
 createMailSender(options)
 return { sender: env.MAIL_FROM.trim(), digest: await senderDigest(env, options) }
}

export function operatorMail(env) {
 const recipients = mailRecipients(env)
 if (!recipients) return undefined
 const sender = providerMail(env)
 return sender && recipients === 'owner' ? ownerOnly(env, sender) : sender
}

function providerMail(env) {
 if (env.MAIL_PROVIDER === 'none') return undefined
 if (demoEffectsEnabled()) return { send: message => demoEffect(
  () => { throw Error('Mail provider is not configured') },
  () => ({ deliveryId: message.deliveryId, status: 'accepted' }),
 ) }
 if (env.AUTH_LOCAL === 'true' && env.MAIL_PROVIDER === 'development') return undefined
 const options = productionMailOptions(env)
 if (!options) return undefined
 const sender = createMailSender(options)
 if (env.AUTH_LOCAL === 'true') return sender
 return {async send(message) {
  // The auth module uses the token ID as the mail delivery ID. Stamp it
  // before sending so a pending link keeps the settings that actually sent it.
  await env.DB.prepare("UPDATE oa_tokens SET mail_sender_digest=? WHERE id=? AND kind='magic'")
   .bind(await senderDigest(env, options), message.deliveryId).run()
  return sender.send(message)
 }}
}
