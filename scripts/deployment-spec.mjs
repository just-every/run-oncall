import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {wranglerBindings} from '@runeditrun/rer/internal/modules/delivery-producer/bindings.mjs';
import {collectMigrations, decodeUtf8, sourcePath} from '@runeditrun/rer/internal/modules/delivery-producer/migrations.mjs';
import {validateDeclarations} from '@runeditrun/rer/internal/modules/delivery-producer/declarations.mjs';

// Source metadata only: this does not publish an artifact or enable hosted deploys.
// Generate after the real build so bindings and migration bytes describe its Worker.
const root = process.cwd();
const json = async path => JSON.parse(decodeUtf8(await readFile(await sourcePath(root, path)), path));
const [build, deploy, setup, policy] = await Promise.all([
  json('dist/server/wrangler.json'), json('deploy.json'), json('rer-setup.json'),
  json('scripts/deployment-spec-policy.json'),
]);
const bindings = wranglerBindings(build);
const setupFields = new Map(setup.fields.map(field => [field.name, field]));
const secretNames = setup.fields.filter(field => field.kind === 'secret' && field.required).map(field => field.name);
const optionalSecretNames = (deploy.secrets ?? []).map(item => item.binding).filter(name =>
  !secretNames.includes(name) && (!setupFields.has(name) || setupFields.get(name).kind === 'secret'));
const spec = {
  schema: 1,
  ...bindings,
  migrations: await collectMigrations(root, (build.d1_databases ?? []).map(item => ({
    binding: item.binding, path: resolve(dirname(resolve(root, 'dist/server/wrangler.json')), item.migrations_dir),
  })), bindings.resources),
  compatibilityDate: build.compatibility_date,
  compatibilityFlags: build.compatibility_flags ?? [],
  publicVariables: {...build.vars, ...deploy.vars},
  secretNames, optionalSecretNames,
  schedules: build.triggers?.crons ?? [],
  healthPath: '/health',
  ...policy,
};
validateDeclarations(spec);
await mkdir('management/integration', {recursive: true});
await writeFile('management/integration/deployment-spec.json', JSON.stringify(spec, null, 2) + '\n');
console.log('Generated management/integration/deployment-spec.json from the built Worker and source policy.');
