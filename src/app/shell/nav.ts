import type {State} from '../../family/response-operations/domain';

export type NavItem = {id: string; label: string; path: string; count?: number; icon?: string};
export function dailyNavigation(state: State | null, stakeholder = false): NavItem[] {
  if (stakeholder) return [{id: 'status', label: 'Status', path: '/status', icon: 'status'}];
  return [
    {id: 'on-call', label: 'On call', path: '/on-call', icon: 'on-call'},
    {id: 'incidents', label: 'Incidents', path: '/incidents', icon: 'incidents', count: state?.incidents.filter(row => row.state !== 'resolved' && !row.mergedInto).length ?? 0},
    {id: 'alerts', label: 'Alerts', path: '/alerts', icon: 'alerts', count: state?.alerts.filter(row => row.state === 'active').length ?? 0},
    {id: 'reviews', label: 'Reviews', path: '/reviews', icon: 'reviews'},
    {id: 'status', label: 'Status', path: '/status', icon: 'status'},
  ];
}
export const settingsNavigation: NavItem[] = [
  {id: 'services', label: 'Services', path: '/settings/services'},
  {id: 'integrations', label: 'Integrations', path: '/settings/integrations'},
  {id: 'routing', label: 'Routing', path: '/settings/routing'},
  {id: 'team', label: 'Team', path: '/settings/team'},
  {id: 'move-in', label: 'Move in', path: '/settings/move-in'},
  {id: 'readiness', label: 'Readiness', path: '/settings/readiness'},
  {id: 'archive', label: 'Archive', path: '/settings/archive'},
];
export const settingsItem: NavItem = {id: 'settings', label: 'Settings', path: '/settings/services', icon: 'settings'};
