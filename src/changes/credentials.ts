import { fail } from '../family/response-operations/domain.ts';
const bytes = (value: string) => new TextEncoder().encode(value);
const hex = (value: ArrayBuffer) => Array.from(new Uint8Array(value), b => b.toString(16).padStart(2, '0')).join('');
export const changeHash = async (value: string) => hex(await crypto.subtle.digest('SHA-256', bytes(value)));
const base64 = (value: Uint8Array) => btoa(String.fromCharCode(...value));
const unbase64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
// Installation-local AES-GCM custody. Each held credential kind derives its own key from the installation secret.
export type Custody = {label: string; unavailable: string; unreadable: string};
export const changeCustody: Custody = {label: 'oncall-change-credentials-v1', unavailable: 'Installation key unavailable; finish setup before configuring change sources', unreadable: 'Change credential cannot be opened with this installation key; configure it again'};
export const sourceCustody: Custody = {label: 'oncall-source-credentials-v1', unavailable: 'Installation key unavailable; finish setup before holding signed source keys', unreadable: 'Source signing key cannot be opened with this installation key; configure the source again'};
async function custodyKey(secret: string, custody: Custody) {
  if (!secret) fail(custody.unavailable, 503);
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', bytes(custody.label + ':' + secret)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function sealCredential(value: string, secret: string, custody: Custody) {
  const iv = crypto.getRandomValues(new Uint8Array(12)), key = await custodyKey(secret, custody);
  return 'v1.' + base64(iv) + '.' + base64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv}, key, bytes(value))));
}
export async function openCredential(value: string, secret: string, custody: Custody) {
  const key = await custodyKey(secret, custody);
  try {const [version, iv, ciphertext] = value.split('.'); if (version !== 'v1') throw Error('Unsupported custody'); return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(iv)}, key, unbase64(ciphertext)));}
  catch {return fail(custody.unreadable,503);}
}
export const equalSignature = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let difference = 0; for (let n=0;n<a.length;n++) difference |= a.charCodeAt(n) ^ b.charCodeAt(n); return difference === 0;
};
export async function changeHmac(key: string | Uint8Array, value: string, encoding: 'hex' | 'base64' = 'hex') {
  const signingKey = await crypto.subtle.importKey('raw', typeof key === 'string' ? bytes(key) : Uint8Array.from(key), {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature = await crypto.subtle.sign('HMAC',signingKey,bytes(value)); return encoding === 'hex' ? hex(signature) : base64(new Uint8Array(signature));
}
export function freshTimestamp(value: string) {
  if (!/^\d+$/.test(value) || Math.abs(Date.now() - Number(value) * 1000) > 300000) fail('Stale or invalid signature timestamp',401);
}
export function gitlabSigningKey(value: string) {
  if (!value.startsWith('whsec_')) fail('GitLab requires a Standard Webhooks signing secret beginning whsec_');
  try {const decoded = unbase64(value.slice(6)); if (decoded.length < 16) throw Error('Short key'); return decoded;} catch {return fail('Invalid GitLab signing secret');}
}
