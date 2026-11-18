# Check receipts

Run Edit Run fleet, 18 November 2026.

- Product branch `cloud/sd-oncall-c-f286`. Remote advertised head `26832cb3a081161a5bce8549795aae5f729670fe`.
- Main parent `518317b385c4535599bfc670dd676da46069b451`. Its Verify [run 44322242486](https://github.com/just-every/run-oncall/actions/runs/44322242486) and Run site [run 44322242470](https://github.com/just-every/run-oncall/actions/runs/44322242470) completed successfully.
- Candidate tree `dbe1f928b02dadf93a2f581b9f088959856371f6`. Candidate Verify push [run 44324141568](https://github.com/just-every/run-oncall/actions/runs/44324141568) reported `completed` with conclusion `success` for `26832cb3a081161a5bce8549795aae5f729670fe`.
- The guarded lander owns the full-history publication scan, main update and candidate Run site. The receipt above records the candidate's branch Verify and the parent’s main workflows independently.
- Fleet author, committer and trailer inspection passed for every candidate commit, including all parents in the revision range. No co-author trailers were present.

## Local execution

- Build via `npx -y @runeditrun/rer build` on the candidate checkout. Exit 0.
- Typecheck via `pnpm typecheck`. Exit 0.
- `pnpm exec rer check --profile first-party`. Exit 0.
- Exact candidate agents shard via `node scripts/verify-oncall-build.mjs` and `node scripts/verify-oncall.mjs agents` on Node 22.20.0. Both exited 0. Runtime agents completed (504.4s). The shard invokes the emitted Worker with `ONCALL_RUNTIME_PART=agents`.
- Agent browser via `node tests/agent-door-browser.mjs` against the candidate build with Chromium 154.0.8037.57. Exit 0. Desktop assertions at 1440 with proof captures at 1440 and 390.
- Test registration is the existing emitted journey. The regression extends native preparation with a signed-in note, zero-effect refusals, a corrected write and a retained outcome. The post-preparation case also checks that an identical retry links to the original terminal refusal.
- Generated contract documents wrote zero changes and checked current. Source-lock generation and freshness both passed. The candidate product diff contains only the resolution code, the existing runtime journey and the generated source lock.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

## Emitted MCP proof

PROBE BASE-AGENT-012 4: MCP oncall.incidents.resolve with native revision 3 and expected_revision omitted under autonomous and held policies -> revision_conflict with authorized current_revision 4 in metadata and text. Scoped foreign and missing incidents returned identical not_found. Fresh-key correction committed one resolution and audit in each policy, with one separate exact signed-in approval when held.

PROBE BASE-AGENT-012 acceptance 4 autonomous oncall.incidents.resolve: first call with native revision 3 and no expected_revision returned revision_conflict with current_revision 4 in metadata and text; scoped-out and missing incidents returned identical not_found; corrected key recorded one resolution and audit, 0 approvals, effect-free replay, unchanged paging, zero outbound requests

PROBE BASE-AGENT-012 acceptance 4 held oncall.incidents.resolve: first call with native revision 3 and no expected_revision returned revision_conflict with current_revision 4 in metadata and text; scoped-out and missing incidents returned identical not_found; corrected key recorded one resolution and audit, 1 approvals, effect-free replay, unchanged paging, zero outbound requests

The fresh-preparation assertion is in `tests/oncall-agent-flow.mjs` at line 491. The native execution and durable audit checks start at line 530. Completed-result retrieval is checked at line 555. Approval-time drift and replay are checked at lines 986–998. The maintained agents shard invokes the same file from `tests/runtime.mjs` line 142.

## Browser proof

- Browser proof resolution-pending 1440: fits=true serious/critical=0 undersized-controls=0
- Browser proof resolution-pending 390: fits=true serious/critical=0 undersized-controls=0
- Browser proof resolution-executed 1440: fits=true serious/critical=0 undersized-controls=0
- Browser proof resolution-executed 390: fits=true serious/critical=0 undersized-controls=0
- Browser proof resolution-timeline 1440: fits=true serious/critical=0 undersized-controls=0
- Browser proof resolution-timeline 390: fits=true serious/critical=0 undersized-controls=0

PASS incident resolution browser: commitment-only approval, exact saved revision, native human approver and agent preparer, one attributed resolution and effect-free retry
