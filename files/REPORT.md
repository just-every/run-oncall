# Oncall reassignment audit continuation

Run Edit Run fleet · 19 November 2026

- Oncall repository `just-every/run-oncall`
- Product branch `cloud/sd-oncall-c-f308-pc1`
- Continuation commit c88515d973486ba9908d54d6574b3c00c0047e4a
- Candidate commit eee43b208c0b2e3a02c98d130c49ef39c67ff458
- Rechecked main commit 071c74a352196f6778eb3b2942c351b4cf1e0ace
- Main and the candidate each have 26 done, 41 partial and 34 missing clauses out of 101. BASE-AGENT-002 remains MISSING.
- Branch push starts Verify. The guarded lander owns publication scanning, generated view publication and main Run site.

## Plan and source

1. Start at the fleet-published continuation and reproduce the saved Verify results before changing source. Reinspect main, the f290 acknowledgment and the separately scoped f299 mitigation before integrating anything.
2. Keep the existing native audit change in `src/agent-door/coordination-tools.ts:146`. A successful non-null reassignment that advances the incident revision writes `command.reassign`. The MCP tool and event identity remain `oncall.incidents.update` and `incidents.update` respectively. Historical audit rows and the OC-053 REST override retain their original meaning.
3. Use the existing fixture for matching acknowledged incidents in one granted public service, under autonomous and held policies, through the actual signed-in Assignee picker and one MCP call per policy. Choose the same active responder with no optional reason. In the continuation commit, inspect the persisted incident, workspace control revision and every paging table after each door. Retest the existing replay, revision, link and machine REST flows.
4. Generate and check the contract views locally, restore both views from main, regenerate the pinned source lock, then check and rerun the touched production-Worker journeys. Inspect the saved incident twice per policy and door, once at each required width.
5. Push the product branch, determine exact-SHA Verify status, and publish this report and the actual receipts on the evidence branch. Leave acceptance and landing with the fleet.

## Prior Verify and predecessors

- Main Verify 44599061529 and Run site 44599061677 finished successfully on main's exact SHA. The candidate includes that main.
- The f290 branch advertises 6052b446cc8f6da18f0620fb4e2dabf6bed7cbf3. Main carries its acknowledgment implementation and proof in 5dba188 and the prior native acknowledgment audit change in c131d98.
- The f299 branch advertises 8470abfd4f365e0ad584dae3016758b2852d2a7f. It contains separately scoped mitigation code and browser proof. It was absent from rechecked main and remained in its own branch.
- Verify 44601711462, attempt 1, at the starting SHA had a stale generated view in contract-docs (135834829102), a cancelled changes shard (135836796984) and the aggregate verify failure (135846112556). The exact generated-docs command and the aggregate shell ran locally and exited 1 with the same freshness rejection. The exact changes shard completed locally with exit 0, including both of its lanes. The one allowed archive command per starting job returned the aggregate's failure step and empty failure output for the other two jobs. See the reproduction and baseline receipts.
- The branch retains the held scope for f184’s note review and retry, f281's declaration proof, f290's acknowledgment proof and the existing replay, revision and resource-link proof. The f299 mitigation branch and its separate landing scope are preserved.

## Scope and remaining contract work

| Acceptance | Candidate evidence or remaining work |
| --- | --- |
| 1 | Full Core job coverage and a real CLI rejection are held. |
| 2 | Complete fixture-to-output-schema coverage is held. |
| 3 | Complete annotation proof is held. |
| 4 | Stable-error parity across UI and tools is held. |
| 5 | This round exercises ordinary non-null reassignment. Other jobs and the held standard-note review and retry remainder remain in scope for later rounds. |
| 6 | Embedded-agent audit through the common registry is held. |

The plan row for BASE-AGENT-002 remains held after the named reassignment slice. OC-023 team privacy, BASE-AGENT-005, BASE-AGENT-006, BASE-AGENT-008, human follow-up acceptance, erasure and approval replay, SURFACE-004 and its Base seam, ownership under OC-037, OC-044 and OC-054, and outbound agent and AI work under OC-045, OC-046, OC-048 and OC-049 remain on their existing lanes. Paging stays OFF. Authorization and A2P, timers, delivery, standby, devices, real-phone testing and cutover are held. Role, grant, classifier, tool exposure and copied Base scope were preserved.

## Fixture expectations

`changedReassignmentReasonConflict` in `tests/oncall-agent-incident-replay.mjs:57` and `staleReassignmentNativeRevision` in `tests/oncall-agent-incident-revisions.mjs:75` intentionally expect `command.reassign` for a committed reassignment. Changed-reason refusal, exact replay, stale revision refusal, held review identity and no second durable effect remain asserted. The existing machine journey in `tests/runtime.mjs:1753` separately expects `automation.incidents` for the OC-053 REST reassignment and checks its retained attribution. The new storage checks extend `reassignParity` in `tests/oncall-agent-fixtures.mjs:766` without new test registrations.

## Observed reassignment result

The signed-in Assignee picker posted the expected command, revision and member without a reason. The matching MCP request ran once per policy and kept the tool's identity in its decision audit. Each door persisted the same assignee, kept the other response roles, appended the same timeline effect, advanced the incident and workspace revisions once and appended exactly one permanent `command.reassign` event. Stored paging rows and the paging response stayed unchanged. Immutable earlier audit rows were compared against the post-command rows. The browser action named the signed-in responder and the MCP action named the agent and its sponsor. The held MCP request opened one review and the other three requests opened none.

On the retained incidents, the desktop assertions and phone readback showed the same assignee, Lead, timeline effect and separate attribution. The eight captures cover both doors and company policies at both widths. The tested text was at least 13 px. Every capture fit its viewport and had zero serious or critical Axe findings and zero undersized controls. Picker close and incident actions showed their tooltips on keyboard focus in the existing journey. The Worker and signed-in browser attempted no outbound requests.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0

PROBE BASE-AGENT-002 5 reassignment: actual Assignee picker and one scoped MCP call per company policy, same active member and no reason -> matching stored assignee and timeline, one revision at each level and one permanent command.reassign per door; distinct attribution, held MCP only opens one review, unchanged paging and zero outbound requests.

CLAIM BASE-AGENT-002 PARTIAL points=none tests=tests/agent-door-browser.mjs#reassignmentBrowser; tests/oncall-agent-fixtures.mjs#reassignParity; tests/oncall-agent-incident-replay.mjs#changedReassignmentReasonConflict; tests/oncall-agent-incident-revisions.mjs#staleReassignmentNativeRevision

GAP BASE-AGENT-002: Full Core coverage and real CLI rejection, complete schema and annotation coverage, stable-error parity, the remaining point 5 jobs and held standard-note review and retry, and embedded-agent audit remain open.

## DONE riders

| Rider | Candidate result |
| --- | --- |
| 1 | Incomplete across the clause. The user-visible reassignment slice passed in `tests/agent-door-browser.mjs:1019` and `tests/oncall-agent-fixtures.mjs:766`. Remaining outcomes are listed above. |
| 2 | Pass for reassignment. The fixture uses populated incidents and independently expects the stored assignee, audit kind, attribution and revisions. `tests/oncall-agent-incident-revisions.mjs:75` and `tests/oncall-agent-incident-replay.mjs:57` retain refused requests with no additional native effect. |
| 3 | See the exact-SHA Verify section below. The agent runtime is registered in the agents shard. The browser journey is in the hosted shard. |
| 4 | Pass locally on the listed candidate. The build receipt checks the exact SHA, and the runtime and captured browser runs consumed that build. |
| 5 | Existing inheritance checked at `CONTRACT.md:1313`. SURFACE-001 cites BASE-AGENT-002 and retains its own registry and harness obligations. |
| 6 | The clause remains MISSING. Generation and freshness passed locally together. The candidate carries main's two views for lander regeneration and retains main's judgment cells and provenance. |
| 7 | Pass by inspection of the status and acceptance diffs. The continuation adds observations and durable assertions within existing registrations. |
| 8 | Pass for the selected service grant and refusal coverage. The reassignment requires the allowed active responder and the revision and replay cases still refuse changes without a second mutation. Wider authority and erasure are held. |
| 9 | The claims describe a local emitted Worker and Chromium only. Account, provider, live delivery and legal proof remain held. |
| 10 | Existing company policies and authorization apply. This round required no new default. |
| 11 | Pending guarded landing. Main differs from the candidate. The cloud runner has no full-history publication-scan receipt or candidate Run site result. |

The source lock is fresh, the candidate diff passed whitespace, email-shaped string and prose slash-token checks, and the eligible commit messages and both identities were checked with side parents. No existing assertion was dropped or narrowed. The new test follows the existing one-width assertion and two-width readback pattern for the picker. The release and predecessor checks remain part of landing.

## Exact-SHA Verify

Push Verify [44620652289](https://github.com/just-every/run-oncall/actions/runs/44620652289) completed with failure on eee43b208c0b2e3a02c98d130c49ef39c67ff458. The agents shard passed (135902823423), the hosted shard carrying the agent browser lane passed (135902823211), the build passed (135901265308), and the runtime, intake, product browser, triage and transfer shards passed.

The generated-view check failed as expected in contract-docs (135901265249). Separately, the changes shard (135902823253) was cancelled in “Run this shard” at 15 minutes 15 seconds from job start, consistent with its configured 15-minute limit. The aggregate verify job failed (135911632910), and full-push-proof was skipped (135911635443). The expected generated-view exception does not cover the independent changes shard cancellation. The starting Verify had the same combination. The initial local changes shard finished all tests without the CI cap, with about 15 minutes 19 seconds in its test processes.

The exact `node scripts/verify-oncall.mjs changes` command passed locally under Node 22.20.0 in 14 minutes 54 seconds on the candidate and 14 minutes 56 seconds on rechecked main. Both runs used the same local 15-minute command cap. This cap covered the command only. GitHub's 15-minute job cap also covers checkout, dependency installation and artifact restore. The single candidate failed-log archive request exited 0 with no output. Its cancelled step and elapsed time are recorded in the API receipt. The repeated required-job cancellation is the blocker for landing, and the CI timing issue goes to fv. The clause retains its MISSING judgment with the scoped reassignment evidence above.
