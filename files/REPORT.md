# Oncall OC-043 unmatched service alerts

Run Edit Run fleet · 2026-11-19 00:07 UTC  
**Product branch** cloud/sd-oncall-c-f293  
**Product commit** 8ebbda5bff4b31e24deb83cb7024c5176f7f8e79  
**Base main** df8efefe31a9813ebc5aa3f0c2a319c19e2667d7  
**Branch Verify** push Verify 44423580620, completed, success  
**Candidate Run site and main equality** pending guarded landing.

## Plan and result

- Carry forward the existing OC-043 judgment. The plan extract's OC-043 row gains acceptance 2's service-bound unmatched queue. Its f277 hold on unattended continuation and live responder delivery remains.
- Use the signed-in Alerts list and its existing filters. The queue uses the first retained trigger's admission decision together with current alert state, service association, owner and suppression. Selecting an alert shows the exact retained admission reason in Event context. Later policy edits and trigger decisions leave that admission reason intact. The active filter survives selection and returning to the list. Clearing it restores the ordinary cohort.
- Reuse the emitted Worker and the product browser core journey. Native routed admissions seed missing policy and unavailable responder cases. Five controls cover a routed alert, a suppressed alert, an integration-unrouted incomplete alert, a recovered alert and an alert that now has an owner. The protected workspace read supplies the alert IDs and the distinct admission reasons. The journey sees both reasons and the queue at desktop and phone widths. Protected records, revisions, permanent audit, paging and the outbound ledger compare equal before and after the reads.
- The detail journey also reads the three protected service runbook steps in order before declaration. The declaration control is available, and the journey leaves it unused.
- Before and after the change, the contract lists 26 DONE, 41 PARTIAL and 34 MISSING, for 101 clauses. OC-043 stays PARTIAL in the product source. The Status table, Gap, Evidence and acceptance wording compare equal to main. The contract generator wrote zero documents and its check passed. The edition source lock is fresh with the pinned tool. The product branch contains only app, test and lock changes.

PROBE OC-043 2: signed-in Alerts with native retained triggers and five controls → two exact alert IDs and original reasons, ordinary cohort restored after clearing, protected state, revisions, permanent audit, paging and outbound ledger unchanged.

CLAIM OC-043 PARTIAL points=2 tests=tests/product-browser-journey.mjs#unmatchedAlertQueue

GAP OC-043: Unattended continuation and live responder delivery remain held under OC-027, OC-026 and OC-042. Broader workflow failure visibility and activation, additional timers and delivery, reference load, production paging, provider, standby, real-phone and cutover evidence remain held.

## Acceptance and inherited duties

| Point or duty | Result and proof |
| --- | --- |
| 1 · Correlation, replay and maintenance | Existing scoped routing proof covers linked and unlinked provider events, time windows, audit rollback, maintenance expiry at next admission, immutable originals, ordered read-only replay and restart. Browser-closed timers remain held. tests/routing.mjs:532 and tests/routing.mjs:559. |
| 2 · Retained decisions, intended actions and queue | Selected queue slice proved by unmatchedAlertQueue at desktop and phone widths. Existing intended-action and workflow interruption evidence remains in triageBulkBrowser. Broader failure visibility remains held. tests/product-browser-journey.mjs:1654 and tests/product-browser-journey.mjs:1406. |
| 3 · Routing precedes service orchestration | Existing native routed and provider journeys exercise both retained rule versions, audit and no-write replay. tests/routing.mjs:8 and tests/routing.mjs:602. |
| 4 · D-1 and OC-041 rollback, erasure and interruption | Inherited evidence for explicit workflow interruption, premature and expired clearance, and unchanged paging is retained with f277. The browser recheck passed. tests/product-browser-journey.mjs:1406. |
| OC-056 and OC-057 | Recovery stops its own recorded obligation while keeping a declared incident open. Admission applies versioned urgency and severity rules without replacing source evidence. Existing routing proof rerun. tests/routing.mjs:785. |
| OC-023, OC-072 and OC-083 | Public service runbook read was rechecked before declaration. Existing scope and integration-unrouted custody remain. Team, privacy, import and provider tasks are held. RL-102 reserves the OC-072 Explanation and replay paragraph and original acceptance points 4 and 6 for OC-085 under the documented cleanup or stack condition. |
| OC-027, OC-026 and OC-042 | Unattended steps and actual responder delivery are held. Paging is OFF. |

## Predecessors

- f277 branch head b4c3ab269146796413a9943566b017c6f8df22f2 was integrated as dfdd89469d3b2b2d552e39137cacc7b64633ddb1, an ancestor of the base. Verify 44278366871 and Run site 44278366884 completed successfully on the integrated commit. The workflow assertions remain present on the candidate.
- f288 head 911992df4f14fa2334bd31600ea2157ddbecc5ab is on its branch. Its changes are contract observation text and lock. Its Verify 44407948988 completed with build and every shard green. The generated-document check failed in job 135168304920 and the aggregate gate failed in job 135177131611. The product already exposes pre-declaration runbooks, and the candidate rechecks that through the same signed-in detail. f288's contract observation remains with its own landing.
- Base main df8efefe31a9813ebc5aa3f0c2a319c19e2667d7 had exact-SHA Verify 44420542831 and Run site 44420542819 completed successfully. The pinned contract cleanup at 9e40e7119e1afdfcf7c2a1f1de191682d50387a5 is an ancestor of main. The pinned Base and release gates follow the maintained landing process. The cloud packet leaves scan completeness, history scanned and findings pending the lander’s full-history scan.

## Riders

| Row | Observation |
| --- | --- |
| 1 | The selected queue outcome is proved at both widths. Unattended workflows, live delivery and broader failure visibility remain held. See the acceptance rows. |
| 2 | Two distinct native positive cases and five real controls reach the signed-in Alerts door. Exact IDs, reasons and unchanged durable state are asserted at tests/product-browser-journey.mjs:1721. |
| 3 | The journey runs through product-browser.mjs in the ordinary push browser shard. The exact candidate has push Verify 44423580620, completed, success. |
| 4 | The two focused width runs used a Worker built from the exact candidate commit. The pre-push routing and core browser runs used identical app and test sources. See RECEIPTS.json for provenance. |
| 5 | OC-043 cites D-1 and names inherited rule duties. The contract and its mappings are intact. |
| 6 | Contract views check passed. OC-043 remains PARTIAL with the base judgment and counts. |
| 7 | Acceptance text and coverage map match main. The OC-072 split stays on its approved path. |
| 8 | The presentation uses the existing session-protected workspace. The new display shares the existing authority checks and reads the retained workspace projection. Native credential and replay boundaries were rechecked by tests/routing.mjs:8. |
| 9 | Provider, standby, paging and real-phone evidence remain held. |
| 10 | Existing policy and authority govern the read. |
| 11 | Main equality, complete full-history publication scan and candidate Run site await guarded landing. |

The changed controls have text labels and reuse existing Alerts controls and styling. The queue and both details were captured at 1440 and 390. All prior assertions remain active on their existing paths. The selected product diff and evidence text contain no email-shaped strings.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0
