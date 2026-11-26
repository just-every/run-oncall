// Native policy shared by setup, operations and deployment. Missing selection
// stays unconfigured; only the exact choice "none" turns outbound mail off.
const enabled = new Set(['rer', 'sendgrid', 'resend', 'cloudflare'])
const present = value => typeof value === 'string' && Boolean(value.trim())
const sendingInputs = ['MAIL_API_KEY', 'SENDGRID_API_KEY', 'RESEND_API_KEY', 'MAIL_PROVIDER_API_KEY', 'MAIL_ACCOUNT_ID', 'MAIL_RELAY_URL', 'MAIL_DKIM_PRIVATE_KEY', 'DKIM_PRIVATE_KEY']

// `bound` names the secrets already bound on the Worker a redeploy updates: the
// deploy keeps them, so they count as supplied. Their values are never read.
export function validateMailConfiguration(values, { required = false, bound = [] } = {}) {
 const has = name => present(values[name]) || bound.includes(name)
 const provider = values.MAIL_PROVIDER
 if (present(values.MAIL_RECIPIENTS) && !['any', 'owner'].includes(values.MAIL_RECIPIENTS.trim())) throw Error('MAIL_RECIPIENTS must be any or owner.')
 if (provider === 'none') {
  const conflicts = sendingInputs.filter(name => present(values[name]))
  if (conflicts.length) throw Error('MAIL_PROVIDER=none conflicts with sending inputs: ' + conflicts.join(', '))
  return
 }
 if (!present(provider) || provider === 'later') {
  if (required && !bound.includes('MAIL_PROVIDER')) throw Error('Choose a mail provider or explicitly set MAIL_PROVIDER=none.')
  return
 }
 // Local setup keeps its existing no-delivery development mode.
 if (provider === 'development' && !required) return
 if (!enabled.has(provider)) throw Error('Choose a supported mail provider or explicitly set MAIL_PROVIDER=none.')
 const keys = ['MAIL_API_KEY', ...(provider === 'sendgrid' ? ['SENDGRID_API_KEY'] : provider === 'resend' ? ['RESEND_API_KEY'] : [])]
 const missing = [
  ...(!has('MAIL_FROM') ? ['MAIL_FROM'] : []),
  ...(!keys.some(has) ? ['MAIL_API_KEY'] : []),
  ...(provider === 'cloudflare' && !has('MAIL_ACCOUNT_ID') ? ['MAIL_ACCOUNT_ID'] : []),
  ...(provider === 'rer' && !has('MAIL_RELAY_URL') ? ['MAIL_RELAY_URL'] : []),
 ]
 if (missing.length) throw Error('Enabled mail requires: ' + missing.join(', '))
}
