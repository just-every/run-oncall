import type { State } from '../family/response-operations/domain';
import type { SourceRecord } from './catalog';

/** The allowance record ID the admission engine debits for this source, or undefined when it has none. */
export const allowanceKey = (source: SourceRecord) => source.id.startsWith('intake:') ? source.id : source.native ? 'source:' + source.native.id : undefined;

/** Allowance refusals are retained as owner notices, not as credential rejections. */
export const throttleNotices = (state: State, key: string | undefined) => key ? state.audit.filter(a => a.kind === 'intake-throttled' && a.actor === 'source:' + key) : [];

export function refusalText(text: string) {
  const [, field, required] = /throttled at \d+ (requests|events) in the rolling minute; (\d+) requested/.exec(text) ?? [];
  if (!field) return 'The key’s allowance was reached.';
  return allowanceRefusalText(field, Number(required));
}

/** Shared by the retained notice and the immediate test result. */
export function allowanceRefusalText(field: string, required: number) {
  return field === 'events'
    ? `${required} new event${required === 1 ? '' : 's'} requested; more than this key’s event allowance leaves room for.`
    : 'More requests than this key’s request allowance in one minute.';
}

/** The receivers use native and incumbent error envelopes for the same refusal. */
export function testRefusal(status: number, value: any) {
  const reason = typeof value?.error === 'string' ? value.error : Array.isArray(value?.errors) && typeof value.errors[0] === 'string' ? value.errors[0] : typeof value?.message === 'string' ? value.message : '';
  const rate = /^Key (requests|events) allowance exceeded; retry after (\d+) seconds$/.exec(reason);
  if (status === 429 && rate) return `${allowanceRefusalText(rate[1], 1)} Retry in ${rate[2]} seconds, or raise ${rate[1] === 'events' ? 'New events' : 'Requests'} per minute under Per-key rate allowance on this page.`;
  if (status === 429 && value?.rateLimit?.code === 'batch_exceeds_allowance') return `${allowanceRefusalText('events', value.rateLimit.batchCount)} Split the request or raise New events per minute under Per-key rate allowance on this page.`;
  if (status === 401 || /^Invalid (?:integration|source) credential$/.test(reason)) return 'The receiver refused this private key or signature. Copy the current private key for this source, or rotate it under Source actions and enter the new key. If signing is enabled, check its signing secret.';
  return reason || 'The receiver refused this test. Review Rejected requests and the sample request for this source.';
}
