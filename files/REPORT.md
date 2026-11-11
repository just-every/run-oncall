# OC-022 round plan and results

Tag: sd-oncall-c-f221
Repository: just-every/run-oncall
Branch: cloud/sd-oncall-c-f221
Base: 1e8f35e6ec553ed607b812dd6f957aae2b3acce9

## Plan

1. Read OC-022, its single acceptance sentence, the maintained activation and import-door journeys, their helpers, the inline plan and DONE riders.
2. Record a fresh emitted Worker run of the changes and imports lanes on current main. Confirm both vendor imports apply a strictly unfinished checkpoint, restart, resume the same job to completion, retain prefix records, retry without effects and undo exactly.
3. Confirm publication-time revocation, revoked-session refusal, injected SQL rollback, unchanged and changed identity replay, native edit refusal and superseded-import undo refusal in those runs.
4. Document the existing native proof beside OC-022 without editing Status, Gap or Evidence cells. The later single-writer instructions override the planner's stale request to edit those cells. Add no acceptance point and change no implementation or test unless an observation fails.
5. Run typecheck, first-party check, required rer verification, contract document write and check, restore generated views, then regenerate and check the source lock last.
6. Refresh main before publication, inspect all candidate identities and trailers, push only the named product branch, inspect exact-SHA Verify within the API budget, publish the explicit non-secret evidence packet separately and hand over lander-owned judgments and publication gates.

No plan queue or hold is rewritten. No new policy default is adopted. Live provider pulls, complete incumbent conversion, routed mail settings, account reconciliation, parallel routing, delivery and real-phone cutover remain with OC-038 and OC-074; paging remains OFF.

The following results come from actual command receipts.

## Frozen acceptance rubric

The named incumbent formats are saved PagerDuty and Opsgenie files. This round proves Oncall's native file-import safety guarantee; it does not claim incumbent live service acceptance.

| Item | OC-022 acceptance sentence and inherited duty | Existing public-door proof |
| --- | --- | --- |
| R1 | Apply, interrupt, restart, resume and undo both vendors | tests/activation.mjs lines 739–789: per-vendor unfinished-checkpoint journey, owner-session import HTTP, real local Worker restart and retained D1 |
| R2 | Same reviewed job and fingerprint, strictly unfinished checkpoint, exactly-once remainder, unchanged prefix | tests/activation.mjs lines 749–779: >20 mapped records, one apply, status before and after restart, full native record comparison and contiguous journal batches |
| R3 | Effect-free completed retry and exact undo; inactive objects, no new login or paging authority | tests/activation.mjs lines 773–787: native objects, completed job, batches, workspace and paging snapshots |
| R4 | Revoke authority at publication and refuse revoked sessions | tests/import-door.mjs lines 522–529: settings revocation inside the committing SQL batch; tests/activation.mjs lines 987–988: logged-out session apply and audit export refusal |
| R5 | Injected SQL failure preserves earlier state and journal; failed publication and expired lease stay terminal | tests/activation.mjs lines 699–738 and tests/import-door.mjs lines 530–540: actual SQL trigger failure, zero native or journal commit, rejected retry and explicit rollback |
| R6 | Unchanged and changed source identity replays | tests/activation.mjs lines 819–820 and 978–986; tests/import-door.mjs lines 550–581: same-byte idempotence, reviewed changed catch-up, additions, replacements, absent sources retained and native edits preserved |
| R7 | Preserve native edits and name strict undo conflicts | tests/activation.mjs lines 973–996: NATIVE_EDIT_CONFLICT and IMPORT_SUPERSEDED, named objects and holding import, unchanged durable rows, newest-first reversal |
| R8 | Subject erasure and later undo do not resurrect personal data | tests/activation.mjs lines 906–970: protected erasure, explicit retained gaps, exact-person matching, every table and plan checked, later undo restores no erased value |
| R9 | Invalid source input and unreviewed fingerprints publish no native objects | tests/activation.mjs lines 808–813 and 854–870: viewer, malformed review and changed-fingerprint refusals, invalid source matrix, all imported rows and native and paging snapshots preserved; tests/import-door.mjs lines 515–520: refused credential-bearing bytes withdrawn |

No acceptance outcome was identified as unbuilt after source inspection. Passing runtime results are recorded separately below. No runtime implementation or journey assertion is changed by this round.

## Contract custody and count effect

The product change documents existing journeys inside the OC-022 clause body. It does not change an acceptance sentence or any Status, Gap or Evidence cell, summary count, implementation boundary, migration, fixture or assertion. The lander is requested to change only OC-022 from PARTIAL to DONE, empty its stale Gap, and replace its Evidence cell with the R1–R9 journey mapping after the independent gate passes.

Before and after this product commit: 22 DONE, 45 PARTIAL, 34 MISSING, 101 total; OC-022 remains PARTIAL in the checked-in Status table by the single-writer rule. Requested after guarded judgment: 23 DONE, 44 PARTIAL, 34 MISSING, 101 total. Test registration delta: zero. No assertion was removed, narrowed, skipped, conditionally hidden or replaced.

Plan row affected: OC-022 only. All other plan rows, the empty whole-clause queue and named holds remain unchanged.

## DONE riders and pre-ready checks

| Rider | Result and scope | Proof |
| --- | --- | --- |
| 1 | PASS on candidate | R1–R9 cover the full one-sentence acceptance through native HTTP doors |
| 2 | PASS on candidate | Seeded real D1 records; successful apply and undo beside refused publication, revoked-session and strict undo paths |
| 3 | PASS under the explicitly permitted generated-view-only CI exception; local exact-SHA proof passed | The observed Verify selected full coverage and stopped only at generated ACCEPTANCE.md freshness; the task explicitly permits that exception, with round-local journeys and no relevant byte changed. Candidate receipts are recorded below |
| 4 | PASS: relevant bytes unchanged and both candidate rer verification commands passed | Only contract prose and its generated source lock will change; implementation and tests remain byte-identical to main |
| 5 | INSPECTED | OC-022's own Requirement explicitly names actor, session and admin authority inside publication and reversal; unchanged-state and retained-partial semantics are explicit. No new inherited Base duty or obligation is claimed |
| 6 | PASS mechanical generation; Status judgment remains lander-owned | Write and check passed; generated views were restored whole from main; stale Gap will be handed over, never silently altered |
| 7 | PASS, INSPECTED | Acceptance point 1 is byte-identical; no split, rewrite, changed threshold or added point |
| 8 | PASS on candidate | R4, R5 and R7 exercise permitted administrator work and denied current-authority and edit-conflict paths with unchanged records |
| 9 | PASS, INSPECTED | Only synthetic native file proof is claimed; OC-038 and OC-074 live account, delivery and cutover holds are unchanged |
| 10 | PASS, INSPECTED | No policy default or new authority is adopted |
| 11 | PENDING guarded landing | Product stays on cloud/sd-oncall-c-f221; main equality, full-history publication scan and resulting main Run site are fleet gates, not claimed complete by this cloud |

Pre-ready applicability: no UI screen or control is touched, so no new screenshot or tooltip qualification is claimed. Runtime paths cover revoked authority, erased-person non-resurrection, captured-file retry and conflicting identities. No changed fixture contains an address or key-shaped value. The source lock was generated last and its check passed. The publication scanner is unavailable in this cloud by the task's explicit adaptation: its result is NOT RUN, complete=unestablished, historyScanned=unestablished, findings=unestablished. It must not be reported as zero findings. Base main's push Verify 43085467285 and Run site 43085467371 are completed/success at 1e8f35e6ec553ed607b812dd6f957aae2b3acce9; they are not substituted for candidate CI or candidate landing.

## Observed probes on main

PROBE OC-022 1 PagerDuty: owner-session import HTTP with a source over 20 mapped records -> checkpoint 20 of 30 retained across Worker stop and restart; same job and fingerprint completed once, unchanged prefix, effect-free completed retry, exact undo and unchanged paging snapshot.
PROBE OC-022 1 Opsgenie: owner-session import HTTP with a source over 20 mapped records -> checkpoint 20 of 34 retained across Worker stop and restart; same job and fingerprint completed once, unchanged prefix, effect-free completed retry, exact undo and unchanged paging snapshot.

These observations come from this round's changes-main.log, not a prior report. Both lane processes exited successfully; the refusal and replay observations are recorded below.

## Completed main changes lane

Command: ONCALL_VERIFY_LANE=changes node tests/verify.mjs
Head: 1e8f35e6ec553ed607b812dd6f957aae2b3acce9
Exit: 0
The maintained first-party check, production build and typecheck passed. tests/changes.mjs passed in 41.2 seconds; tests/activation.mjs passed in 345.6 seconds with 40 requirement flow groups and its final demo flow. Both vendor checkpoint observations, the injected SQL failure, expired lease rollback, every saved-file shape, exact-person erasure, revoked-session refusal and named native-edit and superseded-import undo refusal completed successfully.

PROBE OC-022 1 rollback: owner-session apply with injected native SQL failure -> 409 import_door_apply_constraint, zero native rows and zero journal batches; failed plan retry refused; a new reviewed plan applied and undid.
PROBE OC-022 1 interrupted lease: one committed partial batch with a lost response, then expired lease and restart -> durable failed job and interrupted audit, no extra objects on retry, explicit rollback removes only accepted partial effects.
PROBE OC-022 1 replay and undo: unchanged completed apply -> same job and no new effects; changed source with native edit -> named rejection and unchanged native data; old undo after later replacement -> 409 IMPORT_SUPERSEDED, names the later import and changes nothing; newest import undoes first.
PROBE OC-022 1 revoked session: successful login then logout followed by apply and audit export -> 401, durable imported records unchanged.
PROBE OC-022 inherited erasure: protected erasure of referenced PagerDuty and Opsgenie people -> no personal value in retained tables or plans, explicit coverage gaps, unrelated people kept; undo restores no erased value.

## Completed main imports lane and mechanical preparation

Command: ONCALL_VERIFY_LANE=imports node tests/verify.mjs
Head: 1e8f35e6ec553ed607b812dd6f957aae2b3acce9
Exit: 0
The lane's first-party check, build and typecheck passed. tests/import-door.mjs passed in 139.7 seconds; the existing agent subject and roster erasure journeys and reports leg also passed.

PROBE OC-022 1 publication authority: signed PagerDuty apply while an SQL trigger disables Business import authority after job insertion -> 409, every imported native row unchanged, and the authority-setting mutation itself rolled back in the rejected transaction.
PROBE OC-022 1 SQL failure and identity replay: signed apply with injected native publication failure -> 409 import_door_apply_constraint and unchanged imported, workspace and paging state; new fingerprint-reviewed plan succeeds, survives restart and reconciles; identical bytes and zero-change catch-up retain exact records; reviewed changed source adds and replaces only supported unchanged targets, preserves native edits and absent-source objects; strict native-edit undo changes nothing.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0, both generated views restored whole from origin/main; ledger=none exit=0 (no migration changed).
Contract generation reported 0 prose errors and 0 warnings. Only CONTRACT.md and sources.lock.json differ; the contract change adds native proof without changing the original acceptance sentence or any Status cell. The three named implementation boundaries remain unchanged.

## Pushed candidate

Head: e50345569adb756f5e3b3b9300a38e24a55a2e8a
Branch: cloud/sd-oncall-c-f221
Parent main: 1e8f35e6ec553ed607b812dd6f957aae2b3acce9
PR: none; the existing push event is the supported Verify entry point.
Product push: successful on attempt 1 through the fleet guard; no authentication or transport rejection.
Candidate Verify: 43099560050, event push, exact head e50345569adb756f5e3b3b9300a38e24a55a2e8a; first observed queued.
GitHub REST calls used at discovery: 2 of 10. No dispatch or rerun.
All candidate author and committer identities are the fleet identity. There are no co-author trailers. The audit inspected every candidate commit, including all parents reachable outside main.
The diff has only CONTRACT.md and sources.lock.json, and no runtime or test byte differs from the fully passing base-lane runs. No generated view is committed.

Both required rer verify commands recorded the selected changes and imports lanes on this committed candidate and passed; the complete logs and exit receipts are included.

## Exact-SHA CI disposition

Verify 43099560050 completed on push at e50345569adb756f5e3b3b9300a38e24a55a2e8a with conclusion failure. Its only independent failure is build job 130786432278, step “Check the generated contract documents”:

    Contract prose: 0 errors, 0 warnings.
    ACCEPTANCE.md: generated content differs; run contract-docs write.
    Process completed with exit code 1.

Verify guard job 130787284740 then failed because BUILD=failure; dependent shards and proof jobs skipped. The plan selected full coverage, rather than the brief's anticipated light readers. No runtime assertion ran in this failed CI build, so no runtime green is inferred from it. Each failed job archive was read exactly once with the prescribed gh run view command; both reads succeeded. Six explicit GitHub CLI calls were used. No workflow was edited, dispatched or rerun.

This is the exact generated-view-only exception explicitly permitted by the cloud task. The contract generator write and check passed locally before restoring main's views, and the committed restored-view check reproduces exactly the ACCEPTANCE.md freshness message. It is not a runtime defect or a repair round. The lander must regenerate the views, apply the guarded judgment and require its own exact-SHA green run before landing. This report does not call the observed GitHub conclusion success.

## Completed candidate changes verification

Command: ONCALL_VERIFY_LANE=changes npx -y @runeditrun/rer verify --non-interactive
Head: e50345569adb756f5e3b3b9300a38e24a55a2e8a
Started: 2026-11-11T21:02:04Z
Completed: 2026-11-11T21:12:48.652133+00:00
Exit: 0

This command selected project Node 22.20.0, ran the maintained changes and activation journeys, first-party preparation, production build, typecheck, hosted production-output inspection, hydration (four public pages, 23 loads) and declared agent-door conformance (7,780 of 7,780 points). Its final line is “verify: complete (exit 0)”. All OC-022 observations therefore have a passing recorded runtime on the committed candidate. The separate imports lane command also completed successfully, as recorded below.

## Completed candidate imports verification

Command: ONCALL_VERIFY_LANE=imports npx -y @runeditrun/rer verify --non-interactive
Head: e50345569adb756f5e3b3b9300a38e24a55a2e8a
Started: 2026-11-11T21:12:48Z
Completed: 2026-11-11T21:19:58.391040+00:00
Exit: 0

The command completed the maintained import-door, agent erasure and reports journeys, build and typecheck, hosted production-output inspection, public-page hydration and the declared agent-door checks. The candidate's publication-time authority revocation, injected SQL rollback, unchanged and changed identity replay, resume and guarded undo observations passed with inactive imports and paging OFF. Both full required rer wrappers completed; neither receipt is substituted by a prior SHA.

## Terminal rider and self-check disposition

Riders 1, 2, 4 and 8 PASS from the two exact-candidate local runtime receipts and the R1–R9 proof map. Rider 3 uses the explicit generated-view-only exception: exact-SHA push Verify 43099560050 completed/failure only because ACCEPTANCE.md was intentionally restored from main; local candidate runtime and required verification commands passed. Rider 5 PASS by OC-022's unchanged explicit current-authority and data-preservation requirements. Rider 6 PASS for generator write and check, source-lock freshness and preserved Status custody; the lander owns the stale Gap and Evidence update. Rider 7 PASS: the sole acceptance sentence is unchanged. Riders 9 and 10 PASS: no live-provider claim or new policy default. Rider 11 PENDING guarded landing; this cloud has neither written main nor run the fleet's publication scanner.

Pre-ready checks 1–3 PASS for the named native acceptance: every outcome is asserted through public doors with populated records and allowed and refused dangerous paths; no assertion changed; revoked credentials, erased people and replay cannot gain the imported authority the tests refuse. Check 4 is not applicable because no UI is changed. Check 5 is complete for the fresh source lock and the explicitly permitted candidate CI exception; full-history publication scanning, main equality and resulting main Run site remain guarded-lander conditions. No blanket zero-finding scan or landed count is claimed. Relevant source and test bytes are unchanged from main, and all current candidate receipts name the full SHA above.

Requested Status-row update, after the gate: OC-022 PARTIAL → DONE, Gap empty, Evidence names the per-vendor activation unfinished-checkpoint journey, its SQL failure, invalid-input, erasure, revoked-session, native-edit and later-import legs, plus the PagerDuty account HTTP publication-revocation and replay journey in tests/import-door.mjs. No other row changes. Counts remain 22 DONE, 45 PARTIAL, 34 MISSING in this candidate; requested guarded judgment yields 23 DONE, 44 PARTIAL, 34 MISSING of 101.

No product blocker remains. Provider and field holds under OC-038 and OC-074 are unchanged. No PR was needed because push Verify exists. No test, runtime boundary, fixture, migration, homepage, dependency pin or workflow was edited. Product commit and evidence publication remain separate; the packet is selected explicitly and reviewed as public. The clone is removed after successful evidence publication, as required.

CLAIM OC-022 DONE points=1 tests=tests/activation.mjs#OC-022 pagerduty: unfinished checkpoint 20 of 30 survived Worker restart; tests/activation.mjs#OC-022 opsgenie: unfinished checkpoint 20 of 34 survived Worker restart; tests/activation.mjs#OC-022: injected native SQL failure rolled back the complete batch and journal; tests/activation.mjs#OC-022: malformed and credential-bearing source refused, undo preserved a native edit, and undo under a later import named it and undid nothing; tests/import-door.mjs#OC-038 PagerDuty account HTTP: publication revocation and failure rollback, bounded apply and restart and reconcile, identical-byte idempotence, catch-up and guarded undo

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0 before restoring main views; ledger=none exit=0.
