import { checkAgentDoor } from '@runeditrun/rer/internal/cli/agent-door.mjs';

// The installed CLI owns conformance; no separate Base checkout or execution pin.
// PENDING-BASE-2026-10-29.native-client-receipts: conformance/journey.mjs:39-55
// always invokes declared steps with Business credentials. The four retained
// *-receipt steps need real local client credentials and operation keys.
// PENDING-BASE-2026-10-29.native-reviewer-lifecycle: cli/agent-reviewers.mjs:98
// requires a final native 303; Oncall's real password login returns HTTP 200.
// PENDING-BASE-2026-10-29.target-pagination: conformance/target.mjs:10-11
// searches only the oldest audit page, so held-phase targets after row 200 fail.
// PENDING-BASE-2026-10-29.completed-native-replay: modules/agent-door/pipeline.ts:71,101
// reruns target/classify before the completed result. Schedule creation's real
// unused-ID fence consequently refuses a retry after its approved execution.
// Keep these gaps visible: this call preserves every failing Base assertion.
await checkAgentDoor(process.cwd());
