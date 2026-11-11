# main-oncall-readable-times-1

Repository: just-every/run-oncall
Product branch: cloud/main-oncall-readable-times-1
Product head: 669b0c877ca659e5475e4ed2016fe584ac3d859d
Integrated main: b246467 (rer 0.2.108), retaining bb04c4b (incident-lead preservation). No PR is required by this repository's branch landing rules, and none was opened. Product publication used only the named cloud branch. The fleet owns landing and the publication scan.

## Plan and scope

The complete execution plan is in PLAN.md. The work reproduced the reported screens through native setup, protected HTTP and the emitted Worker browser, using Australia/Brisbane as the browser zone and America/New_York as the rota zone. It then changed presentation, extended existing public journeys, checked the touched code, refreshed main before committing, regenerated and checked the source lock last, and published the candidate with fleet identity and the task-side push guard. Reports, receipts and screenshots are kept outside the product checkout and published separately through the evidence ref.

Scheduling algorithms, stored instants, identity and paging authority were not changed by this candidate. The newly landed main incident-lead code and assertions and rer 0.2.108 update were retained. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md have no candidate diff. No clause Status, Gap or Evidence was edited; no DONE claim is made.

## Results

Readiness now formats release observation times, per-signal observations, accepted receipt times and timestamp-valued health measurements as readable local dates carrying their canonical zone and current GMT offset. Maintained test references remain in the protected /api/readiness response and are omitted from the everyday page.

Rota previews show readable zoned start times rather than ISO strings. Rota zone names retain their canonical IANA spelling, including America/New_York, in the picker, check step, preview, overview and cover sheet. Each overview hand-over and gap time identifies its own rota zone. The multi-rota weekly band axis explicitly identifies its browser zone; a single rota's two-week bands use the rota's zone. Cover, swap, reminder and history times use the same named rota clock. Stored and reviewed PTO intervals are formatted as local zoned dates. Review and PTO input labels state UTC in parentheses and preserve their existing UTC interpretation.

Incident header, timeline, deadline, retained workflow and previous acknowledgment timestamps use the shared readable zoned formatter. The named zone and GMT offset describe the instant being shown. Browser-time incident pages therefore identify their own clock even when the rota is elsewhere.

## Before and after

BEFORE.json contains the actual public-door observation on 07eefee5c8f62aa2e56574e7a5e36a582e598198. Readiness showed 8 ISO-shaped timestamp occurrences and 18 lines containing tests/ paths. The new rota preview showed an ISO start and America/New York; overview gaps omitted a zone; the New York detail bands used Australia/Brisbane.

AFTER.json contains the same public-door probe on the product head. The readiness ISO/path occurrences are zero, the preview has no ISO timestamps, overview gap and hand-over times identify America/New_York, and detail bands use America/New_York. Incident dates identify Australia/Brisbane.

Test registrations added: 0. Existing verification-plan invocations remain 16 to 16, with 12 unique registered assertion scripts. The existing browser journeys were extended; no test-budget file was added or cap increase requested. The contract summary remains 22 done, 45 partial and 34 missing (101 total), before and after; this work makes no status promotion.

## Local verification and proof

CHECKS.json and PRODUCT.json are actual receipts for the committed candidate. Setup used the fleet owner address. The production build, TypeScript check, focused emitted-Worker browser journeys, source-lock generation/check and git diff whitespace check passed. The focused browser run was repeated after main integration on each pushed candidate; the final run uses the pinned Node 22.20.0 and the exact final product SHA. The retained-preview regression also passes with the committed test source, with all original retention, no-save and timestamp assertions preserved.

The focused run selects existing keyboardCoordination, scheduleCoordinationBrowser, coverageRulesBrowser and readinessBrowser flows. Assertions run at 1440. It covers native incident declaration and attributed timeline dates, a real stale-write refusal, native rota creation with a different browser zone, preview/gap clock labels and retained instants, substitute password sign-in and swap acceptance, effective coverage, history, calendar revocation, self-PTO and ICS reviews, stale proposal refusal and readiness refresh. Existing accessibility, hydration, protected-readback and zero-write assertions remain. It asserts date shapes and zone/instant agreement rather than fixed UI prose.

Changed rota, overview, history, new-rota, readiness and incident screens have visual proof at 1440 and 390. The phone timeline's existing nowrap layout clips the tail of a long offset; the canonical zone remains visible. This is the separate timeline-layout item excluded by the brief. Source and browser evidence contain synthetic records only. Initial harness-only failures (a redundant Chromium timezone override and an ambiguous person-picker selector) were corrected before the passing candidate run; no product assertion was removed to obtain a pass.

## Claims and limits

CLAIM OC-009 PARTIAL points=none tests=tests/product-browser-journey.mjs#keyboardCoordination
CLAIM OC-020 PARTIAL points=none tests=tests/product-browser-journey.mjs#scheduleCoordinationBrowser
CLAIM OC-025 PARTIAL points=none tests=tests/product-browser-journey.mjs#scheduleCoordinationBrowser
CLAIM OC-054 PARTIAL points=none tests=tests/product-browser.mjs#readinessBrowser

These are bounded presentation observations; they do not prove every obligation of any numbered acceptance point in these broader clauses.

DEFAULT OC-020: The overview's shared band axis explicitly uses the browser clock; individual rotas and the detail band axis use each rota's named clock.
DEFAULT OC-025: Existing review and PTO inputs retain UTC interpretation, explicitly labelled UTC; no scheduling or stored-time conversion was introduced.
GAP OC-054: Live operational readiness, load, independent missed-deadline alarms and the real-device cutover checklist are outside this display-only round.

## Custody and CI

The candidate author and committer are Run Edit Run fleet <fleet@runeditrun.com>. All candidate messages and identities were inspected before the guarded push, including side parents; there are no trailers. Both product pushes succeeded on their first attempts. The first product head was 46054a9e371e97591213c9625ab939770fdea1bd; the final push adds main integration merge 5fbd281866c12d3a082369b19299ef4f5c5fabcc and test correction 669b0c877ca659e5475e4ed2016fe584ac3d859d. No published history was rewritten. The product tree contains only requested source/test changes and sources.lock.json; evidence is published separately.

Initial exact-SHA Verify 42996167998 on 46054a9e371e97591213c9625ab939770fdea1bd failed in browser job 130441870194; plan, build and every other executing shard passed. The final aggregate failed because the browser shard failed. CI-initial.json, failed-jobs.json and the once-read failed-browser.log preserve the actual result.

The failing existing retainPreview helper intercepted both draft requests and a background saved-rota read on /api/paging/preview. A local diagnostic reproduced its mismatch: expected October 2026 saved coverage, while the editor correctly showed the March 2027 London draft. PREVIEW-DIAGNOSTIC.json and schedule-diagnostic-failure.log preserve that observation. The helper now delays only draft requests, waits for those requests to settle, requires a successful final draft response, and compares the same rendered timestamp array. It also performs an explicit saved-rota HTTP read while the draft answer is held, to exercise the formerly ambiguous case deterministically. No assertion was removed or relaxed. The corrected journey passed, including a browser-only CPU-throttled run; schedule-probe-fixed.log records the passing deterministic regression.

Final exact-SHA Verify: 43000194439, https://github.com/just-every/run-oncall/actions/runs/43000194439 , completed/success on exact head 669b0c877ca659e5475e4ed2016fe584ac3d859d at the 10:17 UTC REST observation. CI.json and ci-watch.log record the final candidate's actual REST observations. Six calls were used for the first run and its diagnostics, leaving four for the final candidate. The final watcher delays its first read, then polls no more often than every 300 seconds.

The interim report-only evidence commit 6db48de3445446660aa45d778770d9a232db62a9 was fetched back and its 29-file manifest and hashes were verified, tied to the initial product head. EVIDENCE-initial-check.json preserves that actual transfer receipt. A final evidence publication carries this updated report and both runs' receipts; evidence publication is separate from product READY and landing.

Terminal product custody: READY on 669b0c877ca659e5475e4ed2016fe584ac3d859d. Exact-SHA Verify 43000194439 passed. Total GitHub-call budget used: 8 of 10. Remote product head is independently matched and the checkout is clean. No blockers remain; no PR was opened. The requested clone cleanup follows successful final evidence publication. No publication scan, acceptance promotion or landing is claimed by this report.
