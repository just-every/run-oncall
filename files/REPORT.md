# OC-009 keyboard stale cover

Codex · 18 November 2026 · sd-oncall-c-f285

## Product custody

- Repository `just-every/run-oncall`, branch `cloud/sd-oncall-c-f285`, head `f83add93734cf3ba77817104f08aa10572772d77`.
- Main advanced from `443c3613cefdf7359fac0ca728da428cf9e280a0` to `518317b385c4535599bfc670dd676da46069b451` with release metadata. The unpublished changes were rebased before commit. The candidate ran locally against the updated base and the committed diff matches the tested diff byte for byte.
- Base Verify `44322242486` and base Run site `44322242470` completed successfully on `518317b385c4535599bfc670dd676da46069b451`.
- Status stays PARTIAL. Counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING across 101 clauses. The plan extract's OC-009 row gains the acceptance 2 observation and keeps its held remainder. The Status, Gap and Evidence cells follow main.

## Plan and results

1. Map the existing observations. `keyboardCoordination` covers keyboard declaration, acknowledgment and notes at 1440 and 390, with a real incident stale-write refusal at 1440. `productSchedule` covers keyboard rota creation, coverage preview, cover review, explicit apply and protected readback. Those journeys provide bounded web evidence for acceptance 1. The selected acceptance 2 gap was stale keyboard apply in the cover sheet.
2. Review the browser's valid override with the native keyboard. Authenticate a second request context through the existing login door and save a different interval for the same role using `POST /api/schedules/:id/overrides`. Its confirmed readback contains one override and advances the schedule revision once. The winner lies outside the losing review window, preserving the existing successful cover and named-zone assertions later in this journey.
3. Check the real `POST /api/schedules/:id/apply` issued by keyboard confirmation. The request carries the original digest, confirmation and losing schedule revision, and the server responds 409. The visible alert explains the conflict and asks for a fresh review. Who, Role, From and To keep their values and remain editable. The page presents no saved status. Tab and Shift+Tab stay in the sheet and Escape restores visible focus to Cover a shift.
4. Read back the protected paging state before the stale attempt and after Escape. The winner is the only override at that point, and the complete paging snapshot is identical. The Worker network-edge ledger records no new outbound requests. The subsequent reviewed retry still succeeds only on explicit confirmation and retains the original assignment and preview assertions.
5. Reproduce the focus defect and fix it locally. With the previous sheet the real 409 and alert were reached, then the dialog containment assertion failed because the Apply control disappeared. `RotaPage` requests focus recovery on a failed write when the cover editor has replaced the review. `RotaSheet` restores focus to the dialog if focus has left it. The scope leaves schedule authority, the review digest, retry and confirmation semantics to their existing code.
6. Run the existing focused emitted Worker journey on the candidate with controlled browser and Worker clocks. Desktop push Verify uses the existing core browser entry point and makes the new stale assertion at 1440. The focused local run observed the same journey at 1440 and 390. It passed, including required labels, visible focus, containment, overflow and the serious or critical axe check. The retained Close sheet tooltip was checked by keyboard. Remove cover retains its tooltip, and the changed sheet retains the existing field borders and sizing. The product and test changes add no test registration.

## Acceptance and riders

- Point 1 has bounded maintained keyboard and responsive proof in `tests/product-browser-journey.mjs:571` (`productSchedule`) and `tests/product-browser-journey.mjs:1657` (`keyboardCoordination`). The broader Base and device work remains in the Gap.
- Point 2 has a real losing keyboard request and an independently committed winner in `tests/product-browser-journey.mjs:687`, including focus and visible alert checks at line 717 and post-Escape readback at line 734. `tests/product-browser.mjs:1122` provides the separately authenticated request context. `tests/keyboard.mjs:79` supplies the keyboard driver.
- Riders 1 and 9 retain the bounded scope and the named external proof below. Rider 2 uses durable seeded schedules and verifies both the supported write and stale refusal. Rider 3 uses the existing Verify browser shard and the exact-SHA CI receipt. Rider 4 ties local proof to the committed diff and candidate. Rider 5 retains BASE-ACCESSIBILITY-001 and BASE-PUBLIC-003 citations and their outstanding proof. Riders 6 and 7 retain the judged cells and existing acceptance text, with the generated view check passing locally. Rider 8 exercises the existing authorized write and stale refusal through protected public doors. Rider 10 requires no new policy default. Rider 11 awaits guarded landing, the full-history publication scan and the candidate's main-only Run site.

CLAIM OC-009 PARTIAL points=2 tests=tests/product-browser-journey.mjs#productSchedule; tests/product-browser-journey.mjs#keyboardCoordination

GAP OC-009: Wider BASE-ACCESSIBILITY-001 and BASE-PUBLIC-003 conformance, native-app proof, R-3 named human screen-reader journeys and R-4 VPAT publication remain held. R-3 includes VoiceOver with Safari on macOS, NVDA with Chrome on Windows, iOS VoiceOver and Android TalkBack through the contract flows. The fleet Mac screen-reader prohibition and the paging-OFF, device, independent standby and real-phone prerequisites remain in force.

PROBE OC-009 2: At 1440 and 390, separately authenticated schedule override and native-key confirmation of an older valid review -> HTTP 409, visible alert, editable retained fields, no saved status, focus inside the sheet and Escape focus return. Protected state contains only the winner and remains unchanged across refusal and Escape. The outbound ledger has zero new requests.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

## Receipts

The local receipt contains the production build, typecheck, first-party check, source lock, generated views, baseline focus failure and passing candidate browser output. The two selected PNG files show the refused sheet with visible keyboard focus at 1440 and 390. The CI receipt records exact-SHA REST observations. The fleet lander owns the full-history publication scan and main-only Run site.

Push Verify completed successfully on the exact product head. Run 44323788508 was observed complete at 2026-11-18T14:44:06.776742+00:00. [Verify](https://github.com/just-every/run-oncall/actions/runs/44323788508)
