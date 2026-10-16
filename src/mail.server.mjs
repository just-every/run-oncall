import { demoEffect } from './modules/demo/index.mjs'
import { demoEffectsEnabled } from './modules/demo/effects.mjs'
import { createMailSender } from './modules/mail/index.mjs'

export function operatorMail(env) {
 if (demoEffectsEnabled()) return { send: message => demoEffect(
  () => { throw Error('Mail provider is not configured') },
  () => ({ deliveryId: message.deliveryId, status: 'accepted' }),
 ) }
 if (env.AUTH_LOCAL === 'true' && env.MAIL_PROVIDER === 'development') return undefined
 if (!env.MAIL_PROVIDER || !env.MAIL_API_KEY || !env.MAIL_FROM) return undefined
 return createMailSender({ provider: env.MAIL_PROVIDER, mode: 'production', apiKey: env.MAIL_API_KEY, ...(env.MAIL_PROVIDER === 'cloudflare' ? { accountId: env.MAIL_ACCOUNT_ID } : {}) })
}
