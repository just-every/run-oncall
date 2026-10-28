// Use the installed CLI, including its production build, native bootstrap,
// signed Business binding and isolated provider-edge conformance runner.
import { checkAgentDoor } from '../node_modules/@runeditrun/rer/cli/agent-door.mjs';

// PENDING-BASE-2026-10-28.native-client-receipts: the four native credential
// receipt tools remain declared and exercised. The generic journey accepts only
// Business credentials (Base modules/agent-door/conformance/protocol.mjs:86);
// tests/oncall-agent-native.mjs separately asserts real scoped client authority.
// PENDING-BASE-2026-10-28.reviewer-lifecycle: the generic reviewer requires a
// native 303 (Base cli/agent-reviewers.mjs:98); Oncall's workspace-password
// lifecycle returns 200. tests/oncall-agent-flow.mjs asserts independent native
// human acceptance without fabricating a redirect or session.
// PENDING-BASE-2026-10-28.target-audit-pagination: the target checker reads only
// the first audit page (Base modules/agent-door/conformance/target.mjs:9), while
// the native audit door is paginated. Native target attribution stays asserted.
// PENDING-BASE-2026-10-28.held-schedule-replay: a completed reviewed schedule
// update advances its native revision. The replay pipeline reclassifies before
// returning its receipt (Base modules/agent-door/pipeline.ts:101), so the native
// exact-review/revision fence still refuses it. Keep that safety fence and the
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
