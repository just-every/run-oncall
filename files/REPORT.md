# sd-oncall-c-f282 · OC-025 shared-rota subscriptions

Run Edit Run fleet, 18 November 2026. Repository `just-every/run-oncall`, product branch `cloud/sd-oncall-c-f282`.

## Plan and result

- Replan 80, OC-025 acceptance 1. Read the current clause, its Status row and R-14. Keep the campaign on the native service-scoped ICS slice. Retain the current clause judgment.
- Select subscriptions by the canonical `scheduleServices` helper. Existing single-service records fall back to their owning service. The existing bearer door uses the same effective coverage resolver and redaction.
- Extend `tests/activation.mjs` in `scheduleCoordination`. Use real saved rosters in the emitted Worker, an existing unrelated rota, two services linked to one shared rota, and a service subscription issued to a responder. Compare both roles over a fixed 31-day UTC window against protected coverage before and after digest-reviewed apply. Check the override's exact start, end and effective holder through protected coverage, and the corresponding calendar boundary.
- Check the bearer response without a session. It returns the shared rota's events alone and omits raw rota identifiers, member names and IDs, and the bearer itself. The original service feed still returns its legacy rota. Another responder's attempt to revoke the secondary subscription returns 403 and the feed remains available. Subscriber revocation returns 404 on the same URL immediately. Saved assignments, protected coverage, policies, jobs, receipts and callbacks are equal before and after revocation. The Worker network-edge ledger stays empty.
- The regression check on the original emitted Worker failed at the new interval comparison with zero events for the secondary service. The fixed emitted Worker passed that comparison and the separate revocation and isolation checks.
- Record the local observation in the body of OC-025 in `CONTRACT.md`. The Status table and the numbered acceptance are identical to main. The lander regenerates the views. Counts before and after are 26 DONE, 41 PARTIAL, 34 MISSING, 101 total.

CLAIM OC-025 PARTIAL points=1 tests=tests/activation.mjs#scheduleCoordination

PROBE OC-025 1: service subscription for the secondary service and anonymous ICS GET -> 200 with only the shared rota's 31-day UTC intervals, matching protected coverage before and after the reviewed override. Revocation by another responder -> 403 with continued access. Revocation by the subscriber and repeat ICS GET -> immediate 404, unchanged assignment and paging data, zero outbound requests.

GAP OC-025: R-14 Google Calendar and Outlook viewing still needs dated owner-role proof. Team managers and privacy (OC-023), mobile swaps (OC-029), automatic change notices and visible delivery failures (OC-077), and automatic reminders (OC-027) remain held. Provider, existing pager, paging-OFF, independent standby, real-phone and release prerequisites remain in force.

## Evidence boundaries

- Riders 1 and 2. The existing journey covers swap consent, racing acceptance, recorded obligations, subscription custody and restore. The new public-door sequence covers the local secondary-service interval, privacy and revocation outcomes. The full clause still requires the held outcomes above.
- Riders 3 and 4. Push Verify runs `tests/activation.mjs` in the changes shard. The receipt identifies the candidate and its CI result. The local Worker was built from the final candidate source before commit and passed the touched suite. GitHub Verify uses the committed SHA.
- Riders 5–7. No inherited duty or acceptance wording changed. Generated views passed the documented write and check, then were restored from main for the lander. No Status, Gap or Evidence cells changed.
- Riders 8–10. The responder's authorized issue and revoke path and the other responder's refusal were exercised. Existing inactive restore and erasure coverage was retained. No field-provider receipt or new policy default is claimed.
- Rider 11. Guarded landing, the full-history publication scan and the resulting main Run site are fleet gates.

The change adds coverage to an existing integration journey and preserves the prior assertions. There is no screen change or new test registration. Exact commands and results are in `verification.json`.

## Product and verification receipts

Product head `cc1111675053e8ade57a09d9f39bfbc09c608f3d`, advertised on `cloud/sd-oncall-c-f282`. Base main `518317b385c4535599bfc670dd676da46069b451` had completed Verify 44322242486 and Run site 44322242470.

Local build, typecheck, first-party check and the emitted Worker activation suite passed. The activation suite reported 40 requirement flow groups. The source lock check passed again on the committed head.

The exact candidate's push Verify 44323516838 completed with the expected generated-view failure. Build, all eight shards and full push proof passed. The changes shard was job 134871392295. The contract-docs job 134868765589 failed its generated-documents step, and the final gate 134880181493 inherited that failure. On the same SHA, the check reported only stale ACCEPTANCE.md after restoring the views from main. The generated views passed when regenerated locally. This meets the cloud handoff's generated-view exception. https://github.com/just-every/run-oncall/actions/runs/44323516838

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none
