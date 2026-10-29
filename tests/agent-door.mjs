// Use the installed CLI, including its production build, native bootstrap,
// signed Business binding and isolated provider-edge conformance runner.
import { checkAgentDoor } from '../node_modules/@runeditrun/rer/cli/agent-door.mjs';

// Published 0.2.90 keeps Base's replay admission and original approval outcome.
// Native erasure receipt custody admits an exact completed replay without
// reading a deleted target; current native authority is still checked.
// PENDING-SEED-2026-10-30.completed-team-replay (outside erase-only brief):
// BASE-AGENT-006.2.held.approved.team-manager,
// BASE-AGENT-007.5.receipt.team-manager, BASE-AGENT-013.4.held.team-manager.
// Base pipeline.ts:121 still calls the classifier on completed replay. The
// seed management-tools.ts:90-91 calls current(); its editTeam call at :78
// reaches teams/model.ts:50 with the consumed native revision. This is
// core-by-us and needs scope beyond the erase-only brief; replay-4 is shipped.
// All conformance points remain real assertions; pending notes skip nothing.
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
