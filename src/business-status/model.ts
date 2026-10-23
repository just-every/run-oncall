import { fail, text, type Member, type State } from '../family/response-operations/domain.ts';
import type { BusinessService, InternalStatus } from './types.ts';
const statuses = ['operational', 'degraded', 'major outage'];
const responder = (member: Member) => member.active && ['admin', 'responder'].includes(member.role);
export function visibleBusiness(service: BusinessService, actor: Member) {
  return ['admin', 'responder', 'viewer'].includes(actor.role) || actor.role === 'stakeholder' && service.active && service.audience.includes(actor.id);
}
export function statusView(state: State, actor: Member) {
  const current = state.members.find(member => member.id === actor.id && member.active);
  if (!current) fail('Access revoked', 401);
  actor = current;
  return (state.businessServices ?? []).filter(service => visibleBusiness(service, actor)).map(service => ({
    id: service.id, name: service.name, owningTeam: service.owningTeam, active: service.active,
    derived: service.derived, revision: service.revision,
    override: service.override && {value: service.override.value, reason: service.override.reason, at: service.override.at,
      ...(actor.role === 'stakeholder' ? {} : {by: service.override.by})},
    subscription: service.subscriptions.find(row => row.member === actor.id) ?? null,
    notices: service.notices.filter(row => row.target.id === actor.id),
    ...(actor.role === 'stakeholder' ? {} : {supporting: service.supporting, audience: service.audience,
      communicationsOwner: service.communicationsOwner, highUrgencyImpact: service.highUrgencyImpact,
      subscriptions: service.subscriptions}),
  }));
}
function supportingServices(state: State, service: BusinessService) {
  const ids = new Set(service.supporting), pending = [...ids];
  for (const id of pending) for (const dependency of state.services.find(row => row.id === id)?.dependencies ?? []) {
    if (!ids.has(dependency)) { ids.add(dependency); pending.push(dependency); }
  }
  return ids;
}
export function derivedStatus(state: State, business: BusinessService): InternalStatus {
  const ids = supportingServices(state, business);
  const incidents = state.incidents.filter(row => ids.has(row.service) && row.state !== 'resolved');
  if (incidents.some(row => row.severity === 'critical')) return 'major outage';
  if (incidents.length || business.highUrgencyImpact && state.alerts.some(row => row.service && ids.has(row.service) && row.state === 'active' && !row.suppressed && (row.urgency ?? 'high') === 'high')) return 'degraded';
  return 'operational';
}
function notice(service: BusinessService, member: string) {
  const subscription = service.subscriptions.find(row => row.member === member && row.active);
  if (!subscription || service.derived === 'operational' || !service.active) return;
  const id = `status:${service.id}:${service.impactRevision}:${member}`;
  if (service.notices.some(row => row.id === id)) return;
  service.notices.push({id, kind: 'business-status', state: 'recorded', paging: 'off', automatic: false,
    label: 'no sender', target: {kind: 'user', id: member}, channel: subscription.channel,
    businessService: service.id, businessName: service.name, derivedStatus: service.derived,
    approvedUpdate: null, at: new Date().toISOString()});
}
/** Runs at the same durable write boundary as alerts/incidents, including bulk writes. */
export function refreshBusinessStatus(state: State) {
  for (const service of state.businessServices ?? []) {
    const next = derivedStatus(state, service);
    if (next !== service.derived) { service.derived = next; service.impactRevision++; }
    if (!service.active) continue;
    for (const subscription of service.subscriptions) {
      if (!state.members.some(member => member.id === subscription.member && member.active)) subscription.active = false;
      if (subscription.active) notice(service, subscription.member);
    }
  }
}
export function businessCommand(state: State, actor: Member, input: any) {
  const current = state.members.find(row => row.id === actor.id && row.active);
  if (!current) fail('Access revoked', 401);
  const rows = state.businessServices ??= [];
  if (input.action === 'create') {
    if (current.role !== 'admin') fail('Admin required', 403);
    const supporting = input.supporting, audience = input.audience;
    if (!Array.isArray(supporting) || !supporting.length || supporting.length > 100 || new Set(supporting).size !== supporting.length || supporting.some(id => !state.services.some(row => row.id === id))) fail('Choose supporting technical services');
    if (!Array.isArray(audience) || audience.length > 1000 || new Set(audience).size !== audience.length || audience.some(id => !state.members.some(row => row.id === id && row.active))) fail('Choose an explicit member audience');
    if (!state.members.some(row => row.id === input.communicationsOwner && responder(row))) fail('Choose an active responder or admin as communications owner');
    if (typeof input.highUrgencyImpact !== 'boolean') fail('Choose the high-urgency impact rule');
    const service: BusinessService = {id: crypto.randomUUID(), name: text(input.name, 'Business-service name', 100),
      owningTeam: text(input.owningTeam, 'Owning team label', 100), supporting, audience,
      communicationsOwner: input.communicationsOwner, highUrgencyImpact: input.highUrgencyImpact,
      active: true, revision: 1, derived: 'operational', impactRevision: 0, override: null, subscriptions: [], notices: []};
    rows.push(service); refreshBusinessStatus(state); return service;
  }
  const service = rows.find(row => row.id === input.id);
  if (!service || !visibleBusiness(service, current)) fail('Business service not found', 404);
  if (input.revision !== service.revision) fail('Business service changed; reload', 409);
  const manages = current.role === 'admin' || current.id === service.communicationsOwner && responder(current);
  if (input.action === 'override') {
    if (!manages) fail('Only the communications owner or an admin may override status', 403);
    if (input.value === null) service.override = null;
    else {
      if (!statuses.includes(input.value)) fail('Invalid status');
      service.override = {value: input.value, reason: text(input.reason, 'Override reason', 1000), by: current.id, at: new Date().toISOString()};
    }
  } else if (input.action === 'subscribe') {
    const member = input.member ?? current.id;
    if (member !== current.id && !manages) fail('Only the communications owner or an admin may subscribe other users', 403);
    const recipient = state.members.find(row => row.id === member && row.active);
    if (!recipient || !visibleBusiness(service, recipient)) fail('Member is outside this business service audience', 403);
    if (!['email', 'push', 'chat'].includes(input.channel) || typeof input.active !== 'boolean') fail('Choose a recorded channel and subscription state');
    const record = {member, channel: input.channel, active: input.active, by: current.id, at: new Date().toISOString()};
    service.subscriptions = [...service.subscriptions.filter(row => row.member !== member), record];
    if (!input.active) service.notices = service.notices.map(row => row.target.id === member ? {...row, state: 'stopped'} : row);
    else notice(service, member);
  } else if (input.action === 'activate') {
    if (current.role !== 'admin') fail('Admin required', 403);
    service.active = true;
  } else fail('Unknown business-service action');
  service.revision++; return service;
}
export function holdBusinessStatus(state: State) {
  for (const service of state.businessServices ?? []) {
    service.active = false;
    for (const subscription of service.subscriptions) subscription.active = false;
    for (const notice of service.notices) notice.state = 'stopped';
  }
  for (const member of state.members) if (member.role === 'stakeholder') member.active = false;
}
/** Member erasure removes destinations, personal status text and local subscription copies. */
export function eraseBusinessMember(state: State, id: string) {
  for (const service of state.businessServices ?? []) {
    service.audience = service.audience.filter(member => member !== id);
    service.subscriptions = service.subscriptions.filter(row => row.member !== id && row.by !== id);
    service.notices = service.notices.filter(row => row.target.id !== id);
    if (service.override?.by === id) service.override = null;
    if (service.communicationsOwner === id) { service.communicationsOwner = ''; service.active = false; }
  }
}
