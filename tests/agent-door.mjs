// Use the installed CLI, including its production build, native bootstrap,
// signed Business binding and isolated provider-edge conformance runner.
import { checkAgentDoor } from '../node_modules/@runeditrun/rer/cli/agent-door.mjs';

// Published 0.2.88 exercises native receipt clients, the native HTTP 200 reviewer
// lifecycle and every audit page. Their assertions remain part of this run.
// PENDING-BASE-2026-10-29.held-schedule-replay: a completed reviewed schedule
// update advances its native revision. The replay pipeline reclassifies before
// returning its receipt (Base modules/agent-door/pipeline.ts:111; the missing
// replay-admission contract is named in modules/agent-door/ADOPTING.md:1032).
// The native exact-review/revision fence still refuses it. Keep that fence and the
// held retry assertions until the replay/classification contract is reconciled.
// All conformance points are real assertions; pending notes skip nothing.
const report = line => {
  // Keep the complete assertion count even when the parent command bounds logs.
  if (line.startsWith('Agent door conformance:')) process.stderr.write(line + '\n');
  else console.log(line);
};
try { await checkAgentDoor(process.cwd(), { report }); }
catch (error) {
  if (error.code !== 'agent_door_failed') throw error;
  console.error(error.message);
  process.exitCode = error.exitCode ?? 1;
}
