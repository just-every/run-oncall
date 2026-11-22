import type { MailSender } from './modules/operator-auth/index.mjs'
import type { Bindings } from './auth.server'
export function operatorMail(env: Bindings): MailSender | undefined
export function hostedSignInMailSender(env: Bindings): Promise<{sender: string; digest: string} | undefined>
