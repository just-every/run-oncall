import {Link} from '@tanstack/react-router';
import type {ReactNode} from 'react';
import type {Service, State} from '../family/response-operations/domain';

export type ServiceValues = Pick<Service, 'name' | 'owner' | 'runbook' | 'pager'> & {team: string | null};
export const serviceValues = (service: Service): ServiceValues => ({name: service.name, owner: service.owner, runbook: service.runbook, pager: service.pager, team: service.team ?? null});
type Field = keyof ServiceValues;
type Props = {focusName?: boolean; service: Service; state: State; admin: boolean; values: ServiceValues; change: <K extends Field>(field: K, value: ServiceValues[K]) => void; blur: (field: Field) => void; mark?: (field: Field) => ReactNode; feedback?: (field: Field) => ReactNode; confirm?: (field: 'pager' | 'team') => ReactNode};
export function ServiceHead({service, state, admin, values, change, blur, mark = () => null, feedback = () => null, confirm = () => null, focusName}: Props) {
  const teams=state.teams?.filter(team => team.active || team.id === values.team) ?? [];
  return <section className="service-page-head panel padded">
    <h2>{service.name}</h2><p className="service-meta">{service.environment}</p>
    {!admin && <p>Admins can change service settings.</p>}
    <div className="service-head-fields">
      <div><label className="field"><span>Name {mark('name')}</span><input autoFocus={focusName} aria-label="Name" required maxLength={200} readOnly={!admin} value={values.name} onChange={event => change('name', event.target.value)} onBlur={() => blur('name')}/></label>{feedback('name')}</div>
      <div><label className="field"><span>Owner {mark('owner')}</span><select aria-label="Owner" disabled={!admin} value={values.owner} onChange={event => change('owner', event.target.value)}><option value="">Unassigned</option>{state.members.filter(member => member.active && ['admin', 'responder'].includes(member.role) || member.id === values.owner).map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>{feedback('owner')}</div>
      <div className="service-runbook"><label className="field"><span>Runbook steps (one per line) {mark('runbook')}</span><textarea aria-label="Runbook steps (one per line)" rows={3} readOnly={!admin} value={values.runbook.join('\n')} onChange={event => change('runbook', event.target.value.split('\n'))} onBlur={() => blur('runbook')}/></label>{feedback('runbook')}</div>
      <div><label className="field"><span>Existing pager link {mark('pager')}</span><input aria-label="Existing pager link" type="url" readOnly={!admin} value={values.pager} onChange={event => change('pager', event.target.value)} onBlur={() => blur('pager')}/></label>{confirm('pager')}{feedback('pager')}{service.pager && <a href={service.pager} target="_blank" rel="noreferrer">Existing pager →</a>}</div>
      <div>{teams.length ? <label className="field"><span>Team {mark('team')}</span><select aria-label="Team" disabled={!admin} value={values.team ?? ''} onChange={event => change('team', event.target.value || null)}><option value="">Unassigned</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label> : <div className="field"><span>Team</span><p className="service-meta">Unassigned{admin && <> · <Link to={'/settings/team' as any}>Make a team in Settings › Team › Teams</Link></>}</p></div>}{service.ownership && values.team === service.team && <p className="service-meta">From Backstage · {service.ownership.entity}</p>}{confirm('team')}{feedback('team')}</div>
    </div>
  </section>;
}
