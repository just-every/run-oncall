import {useState} from 'react';
import {Field, Form} from '../forms';
import type {State} from '../family/response-operations/domain';
import './services.css';

export const servicePath = (id: string) => '/settings/services/' + encodeURIComponent(id);

type Props = {state: State; admin: boolean; busy: boolean; selected?: string; command: (input: any) => Promise<any>; open: (path: string) => void};
export function ServiceList({state, admin, busy, selected, command, open}: Props) {
  const [adding, setAdding] = useState(false);
  const name = (id: string) => state.members.find(member => member.id === id)?.name ?? 'Unassigned';
  return <section className="service-list panel padded" aria-label="Services">
    <div className="services-title"><h2>Services</h2>{admin && state.services.length > 0 && <button type="button" aria-expanded={adding} onClick={() => setAdding(value => !value)}>Add service</button>}</div>
    <div className="service-list-rows">{state.services.map(service => <a key={service.id} href={servicePath(service.id)} onClick={event => {if (!selected && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {try {sessionStorage.setItem('oncall:services:scroll', String(scrollY));} catch {}}}} className={'service-list-row' + (selected === service.id ? ' selected' : '')} aria-current={selected === service.id ? 'page' : undefined}>
      <strong>{service.name}</strong><span>{service.environment} · {name(service.owner)}</span>
    </a>)}</div>
    {admin && (adding || !state.services.length) && <section className="service-create" aria-label="Add service">
      <h3>Add service</h3>
      <Form busy={busy} label="Create service" onSubmit={async data => {
        const service = await command({...data, type: 'service', runbook: [], pager: ''});
        if (service) {setAdding(false); open(servicePath(service.id));}
        return !!service;
      }}>
        <Field name="name" label="Service name"/>
        <Field name="environment" label="Environment" value="production"/>
        <Field name="owner" label="Service owner" required={false}><option value="">Unassigned</option>{state.members.filter(member => member.active && ['admin', 'responder'].includes(member.role)).map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</Field>
      </Form>
    </section>}
    {!admin && !selected && <p className="muted">Admins can add services and change their settings.</p>}
    {!admin && !state.services.length && <p>No services yet.</p>}
  </section>;
}
