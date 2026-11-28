import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Render only Start's root application shell in the emitted Cloudflare runtime.
// This build worker has no storage or credentials. Live documents supply their
// own authorized workspace snapshot after reading this asset.
const root = resolve('dist/server');
const config = JSON.parse(await readFile(resolve(root, 'wrangler.json'), 'utf8'));
const modules = [config.main, ...(await readdir(root, {recursive: true}))
  .filter(path => path !== config.main && /\.m?js$/.test(path))]
  .map(path => ({type: 'ESModule', path: resolve(root, path)}));
const runtime = new Miniflare(convertV4MiniflareOptions({
  workers: [{
    name: config.name,
    modulesRoot: root,
    modules,
    compatibilityDate: config.compatibility_date,
    compatibilityFlags: config.compatibility_flags,
    bindings: {TSS_PRERENDERING: 'true', TSS_SHELL: 'true'},
  }],
}));
try {
  const response = await runtime.dispatchFetch('http://127.0.0.1/__workspace-shell', {
    headers: {accept: 'text/html'},
  });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('text/html')) {
    throw new Error(`Workspace shell render failed (HTTP ${response.status})`);
  }
  await writeFile(resolve(root, config.assets.directory, '_workspace-shell.html'), await response.text());
} finally {
  await runtime.dispose();
}
