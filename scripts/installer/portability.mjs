import { lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { RerError, refuse } from '@runeditrun/rer/errors';

// Seeds declare their real bindings and data policy. The shared module owns the
// archive format and atomic restore; the shared runner owns its native children.
export function productPortability({ database, binding = 'DB', buckets = {}, policy, policyModule, transient = [] }) {
 async function run({ root, path, journal, store, signal, operationToken }, direction) {
  if (direction === 'export') {
   if (await lstat(path).catch(error => { if (error.code === 'ENOENT') return null; throw error; })) throw refuse('Export requires a new archive path.');
  }
  await store.run('Applying local data migrations', 'pnpm', ['exec', 'wrangler', 'd1', 'migrations', 'apply', database, '--local', '--persist-to', '.wrangler/state', '--config', 'wrangler.jsonc'], {
   cwd: root, signal, env: { ...process.env, RER_LOCAL_OPERATION: operationToken, WRANGLER_SEND_METRICS: 'false' },
  });
  const worker = fileURLToPath(new URL('./archive-worker.mjs', import.meta.url));
  const child = store.spawn(`${direction === 'export' ? 'Exporting' : 'Restoring'} local installation data`, process.execPath,
   ['--experimental-strip-types', worker, direction, JSON.stringify({ root, path, journal, binding, buckets, policy, policyModule, transient })], { cwd: root, signal, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  const closed = new Promise(resolve => child.once('close', (code, signal) => resolve({ code, signal })));
  await new Promise(resolve => { child.once('exit', resolve); child.once('error', resolve); });
  await store.stop(child);
  const status = await closed;
  let receipt; try { receipt = JSON.parse(output.trim().split('\n').at(-1)); } catch { throw new RerError('transfer_failed', 'Local portability did not return a complete receipt.', 1); }
  if (status.code !== 0 || !receipt.ok) throw new RerError(receipt.code ?? 'transfer_failed', `The portability module refused or failed the archive operation (${receipt.reason ?? 'incomplete'}).`, receipt.exitCode ?? 1);
  delete receipt.ok;
  return { target: 'local', [direction === 'export' ? 'output' : 'input']: relative(root, path), ...receipt };
 }
 return { export: context => run(context, 'export'), import: context => run(context, 'import') };
}
