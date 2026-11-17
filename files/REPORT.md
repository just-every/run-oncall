# Linear candidate report

Author: Run Edit Run fleet. Date: 2026-11-17T14:35:38.424766+00:00

Repository: just-every/run-oncall
Branch: cloud/sd-oncall-c-f260-lin-1
Candidate: 1defe48f8ddfdb6739042df3dfa694af954161c0
Parent/main: 708271f0cbd8bb35ae45a5b402a97faa6197cc1a
Feeder: db9f4bf9e5f80d06fb4d055ad35e527361c6d5fe

## Product result

One ordinary commit re-applies the feeder's net change on the fresh main. The candidate adds the actions.submit scoped-action and native-parent-revision admission checks before policy approval. A stale required revision, with expected_revision absent, is refused with revision_conflict and the authorized parent current_revision, without creating an approval, review, native effect or outbound request. Missing or scoped-out targets receive identical not_found diagnostics without revision disclosure. A fresh key using the returned revision completes through the existing autonomous/held path; exact completed-result retries retain the original effect and approval identity.

The implementation, native-revision helper and replay helper are byte-for-byte identical to the feeder. The complete oncall-agent-flow journey keeps main's staleActionSubmitExpectedRevision import and invocation and replaces focusedActionSubmitReplay with focusedActionSubmitNativeRevision, which still runs all replay assertions. The browser journey retains main's entire optional-revision story and adds the feeder's native-revision story, including exactly one sponsor approval POST. Capture reloads at 1440 and 390 never resubmit that approval.

## Linear ancestry and complete feeder difference explanation

- The sole candidate commit's parent is main 708271f0cbd8bb35ae45a5b402a97faa6197cc1a. git log --merges origin/main..HEAD is empty. No merge, cherry-pick merge parent, force push, published rewrite, or main update was made.
- The candidate changes exactly the six leased files. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are unchanged. No generator write was needed.
- Relative to db9f4bf9, docs/routed-intake.md, the src/intake/* and src/routing/* changes, tests/intake.mjs and tests/sns.mjs come unchanged from newer main's routed SNS/CloudWatch work.
- tests/oncall-agent-action-submit-revisions.mjs comes unchanged from main's f259 optional-revision coverage. Main's newer endpoint/resource parity assertions in tests/oncall-agent-endpoint-parity.mjs and tests/oncall-agent-resource-parity.mjs are unchanged.
- tests/oncall-agent-flow.mjs differs from the feeder only by main's newer staleActionSubmitExpectedRevision import and invocation.
- tests/agent-door-browser.mjs retains main's newer optional-revision import, complete assertion/capture block and distinct revision screenshot names alongside the feeder's native-revision proof. The approval-POST counter surrounds only the native-revision story so the required once-only assertion stays scoped to its actual approval.
- sources.lock.json is regenerated from the installed pinned package after staging the new helper and all source/test changes. Its difference reflects newer main plus the combined browser/flow source hashes. The lock's check passed.

ancestry.json records every diff path, byte equality for the three feeder files, the main/parent identities, unchanged views, lease audit and zero merge count. product.diff is the actual six-file candidate diff against main.

## Counts and clause custody

Registered verification-plan journey invocations: 20 before, 20 after. No new registration, skipped test, or weakened assertion; the existing replay journey is extended with the native-revision preflight. The browser's newer optional-revision assertions are retained in full.

Contract counts before -> after: 26 done -> 26 done; 41 partial -> 41 partial; 34 missing -> 34 missing. BASE-AGENT-012 remains MISSING. No clause Status, Gap or Evidence cell was edited.

CLAIM BASE-AGENT-012 PARTIAL points=4 tests=tests/oncall-agent-action-submit-native-revision.mjs#actionSubmitNativeRevision
GAP BASE-AGENT-012: Remaining coverage, retention, job-handle and authority gaps persist. Contract remains MISSING.

## Validation and custody

Setup completed with 68 local migrations and the fleet owner; no setup credentials or owner links are selected for evidence. Build, typecheck, first-party check, lock generation/check and contract-docs check passed before the product push. Fleet author/committer identity, absence of trailers and all candidate messages were inspected. cloud-push.py succeeded at its first attempt; only the named cloud branch was pushed. No PR was created.

The first focused local invocation used --input-type=module. Miniflare propagated it to a CommonJS eval worker and blocked waiting for D1 RPC; an isolated Worker diagnostic showed require is not defined in ES module scope. The owned processes were stopped and the invocation corrected to node -e with dynamic import, without modifying the candidate. local-runtime-stall.json/log preserve that actual aborted attempt; the corrected focused test passes under both policies. Node 22.20.0, matching CI's repository pin, is used for candidate receipts.

Exact-SHA build passed on the clean candidate tree. The focused native-revision receipt passed. The complete agent flow passed in 664.769 seconds. The full browser command, including its resource-parity journey, passed in 421.352 seconds. All eight final checks passed on the same clean candidate SHA and tree; RESULTS.json holds their exact commands, timestamps, exits and log hashes. No result from the feeder's old Verify is treated as candidate CI.

The Mac publication scan is unavailable in this cloud by task instruction and remains the fleet lander's gate. No Base refresh, Base clone, deployment, self-submission, tag, release or unrelated repository write occurred. Evidence publication has separate custody and is never a product acceptance or landing signal.

## Final results

All checks completed on 1defe48f8ddfdb6739042df3dfa694af954161c0 with clean tracked files before and after each command:

| Check | Exit | Seconds |
| --- | --- | --- |
| candidate-build | 0 | 13.573 |
| focused-native-revision | 0 | 15.281 |
| agent-flow | 0 | 664.769 |
| agent-browser | 0 | 421.352 |
| candidate-typecheck | 0 | 4.998 |
| candidate-first-party | 0 | 2.061 |
| candidate-contract-docs | 0 | 0.195 |
| candidate-lock-check | 0 | 0.371 |

Exact-SHA Verify: completed/success, run 44103305566, https://github.com/just-every/run-oncall/actions/runs/44103305566. Five CI REST calls total, with at least 300 seconds between discovery and polls. No dispatch, rerun, failed-job archive read or PR API call was needed.

The 16 selected browser screenshots cover main's optional-revision and the feeder's required-native-revision follow-up screens at 1440 and 390. Every selected capture reports fits=true, serious/critical=0 and undersized-controls=0. Native pending approval was visually inspected at both widths; the executed phone screen was also inspected. The actual browser test asserts one sponsor approval POST for the native-revision story; screenshot reloads and completed-result retries do not add another. Browser assertions run at 1440. The evidence URL is not fetched.

No blockers remain for this candidate. The normal fleet publication/landing gates still apply; READY is candidate custody and does not claim landing. The clone and dependencies are deleted after the report-only evidence push and ref verification, as required. The actual packet remains outside that clone.

Plan: PLAN.md. Machine-readable results and all command receipts: RESULTS.json and the named per-check JSON/log files. Product ancestry and complete diff: ancestry.json and product.diff. Browser hashes and measurements: browser/INDEX.json. CI custody: ci-receipt.json and its discovery/poll observations. The two aborted module-mode diagnostic invocations are preserved separately and are not included among the passing required checks.

Signed: Run Edit Run fleet, 2026-11-17T14:52:55Z.
