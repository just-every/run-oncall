import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';

const receipt = 'dist/.oncall-verification.json';
const revision = () => execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
export const preparation = [
 ['pnpm', ['exec', 'rer', 'check', '--profile', 'first-party']],
 ['pnpm', ['run', 'build']],
 ['pnpm', ['run', 'typecheck']],
];

export function run(command, args, env = process.env) {
 console.log(`> ${command} ${args.join(' ')}`);
 const result = spawnSync(command, args, { stdio: 'inherit', env: { ...env, WRANGLER_SEND_METRICS: 'false' } });
 if (result.error) throw result.error;
 if (result.status !== 0) process.exit(result.status ?? 1);
}

export async function requirePreparedBuild() {
 assert.equal(JSON.parse(await readFile(receipt, 'utf8')).sha, revision(), 'Shared verification build must match this exact checkout');
 for (const file of ['dist/server/wrangler.json', 'dist/client', 'management/integration/deployment-spec.json', 'public/move-in/oncall-export.mjs.txt']) await access(file);
}

if (process.argv[1] === import.meta.filename) {
 if (process.argv.length !== 2) throw Error('Usage: node scripts/verify-oncall-build.mjs');
 for (const [command, args] of preparation) run(command, args);
 await writeFile(receipt, JSON.stringify({ sha: revision() }) + '\n');
}
