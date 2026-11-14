import type {ApprovalDisplaySummary, ApprovalSummary} from '../modules/agent-door/types';
import type {Incident, State} from '../family/response-operations/domain';
import {incidentStateLabel, severityLabel, urgencyLabel} from '../reviews/display';

/** Display only: original arguments, revision and raw summary retain custody. */
export function coordinationSummary(operation: string, args: Record<string, unknown>, state: Pick<State, 'members' | 'services'>, incident?: Incident): string[] {
  const service = state.services.find(row => row.id === (incident?.service ?? args.service));
  const person = (id: unknown) => id === null ? 'Unassigned' : state.members.find(row => row.id === id)?.name ?? 'Unavailable member';
  const lines = [service ? `For ${service.name}.` : 'Service unavailable'];
  if (operation === 'incidents.resolve') lines.push(`Mark the incident ${incidentStateLabel('resolved')}.`);
  else if (operation === 'incidents.acknowledge') lines.push(`Acknowledge for ${person(args.member)}.`);
  else if (operation === 'incidents.declare' || args.change === 'manual-page') {
    lines.push(`Declare “${args.title}” with ${severityLabel(String(args.severity)).toLowerCase()} severity.`);
    if (args.urgency) lines.push(`${urgencyLabel(String(args.urgency))} urgency.`);
    if (args.priority) lines.push(`Priority ${args.priority}.`);
    if (Array.isArray(args.users)) lines.push(`Responders: ${args.users.map(person).join(', ')}.`);
    if (args.policy) lines.push(`Use ${state.services.find(row => row.id === args.policy)?.name ?? 'the selected escalation policy'}.`);
    lines.push('Record coordination only; paging remains OFF.');
  } else if (args.change === 'transition') lines.push(`Mark the incident ${incidentStateLabel(String(args.state))}.`);
  else if (args.change === 'reassign' || args.change === 'assign-role') {
    const role = ({commander: 'lead', communications: 'communications lead', scribe: 'scribe', assignee: 'assignee'} as Record<string, string>)[String(args.role ?? 'assignee')];
    lines.push(args.member === null ? `Leave the ${role} unassigned.` : `Make ${person(args.member)} the ${role}.`);
  } else if (args.change === 'snooze') lines.push(`Snooze for ${args.minutes} minutes; paging remains OFF.`);
  else if (args.change === 'cancel-deadline') lines.push('Cancel pending re-trigger deadlines; paging remains OFF.');
  else if (args.change === 'expire-deadline') lines.push('Record the due re-trigger deadline; paging remains OFF.');
  else if (operation === 'actions.create') {
    lines.push(`Create follow-up “${args.title}” for ${person(args.owner)}, due ${args.due}.`);
    if (args.priority) lines.push(`Priority ${args.priority}.`);
    lines.push(args.completionPolicy === 'human-review' ? 'Completion requires human review.' : 'Completion requires evidence.');
  } else if (operation === 'actions.submit') lines.push(`Submit completion evidence for “${incident?.actions.find(row => row.id === args.action)?.title ?? 'the follow-up'}”.`);
  for (const key of ['summary', 'text', 'reason', 'description']) if (typeof args[key] === 'string') lines.push(args[key]);
  if (typeof args.evidence === 'string') lines.push(`Evidence: ${args.evidence}`);
  return lines;
}

/** Project existing saved summaries too, without changing their approval hash. */
export async function presentCoordinationSummary(db: D1Database, tool: string, summary: ApprovalDisplaySummary): Promise<ApprovalSummary | undefined> {
  const operation = tool.replace(/^oncall\./, '');
  if (!['incidents.declare', 'incidents.update', 'incidents.acknowledge', 'incidents.resolve', 'notes.add', 'actions.create', 'actions.submit'].includes(operation) || !('items' in summary)) return;
  const args: Record<string, unknown> = {};
  const keys = new Set(['state','summary','text','reason','description','evidence','service','title','severity','urgency','priority','users','policy','member','role','minutes','owner','due','completionPolicy','action']);
  for (const item of summary.items ?? []) {
    const at = item.indexOf(': '), key = item.slice(0, at), value = item.slice(at + 2);
    if (at < 0 || !keys.has(key)) continue;
    if (key === 'users') { try { args[key] = JSON.parse(value); } catch { /* old details stay available */ } }
    else args[key] = key === 'member' && value === 'null' ? null : value;
  }
  if (operation === 'incidents.update') args.change = args.title ? 'manual-page' : args.state ? 'transition' : args.role ? 'assign-role' : args.member !== undefined ? 'reassign' : args.minutes ? 'snooze' : summary.items?.includes('Cancel pending re-trigger deadlines; paging OFF') ? 'cancel-deadline' : 'expire-deadline';
  const [members, services, target] = await Promise.all([
    db.prepare("SELECT data FROM oc_members").all<{data: string}>(),
    db.prepare("SELECT data FROM oc_services").all<{data: string}>(),
    summary.nativeTarget?.kind === 'incident' ? db.prepare('SELECT data FROM oc_incidents WHERE id=?').bind(summary.nativeTarget.id).first<{data: string}>() : null,
  ]);
  const state = {members: members.results.map(row => JSON.parse(row.data)), services: services.results.map(row => JSON.parse(row.data))};
  return {target: summary.target, items: coordinationSummary(operation, args, state, target ? JSON.parse(target.data) : undefined)};
}
