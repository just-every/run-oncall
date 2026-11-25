import { readFile } from 'node:fs/promises';

// One count per registration in the verification plan: a lane entry is one test,
// whatever it asserts inside. Nothing is folded, so a journey cannot hide behind
// another. test-budget.json holds the cap and, above 200, the written reason.
const { lanes } = JSON.parse(await readFile(new URL('./verify-shards.json', import.meta.url), 'utf8'));
const { cap, reason } = JSON.parse(await readFile(new URL('../test-budget.json', import.meta.url), 'utf8'));
const count = Object.values(lanes).reduce((sum, entries) => sum + entries.length, 0);
if (!Number.isSafeInteger(cap) || cap < 1 || (cap > 200 && !String(reason ?? '').trim())) throw Error('test-budget.json needs an integer cap, and a written reason above 200');
console.log(`Registered tests: ${count} of ${cap}`);
if (count > cap) {
 console.error(`Over the test cap by ${count - cap}: delete a test or raise cap in test-budget.json with a reason.`);
 process.exit(1);
}
