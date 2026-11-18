# sd-oncall-c-f267 — OC-084 native request allowance

Run Edit Run fleet · 18 November 2026

The planner's replan-76 OC-084 acceptance 2 slice is complete locally. OC-084 remains PARTIAL. Counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING, across 101 clauses. The change records the dated observations in CONTRACT.md and extends the existing emitted Worker routing journey. It adds no journey registration or runtime behavior change. The Status table, acceptance sentences, evidence and gap cells retain main's judgments.

## Plan and result

1. Verify the current clause, its acceptance and scope, and ancestry for shared files. Reuse the regular service-key and workspace-routed native intake doors and the existing clock and D1 fixture.
2. Freeze the Worker clock, configure fresh keys through the owner doors, then admit a trigger, retry the same body and submit a schema-valid source mismatch to the same authenticated URL. Compare the response and D1 debits at each stage.
3. Send the next valid observation of the same group, repeat the throttle and compare grouped records, intake receipts, paging and outbound attempts. Confirm a separate fresh key of each kind still admits a trigger.
4. Record the actual proof in clause prose, generate and validate the derived views locally, restore the generated files from main and regenerate the pinned source lock. Publish the save and final candidate on the named branch, then check exact-SHA Verify and return evidence independently.

Both doors returned 201, 200 and 403. The duplicate preserved receipt identity; the rejected request brought usage to three requests and one admitted event. The next valid observation returned 429 with Retry-After of 60 seconds. The owner-visible notice named the tested key and recorded four requests, including that attempt. A repeat throttle charged a fifth request and left the same single notice. Populated alerts and events, retained routed intake receipts, paging state and the outbound ledger were equal across retry, rejection and throttles. No outbound call was attempted. A second key of the same kind returned 201 and recorded one independent request and event.

PROBE OC-084 2: Native service-key and workspace-routed native bearer HTTP ingress, frozen clock and fresh three-request policies → 201, 200, 403 with three requests and one event; valid grouped observation → 429, Retry-After 60, one notice naming the key and count of four; repeated 429 keeps one notice; custody and paging unchanged, zero outbound attempts, isolated keys 201.

## Evidence boundaries

- Acceptance 1. Existing event-limit, duplicate/group and isolation assertions in tests/routing.mjs, rateJourney, lines 198–213 and 244–253. Existing coverage was exercised by the local routing journey.
- Acceptance 2. The selected native rejection is covered by tests/routing.mjs, rateJourney, lines 259–333. The journey asserts the denial reason, exact time and debits, unchanged receipt identity, request throttle and side effects. It exercises valid and refused requests through the same public door.
- Acceptance 3. Existing forged/revoked and rotated-key checks remain in tests/routing.mjs, nativeRouting and rateJourney, including lines 204–206. The selected slice adds no credential or erasure authority. The unchanged retry and prior rotation/revocation assertions ran in the existing journey.
- Acceptance 4. Existing owner policy writes and anonymous, stale revision and viewer refusals remain in tests/routing.mjs, rateJourney and providerRateDoors. The new probe uses the supported owner door at line 268 to set the three-request allowance.
- Acceptance 5. Existing zero-to-expiry window coverage remains in tests/routing.mjs, rateJourney, lines 211–213. The new same-window notice and retry checks are at lines 307–322. External notification stays held.
- Acceptance 6. The independent f139 authenticated email proof, tests/intake.mjs lines 315–364, stays scoped to the per-address receipt allowance. Its source was left intact. The touched local proof covers the native doors.
- Acceptance 7. Existing atomic batch coverage in tests/routing.mjs, providerRateDoors, verifies the entire refusal, machine-readable instructions and absent Retry-After. RL-6 remains in force.
- Acceptance 8. The existing native custody partition checks and separate storage refusal remain local. OC-073 and R-13 retain the hosted 128 MB measurement requirement and the unlanded capacity predecessor.

Riders 1 and 2 are met for the selected native slice with populated state and both successful and refused requests. Rider 3 depends on the exact-SHA Verify result recorded below. Rider 4 uses the exact-head local journey receipt. Rider 5 leaves OC-023, OC-031 and OC-073 ownership intact. Rider 6 passes generation and check after local rendering; the lander owns the restored views and judgment cells. Rider 7 preserves all eight acceptance sentences. Rider 8 uses the existing authenticated ingress and owner management doors, with no authority expansion. Rider 9 keeps provider, hosted and live proof held. Rider 10 has no new policy default. Rider 11 stays with the guarded Mac lander, including the full-history publication scan, main equality and exact main Run site.

## Shared-file predecessors and plan handoff

- Main at integration was d88d44c4e8dedd1bf69682d3d2abcf4116dad3c4. The published cleanup anchor 9e40e7119e1afdfcf7c2a1f1de191682d50387a5 and the existing native routed credential, per-key allowance and atomic notice commits are ancestors. The shared routing journey retains the newer replay, rotation and team fixtures.
- The literal c34 branch was absent from advertised refs. Its independent native handoff scope remains separate from the live per-key-allowances clause. No native handoff read or attribution change was made.
- The f139 original head f2aae87a69ca9336ddc7cf6b4408d30d5858bb9f is branch-only. Its landed counterparts aecb27bf9ed4d2f35e6021f9dee354eb22a6623c and 824d40d46810293d53feb797b1e703f249441da2 are ancestors of main. The f265 and f266 contract branches remained separate and the OC-084 prose addition intersects neither clause.
- The OC-073 capacity predecessor 3539080cd438e5ddfc119245fe96411af5e31afb remains branch-only. Preserve its failed memory result and the hosted measurement-plan prerequisite. The local receipt limit does not establish hosted capacity.
- Update only the replan-76 OC-084 row to record completion of its native rejected-request debit slice and retain PARTIAL. Keep the f139 email scope, the c34 scope and all other queued and held rows.

CLAIM OC-084 PARTIAL points=2 tests=tests/routing.mjs#rateJourney

GAP OC-084: Team authority and privacy under OC-023, live SNS credentials under OC-031, hosted capacity under OC-073, external notification, production paging, independent standby and real-phone proof remain held. Paging stays OFF.

## Checks and custody

- Product branch cloud/sd-oncall-c-f267. Save 8b0b44278cd9ccc270ebe2c1a2275c08caac7e49. Candidate 63fa9aafac0f0cf0f7a6df0560ac32b56668f72c. Both pushes succeeded on the first attempt. No PR was opened because branch push is a Verify entry point and the lane owns landing.
- Pinned Node 22.20.0 and pnpm 10.12.4. The explicit rer build emitted the Worker; routing, typecheck and first-party checks passed locally. No UI changed. No migration ledger check applied.
- MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0
- Restoring the generated views from main reproduced only the expected ACCEPTANCE.md freshness mismatch. Contract prose passed with zero errors and warnings. The candidate's source lock passed after the commit.
- Commit identities and full messages for both commits matched fleet policy. Changed prose and test lines passed the local slash-token and email-shaped-string checks. The publication scan is pending with the lander.
- Baseline main Verify 44207847779 and Run site 44207847848 completed successfully. The candidate's Run site starts after guarded landing.
- Exact-SHA push Verify 44221961558 completed with failure in contract-docs job 134525956312 and its aggregate guard 134531831951. The plan, build, all eight shards and full-push-proof succeeded. The intake shard was 134526723480. The exact committed tree reproduced the ACCEPTANCE.md freshness mismatch, and the aggregate job archive recorded CONTRACT_DOCS=failure, BUILD=success and SHARDS=success. The branch meets the brief's generated-view exception for READY. The lander regenerates the views and runs its guarded checks before landing.
- The failed contract-docs job archive command exited 1 with `failed to get run log: zip: not a valid zip file`. The exact command and job metadata are in VERIFY.json. The aggregate job archive was retrieved successfully.
