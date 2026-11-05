# sd-oncall-c-f201 report

Product repository: just-every/run-oncall
Product branch: cloud/sd-oncall-c-f201
Product head: fed8139a87d396eb5b3caaea677776d1b46ac5c5
Starting main: 1f0b7327773a3963f5fce611295ffc3a251af65a
PR: none; branch push starts Verify directly.
Status: BASE-AGENT-012 MISSING → MISSING. Counts remain 17 DONE, 50 PARTIAL, 34 MISSING; total 101. No acceptance text or status judgment changed.

The two selected acceptance-4 observations are closed locally. The existing implementation already meets the selected optional-revision behavior, so this candidate adds public-door proof and reconciles only the observed evidence and remaining Gap. The test registration count is unchanged: the existing runtime journey imports the extended agent flow. No assertion was removed, narrowed, skipped or moved behind a width or policy condition.

Changed product files:
- ./tests/oncall-agent-flow.mjs: staleCoordinationRevision, lines 239–362; invocation at line 433.
- ./CONTRACT.md: BASE-AGENT-012 Evidence and Gap only, line 1530.
- ./sources.lock.json: generated hashes for those two changed files.

The existing ./tests/agent-door-runtime.mjs agentEffectSnapshot at lines 13–25 is reused unchanged. Execution stays behind ./tests/runtime.mjs at line 2101 and the existing machines runtime selection. The native boundary in ./src/agent-door/coordination-tools.ts and the held Base pipeline are unchanged. Manifest, declarations, classifier behavior, capabilities, workflow definitions, Base and rer pins, homepage and UI are unchanged.

## Observed proof

On separate ordinary incidents with no protected evidence, the journey runs oncall.incidents.acknowledge and oncall.actions.create under autonomous and held policies. Each otherwise-valid call has its current required native revision and a stale optional expected_revision. Every response is isError revision_conflict with exactly the authorized parent incident current_revision in both error metadata and parsed text, with no structured private result.

Before and after refusal, the shared snapshot compares native records, application and incident revisions, timeline, state-changing permanent audit, original call and outcome custody, approvals, reviews and paging records. The paging API is also compared. The required refusal audit is appended exactly once and prior audit rows stay unchanged; rate bookkeeping and the documented attempt-audit machinery are the permitted exclusions.

A new key with the returned revision then succeeds exactly once. Acknowledgment retains the agent actor, names the real active responder in commander, assignee and lifecycle member, and is never presented as a human attestation. Action creation retains one owned, due-dated P1 human-review follow-up with no submission or acceptance and done=false. Each accepted call creates one native state-changing audit commit and has the autonomous outcome or one new open review under the held policy. Existing approvals and reviews remain intact.

An identical-argument retry under a new JSON-RPC id returns the stored D1 result and the original review reference. Every durable snapshot and the original outcome audit remain identical, with a separate linked replay-attempt audit and no additional effect or review.

A real local client scoped to agent-service first proves permitted access. Under both policies, otherwise-valid calls to a foreign incident and a missing incident return identical not_found metadata and text, disclose no current revision or structured result, and preserve all native custody. Every selected chain observes an empty outbound request ledger. No network or provider authority is added.

## Frozen rubric

- R1 MET locally: acknowledgment refusal, exact current revision, active responder and actual agent attribution, successful fresh-key effect and once-only retry under both policies. Lines 263–307 and 328–345.
- R2 MET locally: action creation follows the same diagnostic and retry chain, with exact owner, date, P1, human-review and still-open assertions. Lines 263–298 and 309–345.
- R3 MET locally: populated replay and review custody before refusal, native and paging comparison, one refusal audit, one accepted application commit and unchanged replay custody. Lines 269–285, 316–342 and the shared snapshot.
- R4 MET locally: missing and scoped-out targets both refuse without revision disclosure, durable changes or outbound attempts. Lines 347–358.
- R5 MET locally: scope and no assertion loss checked in the staged diff; generator write and check pass, generated views restored, source lock regenerated last and checked. All parent table rows retained; all 101 Status entries remain.

These rows score only the selected slice. They do not justify whole-clause DONE. No mutation execution is claimed; the assertions' sensitivity is directly inspectable in the changed journey.

## Verification and provenance

Main was rechecked before the candidate: exact-main Verify 42026429002 and 42021999943 succeeded, and Run site 42026429004 succeeded. A separate cancelled Verify 42033597585 is not counted. The predecessor lineage is retained in current main; no unavailable fleet scan or predecessor receipt is inferred.

The unchanged main machines runtime passed in 247.6 seconds. The extended emitted Worker agent flow passed after correcting two fixture assumptions before committing: the scoped client needed services:read for its allowed read, and review readback uses the existing reviews collection rather than an unsupported detail GET. These were test-fixture setup errors, not shipped product failures or CI repair rounds. Neither correction removed a behavior assertion.

The required CLI check initially stopped while probing pnpm because the temporary Chromium preload depended on a custom environment variable omitted from the probe's sanitized environment. The preload now resolves this checkout explicitly, outside the product tree. It selects /usr/bin/chromium with --no-sandbox and preserves the existing browser options and assertions.

Exact-head push Verify 42113983133 completed with failure. Build job 127548698445 failed only at node src/base/contract-docs.mjs check: Contract prose: 0 errors, 0 warnings; ACCEPTANCE.md generated content differs. The final verify guard job 127549791867 failed because the build failed; shards were skipped. Both failed-job archives were read once successfully with gh run view, without blob retries. This matches the explicit generated-view exception for cloud handoff. There was no dispatch, rerun or product repair. The six GitHub calls used one discovery and one status poll over five minutes for this candidate; the remaining reads established main gates and diagnosed the completed failure. Actual command, exit, file-hash and log-hash receipts are in checks.jsonl and ci-failure.json. Exact-head local CLI verification completed successfully: timeout 1200 env ONCALL_VERIFY_LANE=intake NODE_OPTIONS=--import=/tmp/f201-chromium.mjs npx -y @runeditrun/rer verify exited 0. It ran the emitted machines runtime (259.0 seconds), intake (55.5 seconds), routing (113.8 seconds) and import door (92.9 seconds), plus first-party checks, a fresh production build, typecheck, hosted assets, hydration of four pages with 23 loads, and the agent-door conformance check (7,761 of 7,761 points passed). This is the maintained selected application group, not a claimed full suite run. It supplies no new live-provider or whole-clause acceptance claim.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, generated files restored from origin/main; ledger=none exit=0 (no migration changed).

A check after restoring the generated views reports only ACCEPTANCE.md generated content differs. This is intentional under the cloud contract: no generated view is committed. The fleet lander regenerates those views from CONTRACT.md and reruns its required gates.

## DONE riders and pre-ready check

1. FAIL for whole-clause DONE: acceptance outcomes beyond these two diagnostics remain unproved. The selected public-door outcomes pass locally.
2. PASS for this slice: real seeded incidents exercise both refusals and successful writes, with native state readback and no-effect retry assertions.
3. NOT ESTABLISHED for whole-clause DONE: exact-head push Verify 42113983133 completed with failure only at generated ACCEPTANCE.md freshness; its downstream guard failed and shards skipped. This is the permitted cloud generated-view exception for candidate handoff. No actual green journey CI conclusion is claimed.
4. PASS locally: the required CLI verify exited 0 on the exact committed product head; receipts bind all changed file hashes and the final command output.
5. N/A: no receiving clause or inherited duty changed.
6. NOT A DONE CLAIM: Gap retains the complete unproved remainder. The generator writes and checks successfully; main's generated views and existing judged provenance are retained as instructed.
7. PASS: no acceptance point, ruling, ID map or obligation changed.
8. PASS for this slice: authorized writes work; scoped-out and missing native targets disclose no revision and change no native data.
9. PASS: no provider, legal, timing, scale, live-phone or external-account proof is claimed.
10. PASS: no new custody, authority, consent or egress policy is adopted.
11. PENDING fleet landing: exact-head publication scan, landing equality and candidate Run site are not established in this cloud task.

The pre-ready check is limited to applicable acceptance behavior: no existing assertion was removed or weakened; authority and replay are checked through real public doors; the existing erasure and approval replay journey remains intact and passes in the agent flow. No screen was changed. There are no email-shaped or provider-key-shaped strings in the added text. Source lock is fresh. Publication scanning and landing remain fleet gates, with no COMPLETE scan claim from this VM.

## Retained gaps and plan return

Acceptance 1 still lacks complete mutating-tool coverage and the at-least-24-hour retention proof. Acceptance 2's other dropped-response cases remain omitted. Acceptance 3's remaining tools and argument combinations remain omitted. Acceptance 4's other tools and native required-revision diagnostics remain omitted. Acceptance 5's foreign-person job-handle refusal and long-work status independent of the Tasks extension remain omitted. The separately launched required-note-revision, declaration and note retention, changed-argument acknowledgment and action-create, dropped-note-response, and dropped acknowledgment and action-create response scopes are not repeated.

Erasure and approval replay, SURFACE-004's ambiguous hold and Base seam, BASE-AGENT-006 and BASE-AGENT-008 holds, and all release and predecessor gates are retained. Model, investigation, ownership, remediation, recurrence and executor flows remain omitted. OC-045, OC-046, OC-048 and OC-049 retain their agent and AI egress authority hold. Paging stays OFF; provider authorization, A2P, production delivery, independent standby, native devices and real phones are not claimed.

Plan return: mark only the two selected optional expected_revision diagnostics for acknowledgment and action creation as observed. Keep BASE-AGENT-012 MISSING and all existing campaign holds. No full plan, queue, INBOX or STATE file was read or changed. No additional unblocked target touching these files is authorized by the selected POINTS.

Final mechanics on the exact committed head: generator write and check both exited 0, both generated views were restored from origin/main, lock regeneration and both the vendored and installed lock checks exited 0. The working tree and index are clean; the clone has full history. There are no selected-slice blockers. The product branch is published and verified remotely. Evidence publication is separate and does not represent acceptance or landing.
