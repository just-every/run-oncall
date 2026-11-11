# Oncall Events API recovery and source setup

Repository: just-every/run-oncall
Branch: cloud/main-oncall-events-recover-1
Product head: 40f8f21cedd03a2debcf21f9e6853c2344f51238
Base main: 10340960f5cc7a5e17734d65476817129dbab896
PR: none; the requested branch is left for the fleet lander.

## Result and cause

Both requested product changes are implemented. The pre-fix browser reproduction sent Critical Trigger, visited Alerts, returned to the same source, then sent Warning Recover with the same title. The source test form kept its identity only in component memory. Navigation created a different random dedup key and lifecycle generation, so native intake correctly created a recovered tombstone for that different pair while leaving the original critical alert active. A direct public-route Recover with the original key and generation closed the original alert. Severity was not the native pairing key. No ingestion semantics changed.

The native test form now initializes key, generation and title from the current source’s last accepted Trigger for the selected service and environment. Key and generation are visible editable fields; the form explains that Recover closes the matching alert regardless of severity and leaves a declared incident open. Returning to the source, including after a reload, retains its pairing via durable accepted event history. A post-recovery new Trigger uses a new generation, while compatibility senders retain their prior cycle behavior.

The creation confirmation reuses RequestExample: it now includes a copyable ingress URL and copyable curl request using ONCALL_SOURCE_KEY rather than embedding the private key. Signed sources have an HMAC-producing Node step followed by curl. Both copied commands were executed against the real emitted Worker with their one-time source key supplied only in the child environment. The empty native source opens its Sample request by default.

## Alert counts

| Candidate | Step | Total | Active | Recovered |
| --- | --- | ---: | ---: | ---: |
| Before | Critical Trigger | 1 | 1 | 0 |
| Before | Warning Recover after navigating away/back | 2 | 1 | 1 |
| After | Critical Trigger | 1 | 1 | 0 |
| After | Warning Recover after navigating away/back | 1 | 0 | 1 |

The after journey asserts the same alert ID and both event IDs, original Critical presentation, one recovered list row, recovered detail and the active nav badge. It declares a human incident between Trigger and Recover and proves it remains declared. before.json contains the actual pre-fix public-door observations; local-receipt.json records the passed regression outcomes.

## Plan and validation

PLAN.md retains the full execution plan. The implemented sequence was public-door reproduction, sender repair, source-setup reuse, extension of existing intake/browser journeys, touched checks, guarded early save, current-main merge, final source lock, exact-SHA branch Verify and separate evidence publication. Both main fetches found the clone current. Published commits were never rebased or force pushed. No default branch, PR or other repository was written.

Typecheck, production build, the extended tests/intake.mjs journey and focused tests/product-browser.mjs Events journey passed. Contract document check and edition source-lock check passed. Source lock was regenerated last before each final commit. The only change from the validated 6c808e0 tree to final head was explicitly selecting 1440 before the browser regression and regenerating that test’s lock hash; the final browser proof runs on final head. Build/typecheck and intake receipts retain their actual execution head and unchanged-source relationship rather than inventing a rerun. The final source check is repeated on final head.

No test registration was added or deleted: the existing intake and product-browser journeys are extended, and the suite registration plan is unchanged. This run did not request a cap increase. Browser assertions use 1440. Ten masked screenshots show creation confirmation, empty source, Recover form, recovered Alerts list and recovered alert details once each at 1440 and 390. Actual source credentials are masked in screenshots, never saved in the packet. Existing controls and brand styles were reused for this small additive form change.

Exact-SHA Verify 42982841021 completed/success on 40f8f21cedd03a2debcf21f9e6853c2344f51238. Five REST calls were used. The actual observations are in ci-receipt.json and CI.md. Full local verify was not run: the brief assigns the full wall to branch Verify. Fleet publication scan cannot run in this cloud; the fleet must apply it before landing. The changed-code credential-pattern review passed, all candidate authors/committers are fleet, no co-author trailers survived, and the guarded product pushes succeeded on their first attempt. This packet is report-only evidence and does not itself authorize landing or assert acceptance.

## Clause scope

No CONTRACT.md Status, Gap or Evidence cell was changed. ACCEPTANCE.md, docs/CLAIMS.md and summary counts were not changed. Existing OC-001 status remains unchanged; this run makes only a PARTIAL claim for its targeted lifecycle proof. Source creation usability is the owner’s 16 October setup rule; no new acceptance point is invented.

CLAIM OC-001 PARTIAL points=1 tests=tests/intake.mjs#OC-001 native Critical Trigger then Warning Recover; tests/product-browser.mjs#eventsSourceBrowser
DEFAULT OC-001: Prefill the last accepted Trigger for the current native source, service and environment; keep its generation explicit and leave human incidents open.

## Custody and limitations

The product branch contains only requested source/test changes and its source lock. Reports, receipts and screenshots are kept outside the product checkout and are published only to evidence/main-oncall-events-recover-1. No live monitoring provider, hosted deployment, paging delivery or independent publication scan is claimed. No blocker remains: local touched checks passed and exact-SHA Verify is green. The clone is removed only after successful product and evidence custody; the packet remains under the fleet work directory.

READY branch=cloud/main-oncall-events-recover-1 head=40f8f21cedd03a2debcf21f9e6853c2344f51238
