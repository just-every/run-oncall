import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = 'e1b4265eb0d839a67dae3c36a04f83fa48c9d480';
const execute = promisify(execFile), root = process.cwd();
const git = async args => (await execute('git', args, { timeout: 120000, maxBuffer: 1024 * 1024 })).stdout.trim();
let temporary;
try {
  let base = process.env.ONCALL_AGENT_BASE_CHECKOUT;
  if (!base) {
    temporary = await mkdtemp(join(tmpdir(), 'oncall-agent-base-'));
    base = temporary;
    await git(['init', '--quiet', base]);
    await git(['-C', base, 'remote', 'add', 'origin', 'https://github.com/runeditrun/base.git']);
    await git(['-C', base, 'fetch', '--quiet', '--depth=1', 'origin', BASE]);
    await git(['-C', base, 'checkout', '--quiet', '--detach', 'FETCH_HEAD']);
  }
  base = resolve(base);
  assert.equal(await git(['-C', base, 'rev-parse', 'HEAD']), BASE, 'Conformance must use the selected immutable Base source');
  const { checkAgentDoor } = await import(pathToFileURL(join(base, 'cli/agent-door.mjs')));
  // PENDING-CT-2026-10-28.agent-clause: the built-in BASE-AGENT-010 remains
  // asserted against CONTRACT.md; ct's seed contract rewrite is not on main.
  // PENDING-BASE-2026-10-28.native-client-receipts: all four real client receipt
  // tools remain declared; Base still needs a native-credential journey hook.
  // PENDING-BASE-2026-10-28.reviewer-lifecycle: the generic reviewer initializer
  // requires a final native 303; Oncall's workspace-password login returns 200.
  // Its real distinct-person acceptance is asserted in oncall-agent-flow.mjs.
  // V2 closes native-target-audit, resource-error-code and replay admission;
  // oncall-agent-flow.mjs asserts these through production HTTP and native D1.
  // sponsorEscalation:false declares the two admin-only surfaces accurately;
  // the full native widening/narrowing journey and runtime guards stay intact.
  // No marker suppresses, replaces or turns a failed conformance point green.
  await checkAgentDoor(root);

} finally {
  if (temporary) await rm(temporary, { recursive: true, force: true });
}
