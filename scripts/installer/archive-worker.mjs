import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createPortability, PortabilityError } from '../base-cli/modules/portability/index.mjs';
import { exportArchive, importArchive, fileRecords } from '../base-cli/modules/portability/files.mjs';
import { migrationReplay } from '../base-cli/modules/portability/migration-history.mjs';
import { parseJsonc } from '../base-cli/cli/jsonc.mjs';

// Base's portability worker (scripts/base-cli/cli/portability-worker.mjs) plus
// Oncall's restore policy module, whose staged validation is code and cannot
// travel inside the JSON policy Base's worker receives.

// The migrations this installation applied, in Wrangler's applied order, so a
// restore can place an older archive within them.
async function appliedMigrations(root, db, binding, split) {
 const config = parseJsonc(await readFile(join(root, 'wrangler.jsonc'), 'utf8'));
 const directory = join(root, config.d1_databases.find(entry => entry.binding === binding).migrations_dir ?? 'migrations');
 const names = (await db.prepare('SELECT name FROM d1_migrations ORDER BY id').all()).results.map(row => row.name);
 return Promise.all(names.map(async name => ({ name, statements: split(await readFile(join(directory, name), 'utf8')) })));
}

async function run(direction, { root, path, journal, binding, buckets, policy, policyModule, transient }) {
 // Verify the entire input before opening bindings or acquiring an import lock.
 if (direction === 'import') { for await (const record of fileRecords(path)) {} if (journal) for await (const record of fileRecords(journal)) {} }
 if (policyModule) policy = { ...policy, ...(await import(pathToFileURL(join(root,policyModule)))).policy };
 const { getPlatformProxy, unstable_splitSqlQuery } = createRequire(join(root, 'package.json'))('wrangler');
 // Unlike Wrangler's --persist-to base, the API takes the versioned directory.
 const proxy = await getPlatformProxy({ configPath: join(root, 'wrangler.jsonc'), persist: { path: join(root, '.wrangler/state/v3') }, remoteBindings: false });
 try {
  const migrations = async () => migrationReplay(await appliedMigrations(root, proxy.env[binding], binding, unstable_splitSqlQuery), policy);
  const service = await createPortability({ db: proxy.env[binding], buckets: Object.fromEntries(Object.entries(buckets).map(([name, binding]) => [name, proxy.env[binding]])), policy, migrations });
  return await (direction === 'export' ? exportArchive(service, path, transient) : importArchive(service, path, transient, journal));
 } finally { await proxy.dispose(); }
}

try { console.log(JSON.stringify({ ok: true, ...await run(process.argv[2], JSON.parse(process.argv[3])) })); }
catch (error) {
 const refusal = error instanceof PortabilityError && (error.status === 409 || ['wrong_product', 'schema_mismatch', 'table_inventory', 'configuration_inventory', 'erased_row', 'erasure_epoch', 'later_journal', 'invalid_journal'].includes(error.code.split(':')[0]));
 const exitCode = error.message === 'archive_json' ? 2 : refusal || error.code === 'EEXIST' ? 4 : 1;
 // Report only symbolic codes; native database errors can contain private data.
 const reason = error instanceof PortabilityError ? error.code.split(':')[0] : /^[A-Z_]+$/.test(error.code ?? '') ? error.code : error.message === 'archive_json' ? 'archive_json' : 'native_error';
 console.log(JSON.stringify({ ok: false, code: exitCode === 2 ? 'invalid_archive' : exitCode === 4 ? 'restore_refused' : 'transfer_failed', reason, exitCode })); process.exitCode = exitCode;
}
