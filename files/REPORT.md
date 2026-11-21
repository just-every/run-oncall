# Oncall swap approval · sd-oncall-c-f334

Run Edit Run fleet · 21 November 2026

## Scope and result

OC-025 stays PARTIAL. Counts are 26 DONE, 41 PARTIAL and 34 MISSING both before and after. The selected work closes the named substitute’s web action boundary within acceptance 1. Acceptance 1 is a mixed sentence and still includes work beyond this web boundary. The source clause and judged Status, Gap and Evidence cells have no diff.

- Repository — just-every/run-oncall
- Main at integration — `9e7d7cdc9a4b1fa53cbcd01ba4d0047b18cf523d`
- Saved head — `e2c8477eb270546b6535f4a1154dacad19102d40`
- Candidate — `c7ef42ce5737a736503872d5ce98ff16ddb93211` on `cloud/sd-oncall-c-f334`

## Plan and executed coverage

1. Read OC-025 and its status row on current main, the selected campaign and the DONE riders. Map the native swap flow to `scheduleCoordinationBrowser` and `scheduleCoordination`. Audit the rota’s action presentation, including the existing tooltips for icon-only controls. Keep the selected campaign limited to the saved approval boundary.
2. Apply the saved-approval check to Accept in `src/schedule-coordination/Controls.tsx:24`. Keep Decline available during effective pending, along with the approval state. The protected HTTP implementation in `src/schedule-coordination/api.ts:26` continues to enforce named-substitute authority, the approval requirement, requester cancellation and the overdue refusal.
3. Extend the existing browser journey and activation journey. Use isolated administrator and responder sessions, one future primary swap and a named backup. Assert at 1440 and capture the substitute’s before-approval, approved-pending and accepted cards at 1440 and 390. Inspect the screenshots for their displayed state and accessibility of the visible actions. Keep the existing overdue, race, feed, and restore coverage.
4. Push the preservation save, integrate current main, and verify the final touched journeys and typecheck. Run the first-party check, generate and check contract documents, restore the generated views, then regenerate and check the installed edition source lock. Inspect candidate commit identity, trailers, and added text before publishing.
5. Hand back the exact candidate, Verify state and separate report packet. The Mac lander owns full-history publication scanning, landing and main Run site.

## Observations and preserved scope

| Outcome | Public door and evidence |
| --- | --- |
| Future pending, before approval | The named substitute’s own password session opens the real rota. The card displays admin approval required and shows enabled Decline with no Accept. `tests/product-browser-journey.mjs:1022` |
| Valid early acceptance refused | The substitute posts the current request ID and revision. The response is 403 with the approval-required reason. A protected read returns the identical request, effective assignment and paging state. `tests/product-browser-journey.mjs:1041` and `tests/activation.mjs:175` |
| Saved administrator approval and effective substitute decision | Administrator approves. The substitute reloads and sees approval recorded and enabled Accept. One click returns 200 and retains the accepted revision, one effective primary override for the precise interval, the same distinct backup and one accepted audit entry attributed to the substitute. The outbound ledger is unchanged. `tests/product-browser-journey.mjs:1060` |
| Effective overdue and cancellation | Requester, substitute and administrator see overdue after exact-start reload. Only requester can cancel. Late approve, accept and decline each return 409 with stable storage and effective coverage. One cancellation commits and is attributed, with no outbound requests. `tests/product-browser-journey.mjs:1118` and `tests/activation.mjs:311` |
| Race, scoped subscriptions and restore | The race still yields one success and one 409. The own-shifts feeds transfer the accepted primary interval. Selected service coverage and immediate revocation still pass. Native and checkpoint restore leave historical subscriptions inactive. `tests/activation.mjs:190`, `tests/activation.mjs:230` and `tests/activation.mjs:361` |
| Provider viewing and delivery | R-14 still needs dated owner-role viewing in Google Calendar and Outlook. Mobile (OC-029), team managers and privacy (OC-023), automatic change notices and failure custody (OC-077), reminder delivery and timers (OC-027), provider authorization and A2P, standby, and real-phone and cutover scope remain held. Paging stays OFF. |

## DONE riders

| Rider | Result and evidence |
| --- | --- |
| 1 | Partial. The native web boundary passes. R-14 and the held mixed-sentence outcomes have no passing result in this round. |
| 2 | Pass for selected scope. The future swap uses a populated rota and a distinct backup. The unsafe and allowed decisions both execute through the protected door, with assignment and revision checks. |
| 3 | Verify uses the core browser and activation lanes. Its exact-SHA disposition is recorded below. |
| 4 | Relevant product code and assertions match the candidate. The core browser run captured the added approved-pending screenshot and its confirmation. |
| 5 | Inspected. The named-substitute, manager, reminder and calendar duties remain in the OC-025 text. This round claims no additional Base duty. |
| 6 | Mechanical checks pass. Existing judged provenance belongs to the lander. The claim and remaining proof gap are stated here. |
| 7 | Pass by diff. Acceptance text and inherited duties are carried verbatim. |
| 8 | Pass for selected authority. The valid named substitute is denied before approval and accepted after approval. Requester authority and late responses are exercised. |
| 9 | Held. R-14 has no dated owner-role provider evidence in this run. No delivery or cutover claim. |
| 10 | No new policy default. The UI follows saved approval and the existing protected semantics. |
| 11 | Cloud branch only. Main equality, a complete publication scan, and exact-main Run site remain with the lander. |

## Pre-READY checks

The retained journey checks the actual card state, protected response, request and paging snapshots, audited acceptance and live coverage from the emitted Worker. The former unapproved Accept expectation was updated to match the product change. Overdue, late conflict, cancel, race, subscription, restore and audit rollback assertions remain in their existing paths. No test registration was added. The changed behavior adds no access, erasure, replay or transport path. The rota controls use existing text buttons and the retained rota has the shared tooltip for its icon-only controls. The changed panel’s body text is 14px and the relevant states passed the existing accessibility and overflow checks. The pre-push review found no email-shaped text or repository-like prose in the diff. Full-history publication scanning, Run site, predecessor and release gates remain fleet work.

CLAIM OC-025 PARTIAL points=none tests=tests/product-browser-journey.mjs#schedule-coordination-browser; tests/activation.mjs#schedule-coordination

GAP OC-025: R-14 still needs dated owner-role viewing in Google Calendar and Outlook.

PROBE OC-025 1: Future pending swap on the named substitute’s rota -> Decline available and Accept absent before approval. Valid early protected Accept -> 403 with unchanged request revision, assignments and paging. Saved administrator approval and substitute reload -> one accepted decision, one attributed audit, one effective primary override, distinct backup and zero outbound requests.

Plan return for OC-025 in Next campaign: retain the R-14 hold and record the completed acceptance 1 web boundary against this candidate. The queue and predecessor gates remain held.

## Check results

Build, typecheck, and first-party check passed. The core browser shard and activation journey both exited 0. Activation reported 41 requirement flow groups. The browser proof uses the candidate's code and assertions, with Chromium 154, Node 24.19.0 and pnpm 10.12.4.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

The generator wrote zero views. Git recorded the same contract counts and judgment cells before and after. Both commits passed fleet identity and trailer checks. The remote advertised the full candidate SHA on the named cloud branch.

Baseline main Verify runs 44951009946 and 44953278792 and Run site 44953278752 each completed successfully at the recorded main SHA.

Verify 44959674886 was completed with success on the exact candidate SHA. The event was push. [Verify run](https://github.com/just-every/run-oncall/actions/runs/44959674886)

Rider 3 passes on the exact push Verify. Rider 11 remains pending guarded landing.
