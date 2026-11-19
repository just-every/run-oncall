# OC-060 alert triage chronology

Run Edit Run fleet · 19 November 2026 · sd-oncall-c-f295

- Repository: just-every/run-oncall
- Product branch: cloud/sd-oncall-c-f295
- Product head: c912d12f2dced5b7255890ba7c53fb4cf1474f86
- Published save: 19c85e457bc942addd88ca9bcbf0f866abc0c3bb
- Main when the candidate was pushed: d376e47b188ba8688ec7413341363fc7723c99dc, which contains the planner's baseline 2235b7592b388c9ea6a8320a9f929a90ed2b754d and f283's explicit unassignment.
- Counts before and after: 26 DONE, 41 PARTIAL, 34 MISSING, 101 total. OC-060 is PARTIAL. The Status table and the original three numbered acceptance points are byte-for-byte identical to main.

## Plan and result

1. Read OC-060, the plan extract for replan 83, the published judgment and the relevant rulings. The selected work is the updated-time portion supporting acceptance 1. Preserve the existing 50-incident storm, low-alert lifecycle and explicit unassignment proof.
2. Compute alert-only chronology from the latest retained event acceptance for that alert generation and the latest human coordination timestamp. Feed the same projected timestamp into updated bounds and Recently updated ordering. Retain the first accepted event as the creation time, the existing receipt or date fallback for eventless rows, and the existing ordering tie-break and cursor contract.
3. Use the real native ingress and human coordination doors with fixed clocks. The older alert and its newer same-key generation are distinct. The older alert's early human entry precedes its later recovery at 10:15 UTC, while a third alert's human acknowledgment at 10:20 UTC follows its source event. Protected state and ingress receipts show exact identities, revisions, event acceptance and human attribution. Exact recovery replay at 10:25 UTC returns the original event identity and timestamp and preserves protected state.
4. Test the same cohort in protected HTTP and signed-in browser. Recently updated returns the human-coordinated alert, the recovered older generation, then the untouched newer generation. Newest created returns the untouched generation, the human-coordinated alert, then the recovered older generation. The fixed intervals isolate the recovered and untouched rows on their lower boundaries and exclude rows on their upper boundaries. A range starting at retry time is empty. One-row cursor pages retain order and revisions. The browser uses existing kind, service, sort and time controls, reopens the shared URL, and matches the exact HTTP IDs. The two evidence images show the reopened filtered view at 1440 and 390 viewport pixels.
5. Preserve and compare durable records, revisions, permanent audit, paging and outbound-request ledgers during protected reads. Run the touched HTTP and browser journeys and typecheck. Add only a dated observation to the clause body. Regenerate and check the views locally, restore the lander's view files from main, then regenerate and check the pinned source lock.
6. Push the named branch, discover and poll the candidate's exact-SHA push Verify, and return the report and check receipts through the evidence ref. The Mac lander retains the predecessor and release gates, exact-SHA full-history publication scan, final generated views, guarded landing and Run site.

The captures show Recently updated and both filter values after reopening the shared URL. [1440-pixel viewport](OC-060-updated-range-1440.png) · [390-pixel viewport](OC-060-updated-range-390.png)

## Verify outcome

Push Verify 44525584397 completed on c912d12f2dced5b7255890ba7c53fb4cf1474f86. The build, full-push proof and all eight test shards succeeded. The workflow reported failure because the contract-docs job failed on the lander-generated ACCEPTANCE.md and the final coverage guard depends on that job. The local write and check succeeded, then the generated files were restored from main as required. The view-only failure meets the fleet's branch handoff rule. Main advanced to 4eadad478aa00b538a9750a6727306937a4fd54c after the candidate push. Reconciliation, publication scanning and candidate Run site remain with the guarded lander. [Verify 44525584397](https://github.com/just-every/run-oncall/actions/runs/44525584397)

## Acceptance and inherited duties

| Point or duty | Evidence | Result |
| --- | --- | --- |
| Acceptance 1, service, urgency, status and mine in a 50-incident storm | tests/triage.mjs:397–473 and tests/product-browser-journey.mjs:992–1078 | Existing protected HTTP and signed-in web assertions passed locally. Team and native-mobile parts are held. |
| Acceptance 1, alert-only chronology and shared query | tests/triage.mjs:229–268, tests/triage-time-fixture.mjs:13–75 and tests/product-browser-journey.mjs:1173–1226 via tests/product-browser.mjs | Exact order, both boundaries, recovery replay, cursor pages, creation sort and the shared URL passed locally. |
| Acceptance 1, explicit unassignment | tests/triage.mjs:182–228 and tests/product-browser-journey.mjs:1118–1172 | Reloaded Mine and Unassigned preserve explicit null assignment, original admission and current attribution. |
| Acceptance 2 and OC-023 | CONTRACT.md:719–721 | Team and my-teams filtering and foreign listing and selection refusal remain held. |
| Acceptance 3 and OC-057 | tests/triage.mjs:119–181 and tests/product-browser-journey.mjs:1079–1117 | Untouched low alerts remain listed until explicit acknowledgment or closure. Anonymous and source-only reads are refused. Exact replay and source revocation preserve history. |
| OC-029, OC-053 and OC-079 | CONTRACT.md:716–721 and tests/triage.mjs:229–268 | Covered the existing signed-in web and protected HTTP query. Native-mobile query and bulk bounds and bundled replies stay with their owning clauses. |
| Paging custody and zero outbound | tests/triage.mjs:264–266 and tests/product-browser-journey.mjs:1220–1223 | Permanent audit, records, revisions and paging comparisons passed. Worker and browser outbound ledgers were empty. Paging is OFF. |

## DONE riders and handoff checks

| Rider | Result on this candidate |
| --- | --- |
| 1 | Partial. Acceptance 3 and the named acceptance 1 outcomes ran through emitted HTTP and web. Acceptance 2 and the team and native-mobile portions of acceptance 1 remain held. |
| 2 | Pass for the selected scope. Populated native records and independent exact ID and time expectations in tests/triage.mjs:229–268 and tests/product-browser-journey.mjs:1173–1226. |
| 3 | The exact-SHA push Verify ran the touched bulk and storm journeys in runtime job 135566293343 and the core browser journey in job 135566293091. Both passed. The generated-view exception is recorded above. |
| 4 | Pass. The product save and candidate have identical source and test bytes. The candidate added the dated observation and its pinned lock. The CI build preparation, focused browser journey and bulk and storm HTTP journeys were rerun locally from the exact candidate with Node 22.20.0. |
| 5 | Inspected. OC-060 names OC-023, OC-029, OC-053, OC-057 and OC-079 in its requirement. No Base duty or authority claim was added. |
| 6 | Local generation and view check passed. The committed candidate reproduces only the expected ACCEPTANCE.md freshness difference locally. Contract judgment remains on main's provenance. |
| 7 | Pass. Status, Gap, Evidence and acceptance sentences match main. No ct rider or new acceptance point was added. |
| 8 | Pass for selected reads. Existing populated viewer, anonymous and intake-only boundary assertions and revoked-source replay coverage remain. Team permission and erasure duties retain their existing owners. |
| 9 | Held. Evidence is from the local emitted Worker and browser. Production paging, provider delivery, standby, timing and real-phone proof remain held. |
| 10 | Pass. The round introduced no policy or authorization default. |
| 11 | Pending guarded landing. Main at push time was d376e47b188ba8688ec7413341363fc7723c99dc, with green Verify 44521933517 and Run site 44521933751. Candidate publication scan and main Run site are lander gates. |

The new assertions distinguish source acceptance from sender observation, detect incorrect priority between source recovery and human history, and detect order or boundary regressions. A local run that temporarily substituted the timeline fallback in the emitted Worker failed the ordered HTTP assertion at tests/product-browser-journey.mjs:1198 with exit 1. The restored exact-candidate build passed. Existing assertions and registered journeys remain. Triage controls use the existing field styles and saved-view delete tooltip. Applied-filter chips have visible labels. Browser proof used the existing controls with no UI styling changes.

PROBE OC-060 1: signed-in browser and protected triage HTTP with service-bound alert-only chronology and fixed native ingress -> identical ordered IDs for the human-coordinated alert, recovered older generation and untouched newer generation. Both range boundaries and shared URL matched. Paging OFF and zero outbound requests.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0.

CLAIM OC-060 PARTIAL points=3 tests=tests/triage.mjs#triageBulkCompletion; tests/product-browser-journey.mjs#triageFiltersBrowser

GAP OC-060: Team and my-teams filtering and foreign-team listing and selection refusals remain held under OC-023. Native-mobile storm and shared queries under OC-029, OC-079 bulk bounds and bundled replies, direct urgency-edit chronology, eventless intake, wider filter coverage, and production paging, timing, delivery, standby and real-phone duties remain outside this round.

Plan relay for replan 83: record the service-bound alert-only updated-time range and order as locally observed under acceptance 1. Retain the OC-060 hold and existing queue, publication scan, Run site, predecessor and release gates.
