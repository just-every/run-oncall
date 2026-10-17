import type { Member, Service } from '../family/response-operations/domain';
import type { TriageQuery } from '../family/response-operations/triage';

export function TriageFilters({query, change, services, members}: {query: TriageQuery; change: (key: keyof TriageQuery, value: string) => void; services: Service[]; members: Member[]}) {
  const select = (key: keyof TriageQuery, label: string, choices: {id: string; name: string}[]) => <label>{label}<select aria-label={label} value={query[key] ?? ''} onChange={e => change(key, e.target.value)}><option value="">All</option>{choices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>;
  const options = (...values: string[]) => values.map(id => ({id, name: id}));
  return <div className="triage-filters">
    <label className="search">Search<input aria-label="Search incidents" placeholder="Title, notes, service or alert key" value={query.q ?? ''} onChange={e => change('q', e.target.value)} /></label>
    <label className="triage-mine"><input type="checkbox" checked={query.mine === 'true'} onChange={e => change('mine', e.target.checked ? 'true' : '')} />Assigned to me</label>
    <details><summary>Filter and sort incidents</summary><div className="triage-filter-grid">
      {select('status', 'Incident status', options('open', 'declared', 'acknowledged', 'mitigating', 'recovered', 'resolved'))}
      {select('service', 'Filter service', services)}
      {select('assignee', 'Filter assignee', [{id: 'unassigned', name: 'Unassigned'}, ...members])}
      {select('urgency', 'Filter urgency', options('high', 'low'))}
      {select('priority', 'Filter priority', options('P1', 'P2', 'P3', 'P4', 'P5', 'unset'))}
      {select('severity', 'Filter severity', options('critical', 'warning', 'info'))}
      <label>Sort incidents<select aria-label="Sort incidents" value={query.sort ?? 'created'} onChange={e => change('sort', e.target.value)}><option value="created">Newest created</option><option value="updated">Recently updated</option><option value="urgency">Highest urgency</option><option value="priority">Highest priority</option></select></label>
      {(['createdAfter', 'createdBefore', 'updatedAfter', 'updatedBefore'] as const).map((key, n) => <label key={key}>{['Created from', 'Created before', 'Updated from', 'Updated before'][n]}<input type="datetime-local" value={query[key] ? new Date(Date.parse(query[key]!) - new Date(query[key]!).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={e => change(key, e.target.value ? new Date(e.target.value).toISOString() : '')} /></label>)}
    </div></details>
  </div>;
}
