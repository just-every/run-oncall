# Oncall P2 follow-up revision diagnostics

Run Edit Run fleet · 18 November 2026

The published product candidate is `cloud/sd-oncall-c-f273` at `b068148c87bcfdc84150ea3e73578a355176ebdc`. The published save is `9f27ae7f0b30440d3880f2ccafe46dfb6ad2511d`.

Build, typecheck, first-party check, the agent runtime and the agent browser passed on the candidate. The first quick probe using inline module mode stalled in Miniflare's D1 helper. The existing entry point ran with the repository's Node 22.20.0 pin. The pre-merge full runtime was stopped after main advanced with f270, and the exact-head run supersedes it.

Published main at candidate push was `c7c61ef6e03c39d5863a1d472a99eb2436bf73dd`, whose Verify and Run site completed successfully. [Main Verify 44246967278](https://github.com/just-every/run-oncall/actions/runs/44246967278) · [Main Run site 44246967365](https://github.com/just-every/run-oncall/actions/runs/44246967365)

Candidate push Verify 44249124430 completed with all eight shards, the build and the full push proof green. Its failure is confined to the expected generated ACCEPTANCE.md freshness check and the dependent aggregate job. The exact committed local check reproduced the stale ACCEPTANCE.md diagnostic. GitHub supplied the aggregate archive with CONTRACT_DOCS failure and BUILD, SHARDS and PUSH_PROOF success. The request for the contract-docs job archive returned `failed to get run log: zip: not a valid zip file`. The jobs API identifies its failed step as the generated views check. The documented generated-view rule applies to READY. [Candidate Verify](https://github.com/just-every/run-oncall/actions/runs/44249124430)

## Scope and plan

The plan extract places this round after the P2 immediate replay, retention and completed-response-loss work. The leased scope is the two acceptance 4 revision diagnostics for an owned, due-dated follow-up with priority P2 and the evidence completion policy. First extend the existing emitted MCP fixture and preserve the original immediate replay and changed-evidence conflict cases. Then exercise each held correction through its own signed-in sponsor approval and inspect the saved follow-up at 1440 and 390. Recheck the predecessor lineage, regenerate and check the contract views, restore the generated files from main, regenerate the pinned source lock, and run the existing verification entry points.

The agent sends four separate refused calls, one for each combination of autonomous or held policy and stale optional or stale required revision. Each call targets a fresh native incident with an open P2 follow-up and an untouched P3 companion. The same journey has existing call outcomes to preserve. The supplied stale revision comes from a prior native write, while the expected diagnostic comes from the authorized parent incident and differs from the workspace revision. Each response contains only the text diagnostic and metadata for `revision_conflict` with parent revision 3. The outer JSON-RPC request succeeds, the tool reports `isError`, and neither approval nor review opens. Full native and agent custody snapshots match before and after the refusal. The refusal appends one attributed agent audit with unchanged native audit revisions. See `tests/oncall-agent-action-evidence-replay.mjs`, function `actionEvidenceReplay` at lines 25–75 and 106–165, and `tests/agent-door-runtime.mjs`, function `agentEffectSnapshot` at lines 13–26.

Each correction uses the returned revision with a new idempotency key. Both revision fields are corrected in the optional case. The required-only case continues to omit the optional field. Each corrected call produces one native completion, one incident and workspace revision increment, one state-changing native audit row, and agent attribution for both submission and acceptance. The companion, owner, due date and escalation recipient are preserved. Each held approval posts the pending call's saved revision and summary SHA-256 once from the signed-in sponsor page. The retained approval, native timeline and stored outcome identify the agent and sponsor. Protected review material agrees with the stored MCP result. Runtime recorded zero outbound requests and Chromium recorded zero evidence-link requests.

`tests/agent-door-browser.mjs` lines 244–306 exercise the signed-in pages. At 1440 the browser asserts the saved row's owner, UTC due date, P2 priority, completion policy and retained evidence link. At 390 the same row and held approval were inspected in the captures. The pending approval, executed approval and saved follow-up all fit both widths. The measurements reported zero serious or critical axe findings and zero undersized controls for these screens. The existing f263 P2 replay and browser assertions still run on the original case. No registrations were added.

## Predecessors and scope boundaries

- f263's original branch head is `e70051e60c403f6bd99c992871751ee42d7963a0`. Main carries the reapplied P2 immediate replay and evidence-change conflict in `8215674a456bc19361dd21d224c6dd77e60f3262`. Both run before the new correction cases.
- f264's initial P2 retention save is `96f3bf2624da756947ec15fb1977024e0746bb51`. The complete shared-journey lineage head is `0f2dd0e8ba15aa28423a09282025134578694ea1`. The unlanded lineage overlaps the signed-in browser fixture and the source lock. The compatibility browser child exited 0 after reconciling the shared helper in scratch against the candidate build. The retained P2 result and exact approval pass at 24 hours and at 24 hours plus one second under both policies. The tested reconciliation combines the retained-mode browser helper with per-call approval paths and bodies. It keeps the f264 retention and f273 revision cases distinct. The lander regenerates the lock on integration.
- f270's original branch head is `7b506110e8e8f38a8a87c6e0ba01f8da93f2cb83`. Its landed successor is `c7c61ef6e03c39d5863a1d472a99eb2436bf73dd`. It was merged after the save, with its P1 and P2 completed-response-loss cases retained. The source lock was regenerated to resolve the only merge conflict.
- f260's native revision proof, f261's P1 retention proof and f262's P1 completed-response-loss proof are present on main at `4988fbbe5e310410f02d3cfbd4ffc323bc967a6f`, `ecdacdd840fcc4f87f8147c8df1175d6f2d6fb85` and `572e4f17babb9fbc53600fe2e42da7e4df5604d3`. The shared-browser f269 reassignment branch at `1537ad2` merges its browser edit with this round. Its public readback passed in the compatibility browser. Its source lock must be regenerated on integration.
- The existing boundaries are `src/agent-door/coordination-tools.ts` for the scoped native target and its required revision, `src/modules/agent-door/pipeline.ts` for the optional revision and decision custody, and `src/reviews/review-controls.ts` for native completion and attribution. This round changes only test and contract observation code plus the source lock.

## Contract and riders

BASE-AGENT-012 stays MISSING. Counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING across 101 clauses. The observation is in the BASE-AGENT-012 clause text. The Status, Gap and Evidence cells and all acceptance sentences match main. No plan rows were edited. The lane should record the acceptance 4 P2 result against the existing f273 row.

| Rider | Result |
| --- | --- |
| 1 | The selected P2 acceptance 4 paths pass through emitted MCP and signed-in browser doors. Full acceptance and clause coverage remain open. |
| 2 | Pass for the selected proof. A populated follow-up is refused with custody unchanged, then a corrected call completes exactly once. |
| 3 | Push Verify 44249124430 ran the exact head. The agents shard and hosted shard passed. The generated views gate and its aggregate job are the recorded exception. |
| 4 | Exact-head local build, agent runtime and browser receipts are the candidate evidence. The scratch run is predecessor compatibility evidence. |
| 5 | Existing Base inheritance and SURFACE-001 reference apply. The round creates no new receiving duty. |
| 6 | The local generated views check passes after regeneration. The Status row remains main's judgment, and the checked-in derived views are regenerated by the lander. |
| 7 | The acceptance sentences match main. The added observation describes existing behavior. |
| 8 | Pass within this slice. Each stale call preserves authority and discloses only the authorized parent revision. The retained P1 scope cases still exercise missing and foreign incidents. |
| 9 | Paging remains OFF. This is emitted local Worker and browser proof. |
| 10 | Existing autonomous and held policies govern the tests. The round adopts no new policy default. |
| 11 | Guarded landing, publication scan and Run site on the landed SHA are pending. |

Remaining BASE-AGENT-012 gaps are the rest of acceptance 1's tool, variant and retention coverage, acceptance 2's other lost streams including initial input-required and approval streams, acceptance 3's other argument combinations, acceptance 4's other diagnostics, and acceptance 5's foreign-person job handles and status independent of Tasks. Human follow-up acceptance, broader attribution and erasure and approval replay remain held, including BASE-AGENT-006 and BASE-AGENT-008 and SURFACE-004's Base seam. OC-023 team privacy and OC-037, OC-044 and OC-054 ownership boundaries remain held. OC-045, OC-046, OC-048 and OC-049 still need the agent and AI egress ruling. Model, investigation, ownership, remediation, recurrence and executor work remains outside the lease. Provider authorization and A2P, timers, delivery, standby, devices and real-phone cutover remain held.

The new assertions preserve earlier declaration, note, acknowledgment, action, service, role and assignee coverage. The exact-head run also exercises the existing revoked-credential, erased-subject and replay refusals. The product diff passes whitespace, changed-text slash-token and added email-shaped text checks. The owned approval and review pages were inspected in the existing UI. The complete full-history scan, main equality and exact landed Run site are fleet gates.

CLAIM BASE-AGENT-012 PARTIAL points=4 tests=tests/oncall-agent-action-evidence-replay.mjs#actionEvidenceReplay; tests/agent-door-browser.mjs#held P2 revision corrections

GAP BASE-AGENT-012: The P2 optional and required stale revision paths are proven. Other acceptance 4 diagnostics and the remaining coverage in acceptances 1, 2, 3 and 5 stay open.
