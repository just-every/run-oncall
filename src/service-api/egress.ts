// Outbound endpoint policy (OC-042): HTTPS to a public hostname by default. Plain HTTP is allowed only to a loopback
// receiver, and only when this installation itself is a loopback development installation. Redirects are never followed.
const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

export function isLoopbackHostname(host: string) {
  const name = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (name === 'localhost' || name === '::1' || name.endsWith('.localhost')) return true
  const match = ipv4.exec(name)
  return !!match && Number(match[1]) === 127
}
function privateIpv4(parts: number[]) {
  const [a, b] = parts
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || (b === 0 && parts[2] === 0) || (b === 0 && parts[2] === 2))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && parts[2] === 100))) || (a === 203 && b === 0 && parts[2] === 113)
}
/** Whether a URL host is an address or name that cannot be a public receiver. */
export function unsafeHost(host: string) {
  const name = host.replace(/^\[|\]$/g, '').toLowerCase()
  const match = ipv4.exec(name)
  if (match) {
    const parts = match.slice(1).map(Number)
    return parts.some(part => part > 255) || privateIpv4(parts)
  }
  if (name.includes(':')) return true // IPv6 literals are not accepted as receivers
  if (/^\d+$/.test(name.replaceAll('.', '')) || /^0x/i.test(name)) return true // numeric host spellings
  return !name.includes('.') || ['.local', '.localhost', '.internal', '.lan', '.home', '.corp', '.intranet', '.private', '.arpa'].some(suffix => name.endsWith(suffix))
}
export type EndpointCheck = { ok: true; url: string; loopback: boolean } | { ok: false; reason: string }
/** `local` is true only for an installation served from a loopback origin. */
export function checkEndpointUrl(value: unknown, local: boolean): EndpointCheck {
  if (typeof value !== 'string' || !value || value.length > 500) return { ok: false, reason: 'Enter an endpoint URL of at most 500 characters' }
  let url: URL
  try { url = new URL(value) } catch { return { ok: false, reason: 'Enter an absolute endpoint URL' } }
  if (url.username || url.password) return { ok: false, reason: 'Endpoint URLs cannot carry credentials' }
  if (url.search || url.hash) return { ok: false, reason: 'Endpoint URLs cannot carry a query string or fragment; secrets belong in the signing secret' }
  const loopback = isLoopbackHostname(url.hostname)
  if (url.protocol === 'http:') {
    if (!loopback || !local) return { ok: false, reason: 'Endpoints must use HTTPS. Plain HTTP is accepted only for a loopback receiver on a local installation' }
    return { ok: true, url: url.toString(), loopback }
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'Endpoints must use HTTPS' }
  if (url.port && url.port !== '443') return { ok: false, reason: 'HTTPS endpoints must use the default port' }
  if (unsafeHost(url.hostname)) return { ok: false, reason: 'Endpoints must be a public hostname, not a private, loopback or internal address' }
  return { ok: true, url: url.toString(), loopback: false }
}
