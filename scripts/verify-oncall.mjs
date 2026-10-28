import { appendFile } from 'node:fs/promises';
import { verificationPlan, lightReaders, documentReaders } from './verify-oncall-plan.mjs';
import { requirePreparedBuild, run } from './verify-oncall-build.mjs';

const [mode, tier] = process.argv.slice(2), plan = verificationPlan();
const shards = [...plan.push, ...plan.nightly];
if (mode === '--plan' && !tier) {
 const { planVerification } = await import('./verify-plan.mjs');
 const decision = await planVerification({ plan, readers: lightReaders });
 decision.matrix.include = decision.matrix.include.map(shard => ({ ...shard, timeout: shards.find(item => item.name === shard.name).timeout }));
 const output = Object.entries({ ...decision, matrix: JSON.stringify(decision.matrix), readers: JSON.stringify(decision.readers), has_shards: decision.matrix.include.length > 0 })
  .map(([key, value]) => `${key}=${value}\n`).join('');
 if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, output);
 process.stdout.write(output);
} else if (mode === '--matrix' && ['push', 'nightly', 'all'].includes(tier)) {
 console.log(JSON.stringify({ include: (tier === 'all' ? shards : plan[tier]).map(({ name, browser, timeout }) => ({ name, browser, timeout })) }));
} else if (mode === '--light' && !tier) {
 const readers = JSON.parse(process.env.LIGHT_READERS);
 if (!Array.isArray(readers) || ![JSON.stringify([]), JSON.stringify(documentReaders)].includes(JSON.stringify(readers))) throw Error('Invalid Oncall light readers');
 run('node', ['node_modules/@runeditrun/rer/edition-authoring/cli.mjs', 'check']);
 run('pnpm', ['run', 'check']);
 for (const command of readers) {
  const [program, ...args] = command.split(' ');
  run(program, args);
 }
 run('pnpm', ['run', 'build', '--site']);
} else {
 const shard = shards.find(item => item.name === mode);
 if (!shard || tier) throw Error('Usage: verify-oncall.mjs --plan|--light|--matrix push|nightly|all|SHARD');
 await requirePreparedBuild();
 for (const lane of shard.lanes) run('pnpm', lane === 'hosted' ? ['exec', 'rer', 'verify', '--non-interactive'] : ['run', 'verify:app'], {
  ...process.env, ONCALL_VERIFY_LANE: lane, ONCALL_VERIFY_PREBUILT: 'true',
 });
}
