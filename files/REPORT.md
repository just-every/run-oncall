# sd-oncall-c-f232 report

Repository: https://github.com/just-every/run-oncall
Branch: `cloud/sd-oncall-c-f232`
Baseline: `25b173adff3e5a2e7bedd97e02428eebee9418f4`
Candidate: `25c0fe55b1f2928c526119d79d3629dfb8be7931`. Current main `90f391b56d492b998e0e55509e076eaf588cbea4` was merged without rewriting published history.

BASE-AGENT-012 remains MISSING in the contract; this round claims PARTIAL progress on the selected portions of acceptances 2, 3 and 4. Counts remain 24 DONE, 43 PARTIAL, 34 MISSING, 101 total before and after. In the selected stale-diagnostic matrix, 7 of 18 cells were present on main and all 18 are now observed under both policies; service dropped-response and Commander changed-reason observations move from absent to present. These are bounded proof observations, not additional registered journeys or whole-clause promotion. No contract Status, Evidence or Gap cell was edited. No generated view, workflow, classifier, declaration, capability, held replay seam, migration, homepage or screen was changed.

## Plan and implementation

The complete plan is in PLAN.md. All selected observations are implemented: port the stranded note native, acknowledgment native, follow-up native, declaration optional and native, service optional and native, dropped service response and Scribe native proofs; add optional reassignment, Commander optional and native revisions and changed-reason conflict. Preserve every existing observation under autonomous and held policies. Use main's native guard rather than replaying superseded coordination edits.

The only product behavior change is in `src/agent-door/service-tools.ts`: a stale required ETag returns `revision_conflict` with the exact current authorized projected ETag in metadata and text. Authorization runs first and scoped projections exclude private dependencies. No new data or authority is exposed.

The role native helper is the shipped Communications body with a role and label parameter; every original Communications assertion is retained exactly. Scribe and Commander invoke that common helper. Changed Scribe reason retains its original wrapper and all assertions, and Commander invokes the same complete journey. Reassignment runs both native and optional guards through its existing full assertion set. Existing optional note and coordination journeys stay in place.

Port provenance: `fd731a5` note native; `4fd06a8` acknowledgment and follow-up native, including its prior helper; `6e382fa` optional declaration; `32c0f37` declaration and service native; `4f07968` service optional; `a41c45d` service dropped response; `627dffb` Scribe native scope, supplied by the stronger current Communications helper. No historical branch was merged or cherry-picked. Historical contract judgments and locks were not copied.

The first local machine run reached the new service optional-ETag recovery and failed because the old expected response omitted the current projection's explicit empty dependencies array. The expected projection now includes `dependencies: saved.dependencies ?? []` while exact native-record equality and the name-only effect checks remain. A second local run exposed an ordering assumption after replacing the old declaration snapshot with the common helper: common snapshots sort audit rows by serialized contents rather than ordinal. The proof now compares every prior audit row by immutable id and still requires exactly one new state-changing row. These were local proof-port compatibility fixes, not Verify repairs or product behavior relaxations. Both initial failure logs are retained.

## Acceptance coverage

| Acceptance sentence | Current proof and scope | Result |
| --- | --- | --- |
| 1. Two calls with one key give one effect and equal results. | Existing agedReplayRetention for declaration and note, plus supported recovery and identical replay in every selected helper. Every shipped mutating tool and broad retention remain unproved. | PARTIAL |
| 2. New JSON-RPC id after dropped stream returns recorded outcome. | `tests/oncall-agent-service-replay.mjs` droppedServiceReplay destroys the real response socket at headers with no body read; native D1 confirms the saved outcome before retry; one workspace revision, native agent audit and original held review remain. Existing declaration, note, acknowledgment, follow-up and three role replay proofs remain. | PASS on exact candidate in selected rer verify lane |
| 3. Different arguments with same key conflict without effect. | `tests/oncall-agent-role-replay.mjs` changedRoleReasonConflict for Commander; Scribe and Communications and reassignment remain; metadata and text conflict, no private result, unchanged native and replay custody, exact original retry returns original result and review. Other tools and combinations remain omitted. | PASS on exact candidate in selected rer verify lane |
| 4. Stale revision conflict names current revision. | Matrix below; exact authorized parent incident revision, workspace revision for declaration and projected service ETag in metadata and text; no private structured result. Refusal leaves native records, revisions, timelines, state-changing permanent audit, call outcomes, approvals, reviews and paging unchanged except documented refusal audit and capacity accounting. Fresh key with returned revision makes one attributed effect; identical retry with new RPC id adds no effect or review. Missing and scoped-out targets return not_found without a revision. | PASS on exact candidate in selected rer verify lane |
| 5. Another person's token reads job handle as not found. | Not added by this round. Foreign-person long-work isolation and Tasks-independent status remain omitted. | UNPROVED |

| Selected stale write | Optional guard | Required native guard | Helper |
| --- | --- | --- | --- |
| declaration | New | New | staleDeclarationExpectedRevision; nativeRevisions |
| note | Existing | New | staleNoteRevision; staleNoteNativeRevision |
| acknowledgment | Existing | New | staleCoordinationRevision; staleCoordinationNativeRevision |
| follow-up | Existing | New | staleCoordinationRevision; staleCoordinationNativeRevision |
| reassignment | New | Existing | staleReassignmentNativeRevision with optional true and false |
| Scribe assignment | Existing | New | staleRoleExpectedRevision; staleRoleNativeRevision |
| Communications assignment | Existing | Existing, preserved exactly | staleCommunicationsExpectedRevision; staleCommunicationsNativeRevision |
| Commander assignment | New | New | staleRoleExpectedRevision; staleRoleNativeRevision |
| service update | New | New, including hidden dependency projection | staleServiceRevision; nativeRevisions |

Every row runs through emitted Worker MCP and real D1 in `tests/oncall-agent-flow.mjs`, invoked by automationJourney in the machine part of `tests/runtime.mjs`. The selected observations assert zero outbound requests under both policies. Helpers add no separate journey registration; no test cap increase, test deletion or duplicate old journey was introduced. New declaration and native-note helpers omit copied unreachable optional branches and retain their supported and refused paths.

## DONE riders and pre-ready check

| Rider | Result for this PARTIAL claim | Evidence or retained gap |
| --- | --- | --- |
| 1 | PARTIAL | Selected outcomes are reached; full mutating-tool, retention and long-work scope remains unproved. |
| 2 | PASS for selected scope | Seeded real D1; supported recovery and forbidden stale, missing and foreign-target paths; complete custody equality. |
| 3 | Exact-head Verify queued | Machine part of tests/runtime.mjs invokes the full agent journey in push Verify. |
| 4 | PASS | Exact candidate preparation and required rer verify passed after the last edit and lock; relevant source hashes and actual logs are retained. |
| 5 | INSPECTED | No receiving clause or inherited duty was rewritten; BASE-AGENT-012 and every existing hold remain. |
| 6 | MECHANICAL PASS; judgment reconciliation deferred | Contract generator write and check pass; generated views restored from main. Status, Evidence, Gap and judged-from provenance remain lander-owned and unchanged, as required by the brief. |
| 7 | PASS | No acceptance text, coverage map, ruling or clause id changed. |
| 8 | PASS for selected scope | Authorized projected revisions only; foreign and missing targets indistinguishable; existing revocation and erasure cases remain in the journey. |
| 9 | PASS | No provider, retention, delivery, native-device, live account or release qualification claimed. |
| 10 | PASS | No policy default or authority choice was added. |
| 11 | LANDER PENDING | Main equality, complete full-history publication scan and candidate Run site are independent fleet gates; no cloud landing attempted. |

Pre-ready: new assertions directly compare required errors, exact authorized revisions, output shapes, attributed committed state, review counts and complete retained custody, so removing the behavior fails the journey. Original main assertions are preserved; the only body move is the exact Communications helper parameterization. No UI was touched. Existing revoked credential, erased subject and approval replay assertions stay active. No new email-shaped fixture or provider-shaped credential was introduced. All new credential fixtures use synthetic-oncall names. Source lock and generated-view write and check both passed before the candidate commit; generated files match merged main exactly. The cloud route defers publication scanning and main Run site to the guarded lander and makes no COMPLETE or landing claim.

## Retained scope

GAP BASE-AGENT-012: Complete mutating-tool coverage and at least 24-hour retention beyond declaration and note; remaining dropped-response tools and changed-argument combinations; stale diagnostics for schedule, team, access, client, endpoint, action-submit, automation, resolve and erasure, and incidents.update recovery, manual-page and deadline changes; foreign-person job-handle refusal and long-work status without Tasks remain omitted. Erasure and approval replay, SURFACE-004's ambiguous hold and Base seam, BASE-AGENT-006 and BASE-AGENT-008 holds remain unchanged. OC-045, OC-046, OC-048 and OC-049 retain ct's agent and AI egress authority hold. Model, investigation, ownership, remediation, recurrence and executor flows remain omitted. Paging stays OFF; provider authorization and A2P, production delivery, independent standby, native-device and real-phone duties remain held. This slice grants no account, capability, outbound, activation, publication or release authority.

Plan row change for the fleet: BASE-AGENT-012 selected revision, Commander reason and service dropped-response observations completed; retain MISSING without whole-clause promotion and retain every queue entry, predecessor, note and release hold. No Mac plan file was edited.

## Checks and custody

See RECEIPT.json and the explicitly selected actual command logs for final commands, exit statuses, full product SHA, pushed custody and exact-SHA workflow discovery. Baseline Verify 43131004505 and Run site 43131004503 are success at the baseline only; neither is candidate proof. No PR is required: Verify triggers on all pushed branches.

## Exact candidate proof locations

- Service diagnostic product change: `src/agent-door/service-tools.ts:25`.
- Declaration optional: `tests/oncall-agent-declaration-revisions.mjs:6`, staleDeclarationExpectedRevision.
- Declaration and service native, including private dependency projection: `tests/oncall-agent-native-revisions.mjs:7`, nativeRevisions.
- Native note: `tests/oncall-agent-native-revisions.mjs:146`, staleNoteNativeRevision.
- Native acknowledgment and follow-up: `tests/oncall-agent-native-revisions.mjs:260`, staleCoordinationNativeRevision.
- Optional service ETag: `tests/oncall-agent-service-revisions.mjs:7`, staleServiceRevision.
- Dropped service response: `tests/oncall-agent-service-replay.mjs:102`, droppedServiceReplay.
- Role optional: `tests/oncall-agent-role-revisions.mjs:7`, staleRoleExpectedRevision.
- Role native: `tests/oncall-agent-role-revisions.mjs:162`, staleRoleNativeRevision.
- Commander changed reason: `tests/oncall-agent-role-replay.mjs:131`, changedRoleReasonConflict.
- Reassignment optional and native: `tests/oncall-agent-incident-revisions.mjs:7`, staleReassignmentNativeRevision.
- Maintained invocations: `tests/oncall-agent-flow.mjs:750`, `tests/oncall-agent-flow.mjs:753`, `tests/oncall-agent-flow.mjs:758`, `tests/oncall-agent-flow.mjs:1133`.
- Runtime entry: `tests/runtime.mjs:2101`, imported by automationJourney in the selected machine part; `scripts/verify-shards.json` puts that part in push Verify's intake shard.

## Local final results and pushed custody

All local commands completed successfully on candidate `25c0fe55b1f2928c526119d79d3629dfb8be7931`. `node scripts/verify-oncall-build.mjs` passed the first-party check, production build and typecheck. `ONCALL_VERIFY_LANE=intake ONCALL_VERIFY_PREBUILT=true pnpm exec rer verify --non-interactive` exited 0: machine runtime 520.0 seconds, intake 60.4 seconds, routing 121.7 seconds, production hydration (4 pages, 23 loads) and Base agent conformance 8,230 of 8,230 points passed. The tool selected the pinned Node 22.20.0 runtime. This Base result does not complete the seed's omitted acceptance scope.

The explicit matrix contains all 20 selected logical observations under both policies (40 observed policy cases). Every prior Scribe, Communications and reassignment observation remains active. Both product pushes succeeded on their first attempt. The save was `9162c0942ae7994f1d51f4258f9838675ca502b8`; the terminal product candidate is `25c0fe55b1f2928c526119d79d3629dfb8be7931`. Every candidate author and committer and all messages, including side parents, were inspected before each push; no Co-authored-by trailer remains. Current main was fetched and merged again immediately before the candidate push and was already included.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, restored from origin main; ledger=none exit=0, no migrations changed.

Candidate push Verify: run 43135768629, event push, exact full head above. Status at discovery: queued. No PR was created because this repository has a branch push entry point. The independent guarded lander owns the full-history publication scan, main equality and main Run site.
