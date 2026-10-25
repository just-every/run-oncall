export const workspaceSections = ['incidents', 'alerts', 'services', 'status', 'routing', 'schedules', 'move-in', 'reviews', 'team', 'archive'] as const;
export const incidentPath = (id: string) => `/incidents/${encodeURIComponent(id)}`;

/** Public documents and transports keep their own handlers. Everything else is an app address. */
export function isWorkspacePath(path: string) {
  return !/^\/(?:api|auth|signin|setup|docs|run|contract|health|move-in-guide|__dev|\.well-known|integrations|generic|v2)(?:\/|$)/.test(path);
}
export function workspaceAddress(path: string) {
  if (path === '/') return {page: 'incidents', incident: ''};
  const section = workspaceSections.find(section => path === `/${section}` || path === `/${section}/`);
  if (section) return {page: section, incident: ''};
  const incident = /^\/incidents\/([^/]+)\/?$/.exec(path);
  if (incident) {
    try {return {page: 'incidents', incident: decodeURIComponent(incident[1])};} catch {return {page: 'not-found', incident: ''};}
  }
  return {page: 'not-found', incident: ''};
}
export function legacyWorkspacePath(url: URL) {
  if (url.pathname !== '/') return null;
  const incident = url.searchParams.get('incident');
  const section = url.hash.slice(1);
  url.searchParams.delete('incident');
  const path = incident ? incidentPath(incident) : section ? `/${encodeURIComponent(section)}` : '/incidents';
  return path + url.search;
}
