# OC-058 browser snooze evidence

Run Edit Run fleet, 18 November 2026. Task `sd-oncall-c-f268` for `just-every/run-oncall`.

## Scope and plan

1. Check the six acceptance points, the Status row and the latest main and predecessor diffs.
2. Reuse the member coordination journey's incident controls and emitted Worker clock for a one-off test with a 15-minute snooze, a closed browser and protected HTTP readback.
3. Open a fresh responder session before expiry and capture the saved deadline in the Snooze sheet at 1440 and 390 pixels.
4. Record the observation in the OC-058 clause text. Run the maintained journey, typecheck, first-party checks, contract generation and source lock checks. Publish the product branch and return the evidence through its separate ref.

The touched queue row is OC-058 in planner replan 76. It retains PARTIAL after the selected proof. All 101 judgments carry forward. Counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING.

## Prior coverage and shared files

- `tests/member-coordination-browser.mjs` lines 824–847 exercise the Snooze sheet with a one-minute duration and certify recorded expiry in the open browser. Its existing responder journey uses the native Acknowledge control at lines 527–543. The one-off combined those controls with a 15-minute duration and separate closed-browser read.
- `tests/triage.mjs` lines 367–389 use a 15-minute HTTP snooze and check that reads leave its state and outbound records alone. `tests/runtime.mjs` lines 2036–2070 cover recorded deadline replacement, current coverage resolution, recorded restart behavior and no early execution. Those observations leave the live outcomes in points 2–6 open.
- Main was `d88d44c4e8dedd1bf69682d3d2abcf4116dad3c4` when checked. Verify run 44207847779 and Run site 44207847848 both completed successfully on that SHA.
- The live f265 and f266 refs both touched the contract and source lock. Their contract changes concern the responder list and agent-resource evidence. f263, f264 and f267 overlap the source lock and concern agent replay, retention or rejected-request debit. The checked branch heads were `e70051e60c403f6bd99c992871751ee42d7963a0`, `96f3bf2624da756947ec15fb1977024e0746bb51`, `bcd444494196597c1834818c2c78d3d8c13b6aa9`, `de9ca112a947692bd3cc847508fbae57cb5cc0e7` and `8b0b44278cd9ccc270ebe2c1a2275c08caac7e49` respectively. The fleet lander retains queue ordering and regenerates the source lock after reconciling shared files.

## Runtime result

PROBE OC-058 1: Signed-in responder used Acknowledge and then entered 15 in the Snooze sheet for a declared incident. Chromium context and process closed. A separate authenticated HTTP client read one pending snooze and the cancelled acknowledgment timeout from the emitted Worker, with the responder ID, pinned start, exact 15-minute duration, absolute due time and corresponding attributed timeline. Anonymous read returned 401. Paging jobs, receipts, callbacks, notification runs, notices, outbox and outbound requests remained empty. After advancing the Worker clock five minutes, a fresh responder sign-in showed the saved deadline at both widths.

The manual-page fixture supplied a declared incident and its own recorded coordination obligation with paging OFF. The snooze produced a pending deadline and an attributed timeline entry. Delivery records and provider activity stayed empty.

The one-off used the maintained browser journey's controls, setup pattern and shared helpers. The product change records the observation in `CONTRACT.md` and regenerates `sources.lock.json`. The acceptance list and the complete Status table match main. The maintained test suite retains its existing coverage and assertions. The emitted Worker and D1 were local with synthetic data.

## Rider review

1. Acceptance 1 passed through the browser and independent protected HTTP. Live outcomes 2–6 remain open.
2. The populated incident was read back by ID and compared with the separately pinned Worker clock, actor and timeline. Zero notification effects were checked through the protected routes and outbound ledger.
3. The 15-minute browser-close variant was a one-off. The maintained journey was run locally. Exact-SHA Verify findings are recorded in the verification receipt.
4. The verification receipt identifies the checked product SHA and the browser receipt covers the same build.
5. The clause names its existing inherited timing and standby duties. No new inherited duty applies to the selected observation.
6. Contract document generation and the generated-view check passed before restoring main's derived files. The source retains all existing judgments and counts.
7. All six acceptance points and the existing classifier scopes carry forward.
8. A permitted responder acted through the ordinary controls. Unauthenticated protected-state read returned 401. Existing viewer refusal, revocation and applicable erasure and replay coverage in the maintained journeys and contract remains applicable.
9. Paging stayed OFF throughout. The recorded deadline supplies local coordination proof.
10. The selected proof exercised the existing authority and policy. No new default was adopted.
11. Exact-main verification, publication scanning and Run site for the landing are held by the fleet. Cloud only published the candidate branch and evidence ref.

CLAIM OC-058 PARTIAL points=1 tests=tests/member-coordination-browser.mjs#OC-058 browser (one-off 15-minute closure variant)

GAP OC-058: Live deadline re-page, delivery after handoff, automatic timeout re-escalation, exactly-once live re-trigger after restart, and no re-page after source recovery on a live delivery path remain held. Alert-only and other channels, mobile, Slack and Teams, OC-064 timing, OC-028 standby and carrier and real-phone proof remain held.

## Publication and CI

See `verification-receipt.json` for the exact product SHA, command results and candidate Verify status. The two PNGs and `oc058-browser-receipt.json` carry the actual browser proof.

Candidate commit `73b6d143e562333e09b03077a75cac38555c2784` is on `cloud/sd-oncall-c-f268`. The remote readback matched. The fleet lander handles the main publication scan and landing. No PR was required by the branch Verify entry point.

The focused run used Node 22.20.0 and system Chromium. The first standalone member-journey run needed the Playwright browser prerequisite for its operations check. It passed after the prerequisite was installed. I stopped the initial unfiltered local Verify after its build, first-party check and typecheck, then ran the member-browser lane through the pinned rer command.

The exact-candidate screenshot receipt records a snooze at 02:23 UTC and a deadline at 02:38 UTC, with the separate read and fresh browser at the controlled 02:28 UTC point. Both screens showed the saved deadline. The existing Close dialog tooltip opened on keyboard focus, and the saved status text was at least 13 pixels. The existing Incident actions tooltip was confirmed in the source.

The exact-candidate member-browser lane passed through rer Verify, including the maintained journey, typecheck, first-party check and local hosted checks. Branch Verify run 44222707968 completed with a failure limited to the expected generated view and its aggregate gate. The plan, build and all eight shards passed, including runtime job 134529243187 and browser job 134529243459. Job 134528384006 reported that the generated ACCEPTANCE.md differs. Job 134533727395 recorded successful plan, build and shards and a failing contract-docs dependency. Both failed-job archive reads succeeded.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

The scope check compared all Status rows, all six acceptance sentences and the two changed paths with refreshed main. The changed prose had no email-shaped values or bare owner and repository tokens. Full-history publication scanning and exact-main Run site remain part of fleet landing.
