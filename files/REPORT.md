# Oncall test-event results

Repository: just-every/run-oncall
Branch: cloud/main-oncall-test-event-results-1
Candidate: b9e47fa70881e514b14d3ffed5a224bc7d1c6b5f
Base: 809d67a8fbf255ee13e8531e4246a1ffbddf2fa4
PR: none; this seed's branch candidate is handed to the fleet lander.

## Plan and scope

The full plan is in PLAN.md. Read the compatible receiver's lifecycle and allowance contracts; reproduce the findings through the emitted Worker/browser doors; restore an explicit compatible outage key and explain actual refusal reasons; extend the existing source browser journey without adding registrations; run touched checks and typecheck, refresh main and regenerate the source lock last, publish the named product branch, inspect exact-SHA Verify, and return reports independently on the evidence ref.

No receiver acceptance rule or allowance limit changed. No source kinds were added. No CONTRACT.md Status, Gap or Evidence cells, generated acceptance views, or unrelated product screens changed. Native Events API lifecycle semantics and secret-clearing behavior are retained; its existing clearing policy is now stated beside the key.

## Baseline reproduction

The original same-mounted-form PagerDuty Trigger and Recover succeeded when the private key was re-entered. It was important to distinguish that from the actual reproducible navigation defect. Trigger, visit Alerts, return to the compatible source and Recover produced a no-effect receipt and left one active alert, because compatible history was not supplied to the form. Successful sends also cleared the entered private key. See reproduction.json and reproduction-partial.json.

On an Events API source with New events per minute set to 1, the first valid test returned HTTP 201, and the next observation returned HTTP 429. The immediate browser result was “The receiver refused this test. Check the private key and sender settings.” See reproduction-allowance.log. Early diagnostic scripts stalled while trying to read collapsed/unfinished browser results; their observed response/status and immediate text were retained, and their owned processes were stopped.

## Result and receiver choice

PagerDuty's documented compatible door identifies an outage using source, service/environment and an explicit dedup_key. It does not infer an outage identity from its summary. The test form now carries a visible, editable Alert key (dedup key), sends it unchanged for Trigger and Recover, and restores the latest trigger's identity and title from protected event history on return. The receiver continues to derive its own lifecycle generation. A later Trigger can reopen the same outage key in a new generation.

Compatible test forms retain the private key in component memory between sends. Navigating away clears that memory; no secret is placed in storage or durable event history. The Events API form deliberately keeps its prior clear-after-success behavior and explains that beside the password field.

The immediate test result now reads the native or compatible error envelope. Temporary event/request throttles use the same explanation as Rejected requests, give the actual retry duration, and identify New events per minute or Requests per minute under Per-key rate allowance on the same page. Batch refusals give split-or-raise guidance. Authentication refusals give the current-key/rotation/signing step. Other known receiver diagnostics remain available rather than universally blaming the key.

## Local proof

- Build passed: cloud_run npx -y @runeditrun/rer build.
- Typecheck passed: cloud_run pnpm run typecheck.
- Focused emitted Worker/browser journey passed: ONCALL_PRODUCT_JOURNEY=events-source node tests/product-browser.mjs, through cloud_run with /usr/bin/chromium and --no-sandbox.
- The same existing eventsSourceBrowser journey now proves PagerDuty Trigger/Recover in the mounted form, a reopened generation followed by navigation/return/Recover, the actual transmitted visible dedup_key, retained private key between compatible sends, and absence of persisted key on return. Both generations are recovered and zero compatible alerts remain active. The Alerts list places both in Recovered.
- The journey also proves native allowance HTTP 429 with a real Retry-After and the allowance action, the same diagnosis after valid key rotation, unchanged accepted events/alerts on refusal, a compatible wrong-key HTTP 400 and a native retired-key HTTP 401 with authentication guidance. Existing native Critical Trigger/Warning Recover, incident independence, timeline and copied bearer/signed sample assertions remain intact.
- Behavior assertions run at 1440. Changed form/results and Alerts screens are captured at 1440 and 390; the existing timeline phone assertion remains in its original journey. Visual inspection confirmed the compatible recovery form, recovered phone list and allowance phone result fit and remain readable.
- One initial test attempt passed the product assertions then timed out trying to read the collapsed Rejected requests list. The test now opens its disclosure before reading it. The unchanged behavior assertions passed on rerun; browser.log is the successful receipt.
- Source lock regenerated with node scripts/edition-authoring/cli.mjs lock and passed its check. Contract documents check passed with 0 errors/0 warnings and current views. git diff --check passed.
- Main was fetched and the unpublished branch rebased with the fleet identity before the candidate commit; main was unchanged. The lock was regenerated last. Local checks ran on the final source changes before commit; exact-SHA Verify is separately recorded.

See local-checks.json, browser/test-event-receipt.json, browser.log, typecheck.log, build.log and contract-docs-check.log for actual receipts.

## Before/after counts and clauses

Compatible active alerts after navigation/Recover: 1 before the fix -> 0 after, with 2 compatible generations proved recovered. Added test registrations: 0; the existing browser journey was extended. Configured verification commands remain 16 -> 16 (this is a command count, not a claim that all internal scenarios are separate registrations). Contract totals remain 26 done / 41 partial / 34 missing, 101 total -> unchanged. Clause status changes: none.

CLAIM OC-055 PARTIAL points=none tests=tests/product-browser.mjs#eventsSourceBrowser
CLAIM OC-084 PARTIAL points=none tests=tests/product-browser.mjs#eventsSourceBrowser
DEFAULT OC-055: Carry an explicit visible editable dedup_key, restore it from the protected trigger, and let the compatible receiver own generation order.
GAP OC-055: This bounded form regression does not establish whole incumbent-monitor, cross-vendor, routed-scope or paging acceptance points.
GAP OC-084: Native form allowance/rotation diagnostics are proved; whole-key, timed-window, routed, email and capacity acceptance remain outside this round.

No DONE claim is made. Existing clause judgments and unrelated legacy text are untouched.

## Publication and custody

The first real commit was pushed immediately via the required cloud-push.py guard, on its first attempt. Product changes consist only of the three integration source files, the existing browser test and the regenerated source lock. All candidate commit identities, including side parents, were inspected with the required origin/main..HEAD log and validated as fleet author/committer with no trailers. Fleet commit hooks remained active. No force push, main push, published-history rewrite or PR was performed.

The product diff was checked for credential-shaped literals. The fleet Mac owns the publication scan and landing, as the cloud adaptation requires. Reports, receipts and browser proof are kept outside the product clone and will be published only to evidence/main-oncall-test-event-results-1. Evidence publication conveys no READY, acceptance or landing signal.

## CI and terminal result

Exact-SHA Verify run 43354439663 is in progress on b9e47fa70881e514b14d3ffed5a224bc7d1c6b5f: https://github.com/just-every/run-oncall/actions/runs/43354439663. Polling respects the ten-call budget and 300-second interval. The initial discovery accidentally used a wrong abbreviated SHA and returned no runs; no result from it is treated as candidate evidence, and the next discovery is delayed 300 seconds and uses the full candidate SHA. Final exact-SHA status and any blocker will be appended here with actual run/job receipts.
