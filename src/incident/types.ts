import {shortDate, shortTime} from '../reviews/time';
export {shortTime} from '../reviews/time';
import type {Entry, Incident, Member, State} from '../family/response-operations/domain';
import {nativeName} from '../integrations/native-name';

export type IncidentProps = {
  incident: Incident;
  state: State;
  actor: Member;
  canEdit: boolean;
  busy: boolean;
  demo: boolean;
  refresh: () => Promise<void>;
  command: (data: any) => Promise<any>;
  mutate: (data: any) => Promise<any>;
};
export const memberName = (state: State, id: string | null | undefined) => {
  if(id?.startsWith('source:')) {
    const source = id.slice('source:'.length);
    const name = source.startsWith('intake:')
      ? state.intakeSources?.find(row => row.id === source.slice(7))?.name ?? 'Unavailable source'
      : source.startsWith('email:')
        ? state.emailAddresses?.find(row => row.id === source.slice(6))?.name ?? 'Unavailable source'
        : nativeName(source);
    return `Source: ${name}`;
  }
  if(id==='system:incident-deadlines')return 'Deadline scheduler';
  const member=state.members.find(member=>member.id===id);
  if(member)return member.name;
  const client=state.apiClients?.find(client=>client.id===id);
  if(client)return `${client.name} for ${state.members.find(member=>member.id===client.owner)?.name??'Erased member'}`;
  const attributed=state.incidents.flatMap(incident=>incident.timeline).find(entry=>entry.actor===id&&entry.metadata?.agent)?.metadata?.agent;
  return attributed?.label??(id?id.startsWith('api-')?'Service account':'Erased member':'Unassigned');
};

export function timelineText(entry: Entry, state: State) {
  // Only format generated workflow prefixes. Authored notes and reasons remain
  // literal text, and the retained timeline is never changed.
  if (entry.kind === 'source-recovery') {
    return 'All alerts recovered — awaiting resolution. Source recovery stopped the alert obligations. The incident still needs human recovery evidence and a summary. A reminder was recorded for the incident lead; automatic reminders and recovery notices are not available yet.';
  }
  if (entry.kind === 'declared' && entry.metadata?.event && entry.metadata.policyVersion !== undefined) {
    const event = state.events.find(event => event.id === entry.metadata!.event);
    if (event) return `Automatically declared from alert: ${event.title}. The service response policy was applied. No human acknowledgment has been recorded.`;
  }
  if (entry.kind === 'assign-role' || entry.kind === 'reassign') {
    const match = /^(commander|scribe|communications|assignee): ([\s\S]*?) → ([\s\S]*?)(: [\s\S]*)?$/.exec(entry.text);
    if (match) {
      const role = {commander: 'lead', scribe: 'scribe', communications: 'communications lead', assignee: 'assignee'}[match[1] as 'commander' | 'scribe' | 'communications' | 'assignee'];
      const change = match[3] === 'Unassigned'
        ? `${role[0].toUpperCase() + role.slice(1)} is now unassigned`
        : `${match[3]} is now ${role}`;
      return `${change}. Previously ${match[2]}.${match[4] ? ' Reason: ' + match[4].slice(2) : ''}`;
    }
  }
  if (entry.kind === 'merge') {
    const match = /^Merged incident (\S+) \(([\s\S]*?)\) into (\S+) \(([\s\S]*?)\): ([\s\S]*)$/.exec(entry.text);
    if (match) return `Merged ${match[2]} into ${match[4]}: ${match[5]}`;
  }
  if (entry.kind === 'split') {
    const match = /^Split (\d+) alert\(s\) from incident (\S+) into (\S+): ([\s\S]*)$/.exec(entry.text);
    if (match) {
      const title = (id: string) => state.incidents.find(incident => incident.id === id)?.title ?? 'another incident';
      return `Split ${match[1]} alert ${match[1] === '1' ? 'group' : 'groups'} from ${title(match[2])} into ${title(match[3])}: ${match[4]}`;
    }
  }
  const targetName = (kind: string, id: string) => kind === 'user'
    ? state.members.find(member => member.id === id)?.name ?? 'an unavailable responder'
    : state.services.find(service => service.id === id)?.name ?? 'the service team';
  if (entry.kind === 'request-responders') {
    const match = /^Requested ([\s\S]*?): ([\s\S]*)$/.exec(entry.text);
    if (match) return `Requested ${match[1].split(', ').map(target => {
      const [kind, id] = target.split(' ');
      return targetName(kind, id);
    }).join(', ')}: ${match[2]}`;
  }
  if (entry.kind === 'respond-request' || entry.kind === 'cancel-request') {
    return entry.text.replace(/^Responder request \S+ (accepted|declined|cancelled) by /, 'Responder request $1 by ');
  }
  if (entry.kind === 'manual-page') {
    const incident = state.incidents.find(incident => incident.manualPage && incident.timeline.some(row => row.id === entry.id));
    if (incident?.manualPage) return `Incident declared for coordination with ${incident.manualPage.obligations.map(obligation => targetName(obligation.target.kind, obligation.target.id)).join(', ')}. Paging is off; contact responders through your existing pager.`;
    return entry.text.replace(/\b(user|policy) (.+?)(?=, |\. User assignment)/g, (_, kind, id) => targetName(kind, id));
  }
  if (['incident-deadline', 'deadline-cancelled', 'deadline-fired'].includes(entry.kind)) {
    return entry.text.replace(/^acknowledgment-timeout:/, 'Acknowledgment timeout:')
      .replace(/\bdue (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/, (_, at) => 'due ' + shortTime(at));
  }
  if (entry.kind === 'action') {
    const match = /^(Follow-up P[1-3]: [\s\S]*) due (\d{4}-\d{2}-\d{2}) \(UTC calendar date\); completion (human-review|evidence)$/.exec(entry.text);
    if (match) {
      const day = shortDate(match[2]);
      return `${match[1]} due ${day}, end of day UTC; ${match[3] === 'human-review' ? 'human review' : 'evidence'}`;
    }
  }
  return entry.text;
}
