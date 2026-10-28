import {shortDate, shortTime} from '../reviews/time';
export {shortTime} from '../reviews/time';
import type {Entry, Incident, Member, State} from '../family/response-operations/domain';

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
export const memberName = (state: State, id: string | null | undefined) =>
  state.members.find(member => member.id === id)?.name ?? (id ? id.startsWith('api-') ? 'Service account' : 'Erased member' : 'Unassigned');

export function timelineText(entry: Entry, state: State) {
  // Only format generated workflow prefixes. Authored notes and reasons remain
  // literal text, and the retained timeline is never changed.
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
