import type {Incident, Member, State} from '../family/response-operations/domain';

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
export const shortTime = (value: string) => new Date(value).toLocaleString([], {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});
export const memberName = (state: State, id: string | null | undefined) =>
  state.members.find(member => member.id === id)?.name ?? (id?.startsWith('api-') ? 'Service account' : 'Unassigned');
