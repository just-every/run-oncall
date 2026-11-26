import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { operatorInstaller, developmentTarget, previewTarget } from '@runeditrun/rer/operator-installer';
import { selectLocalState } from '@runeditrun/rer/local/state';
import { commandAdapter as createCommandAdapter } from '@runeditrun/rer/adapter';
import { ownerDeploy } from '@runeditrun/rer/deploy';
import { localPortability } from '@runeditrun/rer/portability';
import { labels } from '@runeditrun/rer/local-installer';
import * as model from './ui/seed.mjs';
import { validateMailConfiguration } from '../../src/mail-configuration.mjs';
import { deployMailPolicy } from './deploy-mail-policy.mjs';
import { refuse } from '@runeditrun/rer/errors';

export { selectLocalState };
const localOnlyKeys = ['RER_DEV_ORIGIN', 'RER_DEV_IDENTITY'];
const baseLifecycle = operatorInstaller({
 database: 'oncall-local', features: model.features,
 async prepare({ root, input, store }) {
  try { validateMailConfiguration(input); }
  catch (error) { throw refuse(error.message); }
  // export and import run prepare without answers; the saved branding stays.
  if (input.APP_NAME === undefined && input.PRIMARY_COLOR === undefined) return;
  await store.step('Saving application branding');
  await writeFile(join(root, 'src/branding.json'), JSON.stringify({ name: input.APP_NAME, primaryColor: input.PRIMARY_COLOR }, null, 2) + '\n');
 },
});
const lifecycle = {
 ...baseLifecycle,
 run(root, input, store, onApp, signal, options = {}) {
  // Preserve the hosted-only refusal before the shared local mail preflight.
  if (input.MAIL_PROVIDER === 'none') throw refuse('MAIL_PROVIDER=none is for hosted deployments; choose MAIL_PROVIDER=development for local setup.');
  if (options.verb !== 'setup') return baseLifecycle.run(root, input, store, onApp, signal, options);
  const setupStore = Object.create(store);
  setupStore.step = async (label, ...args) => {
   if (label !== labels.complete) return store.step(label, ...args);
   await store.step('Local setup is ready. The temporary app stops when setup exits. Run rer dev to start Oncall.', ...args);
   store.report('For hosting, supply Cloudflare credentials. Email is optional.');
   store.report('  1. With email off, set MAIL_PROVIDER=none in the deploy environment or --env-file and leave sender and mail credentials unset. After deploying, run rer signin from this checkout.');
   store.report('  2. For email sign-in links, configure a mail provider and verified sender. For SendGrid, set MAIL_PROVIDER=sendgrid, SENDGRID_API_KEY and MAIL_FROM.');
  };
  return baseLifecycle.run(root, input, setupStore, onApp, signal, options);
 },
};
export const adapter = lifecycle;
export const { install } = lifecycle;
export const commandAdapter = createCommandAdapter(lifecycle, {
 generatedOutputs: ['management/integration/deployment-spec.json', 'public/move-in/oncall-export.mjs.txt'],
 mailOffSignIn: 'rer signin',
 deployPolicy: context => deployMailPolicy({ ...context, localOnlyKeys }),
 site: { entry: 'src/site/pages.tsx', output: 'dist/site', declaration: 'deploy-site.json', config: 'vite.site.config.ts' },
 publicPages: ['/', '/docs', '/docs/install', '/signin/local'],
 dev: developmentTarget, preview: previewTarget, verify: ['pnpm', ['run', 'verify:app']], deploy: ownerDeploy('deploy.json', lifecycle),
 portability: localPortability({ database: 'oncall-local', policyModule: 'scripts/installer/archive-policy.mjs', transient: ['local runtime caches and logs'] }),
 setup: { manifestFile: 'rer-setup.json' }, browserModule: 'scripts/installer/ui/seed.mjs',
 // Local dev identity: the local-only Worker entry, the build output rer build
 // scans for the dev layer.
 devIdentity: { entry: 'src/server.dev.ts', output: ['dist'] },
 localOnlyKeys,
 product: model.product.name, input: { names: { email: 'OWNER_EMAIL', name: 'displayName' }, async defaults(root) { const { readFile } = await import('node:fs/promises'); const branding = JSON.parse(await readFile(join(root, 'src/branding.json'), 'utf8')); return { APP_NAME: branding.name, PRIMARY_COLOR: branding.primaryColor }; } },
});
