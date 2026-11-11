# Status and rota refusal explanations

Task: main-oncall-explain-refusals-1
Repository: just-every/run-oncall
Product branch: cloud/main-oncall-explain-refusals-1
Baseline: 07eefee5c8f62aa2e56574e7a5e36a582e598198
Intermediate published save: 42609deb77265868d16bb51eaedb56f06e06bc42
Final product head: 347265e1efe5b5ace2ea575d316ea97336dbca21
Integrated main: bb04c4bb7bb5ed8f0962325daf8a5d79d440452c
PR: not required by this repository’s branch landing rules; none opened.

## Plan and baseline

PLAN.md contains the complete executed plan. The unchanged app was built and exercised through its emitted Worker, public setup/session and protected HTTP doors, and Chromium. No production account was used. In Status, Checkout / Payments / a communications owner / no supporting service left status records unchanged, with zero inline alerts and an invalid supporting-service control. Ana Ruiz / Primary / 12 November 10:00–16:00 produced a disabled reviewed Apply action with no accessible description or enabling instruction beside it. reproduction.json and before screenshots retain those observations at 1440 and 390.

## Changes

- Status business-service create: persistent inline native-constraint errors identify the invalid field; the first invalid field receives focus. Supporting services retains its required multiple selection. The error is inside the field label, associated by aria-describedby and marked aria-invalid. No invalid request reaches the write endpoint.
- Status member subscriptions and email-list creates: the same opt-in validation covers their required controls and email constraints. Existing server refusal handling stays beside the initiating action and keeps the draft. A real overlength business-service name is refused by the server and its returned reason appears on the page without a Saved claim; correcting it then creates the service.
- Status manual override confirmation: a line beside the disabled Set status action asks for the required reason and describes the button. Existing reason, authority and save behavior are preserved.
- Rota create/edit: native required and range errors become persistent field-associated messages with focus. A whitespace-only rota name now produces an explicit refusal instead of returning silently. The preview-dependent Create rota / Review change button names the invalid proposal or the need for a successful current coverage preview.
- Cover a shift: missing From/To values get inline associated errors with focus. Existing server review/apply failures remain visible.
- Reviewed schedule apply: one line immediately beside disabled Apply reviewed change names the review checkbox; the explanation disappears when checked and changes to applying feedback while busy. The shared component also covers rota edits, PTO reviews and cover removal.
- Request a swap: the disabled Request button names the missing substitute beside it and through aria-describedby; choosing a substitute enables the existing flow.

Audited without requiring a new repair: calendar-link create/revoke and swap approve/accept/decline already use FailureLine; PTO add/upload already reports and focuses its outcome; rota settings and status self-subscriptions already use SaveFeedback. Existing required fields, intervals, review authorization and server rules are unchanged. The layout and override review were preserved.

## Validation and test budget

Existing member-coordination-browser.mjs and product-browser-journey.mjs are extended; no test registration, suite command, skip or weakening was added. The verification plan remains 16 commands before and after, across the existing seven push shards. There is no test-budget.json; the shipped cap is 200. No cap increase is requested.

The Status extension asserts invalid field presence and placement, aria association, focus, no write request, unchanged status, a real server refusal reason, retained draft, and successful correction. The rota extension asserts invalid name and cover-end focus, an adjacent checkbox explanation for disabled Apply, and a substitute explanation with zero saved swap before selection. Existing keyboard, protected saved-state, stale-write, coverage-preview, axe and hydration assertions remain.

A first local member-journey attempt passed the new create refusal assertions, then failed in screenshot capture because the create form had closed. The proof helper was corrected to capture the actual confirmation action; no product requirement or assertion was weakened. The rota regression also caught input-capture cleanup interfering with controlled typing. Cleanup now happens in the bubbling change handler, after the field owns its edit, and only for an existing error. Final results and provenance are recorded in RECEIPT.json.

Screenshots are proof artifacts only, kept out of the product branch. Behavioral assertions run at 1440; changed-state screenshots are captured at 1440 and 390. Full local verification is intentionally delegated to the exact-SHA branch Verify, per the brief.

## Contract and landing

CONTRACT.md, its Status/Gap/Evidence cells, ACCEPTANCE.md and docs/CLAIMS.md are untouched. Before/after status counts remain Published 16 done / 6 partial / 0 missing; Target 6 / 39 / 34; All 22 / 45 / 34 (101 clauses). No clause is promoted and no DONE claim is made. The bounded validation and accessibility slice does not complete a whole OC-009 acceptance point or the broader OC-024/025/061 obligations.

CLAIM OC-009 PARTIAL points=none tests=tests/product-browser-journey.mjs#productSchedule
GAP OC-009: This round proves local refusal feedback only; complete BASE-ACCESSIBILITY-001 and the named assistive-technology passes are not claimed.

Product custody and report publication are separate. Only the named cloud branch is pushed. Its first real save was published with skip-ci; the final candidate carries no skip marker. Main’s incident-lead changes and newer browser assertions were merged into the published branch without rebasing it. The source-lock conflict was resolved from main and regenerated from the final source; contract generation and lock checks pass. Base's full publication scan and landing remain with the fleet Mac under the cloud adaptation. The evidence ref is report-only and supplies neither acceptance nor landing authority.

## Candidate results

On 347265e1efe5b5ace2ea575d316ea97336dbca21, typecheck, app build, generated-contract check, source-lock check, the existing productSchedule / coverageRulesBrowser / scheduleCoordinationBrowser functions at 1440, and the complete member-coordination browser script all pass. The candidate public-door repro also passes: invalid create retains exactly the prior status records and has one associated inline error rather than zero; the disabled cover Apply action has its enabling checkbox explanation. The two named silent stops are 2 before / 0 after. New-rota missing-name, pending-preview and cover-end messages have 1440 and 390 proof, as do Status required-support, server refusal, manual-reason, cover-review and swap-substitute states.

Push custody: the fleet guard reports PUSH_OK for the named branch at this exact SHA. Verify run 42997501414 was discovered on that head through REST; CI.json records every subsequent observation and the call count. Evidence transport is separate from this product custody.
