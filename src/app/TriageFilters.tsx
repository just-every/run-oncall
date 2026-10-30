import type { Member, Service } from '../family/response-operations/domain';
import type { TriageQuery } from '../family/response-operations/triage';
import {shortTime} from '../reviews/time';

export function TriageFilters({query, change, services, members}: {query: TriageQuery; change: (key: keyof TriageQuery, value: string) => void; services: Service[]; members: Member[]}) {
  const select = (key: keyof TriageQuery, label: string, choices: {id: string; name: string}[]) => <label>{label}<select aria-label={label} value={query[key] ?? ''} onChange={e => change(key, e.target.value)}><option value="">All</option>{choices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>;
  const options = (...values: string[]) => values.map(id => ({id, name: id}));
  const named = (choices: {id: string; name: string}[], value: string) => choices.find(c => c.id === value)?.name ?? value;
  const dateLabels = {createdAfter: 'Created from ', createdBefore: 'Created before ', updatedAfter: 'Updated from ', updatedBefore: 'Updated before '} as const;
  const applied: [keyof TriageQuery, string][] = [];
  if (query.mine === 'true') applied.push(['mine', 'Assigned to me']);
  if (query.status) applied.push(['status', 'Status: ' + query.status]);
  if (query.service) applied.push(['service', 'Service: ' + named(services, query.service)]);
  if (query.assignee) applied.push(['assignee', 'Assignee: ' + named([{id: 'unassigned', name: 'Unassigned'}, ...members], query.assignee)]);
  if (query.urgency) applied.push(['urgency', 'Urgency: ' + query.urgency]);
  if (query.priority) applied.push(['priority', 'Priority: ' + query.priority]);
  if (query.severity) applied.push(['severity', 'Severity: ' + query.severity]);
  if (query.sort && query.sort !== 'created') applied.push(['sort', 'Sort: ' + query.sort]);
  for (const key of Object.keys(dateLabels) as (keyof typeof dateLabels)[]) if (query[key]) applied.push([key, dateLabels[key] + shortTime(query[key]!)]);
  return <div className="triage-filters">
    <label>Items<select aria-label="Triage items" value={query.kind??'incidents'} onChange={e=>change('kind',e.target.value)}><option value="incidents">Declared incidents</option><option value="alerts">Alert-only items</option></select></label>
    <label className="search">Search<input aria-label="Search incidents" placeholder="Title, notes, service or alert key" value={query.q ?? ''} onChange={e => change('q', e.target.value)} /></label>
    <details><summary>Filter and sort incidents</summary><div className="triage-filter-grid">
      <label className="triage-mine"><input type="checkbox" checked={query.mine === 'true'} onChange={e => change('mine', e.target.checked ? 'true' : '')} />Assigned to me</label>
      {select('status', 'Incident status', options('open', 'declared', 'acknowledged', 'mitigating', 'recovered', 'resolved'))}
      {select('service', 'Filter service', services)}
      {select('assignee', 'Filter assignee', [{id: 'unassigned', name: 'Unassigned'}, ...members])}
      {select('urgency', 'Filter urgency', options('high', 'low'))}
      {select('priority', 'Filter priority', options('P1', 'P2', 'P3', 'P4', 'P5', 'unset'))}
      {select('severity', 'Filter severity', options('critical', 'warning', 'info'))}
      <label>Sort incidents<select aria-label="Sort incidents" value={query.sort ?? 'created'} onChange={e => change('sort', e.target.value)}><option value="created">Newest created</option><option value="updated">Recently updated</option><option value="urgency">Highest urgency</option><option value="priority">Highest priority</option></select></label>
      {(['createdAfter', 'createdBefore', 'updatedAfter', 'updatedBefore'] as const).map((key, n) => <label key={key}>{['Created from', 'Created before', 'Updated from', 'Updated before'][n]}<input type="datetime-local" value={query[key] ? new Date(Date.parse(query[key]!) - new Date(query[key]!).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={e => change(key, e.target.value ? new Date(e.target.value).toISOString() : '')} /></label>)}
    </div></details>
    {applied.length > 0 && <ul className="triage-chips" aria-label="Applied filters">{applied.map(([key, text]) => <li key={key}><button type="button" className="quiet" aria-label={'Remove filter ' + text} onClick={() => change(key, '')}>{text} <span aria-hidden="true">×</span></button></li>)}</ul>}
  </div>;
}
