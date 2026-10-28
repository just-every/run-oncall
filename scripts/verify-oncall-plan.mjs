import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const { lanes, push, nightly } = JSON.parse(await readFile(new URL('./verify-shards.json', import.meta.url), 'utf8'));

export function verificationPlan() {
 const names = new Set(), selected = new Set();
 for (const shard of [...push, ...nightly]) {
  if (!/^[a-z][a-z0-9-]*$/.test(shard.name) || names.has(shard.name)
   || typeof shard.browser !== 'boolean' || typeof shard.hosted !== 'boolean'
   || !Number.isSafeInteger(shard.timeout) || shard.timeout < 1 || !shard.lanes?.length) throw Error('Invalid Oncall verification shard');
  names.add(shard.name);
  for (const lane of shard.lanes) {
   if (!Object.hasOwn(lanes, lane) || selected.has(lane)) throw Error(`Missing or duplicate verification lane: ${lane}`);
   selected.add(lane);
  }
 }
 if (selected.size !== Object.keys(lanes).length || push.filter(shard => shard.hosted).length !== 1) throw Error('Incomplete Oncall verification coverage');
 const tier = shards => shards.map(shard => ({ ...shard, commands: shard.lanes.flatMap(lane => lanes[lane].map(file => `node ${file}`)) }));
 return { push: tier(push), nightly: tier(nightly) };
}

// Reviewed public-door readers: these journeys consume source, fixtures and
// built output. Browser evidence is written, never used as test input. Unknown
// journeys deliberately retain full coverage until their inputs are reviewed.
const reviewed = new Set([
 'tests/hosted.mjs', 'tests/runtime.mjs', 'tests/triage.mjs', 'tests/changes.mjs',
 'tests/intake.mjs', 'tests/routing.mjs', 'tests/monitoring.mjs', 'tests/urgency.mjs',
 'tests/reviews.mjs', 'tests/activation.mjs', 'tests/demo.mjs', 'tests/move-in-adoption.mjs',
 'tests/import-door.mjs', 'tests/signin-browser.mjs', 'tests/member-coordination-browser.mjs',
 'tests/product-browser.mjs', 'tests/automation-browser.mjs', 'tests/activation-browser.mjs', 'tests/transfer.mjs',
]);
const documents = new Set(['CONTRACT.md', 'ACCEPTANCE.md', 'CLAIMS.md', 'docs/CLAIMS.md', 'HANDOVER.md', 'STATUS.md']);
export const documentReaders = ['pnpm run build', 'node tests/hosted.mjs'];

export async function lightReaders(files, { cwd = process.cwd(), plan } = {}) {
 if (!files.length || !files.every(file => documents.has(file) || file === 'sources.lock.json'
  || /^(?:evidence|\.artifacts)\/.+\.(?:md|txt|png|jpe?g|pdf)$/.test(file))) return;
 for (const path of ['edition.json', 'sources.lock.json', 'scripts/edition-authoring/cli.mjs']) await access(join(cwd, path));
 for (const shard of [...plan.push, ...plan.nightly]) for (const command of shard.commands) {
  const path = /^node (tests\/[a-z0-9-]+\.mjs)$/.exec(command)?.[1];
  if (!reviewed.has(path)) return;
  await access(join(cwd, path));
 }
 // Oncall's legacy contract is read by its real app/site builders. Rebuild the
 // document consumer and keep the existing hosted-link assertions for edits to
 // contract documents; no new contract format is imposed during this refresh.
 return files.some(file => documents.has(file)) ? documentReaders : [];
}
