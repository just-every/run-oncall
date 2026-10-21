import { Fault } from '../../family/response-operations/domain'

export class ApiError extends Error {
  status: number; code: string; details?: Record<string, unknown>
  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) { super(message); this.status = status; this.code = code; this.details = details }
}
const codes: Record<number, string> = { 400: 'invalid_request', 401: 'unauthorized', 403: 'forbidden', 404: 'not_found', 409: 'conflict', 413: 'payload_too_large', 429: 'rate_limited' }
/** Every refusal has a status, a stable machine code and a message; none reveals whether a hidden record exists. */
export function problem(c: any, error: unknown): Response {
  const headers = { 'cache-control': 'no-store' }
  if (error instanceof ApiError) return c.json({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } }, error.status, headers)
  if (error instanceof Fault && error.status < 500) return c.json({ error: { code: codes[error.status] ?? 'invalid_request', message: error.message } }, error.status, headers)
  console.error('oncall service api failure', error instanceof Error ? error.name : 'Error')
  return c.json({ error: { code: 'unavailable', message: 'Storage or server failure; no success confirmed' } }, 503, headers)
}
export const notFound = (what: string) => new ApiError(404, 'not_found', `${what} not found`)
