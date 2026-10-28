import { checkAgentDoor } from '@runeditrun/rer/internal/cli/agent-door.mjs';

// The installed CLI owns conformance; no separate Base checkout or execution pin.
// PENDING-BASE-2026-10-29.native-client-receipts: conformance/journey.mjs:39-55
// always invokes declared steps with Business credentials. The four retained
// *-receipt steps need real local client credentials and operation keys.
// PENDING-BASE-2026-10-29.native-reviewer-lifecycle: cli/agent-reviewers.mjs:98
// requires a final native 303; Oncall's real password login returns HTTP 200.
// Keep these gaps visible: this call preserves every failing Base assertion.
await checkAgentDoor(process.cwd());
