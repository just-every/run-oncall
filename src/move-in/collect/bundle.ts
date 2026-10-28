import { pagerdutyTasks, pagerdutySchedule } from './pagerduty'
import { opsgenieTasks, opsgenieSchedule } from './opsgenie'

export type Provider = 'pagerduty' | 'opsgenie'
export type Region = 'us' | 'eu'
export type CollectionWindow = { since: string; until: string; days: number }
export type Bundle = Record<string, any[]>
export type ReadTask = { kind: string; path: string; schedule?: string; visited?: string[]; identities?: string[] }
export type CollectionState = { tasks: ReadTask[]; bundle: Bundle; window: CollectionWindow; removed: number }
export type CollectOptions = { vendor: Provider; region: Region; key: string; window?: CollectionWindow; request?: typeof fetch; progress?: (line: string) => void; bearer?: boolean }
export const collectionLimit = 'This read exceeds Oncall’s 500-object or 512 KiB import limit. Ask your administrator for a smaller provider access scope; do not truncate rotations or omit their people.'
export class CollectionRefusal extends Error {}
const credentialField = /^(?:password|passwd|secret|token|credentials?|authorization|cookie)$|(?:api|access|auth|integration|routing|service|signing|private|client|refresh|session)[_-]?(?:key|secret|token)$|^webhook[_-]?(?:url|secret)$|(?:http|web)[_-]?cal[_-]?url$|^ical[_-]?url$/i

export function exportWindow(start: string, end: string): CollectionWindow {
 const parse = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CollectionRefusal('Use dates in YYYY-MM-DD format.')
  const date = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value) throw new CollectionRefusal('That calendar date does not exist.')
  return date
 }
 const since = parse(start), until = parse(end), days = (+until - +since) / 86400000
 if (days < 1 || days > 31) throw new CollectionRefusal('Choose an end date 1 to 31 days after the start date.')
 return { since: since.toISOString(), until: until.toISOString(), days }
}
export function defaultWindow(): CollectionWindow {
 return exportWindow(new Date().toISOString().slice(0, 10), new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))
}
export function emptyBundle(vendor: Provider): Bundle {
 return { users: [], schedules: [], overrides: [], ...(vendor === 'opsgenie' ? { escalations: [], timelines: [] } : { escalation_policies: [] }) }
}
export const bundleJSON = (bundle: Bundle) => JSON.stringify(bundle, null, 2) + '\n'
export const bundleCount = (bundle: Bundle) => Object.values(bundle).reduce((n, records) => n + records.length, 0)
export function checkBundle(bundle: Bundle) {
 if (bundleCount(bundle) > 500 || new TextEncoder().encode(bundleJSON(bundle)).length > 512 * 1024) throw new CollectionRefusal(collectionLimit)
}
function containsKey(value: string, key: string) {
 let decoded = value
 for (let n = 0; n < 4; n++) {
  if (decoded.includes(key)) return true
  try { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next } catch { break }
 }
 return false
}
function cleanResponse(value: any, key: string, removed: { count: number }): any {
 if (typeof value === 'string' && containsKey(value, key)) throw new CollectionRefusal('The provider returned the credential inside its data. Nothing was imported; ask your provider administrator for help.')
 if (Array.isArray(value)) return value.map(item => cleanResponse(item, key, removed))
 if (!value || typeof value !== 'object') return value
 return Object.fromEntries(Object.entries(value).flatMap(([field, child]) => {
  if (containsKey(field, key)) throw new CollectionRefusal('The provider returned the credential inside its data. Nothing was imported; ask your provider administrator for help.')
  if (credentialField.test(field)) { removed.count++; return [] }
  return [[field, cleanResponse(child, key, removed)]]
 }))
}
export function providerOrigin(vendor: Provider, region: Region) {
 if (!['pagerduty', 'opsgenie'].includes(vendor) || !['us', 'eu'].includes(region)) throw new CollectionRefusal('Choose PagerDuty or Opsgenie and a US or EU account region.')
 return `https://api.${region === 'eu' ? 'eu.' : ''}${vendor}.com`
}
// Read the body with a hard bound before JSON.parse. Neither provider bodies nor exceptions escape this boundary.
async function boundedJSON(response: Response) {
 const reader = response.body?.getReader()
 if (!reader) throw new CollectionRefusal('The provider returned an empty answer. Nothing was imported.')
 const chunks: Uint8Array[] = []; let size = 0
 try {
  while (true) {
   const next = await reader.read()
   if (next.done) break
   size += next.value.byteLength
   if (size > 512 * 1024) { await reader.cancel(); throw new CollectionRefusal(collectionLimit) }
   chunks.push(next.value)
  }
 } finally { reader.releaseLock() }
 const bytes = new Uint8Array(size); let offset = 0
 for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
 try { return JSON.parse(new TextDecoder().decode(bytes)) } catch { throw new CollectionRefusal('The provider returned unreadable data. Nothing was imported.') }
}
/** A continuation is data only: the app seals it, binding it to this admin, source, region and expiry. No credential enters it. */
export async function collectStep(options: CollectOptions, previous?: CollectionState, budget = 40) {
 const { vendor, region, key, request = fetch, progress = () => {}, bearer = false } = options
 const base = providerOrigin(vendor, region), ops = vendor === 'opsgenie'
 if (typeof key !== 'string' || !key.trim() || /\s/.test(key) || key.length > 4096) throw new CollectionRefusal('Paste only the read-only key, with no spaces or header text.')
 if (!Number.isInteger(budget) || budget < 1 || budget > 40) throw new CollectionRefusal('The read request budget is invalid.')
 const window = options.window ?? previous?.window ?? defaultWindow()
 const state: CollectionState = previous ? structuredClone(previous) : { tasks: ops ? opsgenieTasks() : pagerdutyTasks(window), bundle: emptyBundle(vendor), window, removed: 0 }
 const part = emptyBundle(vendor), removed = { count: state.removed }; let requests = 0
 function safeURL(path: string, initial?: URL) {
  const url = new URL(path, base)
  if (url.origin !== base || url.username || url.password || url.hash || (initial && url.pathname !== initial.pathname)) throw new CollectionRefusal('The provider returned an unsafe pagination link. Nothing was imported.')
  if (containsKey(url.href, key)) throw new CollectionRefusal('The provider returned a credential in its pagination link. Nothing was imported.')
  if ([...url.searchParams.keys()].some(field => credentialField.test(field))) throw new CollectionRefusal('The provider returned a credential in its pagination link. Nothing was imported.')
  return url
 }
 while (state.tasks.length && requests < budget) {
  const task = state.tasks[0], initial = safeURL(task.path), visited = task.visited ?? [], identities = task.identities ?? []
  if (visited.includes(initial.href) || visited.length >= 100) throw new CollectionRefusal('Provider pagination did not complete safely. Read again while settings are unchanged.')
  progress(`Reading ${task.kind === 'schedule-list' ? 'schedules' : task.kind.replaceAll('_', ' ')}…`)
  const headers = { Authorization: ops ? `GenieKey ${key}` : bearer ? `Bearer ${key}` : `Token token=${key}`, Accept: ops ? 'application/json' : 'application/vnd.pagerduty+json;version=2' }
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000)
  let body: any, response: Response
  try {
   requests++
   response = await request(initial, { method: 'GET', headers, redirect: 'manual', signal: controller.signal })
   if (response.status >= 300 && response.status < 400) throw new CollectionRefusal('The provider redirected the read. Redirects are refused; check the account region. Nothing was imported.')
   if (!response.ok) throw new CollectionRefusal(response.status === 401 || response.status === 403 || response.status === 422
    ? bearer ? 'PagerDuty refused this connection. Connect again. Nothing was imported.' : 'The provider refused this key. Check the account region and read-only configuration access. Nothing was imported.'
    : response.status === 429 ? 'The provider’s rate limit was reached. Wait a few minutes and read again. Nothing was imported.' : 'The provider could not complete the read. Check its status and try again. Nothing was imported.')
   body = cleanResponse(await boundedJSON(response), key, removed)
  } catch (error) {
   // Only our fixed sentences are exposed; fetch failures may contain URLs, headers or credentials.
   if (error instanceof CollectionRefusal && !error.message.includes(key)) throw error
   throw new CollectionRefusal('Could not read the provider. Check your network, account region and provider status, then try again. Nothing was imported.')
  } finally { clearTimeout(timer) }
  if (!body || typeof body !== 'object' || body.error || body.errors || body.result === false) throw new CollectionRefusal('The provider returned an error answer. Nothing was imported.')
  const list = !['detail', 'timelines'].includes(task.kind)
  let next: string | null = null
  if (list) {
   const kind = task.kind === 'schedule-list' ? 'schedules' : task.kind
   const items = body[ops ? 'data' : kind]
   if (!Array.isArray(items)) throw new CollectionRefusal('The provider returned no record list. Nothing was imported.')
   for (const item of items) {
    const id = item?.id ?? item?.alias
    if (id !== undefined && identities.includes(String(id))) throw new CollectionRefusal('The provider repeated a record while paging. Read again while settings are unchanged.')
    if (id !== undefined) identities.push(String(id))
   }
   if (task.kind === 'schedule-list') {
    if (identities.length > 500 || items.some((item: any) => !item?.id)) throw new CollectionRefusal(collectionLimit)
    // Details follow the complete schedule list, before policies, preserving the exporter's original order.
    const at = state.tasks.findIndex(t => ['escalations', 'escalation_policies'].includes(t.kind))
    state.tasks.splice(at < 0 ? state.tasks.length : at, 0, ...items.flatMap((item: any) => ops ? opsgenieSchedule(String(item.id), window) : pagerdutySchedule(String(item.id), window)))
   } else {
    const records = task.kind === 'overrides' ? items.map((item: any) => ({ ...item, [ops ? 'scheduleId' : 'schedule_id']: task.schedule })) : items
    state.bundle[kind].push(...records); part[kind].push(...records)
   }
   if (ops) next = body.paging?.next || response.headers.get('x-paging-next') || null
   else if (body.more === true) {
    if (!Number.isSafeInteger(body.limit) || body.limit < 1 || !Number.isSafeInteger(body.offset) || body.offset < 0 || !items.length) throw new CollectionRefusal('The provider returned invalid pagination. Nothing was imported.')
    const url = new URL(initial); url.searchParams.set('offset', String(body.offset + body.limit)); url.searchParams.set('limit', String(body.limit)); next = url.href
   } else if (!ops && initial.searchParams.has('limit') && body.more !== false) throw new CollectionRefusal('The provider returned no pagination status. Nothing was imported.')
  } else {
   const record = body[ops ? 'data' : 'schedule']
   if (task.kind === 'detail' ? !record || String(record.id) !== task.schedule : !record?.finalTimeline || String(record._parent?.id) !== task.schedule) throw new CollectionRefusal('The provider returned details for a different schedule. Nothing was imported.')
   const kind = task.kind === 'detail' ? 'schedules' : 'timelines'
   state.bundle[kind].push(record); part[kind].push(record)
  }
  checkBundle(state.bundle)
  // Bound index metadata too, before it can enter a continuation.
  if (new TextEncoder().encode(JSON.stringify(state.tasks)).length > 512 * 1024) throw new CollectionRefusal(collectionLimit)
  if (next) { const url = safeURL(next, initial); task.path = url.href; task.visited = [...visited, initial.href]; task.identities = identities }
  else state.tasks.shift()
 }
 state.removed = removed.count
 if (!state.tasks.length && !bundleCount(state.bundle)) throw new CollectionRefusal('The account returned no importable records. Check key access and region. Nothing was imported.')
 return { part, next: state.tasks.length ? state : null, state, requests }
}
export async function collectExport(options: CollectOptions) {
 let state: CollectionState | undefined
 do { const result = await collectStep(options, state); state = result.state } while (state.tasks.length)
 return { json: bundleJSON(state.bundle), count: bundleCount(state.bundle), removed: state.removed }
}
