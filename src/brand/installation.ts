import { identity } from '../identity';
import type { Bindings } from '../auth.server';
import { appendWorkspace } from '../workspace-document';
import type { WorkspaceSnapshot } from '../workspace-refresh';

export async function savedInstallationName(env: Bindings) {
  const row = await env.DB.prepare(`
    SELECT (SELECT value FROM bs_overrides WHERE field='display_name') AS local,
           (SELECT document FROM bs_settings WHERE singleton=1) AS shared
  `).first<{local: string | null; shared: string | null}>();
  const value: unknown = row?.local != null ? JSON.parse(row.local)
    : (row?.shared && JSON.parse(row.shared)?.values.display_name) ?? identity.deployment;
  return typeof value === 'string' && value.trim() ? value.trim() : identity.product;
}

export function checkedInstallationName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length > 0 && name.length <= 80 && !/[\x00-\x1f\x7f-\x9f]/.test(name) ? name : null;
}

/** Apply the same saved identity to native forms and the React workspace. */
export async function installationDocument(response: Response, env: Bindings, pathname: string, workspace?: WorkspaceSnapshot) {
  if (!response.headers.get('content-type')?.startsWith('text/html')) return response;
  const name = await savedInstallationName(env);
  const title = name === identity.product ? identity.product : `${name} · ${identity.product}`;
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store, no-transform');
  headers.delete('content-length');
  const rewrite = new HTMLRewriter()
    .on('html', {element(element) {element.setAttribute('data-oncall-installation', name);}})
    .on('h1', {element(element) {if (pathname === '/signin') element.setInnerContent(`Sign in to ${name}`);}})
    .on('title', {element(element) {element.setInnerContent(title);}})
    .on('[data-installation-name], .rer-brand [data-rer-name], .rer-themed .brand [data-rer-name]', {element(element) {element.setInnerContent(name);}})
    .on('[data-installation-home]', {element(element) {element.setAttribute('aria-label', `${name} home`);}});
  if (workspace) appendWorkspace(rewrite, workspace);
  return rewrite.transform(new Response(response.body, {status: response.status, statusText: response.statusText, headers}));
}
