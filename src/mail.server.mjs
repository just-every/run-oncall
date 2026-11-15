import { demoEffect } from './modules/demo/index.mjs'
import { demoEffectsEnabled } from './modules/demo/effects.mjs'
import { createMailSender } from './modules/mail/index.mjs'

export function operatorMail(env) {
 if (env.MAIL_PROVIDER === 'none') return undefined
 if (demoEffectsEnabled()) return { send: message => demoEffect(
  () => { throw Error('Mail provider is not configured') },
  () => ({ deliveryId: message.deliveryId, status: 'accepted' }),
 ) }
 if (env.AUTH_LOCAL === 'true' && env.MAIL_PROVIDER === 'development') return undefined
 const apiKey = env.MAIL_API_KEY || (env.MAIL_PROVIDER === 'sendgrid' ? env.SENDGRID_API_KEY : env.MAIL_PROVIDER === 'resend' ? env.RESEND_API_KEY : undefined)
 if (!env.MAIL_PROVIDER || !apiKey || !env.MAIL_FROM) return undefined
 return createMailSender({ provider: env.MAIL_PROVIDER, mode: 'production', apiKey, ...(env.MAIL_PROVIDER === 'rer' ? { relayUrl: env.MAIL_RELAY_URL } : {}), ...(env.MAIL_PROVIDER === 'cloudflare' ? { accountId: env.MAIL_ACCOUNT_ID } : {}) })
}
