# Move-in explanations and adopted undo

Repository: just-every/run-oncall
Branch: cloud/main-oncall-movein-plain-labels-1
Product head: c8531010b62374aef16e23611b37b4cb6d2623b2
Base: 90f391b56d492b998e0e55509e076eaf588cbea4
PR: none; this repository uses the fleet branch landing contract.

## Result

The review describes what the source contains and what Oncall will keep paused. Known people, schedules, services and integrations replace their source references in explanations. Missing final coverage lists explain why comparison is unavailable and offer exporting the list or continuing without comparison. Backup gaps explain that no backup is assigned and offer adding one after adoption or continuing with the gap. Comparison results use sentences and UTC dates rather than status codes. Original field names, values, differences, target effects and fingerprint remain available through Copy details, with a selectable fallback when clipboard access is unavailable.

An adopted-schedule undo refusal names the schedule and explains that it was made live, so the import cannot be undone. Its target ID is retained in Copy details beside the schedule name. The existing refusal conditions and adopted coverage are preserved. Ordinary edited-person refusal behavior is retained.

No source parser, mapping, rotation conversion, comparison calculation, adoption implementation, stored-plan format or fingerprint calculation changed. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are unchanged. No clause status, gap or evidence cell was edited; no DONE claim is made.

## Plan and execution

1. Initialized fleet credentials, identity, preserved hooks and pinned toolchain in the assigned shallow clone. PLAN.md retains the full implementation and verification plan.
2. Reproduced the original review and adopted undo through the saved-file browser door using synthetic-oncall-1. BEFORE-review.txt, BEFORE-undo.txt and the two before screenshots retain the actual findings.
3. Implemented a presentation-only review helper, one reusable Copy details control, and the named adopted-schedule refusal. The browser uses the same uploaded bytes, reviewed fingerprint, bounded apply, reconciliation and undo doors.
4. Extended the existing move-in browser journey with plainMoveInReview; added no registered test or test-budget file. Assertions run at 1440; proof of Review and Undo is captured at 1440 and 390. The existing move-in journey still covers source guides, zero-write preview, paused import, explicit adoption, erasure, activation, interrupted resume and reconciliation failure/retry.
5. Ran the touched checks, fetched current main, rebased before the first product push and merged main after publication without rewriting published history. Main did not move during either integration. Regenerated/checksummed the source lock after the helper files were tracked. The final tree is clean. Both candidate commits have fleet author and committer and no co-author trailers.
6. Pushed only the assigned cloud branch, then started one REST watcher for its exact-SHA Verify at a 300-second interval. Reports and actual receipts are published separately on the evidence ref. The Mac fleet retains publication scanning and landing; this run does not push main.

## Checks and actual receipts

- Typecheck, production build, contract generator check and source-lock check passed.
- tests/import-door.mjs passed, including both vendor plans, controlled authority, publication rollback, bounded restart/resume, catch-up/native conflict, erasure, explicit adoption, now/next, ICS and protected undo.
- tests/product-browser-journey.mjs#productImport passed through the emitted Worker at 1440, including the new plainMoveInReview leg.
- tests/product-browser-journey.mjs#plainMoveInReview passed independently on the final product source tree: no raw review labels, named source references, full original plan copied exactly, no imported/native preview writes, explicit adoption, named undo refusal, unchanged imported objects and live schedules after refusal, target keys retained in copied support details, desktop accessibility, and two-width screenshots.
- FINGERPRINT-RECEIPT.json records the same compact saved-file bytes yielding unchanged source digest, review entries/effects/differences, counts and classification versus baseline. Repeated preview with the same administrator preserved the fingerprint. Browser support copy also equals the complete original plan response including its fingerprint.
- LOCAL-RECEIPT.json contains product provenance and before/after counts; SOURCE-LOCK-RECEIPT.json contains the actual lock result; COMMIT-IDENTITY.txt contains both candidate identities; PUSH.log records the successful guarded pushes. CI-RECEIPT.json records exact-SHA REST observations.

An initial exploratory cross-installation fingerprint comparison was invalid: the fingerprint includes the administrator principal, and that probe read pretty-printed bytes rather than the original compact upload. The corrected receipt compares exact bytes and same-administrator repetition. An initial HTTP regression caught generic edited-person labeling; the change was narrowed to adopted schedules and the entire touched HTTP check then passed. The first post-commit lock refresh found the new files were absent from its tracked-file inventory; an ordinary follow-up lock commit corrected that, without rewriting the published first commit.

## Counts and clause custody

Raw review markers (related-users twice, not-supplied once, backup field prefix once): 4 → 0 in the reproduced scenario. Adopted undo naming the schedule: false → true. Registered tests added/removed: 0/0; the existing move-in journey is extended. Contract summary remains 24 done / 43 partial / 34 missing, 101 total, before and after; clause status changes: none.

CLAIM OC-021 PARTIAL points=1 tests=tests/product-browser-journey.mjs#plainMoveInReview; tests/product-browser-journey.mjs#productImport
CLAIM OC-022 PARTIAL points=1 tests=tests/product-browser-journey.mjs#plainMoveInReview; tests/import-door.mjs#Adopt reviewed imports into live schedules
GAP OC-021: This round proves bounded synthetic saved-export review and does not establish real-account migration or complete cutover.
GAP OC-022: This round adds named adopted-undo browser proof; no new completeness or status judgment is requested.

OC-038 remains partial and OC-074 remains missing. No live provider, carrier delivery, new source, real-account conversion, parallel cutover, release-2 paging or standby proof is claimed.

## CI and terminal custody

Verify run: 43139950723, https://github.com/just-every/run-oncall/actions/runs/43139950723
Exact head: c8531010b62374aef16e23611b37b4cb6d2623b2
CI status is recorded in CI-RECEIPT.json. This initial report transfer records Verify in progress; the final transfer will record the terminal observation. There is no product blocker observed locally. The publication scan and fleet landing are still fleet-owned gates.
