# sd-oncall-c-f330 — Oncall reviewed schedule updates

Run Edit Run fleet, 2026-11-21 UTC

## Scope and plan

The planner selected the first-call optional expected revision diagnostic for the shipped `oncall.schedules.update`, within BASE-AGENT-012 acceptance 4. The existing agent runtime journey remains the registration for this coverage. The planning row is replan 94, BASE-AGENT-012. This cloud run leaves the lane plan with its fleet owner.

1. Exercise the emitted Worker with a service-scoped machine credential and use a separate signed-in administrator to edit a populated rota.
2. Ask the MCP review tool for the real digest of a name-only proposal after the signed-in edit. The required revision and the embedded schedule revision match the edited rota. The original revision appears only in the optional `expected_revision` field of a fresh-key call.
3. Check the refusal, compare hidden and absent targets, and compare custody across the refusals. Correct the optional revision and use a fresh key with the same proposal, range and digest. Check the legitimate effect and its exact retry.
4. Run the touched Worker journey, typecheck, first-party check, contract generator and package-pinned source lock check. Push the candidate branch for exact-SHA Verify and attach this packet to that product commit.

## Public-door coverage

- `tests/oncall-agent-flow.mjs:1505–1509` invokes the existing schedule journey and both reviewed-update variants. `tests/runtime.mjs:140–144` runs it in the agents shard selected by `scripts/verify-shards.json`. The same test registration retains the required and optional override cases and the stale required reviewed-update case. Earlier create retention and unrelated coverage stay outside the diff.
- `tests/oncall-agent-schedule-replay.mjs:116–182` signs the independent editor in through the native member door, applies the editor's change and requests the new digest through `oncall.schedules.review`. In the held case the digest is obtained before adopting the participant approval rule. The stale call, scope refusals, corrected call and retry execute under the held policy.
- `tests/oncall-agent-schedule-replay.mjs:102–114,184–221` checks `isError` and identical metadata and text, including the authorized `current_revision`. There is no structured result, approval or receipt. Existing private and absent targets have identical `not_found` results with no revision. The journey compares populated native, paging, call and outcome, approval and review custody and retained notices. It checks the three attributed refusal audit entries and zero outbound requests.
- `tests/oncall-agent-schedule-replay.mjs:223–335` corrects only the optional revision and gives the call a fresh key. The autonomous case applies directly. The held case stays pending until the sponsor approves the exact saved revision and summary. Both cases produce one native schedule update, one attributed native mutation audit, the expected name and control revisions, one retained call and outcome, undelivered notice records and an effect-free exact retry with a new JSON-RPC id. Paging stays OFF and the outbound ledger is empty.
- `src/agent-door/schedule-tools.ts:219–228` supplies the existing scoped revision callback, which consults `savedSchedule` at line 71. Base's first-call expected revision comparison is at `src/modules/agent-door/pipeline.ts:140–145`, before classification and approval custody. The Base copy and Oncall production code have no changes in this round.

## Judgment and riders

The committed counts are 26 DONE, 41 PARTIAL and 34 MISSING, 101 total. BASE-AGENT-012 remains MISSING. This packet claims a bounded acceptance 4 observation. Full mutating-tool coverage, other retention, dropped-response, changed-argument and revision variants, foreign-person job handles and Tasks-independent long work remain open.

1. Public outcome coverage is limited to the selected acceptance 4 observation. The full clause remains open.
2. Populated effect checks cover supported and refused requests in both policies. See the public-door coverage and runtime receipt.
3. Verify includes the agents shard. The exact-SHA workflow state is in the CI receipt.
4. The runtime receipt binds the tested tree and parent SHA to the candidate. The test and source bytes are the ones exercised in the receipt.
5. This proof is within the existing Base duty. It adds no receiving clause or inherited obligation.
6. Contract generator write and check ran, then the generated views were restored from main. Existing judgment cells and counts are preserved.
7. Acceptance wording, scope and all existing assertions are preserved.
8. The scoped authorized correction and both indistinguishable refusal outcomes exercise the authority boundary. The refusal baseline and exact retry retain custody.
9. The outbound ledger verifies zero requests in this scenario. Live provider, standby, carrier, actual paging and real-phone evidence remain held.
10. The scenario uses existing authority policy. It adopts no new policy default.
11. The cloud candidate requires guarded landing, the fleet publication scan and main Run site. The CI receipt records the base and candidate runs separately.

OC-023 scope, OC-024 own-member PTO, OC-025 and R-14, OC-077, human follow-up acceptance, broader attribution, BASE-AGENT-006 and 008, erasure and approval POST replay, SURFACE-004's Base seam, OC-037, OC-044 and OC-054 ownership, OC-045, OC-046, OC-048 and OC-049 egress, timers, delivery, provider authorization and A2P, standby, devices, real-phone cutover, queue and release gates remain held. There are no touched screens or migrations. The journey stays within its existing registration.

## Local run notes

The first local run stopped at native editor creation with HTTP 409 because the new scenario reused the required-revision fixture name. The optional case now creates its own signed-in editor. The agents runtime rerun passed against the candidate tree after main advanced from the lease base. Node 22.20.0 and pnpm 10.12.4 match the checkout pins.

## Candidate provenance

- Branch: cloud/sd-oncall-c-f330
- Product HEAD: 3eee70bbfeadefba838a50fb31bc165e6e79ed04
- Refreshed main used as parent: 513ec690f92432d5e78f67c1f23374d56954ddf7
- Candidate push Verify: run 44943765062.
- Full-history publication scan and main Run site remain with the guarded lander. No PR was needed for push Verify.

## Fleet handoff

CLAIM BASE-AGENT-012 PARTIAL points=4 tests=tests/oncall-agent-schedule-replay.mjs#staleReviewedScheduleRevision

GAP BASE-AGENT-012: Complete mutating-tool coverage, remaining retention, response-loss, argument and revision variants, foreign-person job-handle refusal, and Tasks-independent long work remain open.

Exact candidate push Verify 44943765062 completed successfully. Main at the candidate parent had green Verify 44942410761 and Run site 44942410760. Candidate Run site and the full-history scan are guarded landing checks.
