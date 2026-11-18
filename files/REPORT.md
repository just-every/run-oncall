# sd-oncall-c-f292 · OC-009 keyboard note refusal

Run Edit Run fleet · 18 November 2026 UTC

## Scope and result

The campaign selected the phone-width incident note conflict in acceptance 2. The existing workflow at 1440 provided the starting point. Acceptance 1's maintained browser flow and f285's separate **Cover a shift** refusal were the regression checks. The R-3 and R-4 entries in the field proof register set the remaining scope.

The public incident page now restores focus to the keyboard submitter if the pending write disabled the form and dropped focus. If the user has already moved focus to another control, the alert preserves that choice. The conflict alert labels the winning note as the current record. The losing draft stays in its original textarea and its submission leaves the status region empty.

| Contract point or duty | Result | Evidence on the product head |
| --- | --- | --- |
| 1. Declaration, acknowledgment, notes, schedules, overrides and preview | Maintained web sample passed. Wider conformance remains held. | `keyboardCoordination`, `tests/product-browser-journey.mjs` lines 1723–1807, exercised real declaration, an attributed note, acknowledgment, dialogs and label and focus checks. `productSchedule`, lines 571–776, exercised keyboard schedule setup, preview, override preparation and explicit apply with protected readback. Both ran at 1440 and 390. |
| 2. Real stale write announced without a saved claim | Passed locally on the exact product head at 390 and 1440. | `keyboardCoordination`, lines 1808–1897, signed in a second browser separately, held the first browser's ordinary workspace GET, accepted the winner at 200, refused the stale keyboard POST at 409 and checked the alert and exact protected state. `tests/keyboard.mjs` lines 79–101 supplied native Tab traversal and the visible-focus check. |
| BASE-ACCESSIBILITY-001 | Maintained sample passed for the selected states. | `accessibleState`, lines 562–568, checked the layout and no serious or critical axe findings. `keyboardCoordination` and `productSchedule` exercised visible focus, dialog containment and Escape return. Full criterion and surface coverage stays held. |
| BASE-PUBLIC-003 | Held. | `CONTRACT.md` cites BASE-PUBLIC-003 in the OC-009 clause metadata and lists R-4 as a held field proof. |
| R-3 and OC-029 | Held. | The named desktop screen-reader and native-app journeys were outside this probe. The OC-060 filtered incident list remains part of the named R-3 human journeys. |
| R-4 | Held. | Release VPAT publication per criterion and surface remains held in the field proof register. |
| Paging and outbound boundary | Passed for the selected flow. | `keyboardCoordination`, lines 1832–1837 and 1887–1896, compared paging and the outbound ledger across both submissions. Paging was OFF with unchanged records and zero additional outbound requests. OC-026 through OC-029 and their standby, provider and real-phone checks stay in force. |
| f285 Cover a shift predecessor | Passed locally on the exact product head at 390 and 1440. | `productSchedule`, lines 681–738, exercised a distinct stale apply, alert, editable inputs, focus containment, Escape return and unchanged paging and outbound state after refusal. The separate schedule implementation matches main and f285. |

PROBE OC-009 2: signed-in incident at 390 and 1440, independently authenticated winning note and retained keyboard draft → winner 200, stale original-revision POST 409, visible conflict alert and outlined Add note, editable draft, empty save status and exact winning note and revision. Paging OFF, no change to paging records, no new outbound requests and zero serious or critical axe findings.

The first run with the stricter immediate-focus check failed at `tests/keyboard.mjs` line 82 because the submitting button had lost visible focus after the server refused the request. The existing failure boundary now restores that focus when it has been lost. The exact-head rerun passed both widths. The screenshots show the winning note and editable losing text together with the alert and the focus ring. The alert uses 15 px text. The incident actions and dialog close controls use the existing tooltip, with immediate keyboard display and a 300 ms hover delay.

## DONE riders

| Rider | Result | Evidence |
| --- | --- | --- |
| 1 | Pass for the selected stale note. Full clause remains partial. | Acceptance rows above and `keyboardCoordination` lines 1808–1897. Held R-3, R-4 and wider conformance. |
| 2 | Pass for the selected outcome. | The seeded incident gains one attributed note through the second authenticated session, then refuses the old revision and preserves the entire expected workspace. Lines 1852–1896. |
| 3 | The browser shard passed. The sole workflow failure was the restored acceptance view and its dependent summary, covered by the landing exception. | `scripts/verify-shards.json` lines 30–36 and `tests/product-browser-journey.mjs` lines 2035 and 2062 load the existing keyboard journey in push Verify. See the exact-SHA run below. |
| 4 | Pass locally on the exact SHA. | The emitted Worker, focused browser journey and its captures ran on the recorded product head. See `receipt.json` and `browser-probes.txt`. |
| 5 | Pass by inspection. | `CONTRACT.md` lines 65 and 91 name the Base surface and citations. OC-029 and the human field proof remain named in OC-009. |
| 6 | Pass for local generation. Landing judgment pending. | The generator wrote the view and its check passed. The clause's Status, Gap, Evidence and provenance are reserved for the lander. |
| 7 | Pass by diff inspection. | Only a Native proof paragraph was added to OC-009. The acceptance sentences, coverage map, inherited obligations and Status table match main. |
| 8 | Pass for applicable authority. | `tests/product-browser.mjs` lines 1122–1132 logs in separately and the protected session read proves current admin authority. `keyboardCoordination` lines 1820–1824 and 1852–1896 prove accepted and refused writes. No server authority, erasure or replay code was edited. |
| 9 | Held by the clause. | The browser receipt covers local web behavior. Named human, native, VPAT, provider and real-phone proof remain in their existing gates. |
| 10 | Pass by diff inspection. | No policy default or ruling was required for a focus restoration and stale-note observation. |
| 11 | Pending fleet landing. | The product head is advertised on the cloud branch. Exact-main equality, full-history publication scan and post-landing Run site are fleet operations. |

## Candidate

Branch `cloud/sd-oncall-c-f292` at `8940e83f34a52700ab168f27f2f6e372afcd2c57`. Git confirmed the remote branch advertises this exact SHA.

Push Verify 44422646109 is completed with conclusion **failure**. Classification is **generated-view-only**. [Verify run](https://github.com/just-every/run-oncall/actions/runs/44422646109)

Publication scan on `8940e83f34a52700ab168f27f2f6e372afcd2c57` is pending fleet execution. Complete, historyScanned and findings are unestablished. Main equality and Run site on the landed candidate are pending fleet landing.

Verify jobs recorded for this SHA are plan 135219312433 success, contract-docs 135219483288 failure, build 135219483472 success, shards (runtime) 135220408730 success, shards (agents) 135220408735 success, shards (hosted) 135220408781 success, shards (triage) 135220408782 success, shards (browser) 135220408787 success, shards (transfer) 135220408848 success, shards (intake) 135220408854 success, shards (changes) 135220408872 success, full-push-proof 135226577267 success, verify 135226611747 failure.

## Mechanics and handoff

- Built the emitted Worker with the pinned Node 22.20.0, ran the touched browser coverage and typecheck, and passed the first-party check.
- Ran `node src/base/contract-docs.mjs write` and `node src/base/contract-docs.mjs check`, then restored the generated views from main. This seed's documented generator takes no touched-clause flag.
- Regenerated and checked the source lock last using `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs` with `lock` and `check`. No migration was involved. In the committed tree the only local contract generator discrepancy is the deliberately restored acceptance view.
- Reviewed the full candidate revision range for author and committer identity, side parents and trailers. One commit, fleet identity in both fields and zero trailers. Added text passed the local email and bare owner-and-repository token checks. The cloud run has no full-history publication-scan receipt.
- Reused the existing test registration and keyboard helper. Preserved previous assertions, including desktop incident refusal and both focused Cover a shift legs. No suite registration was added or removed.
- Pin before and after rebase was `df8efefe31a9813ebc5aa3f0c2a319c19e2667d7`, the landed f285 Cover a shift change. Main also contains the shared-file triage predecessor `3a2f2ea` and the service-runbook predecessor `d5bb3d0`. The generated views, schedule UI and keyboard helper on the product candidate match main.
- Before and after counts are 26 DONE, 41 PARTIAL and 34 MISSING of 101. OC-009 remains PARTIAL. The replan-82 OC-009 row can record completed point 2 for the signed-in incident phone flow. Retain the named conformance holds and all other queue rows.
- Main at the final pre-push fetch was `df8efefe31a9813ebc5aa3f0c2a319c19e2667d7` with Verify 44420542831 and Run site 44420542819 completed successfully. The product branch does not require a PR to start Verify.

MECHANICAL lock=pinned edition-authoring lock and check exit=0; views=contract-docs write and check exit=0; ledger=none exit=0

CLAIM OC-009 PARTIAL points=2 tests=tests/product-browser-journey.mjs#keyboardCoordination
GAP OC-009: R-3 named screen-reader journeys, OC-029 native-app proof, R-4 VPAT publication and wider Base accessibility conformance remain held.
