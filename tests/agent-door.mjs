// Use the installed CLI, including its production build, native bootstrap,
// signed Business binding and isolated provider-edge conformance runner.
import { checkAgentDoor } from '../node_modules/@runeditrun/rer/cli/agent-door.mjs';

// Published 0.2.89 exercises current native-grant read replay, reviewer sessions,
// receipt clients and every audit page. Native completed-schedule custody keeps
// the exact review/revision fence while Base alone returns its replay receipt.
// PENDING-BASE-2026-10-29.completed-native-replay:
// team-manager: BASE-AGENT-006.2.held.approved.team-manager,
// BASE-AGENT-007.5.receipt.team-manager, BASE-AGENT-013.4.held.team-manager.
// access-widen: BASE-AGENT-006.2.held.approved.access-widen.
// Base modules/agent-door/pipeline.ts:111 reclassifies completed native effects
// before receipt replay. 0.2.90 writer gr-base-door-v3-merge-5 (replay-4).
// erased-target: BASE-AGENT-006.2.held.approved.erase,
// BASE-AGENT-007.5.receipt.erase, BASE-AGENT-013.4.held.erase.
// Base modules/agent-door/pipeline.ts:78 resolves a deleted target before replay.
// gr-base-door-v3-merge-5 explicitly retains this deferred A1 limitation; neither
// its replay-4 nor erasurefence-1 claims to repair the deleted-target retry.
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
