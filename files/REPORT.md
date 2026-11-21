# OC-025 overdue swap controls

Run Edit Run fleet, 21 November 2026. Task `sd-oncall-c-f326` for `just-every/run-oncall`. Product branch `cloud/sd-oncall-c-f326` advertises `c358f4d053bd52e4108f54951c87f0f7056b3e35`, based on main `82c51561770c1a67ba6e1a3b41752bbabf707007`. The lease base was `d0a94b025d5ef864b77485a56c1474ae805c569e`. Main's newer Communications observation was carried forward.

## Plan and results

1. Read OC-025, its Status row and R-14. Trace the existing request projection and protected command handling. The rota showed the effective overdue status but still offered controls keyed to the stored pending state.
2. In `src/schedule-coordination/Controls.tsx` lines 24–38, use effective pending for administrator approval and substitute acceptance and decline. The active stored pending state governs requester cancellation. Keep the overdue row visible for the three authorized readers. Preserve the Worker command authority, status projection and feed implementation.
3. Extend `scheduleCoordinationBrowser` through `tests/product-browser.mjs` and the existing `scheduleCoordination` activation journey. On a public service rota use independent requester and substitute responder sessions plus the administrator. Observe the pending controls at desktop width, advance the Worker to the exact start, then reload all three sessions. Capture the changed panel at both widths. Click Cancel as the requester and read back the visible cancelled state.
4. Compare the emitted projection with the saved request and try all three late commands over protected HTTP. Confirm 409 with the overdue explanation, preserved workspace and paging records and unchanged effective coverage. Try cancellation as the substitute and require 403. Cancel as the requester, retry the same command and require 409, then check one accepted audit row with the requester's label, exact time and matching revisions. The one accepted cancellation advances the workspace and paging revision counters and changes only the swap's decision within application records. Rota assignments, overrides, paging custody and outbound ledger all retain their prior content.
5. Recheck the f282 and f306 receipts. Run both local feed scopes, accepted and racing decisions, inactive restore, and replay and erased credential proof. Run touched coverage and typecheck, record the dated observation in the clause body, generate and check views, restore main's view files, regenerate and check the lock last, inspect every candidate identity and trailer, and push only the designated product branch. Record Verify and publish the separate evidence packet.

## Acceptance 1 observations

| Outcome | Observed evidence |
| --- | --- |
| Pending request and deadline | `tests/product-browser-journey.mjs` lines 1051–1103 exercised independent requester, substitute and admin sessions. Pending controls were Cancel for the requester, Accept and Decline for the substitute, and Approve for the administrator. At the requested start all three saw overdue with the same pending request, and the requester alone retained Cancel. The three changed panels were captured at 1440 and 390. |
| Request, approve and race; refuse unauthorized substitute | `tests/activation.mjs` lines 174–203 keeps authorized approval, unauthorized and unapproved acceptance refusals, two competing decisions with one winner and one 409, one override and effective coverage with the other role unchanged. The existing browser flow also exercises substitute acceptance after approval in `tests/product-browser-journey.mjs` lines 1013–1026. |
| Refuse late commands; attributed cancellation | `tests/activation.mjs` lines 307–355 checks durable pending against the overdue projection, 409 for late approval, acceptance and decline, 403 for the substitute's cancellation, one accepted requester cancellation and one 409 retry. It checks the actual audit label and time, preserved coverage and paging records, no additional override and zero outbound requests. |
| Local feed scopes, rotation and revocation | The f282 landed equivalent `33ba96ca35c12421697ea3e345d7cc1569727ff1` is in candidate history. Its secondary-service scope, reviewed override, privacy, immediate revocation and zero-egress assertions passed again in `tests/activation.mjs` lines 225–300. The f306 and pc2 receipts were reviewed separately. The pc2 head `087598f4a4c07c4525b6587fe5509ca8a47f239d` remains outside candidate ancestry. Lines 181–199 retest own shifts in the surviving activation journey. The same two feeds move exactly the accepted primary interval from holder to substitute and the existing masking, revocation and inactive restore assertions still run. |
| Dated Google Calendar and Outlook viewing | R-14 still requires the dated, owner-role provider observation. Both local feed scopes ran against the emitted Worker. |
| Automatic changes, reminders and failure visibility | The local recorded notice remains visibly undeliverable, and the reminder shows its due time and the non-running timer status. Actual automatic notice delivery and delivery failure custody remain under OC-077; actual reminder delivery remains under OC-027. Team manager authority and privacy remain under OC-023, and native mobile swaps under OC-029. |

PROBE OC-025 1 local overdue boundary: signed-in public service rota and protected schedule coordination at the exact requested start → overdue remains visible to requester, substitute and administrator while storage stays pending; late decisions return 409, the substitute's cancellation returns 403, requester cancellation succeeds once with attributed audit, no override, unchanged coverage and paging records, and zero outbound requests.

PROBE OC-025 1 local feed recheck: protected swap acceptance and repeat reads of the same own-shifts feed links → exact primary interval transfers; the existing secondary-service scope still matches protected coverage and revocation removes its access immediately.

CLAIM OC-025 PARTIAL points=none tests=tests/product-browser-journey.mjs#scheduleCoordinationBrowser; tests/activation.mjs#scheduleCoordination

GAP OC-025: R-14 still needs dated owner-role viewing in Google Calendar and Outlook. The inherited duties remain under OC-023, OC-029, OC-077 and OC-027.

The combined acceptance remains partial. Plan row replan-93 OC-025 gains the local overdue and feed observations and retains the R-14 hold. Before and after, 26 DONE, 41 PARTIAL, 34 MISSING, 101 clauses total. Provider authorization and A2P, paging OFF, standby, real-phone and cutover duties, predecessor custody and release gates retain their existing status.

## Mechanical checks

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

The source lock passed again on the exact committed head. Generated views were restored to main before the final lock. The candidate-view check on the committed head reported only an `ACCEPTANCE.md` content difference. Contract prose reported zero errors and warnings. The Status table including all judgments and the existing judgment provenance are byte-identical to the main parent. The preflight passed for added email-shaped strings, bare slash-separated prose and all candidate identities and trailers. There are no new test registrations. Earlier local fixture attempts established that restored responders cannot reuse excluded credentials and that the saved swap revision is embedded in the record. The final activation proof checks the live sessions before restore and separately exercises inactive restored records.

## DONE riders

| Rider | Result | Candidate evidence |
| --- | --- | --- |
| 1 | Selected local outcomes pass; combined acceptance is partial. | Acceptance observations above. R-14 and inherited duties remain open. |
| 2 | Pass. | Populated role-specific browser views, real HTTP accepted and refused outcomes, one override for the race and zero added overrides for late decisions. `tests/product-browser-journey.mjs` lines 1051–1103 and `tests/activation.mjs` lines 174–203 and 307–355. |
| 3 | See exact-SHA CI below. | `scripts/verify-shards.json` selects activation and core browser in push Verify. |
| 4 | Pass for local evidence. | The activation command ran on Node 22.20.0 with the committed implementation and test bytes, and the browser receipt records the checked-out head and command. |
| 5 | Inspected. | Existing authority and inherited duties in the clause body apply. |
| 6 | Mechanical pass after documented regeneration. | The dated observation is in the clause body. Status, Gap and Evidence cells preserve main. The lander owns the generated outputs. |
| 7 | Pass. | The numbered acceptance and clause IDs are identical to main. |
| 8 | Pass for the local boundary. | The authorized requester commits with attributed audit. Late decisions and cancellation by the substitute leave the protected state equal. Existing revoked and erased access and inactive restore proof remains exercised in activation. |
| 9 | Held. | Dated provider viewing and actual live delivery remain outside the observed local results. |
| 10 | Inspected. | Existing workspace-admin and named-substitute rules apply. |
| 11 | Pending guarded landing. | Main and the candidate are separate refs. Candidate publication scan and main Run site are landing gates. |

The role assertions run at desktop width and the three overdue panels have 1440 and 390 captures. Swap actions use text labels. The existing rota tooltip controls and Settings entries were inspected, and the altered panel retains 14-pixel body text and its existing complete border. The prior assertions still execute. The local Worker observed the denied and accepted paths, retained revocation, erasure and replay fences, and made zero outbound requests.

## Exact-candidate local coverage

Node 22.20.0 and pnpm 10.12.4 ran the repository's verification build and core browser shard on the committed product SHA. The core browser command exited 0 after 393.4 seconds. The protected rota panel proofs use 1440- and 390-pixel viewports. In those captures the Worker was fixed at 18:58 UTC, the requested shift start on 21 November 2026. The requested interval ended at 19:58 UTC. The submitted PNGs contain the three test roles and synthetic display names.

The ordinary activation run passed 40 requirement flow groups, including the f282 and f306 local rechecks. Prior f282 Verify 44323516838 passed the product jobs and had the generated-view exception. The original f306 Verify 44592740985 hit an imports timeout in its old combined shard. Its pc2 Verify 44630545063 passed the product jobs with the generated-view exception. Those older runs give predecessor context. This packet's CI evidence is bound to the product SHA above.

The exact-candidate activation shard also exited 0. Its activation journey ran in 223.6 seconds and passed all 40 requirement flow groups. The core browser and activation shard commands used the same exact-checkout build receipt.

## Exact-SHA CI and custody

Push Verify 44932479079 completed on `c358f4d053bd52e4108f54951c87f0f7056b3e35`. Its plan, build, all nine product shards and full push proof passed. The core browser shard was job 136932859138 and activation was job 136932859153. Contract-docs job 136932008215 failed its generated-documents step, and the final gate job 136936759280 failed on that dependency. The committed-head generator check reproduced just the `ACCEPTANCE.md` mismatch. The final gate's exact shell returned 1 using the observed dependency conclusions and returned 0 with only the contract-docs conclusion set to success. This is the generated-view-only exception. [Verify 44932479079](https://github.com/just-every/run-oncall/actions/runs/44932479079)

Verify 44931991659 and Run site 44931991602 succeeded on the candidate's main parent `82c51561770c1a67ba6e1a3b41752bbabf707007`. Main later advertised `3802b68ae4bf448528b49eb1aa9e03ebd80a21a6`, and the product branch still advertised the exact candidate. Candidate Run site and the full-history publication scan are guarded landing gates. Scan receipt for this candidate: complete unestablished, historyScanned unestablished, findings unestablished. [Parent Verify](https://github.com/just-every/run-oncall/actions/runs/44931991659) · [Parent Run site](https://github.com/just-every/run-oncall/actions/runs/44931991602)

The failed-job archive commands returned exit 0 for both jobs. The contract-docs log confirmed zero prose errors and warnings, the generated `ACCEPTANCE.md` difference and exit 1. The final gate log recorded `CONTRACT_DOCS: failure` and exit 1. The receipt records both log reads and their relevant lines.
