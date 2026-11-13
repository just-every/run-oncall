import type { State } from '../family/response-operations/domain';
import type { SourceRecord } from './catalog';

/** The allowance record ID the admission engine debits for this source, or undefined when it has none. */
export const allowanceKey = (source: SourceRecord) => source.id.startsWith('intake:') ? source.id : source.native ? 'source:' + source.native.id : undefined;

/** Allowance refusals are retained as owner notices, not as credential rejections. */
export const throttleNotices = (state: State, key: string | undefined) => key ? state.audit.filter(a => a.kind === 'intake-throttled' && a.actor === 'source:' + key) : [];

export function refusalText(text: string) {
  const [, field, required] = /throttled at \d+ (requests|events) in the rolling minute; (\d+) requested/.exec(text) ?? [];
  if (!field) return 'The key’s allowance was reached.';
  return field === 'events'
    ? `${required} new event${required === '1' ? '' : 's'} requested; more than this key’s event allowance leaves room for.`
    : 'More requests than this key’s request allowance in one minute.';
}
