import { businessSettings } from '../agent-door/business';
import { identity } from '../identity';
import type { Bindings } from '../auth.server';

export async function savedInstallationName(env: Bindings) {
  const value = await businessSettings(env).resolve('display_name', identity.deployment);
  return typeof value === 'string' && value.trim() ? value.trim() : identity.product;
}

export function checkedInstallationName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length > 0 && name.length <= 80 && !/[\x00-\x1f\x7f-\x9f]/.test(name) ? name : null;
}

/** Apply the same saved identity to native forms and the React workspace. */
export async function installationDocument(response: Response, env: Bindings, pathname: string) {
  if (!response.headers.get('content-type')?.startsWith('text/html')) return response;
  const name = await savedInstallationName(env);
  const title = name === identity.product ? identity.product : `${name} · ${identity.product}`;
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store, no-transform');
  headers.delete('content-length');
  return new HTMLRewriter()
    .on('html', {element(element) {element.setAttribute('data-oncall-installation', name);}})
    .on('h1', {element(element) {if (pathname === '/signin') element.setInnerContent(`Sign in to ${name}`);}})
    .on('title', {element(element) {element.setInnerContent(title);}})
    .on('[data-installation-name], .rer-brand [data-rer-name], .rer-themed .brand [data-rer-name]', {element(element) {element.setInnerContent(name);}})
    .on('[data-installation-home]', {element(element) {element.setAttribute('aria-label', `${name} home`);}})
    .transform(new Response(response.body, {status: response.status, statusText: response.statusText, headers}));
}
