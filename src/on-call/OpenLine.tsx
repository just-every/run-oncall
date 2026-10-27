import {Link} from '@tanstack/react-router';
import type {State} from '../family/response-operations/domain';
export function OpenLine({state}: {state: State}) {
  const open = state.incidents.filter(incident => incident.state !== 'resolved' && !incident.mergedInto).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  if (!open.length) return null;
  const active = state.alerts.filter(alert => alert.state === 'active').length;
  return <div className="oc-open-line" aria-label="Open incidents">{open.slice(0, 3).map((incident, index) => <p key={incident.id}><Link to={'/incidents/' + encodeURIComponent(incident.id) as any}>{incident.title}</Link>{index === 0 && <> · <Link to="/alerts">{active} active {active === 1 ? 'alert' : 'alerts'}</Link></>}</p>)}{open.length > 3 && <Link to="/incidents" search={{triage_status:'open'} as any} aria-label={`${open.length-3} more open incidents`}>{open.length - 3} more</Link>}</div>;
}
