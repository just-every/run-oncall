import {useRef,useState} from 'react';
import type {State} from '../family/response-operations/domain';
import {alertDisplay} from './alert-display';
export function AlertList({state, selected, onOpen}: {state: State; selected: string; onOpen: () => void}) {
  const filterRoot=useRef<HTMLDetailsElement>(null);
  const closeFilters=()=>{setFilters(false);filterRoot.current?.querySelector('summary')?.focus();};
  const [filters,setFilters]=useState(false);
  const [search, setSearch] = useState(''), [service, setService] = useState(''), [urgency, setUrgency] = useState('');
  const rows = state.alerts.map(alert => ({alert, ...alertDisplay(alert, state)})).filter(row => (!service || row.alert.service === service) && (!urgency || row.alert.urgency === urgency) && `${row.title} ${row.service?.name ?? 'Integration unrouted queue'}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="alert-list" aria-label="Alerts list">
    <div className="alert-list-tools"><label className="field"><span className="alert-search-label">Search alerts</span><input placeholder="Search alerts" type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <details ref={filterRoot} className="alert-filters" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();closeFilters();}}} open={filters} onToggle={e=>setFilters(e.currentTarget.open)}><summary>Filter</summary><div className="alert-filter-fields">
        <label className="field">Service<select aria-label="Filter service" value={service} onChange={e => setService(e.target.value)}><option value="">All services</option>{state.services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
        <label className="field">Urgency<select aria-label="Filter urgency" value={urgency} onChange={e => setUrgency(e.target.value)}><option value="">Any urgency</option><option value="high">High</option><option value="low">Low</option></select></label>
        <button className="alert-filters-done" type="button" onClick={closeFilters}>Done</button>
      </div></details></div>
    {(service || urgency) && <div className="alert-filter-chips">{service && <button onClick={() => setService('')}>{state.services.find(s => s.id === service)?.name} ×</button>}{urgency && <button onClick={() => setUrgency('')}>{urgency} urgency ×</button>}</div>}
    {(['active', 'recovered'] as const).map(group => <div key={group} className="alert-group"><h3>{group === 'active' ? 'Active' : 'Recovered'}</h3>
      {rows.filter(row => row.alert.state === group).map(({alert, title, service, severity, incidents}) => <a className={'alert-row' + (selected === alert.id ? ' current' : '')} href={'/alerts/' + encodeURIComponent(alert.id)} key={alert.id} onClick={onOpen} aria-current={selected === alert.id ? 'page' : undefined}>
        <strong>{title}</strong><span>{service?.name ?? 'Integration unrouted queue'} · {severity}{incidents.length ? ' · in an incident' : ''}{alert.suppressed ? ' · suppressed' : ''}</span>
      </a>)}
      {!rows.some(row => row.alert.state === group) && <p className="muted">No {group} alerts{search || service || urgency ? ' match these filters' : ''}.</p>}
    </div>)}
  </section>;
}
