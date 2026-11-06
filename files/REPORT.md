# sd-oncall-c-f207

Scope: acceptance 2 of BASE-AGENT-012, only the dropped-response replay of shipped oncall.services.update under autonomous and held company policies. Retain MISSING and all other gaps. No UI, provider, activation, outbound or release work.

Plan:
1. Read the current clause, test wiring, native service adapter and shared replay pipeline. Check current main and predecessor ancestry without reusing unfinished predecessor implementations.
2. Extend the existing runtime sanity journey with a focused service helper. Read an authorized service through MCP, preserve every non-name service field, and destroy the real update response at headers without reading its body.
3. Establish the service, original call and saved outcome directly from D1. Prove one workspace revision, one agent-attributed native audit commit, no approval and exactly one original open review under held policy.
4. Replay identical arguments, the original ETag and idempotency key with a new RPC id. Compare the exact structured result and resulting ETag. Compare all retained native effects, calls, outcome custody, reviews, approvals, paging and incident timelines; allow only the linked attempt audit and documented scratch and capacity bookkeeping. Require zero outbound requests.
5. Run the focused emitted Worker helper, existing agent flow, touched runtime coverage and typecheck. Do not add a test registration or repeat predecessor revision and changed-name diagnostics.
6. Reconcile only observed Evidence and Gap text in CONTRACT.md. Generate and check the views, restore main's generated files, and regenerate and check the source lock last. Check all parent Status rows and commit identities.
7. Push the named product branch through the fleet guard. Inspect exact-head Verify using the limited REST budget. Keep the full report and actual receipts in this packet and publish only to the separate evidence ref. Leave publication scan and landing to the fleet.

Frozen selected-point rubric:
R1. Both policies perform an authorized standard-only service name update, preserving environment, owner, runbook, pager and dependencies.
R2. The first real HTTP response is destroyed at headers and its body is unread; native D1 independently establishes the committed service and saved outcome.
R3. The native effect increments the workspace once and has one agent-attributed service audit commit. Held mode has one original open review; autonomous mode has none.
R4. An identical retry using the original projected ETag and key and a new RPC id returns the exact stored result and resulting ETag.
R5. The retry changes no retained native record, revision, timeline, state-changing audit, original call or outcome, approval, review or paging state. The only new agent audit row is a linked replay attempt; outbound ledger remains empty.

Initial observation:
Main 8e02f6674fad992d1a972cfd567a47144296e5a0 has 101 Status rows: 17 DONE, 50 PARTIAL, 34 MISSING. BASE-AGENT-012 is MISSING. Main exact-head Verify 42153902730 and 42151170333 and Run site 42153902508 are completed success. The service replay helper is absent on this main. f204 head 32c0f370f6ebc8cf2a4b55da03901933f300950a, f205 head 4f07968cdaa53d9cbf209f16d912a93342f0ae46 and f206 head 3df91c93581e6ce92acc300d652d5792a7ecdf47 are not ancestors of current main. Their landing and publication gates remain unchanged.

Omitted scope: complete mutating-tool coverage and 24-hour retention, other dropped-response tools, other argument combinations and revision diagnostics, foreign-person job-handle refusal and long-work status independent of the Tasks extension. Erasure and approval replay, SURFACE-004, BASE-AGENT-006 and BASE-AGENT-008 holds remain. Model, investigation, ownership, remediation, recurrence and executor flows remain omitted. OC-045, OC-046, OC-048 and OC-049 retain their agent and AI egress authority hold. Paging remains OFF; provider authorization, A2P, delivery, independent standby, native-device and real-phone duties remain held.

Implementation and initial local results:
- Added ./tests/oncall-agent-service-replay.mjs:droppedServiceReplay and wired it into the existing agent flow, which ./tests/runtime.mjs invokes in the machine runtime leg. There is no new journey registration and no existing assertion was deleted, narrowed or gated.
- A protected native setup creates a populated service fixture with an owner, runbook, pager link and dependency. Each policy then reads that authorized service and edits only its name through MCP using the current projected ETag.
- discardToolResponse destroys the real HTTP response at headers; its body is never consumed. D1 establishes the service, original call and stored result before any retry. Assertions bind the resulting ETag, one application revision and one permanent service.update audit fact to the real agent, service and sponsoring member. Held mode retains one open review; autonomous mode has none.
- The same original arguments, ETag and key are sent again with a new RPC id. The exact stored result and ETag return. agentEffectSnapshot compares retained application records, revisions, timelines, permanent state-changing audit, original calls and outcomes, approvals, reviews and paging. The complete agent audit sequence gains exactly one linked replay row. Both policies have an empty outbound ledger.
- The focused helper passes under both policies. The production build, typecheck, native runtime core, first-party check, generator write and check, and tracked source-lock check pass. The complete touched machine runtime leg is still being recorded separately.
- The initial ad hoc stdin runner passed --input-type=module to Miniflare's worker evaluation and stalled before an assertion. It was stopped by its recorded owned PIDs. A normal .mjs runner succeeds under pinned Node 22.20.0. No product repair or weakened assertion was needed.
- Only CONTRACT.md Evidence and its bounded acceptance-2 Gap were reconciled. BASE-AGENT-012 remains MISSING. Generated views were successfully generated and checked, then restored whole from origin/main. The lock was regenerated after staging the new helper so it includes that file.

Selected-point proof map:
R1 MET: ./tests/oncall-agent-service-replay.mjs lines 13–27 and 38–46 seed populated values, read authorized state and preserve the non-name fields.
R2 MET: lines 28–41 destroy the real response, check unread body and recover original custody and effect directly from D1; ./tests/agent-door-runtime.mjs lines 71–88 implement the real socket discard.
R3 MET: lines 48–76 verify one workspace revision, preserved timelines and paging, agent-attributed native audit, approvals and the original held review.
R4 MET: lines 78–84 replay the original arguments and ETag with a different JSON-RPC id and compare the saved result and resulting ETag.
R5 MET: lines 85–94 compare all retained effects and custody, preserve the complete prior agent audit sequence, require a single linked replay attempt and zero outbound requests.

DONE-RIDERS assessment (no DONE request or promotion):
1: whole-clause NOT MET; only the selected service replay observation is closed, and the full omitted remainder stays in Gap.
2: selected slice MET through populated native data and exact effect and custody comparisons across loss and retry.
3: exact-head Verify result will be recorded in the terminal receipt; the new helper is invoked by the existing machine runtime journey. No whole-clause acceptance claim.
4: proof source hashes are in receipts.json; the final exact-head probe will be recorded after committing.
5: NOT APPLICABLE; no receiving clause or inherited duty changed.
6: MISSING and all remaining Gaps retained. Generated documents pass immediately after write and are restored to main for the lander as required.
7: MET; acceptance sentences, rulings and all 101 parent Status rows are unchanged.
8: no authority implementation changed; the native and machine runtime coverage retains current authority and unsafe-retry checks.
9: MET for honest boundaries; no provider, device, retention, paging or release evidence is claimed by this slice.
10: NOT APPLICABLE; no policy default or authority choice introduced.
11: pending the fleet's publication scan, predecessor gates, exact-head checks and landing; this cloud does not land or count a DONE.

Pre-ready assessment: the selected behavior is exercised through real MCP and D1 under both policies. Existing assertions remain intact. Revocation, erasure and broader approval replay are retained existing scope, not newly claimed. No screen or control changed, so browser proof at 1440 and 390 is not applicable. No email-shaped or credential-shaped text was added. Publication scan and Run site at the landing head remain the fleet's gates.

Mechanical observations: generator write exit 0; generator check immediately after write exit 0 with zero prose errors and warnings. After restoring main views, the check exits 1 solely with "ACCEPTANCE.md: generated content differs; run contract-docs write." This is the expected generated-view handoff, not a repair target. Source lock generation and check exit 0; migration ledger is not applicable because no migration changed.

Candidate and completed integrated proof:
- Product head: a41c45d447efbbb0b3fbc1ce345b96538ddbd87f on cloud/sd-oncall-c-f207. Four changed files: CONTRACT.md, sources.lock.json and the two focused test files. No runtime implementation change was required; the existing service adapter and shared replay path pass the new observation.
- The first real commit was pushed immediately after local touched coverage passed. All candidate author and committer identities were checked, including every side parent; there is one candidate commit and no trailers. The cloud guard succeeded on attempt 1. No PR is needed: Verify has a push entry point for the named branch.
- Fresh main was 8e02f6674fad992d1a972cfd567a47144296e5a0 at the candidate fetch. The unpublished rebase reported the branch up to date. The lock check passed. The product checkout is kept clean for exact-head proof.
- ONCALL_RUNTIME_PART=core passed; its native core completed in 95.1 seconds. ONCALL_RUNTIME_PART=machines passed in 291.2 seconds, including both new service observations at runtime-machines.log lines 113 and 114 and the existing full Oncall native agent flow at line 195. No existing assertion was removed or narrowed. Source hashes in receipts.json identify the proof bytes; the final exact-head focused probe is recorded separately.
- Verify push run 42211172652 was discovered in progress on the full candidate SHA. CI polling observes the 300-second limit and the ten-call budget. No other SHA is claimed green for this candidate. Current main's earlier green runs are baseline evidence only.
- BASE-AGENT-012: MISSING to MISSING. The selected acceptance-2 dropped-response service-update observation is closed. Counts remain 17 DONE, 50 PARTIAL and 34 MISSING across 101 Status rows. All other clause duties, notes, queue entries, policy holds, predecessor gates and release prerequisites are unchanged.
- Plan row reported for the lane: replan-38's sole selected service-update response-loss observation is proved; no whole-clause promotion and no further queue work were authorized by this bounded POINTS slice.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0 before restoring main views; ledger=none exit=0.

Exact-head local receipt:
After committing and pushing a41c45d447efbbb0b3fbc1ce345b96538ddbd87f, source-lock generation and check, a fresh production build, typecheck and the focused emitted Worker probe all exited 0 under Node 22.20.0. The checkout remained clean and remote readback matched that head. Both policies again passed the service response-loss observation. All relevant code and test hashes match the integrated machine-runtime run; no source byte changed between that run and this candidate. Proof files service-probe-exact-head.log, typecheck-exact-head.log and build-exact-head.log hold the actual outputs. The terminal refs and provenance are in terminal-refs.txt and receipts.json.

PROBE BASE-AGENT-012 acceptance 2 autonomous: emitted MCP oncall.services.update with current projected ETag and populated service fields; unread response destroyed at headers; D1 confirms one native commit; identical original arguments and ETag with new RPC id -> exact stored result and resulting ETag, no duplicate native effect, review or paging work, one linked replay attempt and zero outbound requests.
PROBE BASE-AGENT-012 acceptance 2 held: the same public-door observation -> one original open review, exact stored result and resulting ETag on retry, unchanged native and replay custody, one linked replay attempt and zero outbound requests.

Final CI and handoff result:
Verify run 42211172652, event push, completed with conclusion failure on exactly a41c45d447efbbb0b3fbc1ce345b96538ddbd87f. The plan job succeeded. Build job 127869953459 failed only at `node src/base/contract-docs.mjs check`: "Contract prose: 0 errors, 0 warnings." then "ACCEPTANCE.md: generated content differs; run contract-docs write." Final verify job 127870861929 failed its dependent coverage requirement because BUILD was failure and SHARDS were skipped. Both failed-job logs were read once using the required `gh run view` archive command and returned exit 0. Their environment blocks are omitted from the selected evidence logs; no environment dump is published. There is no other failing check or runtime assertion in this run. No rerun, dispatch or repair was attempted. Six GitHub API-budget calls were used in total, with the candidate status poll more than 300 seconds after discovery.

The generated-view-only exception expressly permits this candidate handoff. No raw green Verify or completed scan is claimed: the fleet must regenerate the views from merged CONTRACT.md, rerun its exact-head gates and complete publication scanning before landing. The installed CI source-lock command also exited 0 with the unchanged rer 0.2.96 pin. The local exact-head rebuild, typecheck and selected service replay probe passed, and the integrated machine journey passed with identical relevant code and test bytes.

No real blocker was found in the selected service response-loss observation. BASE-AGENT-012 remains MISSING, with complete retained gaps for omitted points. All predecessor, approval, erasure, agent egress, paging, provider and release holds remain unchanged. The fleet retains landing custody. No PR was created because the existing push entry point starts Verify on the named branch.

Terminal clause result: BASE-AGENT-012 MISSING -> MISSING; acceptance 2's selected oncall.services.update dropped-response replay proved in both policies. Counts 17 DONE, 50 PARTIAL, 34 MISSING before and after; 101 Status rows retained. Full plan, rubric, results, runtime proofs, mechanical receipts and exact product provenance are in this packet. The product branch and evidence ref are separate.
