import {legacyWorkspacePath, workspaceSections} from './paths';

// The lobby has no app bundle. Canonicalize shared entry addresses without a session.
const script = `(() => {
  const path = (${legacyWorkspacePath.toString()})(new URL(location.href));
  if (!path) return;
  const target = new URL(path, location.origin);
  const known = ${JSON.stringify(['/on-call', ...workspaceSections.map(section => ['services','routing','team','move-in','archive'].includes(section) ? '/settings/' + section : '/' + section)])}.includes(target.pathname) || target.pathname.startsWith('/incidents/');
  if (known) history.replaceState(null, '', target.pathname + target.search);
  else location.replace(target.pathname + target.search);
})();`;
let hash: Promise<string> | undefined;

export async function lobbyPaths(response: Response, status: number) {
  if (!response.headers.get('content-type')?.startsWith('text/html')) return response;
  hash ??= crypto.subtle.digest('SHA-256', new TextEncoder().encode(script)).then(value => btoa(String.fromCharCode(...new Uint8Array(value))));
  const headers = new Headers(response.headers);
  headers.set('content-security-policy', (headers.get('content-security-policy') ?? "default-src 'none'") + `; script-src 'sha256-${await hash}'`);
  const document = new Response(response.body, {status: response.status === 200 ? status : response.status, headers});
  return document.body ? new HTMLRewriter().on('body', {element(body) {
    body.append(`<script>${script}</script>`, {html: true});
  }}).transform(document) : document;
}
