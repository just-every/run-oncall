import { fail, type State } from '../family/response-operations/domain.ts';
const exact = (value: any, keys: string[]) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const text = (value: unknown, max = 100) => typeof value === 'string' && value.length > 0 && value.length <= max;
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const statuses = ['operational', 'degraded', 'major outage'];
export function validateBusinessStatus(state: State) {
  const rows = state.businessServices;
  if (rows === undefined) return;
  if (!Array.isArray(rows) || rows.length > 1000 || new Set(rows.map(row => row?.id)).size !== rows.length) fail('Invalid business services');
  const member = (id: unknown) => state.members.some(row => row.id === id);
  for (const row of rows) {
    if (!exact(row, ['id', 'name', 'owningTeam', 'supporting', 'communicationsOwner', 'audience', 'highUrgencyImpact', 'active', 'revision', 'derived', 'impactRevision', 'override', 'subscriptions', 'notices']) ||
      !text(row.id) || !text(row.name) || !text(row.owningTeam) || typeof row.active !== 'boolean' || typeof row.highUrgencyImpact !== 'boolean' ||
      !Number.isSafeInteger(row.revision) || row.revision < 1 || !Number.isSafeInteger(row.impactRevision) || row.impactRevision < 0 || !statuses.includes(row.derived) ||
      !(member(row.communicationsOwner) || row.communicationsOwner === '' && !row.active) ||
      !Array.isArray(row.supporting) || !row.supporting.length || row.supporting.length > 100 || new Set(row.supporting).size !== row.supporting.length || row.supporting.some(id => !state.services.some(service => service.id === id)) ||
      !Array.isArray(row.audience) || row.audience.length > 1000 || new Set(row.audience).size !== row.audience.length || row.audience.some(id => !member(id))) fail('Invalid business service references');
    const override = row.override;
    if (override !== null && (!exact(override, ['value', 'reason', 'by', 'at']) || !statuses.includes(override.value) || !text(override.reason, 1000) || !member(override.by) || !date(override.at))) fail('Invalid status override');
    if (!Array.isArray(row.subscriptions) || row.subscriptions.length > 1000 || new Set(row.subscriptions.map(subscription => subscription?.member)).size !== row.subscriptions.length) fail('Invalid subscriptions');
    for (const subscription of row.subscriptions) if (!exact(subscription, ['member', 'channel', 'active', 'by', 'at']) || !member(subscription.member) || !member(subscription.by) || !['email', 'push', 'chat'].includes(subscription.channel) || typeof subscription.active !== 'boolean' || !date(subscription.at)) fail('Invalid subscription reference');
    if (!Array.isArray(row.notices) || row.notices.length > 10000 || new Set(row.notices.map(notice => notice?.id)).size !== row.notices.length) fail('Invalid status obligations');
    for (const notice of row.notices) if (!exact(notice, ['id', 'kind', 'state', 'paging', 'automatic', 'label', 'target', 'channel', 'businessService', 'businessName', 'derivedStatus', 'approvedUpdate', 'at']) ||
      !text(notice.id, 400) || notice.kind !== 'business-status' || !['recorded', 'stopped'].includes(notice.state) || notice.paging !== 'off' || notice.automatic !== false || notice.label !== 'no sender' ||
      !exact(notice.target, ['kind', 'id']) || notice.target.kind !== 'user' || !member(notice.target.id) || !['email', 'push', 'chat'].includes(notice.channel) || notice.businessService !== row.id || !text(notice.businessName) || !['degraded', 'major outage'].includes(notice.derivedStatus) || notice.approvedUpdate !== null || !date(notice.at)) fail('Invalid status notice custody');
  }
}
