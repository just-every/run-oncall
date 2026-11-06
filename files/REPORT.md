# sd-oncall-c-f206 result

Product: just-every/run-oncall, branch cloud/sd-oncall-c-f206, head 3df91c93581e6ce92acc300d652d5792a7ecdf47. The branch was pushed successfully on the first guard attempt. No PR was created; this repository starts Verify on a branch push.

BASE-AGENT-012 remains MISSING → MISSING. Counts remain 17 DONE, 50 PARTIAL and 34 MISSING, with all 101 Status rows retained. Every one of the parent's 268 table lines remains represented. No acceptance sentence or unrelated clause changed.

The selected acceptance-3 observation is complete: a name-only oncall.services.update succeeds under autonomous and held policies. Reusing the original key and projected ETag with only a different valid name returns isError and idempotency_conflict in both error metadata and text, without private structured content. Exact original arguments with a new JSON-RPC id return the stored result and original review identity.

The first write changes only the authorized service name, advances the workspace once and records one native service audit attributed to the real agent and sponsoring member. Conflict and retry preserve native records, revisions, incident timelines, state-changing audit, the original call and outcome, approvals, reviews and paging. The held write creates exactly one original open review. Required refusal and linked replay-attempt audits are retained separately. The outbound request ledger remains empty throughout this focused journey.

Production behavior already supported this flow: neither src/agent-door/service-tools.ts nor src/modules/agent-door/pipeline.ts required a change. The product commit adds the focused helper, invokes it in the existing agent journey, updates only the observed CONTRACT evidence and remaining-scope wording, and regenerates the source lock.

## Plan and coverage

The complete working plan is PLAN.md. Its six steps were completed: scope and existing proof mapping; focused public-door helper; effect and custody assertions; touched runtime and type checks; fresh-main reconciliation and guarded branch push; explicit report-only evidence return.

The plan row changed conceptually is replan-37's BASE-AGENT-012 acceptance-3 service-name conflict observation. Its selected observation is now proved; the clause remains MISSING. No lane plan, INBOX or STATE file was read or written in this cloud environment.

The maintained entry point is tests/oncall-agent-flow.mjs line 432, loaded by tests/runtime.mjs. The new helper is tests/oncall-agent-service-replay.mjs, changedServiceNameReplay:
- Lines 14–38 perform both company policies, read the real projected ETag, preserve every other service field, complete the allowed edit and check one workspace revision.
- Lines 39–50 check the native state-changing commit, agent, service and sponsor identities, plus the native service audit entry.
- Lines 51–69 retain original call, stored result and exact original review identity; the held write has one open review and no approval.
- Lines 70–83 send only a different valid name with the old ETag and key; check both conflict surfaces, private-result absence, unchanged durable effects and the attributed refusal.
- Lines 84–96 retry exact original arguments using a different JSON-RPC id; check stored-result and review equality, no further durable effect, linked replay audit and zero outbound requests.

The assertions exercise the successful effect and unsafe duplicate path through POST /mcp, with protected native HTTP and real D1 readback. Removing the conflict outcome fails the two error assertions; allowing an extra effect fails the full retained-effect snapshot; losing the stored result or review fails exact equality; creating a second review fails the custody snapshot. No existing assertion was removed, narrowed, skipped or moved behind a new condition. No separate test registration was added.

## Validation and provenance

- Touched runtime: cloud_run env ONCALL_RUNTIME_PART=machines timeout 1200 node tests/runtime.mjs — exit 0, 256.4 seconds. This includes the new helper and retained agent, authority, approval, replay and erasure journeys. The relevant source and test bytes were unchanged between this run and the committed candidate.
- Exact committed head: the file-based runner described in receipt.json creates agentRuntime, awaits changedServiceNameReplay and always closes it — exit 0, both policies. Full output is service-exact-head.log; the actual probe lines are PROBES.txt.
- Exact-head pnpm run typecheck — exit 0.
- pnpm exec rer check --profile first-party — exit 0 after the contract update.
- Contract generator write then check — exit 0. Generated views were restored whole from origin/main; neither ACCEPTANCE.md nor docs/CLAIMS.md was committed.
- Vendored source lock regeneration and check — exit 0 after the final rebase; installed-package source lock check — exit 0 on the committed head.
- Staged whitespace check — exit 0. Candidate identity and full-message inspection covered every commit reachable from HEAD but not origin/main, including side parents: one fleet-authored and fleet-committed candidate, no trailers.
- Fresh fetch and rebase onto origin/main left the base at 8e02f6674fad992d1a972cfd567a47144296e5a0. Remote readback confirms the exact pushed head and unchanged main.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check, restore main views exit=0; ledger=none exit=0.

Local development found two test-fixture assumptions before the final passing runs: sending an explicit empty optional dependency list changed record shape, so the fixture now preserves the original field's absence; an early digest conflict has no policy decision, so its distinct attributed refusal is checked through native audit instead. An eval-based isolated launch did not reach readiness and its owned processes were stopped; the ordinary file-based runner passed. These were not CI repair rounds. No production guard or existing assertion was weakened.

No UI or migration changed, so no browser screenshots or migration-ledger run were needed. No Base pin, workflow, provider configuration or paging authority changed.

## Honest remainder and riders

Acceptance 1's complete mutating-tool coverage and at least 24-hour retention remain omitted. Acceptance 2's other dropped-response cases, including services.update, remain omitted. Acceptance 3's other tools and argument combinations, acceptance 4's other optional and native diagnostics, and acceptance 5's foreign-person job-handle refusal and long-work status independent of the Tasks extension remain omitted. This run does not repeat or claim separately launched diagnostics or retention scopes.

OC-045, OC-046, OC-048 and OC-049 retain ct's agent and AI egress authority hold. Erasure and approval replay, SURFACE-004's ambiguous hold and Base seam, BASE-AGENT-006 and BASE-AGENT-008 holds, every existing queue entry and note, and every publication, predecessor and release gate remain unchanged. Model, investigation, ownership, remediation, recurrence and executor flows remain omitted. Paging stays OFF; provider authorization and A2P, production delivery, independent standby, native devices and real phones remain held. This proof grants no account, capability, outbound, activation, publication or release authority.

No DONE claim is made. DONE-RIDERS assessed proportionately:
1. Full clause UNMET: the omitted outcomes above prevent promotion; the selected service observation passes locally.
2. Selected observation PASS: real seeded service, supported write and refused conflict, exact retained effects.
3. Full-clause recorded proof remains UNMET: exact-SHA Verify stopped at the task-exempt generated-view check, before runtime shards. The selected helper passed locally on the exact head and is invoked unconditionally by existing runtime coverage; no DONE claim is made.
4. Selected proof PASS on the exact committed head; relevant bytes match the full touched-runtime run.
5. No inherited-duty or receiving-clause change.
6. Observed evidence and remaining Gap reconciled; generation passed before restoring main views as required.
7. PASS: acceptance text unchanged; all parent Status rows retained.
8. Selected authorized effect and unsafe replay path PASS; no authority was added or weakened.
9. PASS boundary: no provider, live paging, legal or real-device proof is claimed.
10. No new policy default or custody ruling was adopted.
11. PENDING independent fleet landing: exact main, complete full-history publication scan and main-only Run site remain fleet duties.

## CI and landing custody

Main 8e02f6674fad992d1a972cfd567a47144296e5a0 has successful Verify runs 42153902730 and 42151170333 and successful Run site 42153902508.

Predecessor f204 head 32c0f370f6ebc8cf2a4b55da03901933f300950a and f205 head 4f07968cdaa53d9cbf209f16d912a93342f0ae46 are not ancestors of this main. Their observed Verify runs 42166503634 and 42178613345 failed. Their failures were not diagnosed or repaired here, and their landing gates remain intact. No unlanded diagnostic fixture was imported.

Candidate Verify run 42194462386 completed with failure on the exact head, event push. Build job 127814231983 failed only at the generated contract-document check: "ACCEPTANCE.md: generated content differs; run contract-docs write." Aggregate job 127815095388 failed because BUILD was failure; runtime shards skipped. The same check reproduced exit 1 locally on the exact head after main views were restored. This is the task-authorized generated-view exception for READY; no green Verify or CI runtime pass is claimed. Both failed-job archives were read exactly once. There was one watcher, discovery and status polling were over 300 seconds apart, and the run used eight GitHub calls in total. No workflow was dispatched or rerun. Complete relevant error text and job receipts are in CI-RESULT.md, ci-jobs.json and receipt.json.

The cloud publication scan is NOT RUN under this task's branch-only protocol. The fleet must apply its complete publication scan, predecessor gates, exact-SHA Verify and Run site before landing. Evidence publication is report transport, not acceptance, landing, release or product READY.
