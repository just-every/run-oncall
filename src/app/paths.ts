export const workspaceSections = ['incidents', 'alerts', 'services', 'status', 'routing', 'schedules', 'move-in', 'reviews', 'team', 'archive'] as const;
export const incidentPath = (id: string) => `/incidents/${encodeURIComponent(id)}`;

/** Public documents and transports keep their own handlers. Everything else is an app address. */
export function isWorkspacePath(path: string) {
  return !/^\/(?:api|auth|signin|setup|docs|run|contract|health|move-in-guide|__dev|\.well-known|integrations|generic|v2)(?:\/|$)/.test(path);
}
export function workspaceAddress(path: string) {
  const service = /^\/settings\/services(?:\/([^/]+))?\/?$/.exec(path);
  if (service) {try {if (service[1]) decodeURIComponent(service[1]);return {page: 'services', incident: ''};} catch {return {page: 'not-found', incident: ''};}}
  if (path === '/' || /^\/on-call\/?$/.test(path)) return {page: 'on-call', incident: ''};
  if (/^\/settings\/?$/.test(path)) return {page: 'services', incident: ''};
  const setting = /^\/settings\/(services|integrations|routing|team|move-in|archive|readiness)\/?$/.exec(path);
  if (setting) return {page: setting[1], incident: ''};
  if (/^\/settings\/integrations(?:\/(?:new(?:\/[^/]+)?|[^/]+))?\/?$/.test(path)) return {page:'integrations',incident:''};
  const section = workspaceSections.find(section => path === `/${section}` || path === `/${section}/`);
  if (section) return {page: section, incident: ''};
  if (/^\/on-call(?:\/[^/]+(?:\/edit)?)?\/?$/.test(path)) return {page: 'on-call', incident: ''};
  const record = /^\/(alerts|reviews)\/([^/]+)\/?$/.exec(path);
  if (record) {
    try {decodeURIComponent(record[2]);return {page: record[1], incident: ''};} catch {return {page: 'not-found', incident: ''};}
  }
  const incident = /^\/incidents\/([^/]+)\/?$/.exec(path);
  if (incident) {
    try {return {page: 'incidents', incident: decodeURIComponent(incident[1])};} catch {return {page: 'not-found', incident: ''};}
  }
  return {page: 'not-found', incident: ''};
}
export function legacyWorkspacePath(url: URL, home = '/on-call') {
  if (url.pathname !== '/') return null;
  const incident = url.searchParams.get('incident');
  const section = url.hash.slice(1);
  url.searchParams.delete('incident');
  // Kept self-contained: the signed-out lobby also serializes this function.
  const destinations: Record<string, string> = {services: '/settings/services', routing: '/settings/routing', schedules: '/on-call', 'move-in': '/settings/move-in', team: '/settings/team', archive: '/settings/archive'};
  const path = incident ? '/incidents/' + encodeURIComponent(incident) : section ? destinations[section] ?? `/${encodeURIComponent(section)}` : home;
  return path + url.search;
}
