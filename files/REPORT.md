# sd-oncall-c-f262-lin-1 results

Author: Run Edit Run fleet. Date: 2026-11-17T19:46:22.790011+00:00.

Repository: just-every/run-oncall
Product branch: cloud/sd-oncall-c-f262-lin-1
Candidate SHA: 9599328319a1776018f01965b581656e285324b4
Parent main SHA: ecdacdd840fcc4f87f8147c8df1175d6f2d6fb85
Feeder SHA: 709a43a790f9aadee8b50d89de1a12a872464934

## Plan and implementation

The complete plan is in PLAN.md. Fetch fresh main and feeder; identify only f262's two commits; apply their net changes on main as one ordinary commit; retain newer main assertions; regenerate the installed package source lock last; verify the exact SHA; audit identity and publication hygiene; push only the named branch; require exact-SHA Verify; return this complete non-secret packet on its separate evidence ref.

Applied the net changes of 9cc53e2b8b09057528fdf501a01127c7cde1300d and 709a43a790f9aadee8b50d89de1a12a872464934. The only candidate changes are the new response-loss helper, its HTTP flow invocation, its browser invocation and sources.lock.json. The helper is byte-identical to the feeder. No contract or generated document edits. No application changes, Base refresh, other repository clone, deployment, tag, release, self-submission or main push.

The proof discards the completed MCP result at HTTP headers without reading its body, establishes the original terminal call and one native effect in D1, then retries identical arguments with a new JSON-RPC id. Autonomous and held policies must return the stored outcome without repeating submission or approval. The held path consumes the pending response and makes exactly one signed-in approval POST. The submitted human-review follow-up stays owned, due-dated, P1 and awaiting human acceptance, with one revision increment and state-changing native audit, unchanged replay/approval/review/paging custody, a linked retry-attempt audit and zero outbound requests or evidence-URL fetches.

Main's native required-revision and aged-result retention proofs remain intact. scope-check.json proves that removing only the new additions recovers both main test files byte for byte. feeder-difference-explanation.md explains every newer-main difference against the feeder, supported by diff-from-main.patch and diff-from-feeder.patch.

## Counts and clause scope

Before/after: root verification plan lane registrations 21 -> 21; push shards 8 -> 8; lanes 12 -> 12; candidate merge commits 0; round-only feeder commits 2 -> 1 ordinary candidate commit. Three test paths added/extended; no new separately registered verify journey and no assertions removed or weakened.

CLAIM BASE-AGENT-012 PARTIAL points=2 tests=tests/oncall-agent-action-submit-response-loss.mjs#actionSubmitResponseLoss; tests/agent-door-browser.mjs#actionSubmitResponseLoss
GAP BASE-AGENT-012: Remaining coverage, job-handle and authority gaps persist. Contract remains MISSING.

Clause status changes: none. Status, Gap and Evidence cells were never edited. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain byte-identical to main. This selected completed-result recovery observation does not complete BASE-AGENT-012, authorize paging or prove live delivery.

## Local verification

Setup passed using the pinned rer 0.2.118 and pnpm 10.12.4, with 68 migrations and its temporary app stopped. Node is 24.19.0; the supplied toolchain retains a newer installed Node than the requested 22.20.0 minimum. Typecheck, first-party check, source-lock check and generated contract check passed on the candidate; machine-readable exact-SHA receipts accompany the actual logs. The initial unpublished lock omitted the then-untracked new module; the lock check detected this, it was regenerated after staging, and the unpublished commit was amended. Initial receipts retain that failed attempt honestly.

The full touched HTTP journey passed in 628.30 seconds, including actionSubmitResponseLoss under both policies and all newer main assertions. The complete touched browser script, including its shared resource parity wrapper, passed in 400.45 seconds. Chromium /usr/bin/chromium used --no-sandbox; the journey asserts at 1440 and the eight selected changed approval/submission screenshots cover 1440 and 390. The held follow-up proof was visually inspected at both widths. The exact-SHA candidate build passed in 12.02 seconds, and the post-build source-lock check passed. All receipt heads equal the product SHA above. The product branch was pushed successfully on the first guarded attempt; exact-SHA Verify completed successfully.

## Custody and limitations

This packet is report-only evidence. Its publication does not signal product acceptance or landing. The fleet independently applies its publication and landing gates, and this task does not land main. No private held-out material, credentials, environment dumps or symlinks may enter this packet.

## Publication preflight

The packaged Base publication preflight was invoked on the exact SHA with public main as its baseline. It returned INCOMPLETE, exit 2, rule scan.gitleaks-unavailable: Gitleaks 8.30.1 is not installed on this cloud VM. It scanned zero commits and is not a COMPLETE publication receipt. The assignment explicitly reserves the fleet publication scan and landing for its own machine; that mandatory independent gate remains deferred. The cloud instructions reserve this mandatory scan for the fleet; no local completeness claim is made. No main/default branch was written.

## Product push

Guarded product push succeeded on attempt 1 at 2026-11-17T20:00:21Z. All candidate author and committer identities are Run Edit Run fleet <fleet@runeditrun.com>; no commit trailers. The final candidate message has no CI-skip marker. The branch contains exactly one ordinary commit, with fresh main as its only parent. No PR was opened; Verify has a branch-push entry point. product-push.json and product-push.log record actual transport custody.

## Exact-SHA CI and terminal result

Verify run 44164645057 completed/success on 9599328319a1776018f01965b581656e285324b4, observed through the run-specific REST endpoint at 2026-11-17T20:15:49Z. URL: https://github.com/just-every/run-oncall/actions/runs/44164645057. Discovery and all three polls are included as actual JSON receipts. Four GitHub calls were used, with at least 300 seconds between reads of this run. No workflow retry or manual dispatch, no PR, and no failing-job log reads.

Product custody: READY on cloud/sd-oncall-c-f262-lin-1 at 9599328319a1776018f01965b581656e285324b4. Product blockers: none. The fleet publication scan is still mandatory before landing and is explicitly deferred to its machine by the assignment. This builder neither submits nor lands the product.

The packet contains the complete plan, full actual local command logs and exact-SHA receipts, initial failed-lock receipts and their correction, source and scope provenance, both actual diffs and their explanation, the eight selected browser images and hashes, the guarded push receipt, and the final exact-SHA CI receipts. It is published only to the report-only evidence ref. Its manifest and exact transport head are returned separately by the publisher, without placing reports on the product branch.

POST lanes/sd/INBOX.md: sd-oncall-c-f262-lin-1 re-applied f262 as one linear commit 9599328319a1776018f01965b581656e285324b4 on ecdacdd840fcc4f87f8147c8df1175d6f2d6fb85; Verify 44164645057 success; BASE-AGENT-012 claim PARTIAL point 2, no clause status/cell changes and contract MISSING; registrations 21->21, shards 8->8; local HTTP/browser/typecheck/first-party/build/lock checks pass; fleet publication scan remains deferred; no PR or self-submit.
