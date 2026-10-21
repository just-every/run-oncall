import { ApiError } from './errors'

const encode = (value: object) => btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
function decode(cursor: string): { k: string; f: string } {
  try {
    const value = JSON.parse(atob(cursor.replaceAll('-', '+').replaceAll('_', '/')))
    if (typeof value?.k === 'string' && typeof value?.f === 'string' && value.k.length < 400) return value
  } catch { /* reported below */ }
  throw new ApiError(400, 'invalid_cursor', 'The cursor is not valid for this request')
}
export function pageSize(raw: string | undefined) {
  if (raw === undefined) return 25
  const limit = Number(raw)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new ApiError(400, 'invalid_request', 'limit must be an integer from 1 to 100')
  return limit
}
/** Stable keyset pagination over an already scope-filtered list. A cursor is bound to the filters that produced it. */
export function paginate<T>(items: T[], key: (item: T) => string, order: 'asc' | 'desc', filter: string, cursor: string | undefined, limit: number) {
  const sorted = [...items].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * (order === 'asc' ? 1 : -1))
  let start = 0
  if (cursor !== undefined) {
    const position = decode(cursor)
    if (position.f !== filter) throw new ApiError(400, 'invalid_cursor', 'The cursor belongs to a different query')
    start = sorted.findIndex(item => order === 'asc' ? key(item) > position.k : key(item) < position.k)
    if (start < 0) start = sorted.length
  }
  const data = sorted.slice(start, start + limit)
  return { data, next: start + limit < sorted.length ? encode({ k: key(data[data.length - 1]), f: filter }) : null }
}
