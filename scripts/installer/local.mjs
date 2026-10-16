import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { operatorInstaller, developmentTarget, previewTarget } from '@runeditrun/rer/operator-installer';
import { selectLocalState } from '@runeditrun/rer/local/state';
import { commandAdapter as createCommandAdapter } from '@runeditrun/rer/adapter';
import { ownerDeploy } from '@runeditrun/rer/deploy';
import { localPortability } from '@runeditrun/rer/portability';
import { labels } from '@runeditrun/rer/local-installer';
import * as model from './ui/seed.mjs';

export { selectLocalState };
const baseLifecycle = operatorInstaller({
 database: 'oncall-local', features: model.features,
 async prepare({ root, input, store }) {
  // export and import run prepare without answers; the saved branding stays.
  if (input.APP_NAME === undefined && input.PRIMARY_COLOR === undefined) return;
  await store.step('Saving application branding');
  await writeFile(join(root, 'src/branding.json'), JSON.stringify({ name: input.APP_NAME, primaryColor: input.PRIMARY_COLOR }, null, 2) + '\n');
 },
});
const lifecycle = {
 ...baseLifecycle,
 run(root, input, store, onApp, signal, options = {}) {
  if (options.verb !== 'setup') return baseLifecycle.run(root, input, store, onApp, signal, options);
  const setupStore = Object.create(store);
  setupStore.step = (label, ...args) => store.step(label === labels.complete
   ? 'Local setup is ready. The temporary app stops when setup exits; run rer dev to start Oncall.'
   : label, ...args);
  return baseLifecycle.run(root, input, setupStore, onApp, signal, options);
 },
};
export const adapter = lifecycle;
export const { install } = lifecycle;
export const commandAdapter = createCommandAdapter(lifecycle, {
 generatedOutputs: ['management/integration/deployment-spec.json'],
 site: { entry: 'src/site/pages.tsx', output: 'dist/site', declaration: 'deploy-site.json', config: 'vite.site.config.ts' },
 publicPages: ['/', '/docs', '/docs/install', '/signin/local'],
 dev: developmentTarget, preview: previewTarget, verify: ['pnpm', ['run', 'verify:app']], deploy: ownerDeploy('deploy.json', lifecycle),
 portability: localPortability({ database: 'oncall-local', policyModule: 'scripts/installer/archive-policy.mjs', transient: ['local runtime caches and logs'] }),
 setup: { manifestFile: 'rer-setup.json' }, browserModule: 'scripts/installer/ui/seed.mjs',
 // Local dev identity: the local-only Worker entry, the build output rer build
 // scans for the dev layer.
 devIdentity: { entry: 'src/server.dev.ts', output: ['dist'] },
 localOnlyKeys: ['RER_DEV_ORIGIN', 'RER_DEV_IDENTITY'],
 product: model.product.name, input: { names: { email: 'OWNER_EMAIL', name: 'displayName' }, async defaults(root) { const { readFile } = await import('node:fs/promises'); const branding = JSON.parse(await readFile(join(root, 'src/branding.json'), 'utf8')); return { APP_NAME: branding.name, PRIMARY_COLOR: branding.primaryColor }; } },
});
