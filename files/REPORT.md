# OC-058 local snooze cancellation

Run Edit Run fleet · 19 November 2026 · sd-oncall-c-f310-pc1

The continuation retained product head ad3f36af15cbbe05ec068a8fdea2a9131d1f75c7 on the assigned branch. Its base was 071c74a352196f6778eb3b2942c351b4cf1e0ace. OC-058 stays PARTIAL. Counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING, for 101 clauses. The product delta contains the saved OC-058 observation in CONTRACT.md and its pinned source lock. Both published commits remain in the candidate history.

## Plan and results

1. Compare the saved head to main, read OC-058 and its gap, and diagnose both jobs in Verify 44623417157. All eight shards and the full-push proof succeeded. The contract-docs job (135910995762) failed on the stale generated ACCEPTANCE.md. The final verify job (135920228379) failed because it consumed the failed contract-docs result. Both commands reproduced locally with the workflow inputs. Those failures qualify for the fleet's generated-view exception.
2. Use the clock and native generation pattern from tests/runtime.mjs:2074 and the signed-in controls from tests/member-coordination-browser.mjs:1020–1047 in a one-time leg. Use the emitted Worker with real persisted local data and a network-edge ledger. Give the active responder one declared incident for a public team's service, linked to one alert generation. Acknowledge and snooze for 15 minutes in the browser. Check the pending deadline and the responder attribution after closing all browser contexts.
3. At 12:05 UTC, recover the same generation through native ingress. At 12:15 UTC, run the emitted local scheduled entry with zero browser contexts. The scheduled call returned 200 and left the entire incident equal to its post-recovery snapshot. The incident retained its acknowledged state, original due instant and one cancelled deadline with a null obligation and no deadline-fired event. Paging stayed OFF, with identical paging records and zero browser or Worker outbound requests.
4. Sign the responder in again in separate contexts at 1440 and 390. The protected state and the visible Snooze row agreed on the original 12:15 UTC due time and the exact reason shown in the receipt. The visible timeline matched the cancellation, its 12:05 UTC event time and its Deadline scheduler attribution. Anonymous protected state returned 401. The Snooze panel passed its serious and critical accessibility checks at both widths. The four screen captures show the row and timeline separately at both widths. The first two attempts corrected only the one-time probe's heading scope and normalization of the displayed due time. The final run passed with the saved production code.
5. Run the maintained runtime and member coordination journeys, typecheck, first-party check and the pinned source-lock check. Regenerate and check the two contract views, restore main's generated files, and regenerate the lock last. The lock output matched the saved tree. Confirm the candidate identity and trailers and the advertised branch head before publishing this packet independently. Await the fleet's guarded landing, full-history publication scan and main Run site.

PROBE OC-058 1: Responder Incident actions > Snooze, 15 minutes then browser closure → one pending deadline with the responder and 12:15 UTC due time. The earlier f268 observation and its test paths remain intact.

PROBE OC-058 6: Native trigger and recovery for one linked generation, then emitted scheduler at the original deadline → 200, acknowledged incident, retained cancelled deadline and no obligation or re-trigger. Fresh protected browser readback at both widths shows the same reason, due time and attributed cancellation. Outbound requests 0, paging OFF.

## Coverage and riders

| Item | Result and evidence |
| --- | --- |
| Acceptance 1 | Proven for the selected browser flow. CONTRACT.md:698 retains f268. The one-time browser leg reproduced the protected pending deadline after closing the browser. |
| Acceptances 2 and 3 | Held. Deadline and handoff target resolution are exercised in tests/runtime.mjs:2040–2065 with paging OFF. Actual timed delivery to the current assignee and the new on-call remain unproved. |
| Acceptance 4 | Held. tests/runtime.mjs records timeout coverage at firing time. Actual level-one re-escalation and delivery remain unproved. |
| Acceptance 5 | Held. tests/runtime.mjs exercises restart and concurrent scheduled work with a single recorded obligation. Exactly-once live re-trigger remains unproved. |
| Acceptance 6 | The selected local cancellation and readback are proven in the attached receipt. tests/runtime.mjs:2074 retains the emitted scheduler proof. Actual absence of a re-page through a live delivery path remains held. |
| Riders 1 and 2 | The scoped browser and runtime doors exercised populated records and meaningful outcomes. Live acceptance gaps keep rider 1 open for DONE. |
| Rider 3 | Maintained runtime and browser coverage were part of exact-SHA push Verify. The acceptance 6 browser readback was one-time local proof. |
| Rider 4 | The proof used the emitted Worker from the exact saved SHA. |
| Rider 5 | OC-058 already names OC-056 source recovery, OC-028 standby and the OC-064 timing bar. Checkpoint and portable recovery evidence remain in the contract status row. |
| Riders 6 and 7 | Generated-view write and check passed locally. The two views were restored from main. The Status table, judgment provenance and acceptance points remain intact. |
| Rider 8 | Active responder readback passed, anonymous state was refused, and maintained authority coverage remains in place. The candidate adds no new authority, erasure or replay path. |
| Riders 9 and 10 | Provider and device limits remain named. The observed local behavior required no policy default. |
| Rider 11 | Guarded landing, main equality, full-history publication scan and Run site are fleet gates. This packet reports branch provenance. |

The existing Incident actions and Close buttons have named tooltips. The captured readback uses the existing Snooze and Timeline controls. The diff preserves all existing assertions and test registrations, the Base pin, homepage and SURFACE-002 scope.

CLAIM OC-058 PARTIAL points=1 tests=tests/member-coordination-browser.mjs#one-time acknowledged incident Snooze and browser closure

GAP OC-058: Live timed re-page, delivery after handoff, timeout re-escalation, exactly-once live re-trigger and live no-re-page remain held. Alert-only deadlines, other channels, mobile, Slack and Teams, OC-064 timing, OC-028 standby, carrier and real-phone proof remain held. Paging stays OFF.

Plan row for sd-oncall-replan-87: OC-058 remains PARTIAL. The selected local declared-incident cancellation readback has proof. Keep all live delivery, channel and field holds recorded for OC-058 in the Next campaign section.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

## Verification

The machine-readable verification receipt records the exact branch run, previous run diagnosis and local exits. Product readiness and this evidence transfer are independent. No PR was needed because push starts Verify on this branch.

Both Verify runs were push events on the same full product SHA. Run 44623417157 had successful build, all eight shards and full-push proof. Its generated-view-only failure supplies the prescribed READY exception. Run 44630131089 on the continuation branch also reported the stale ACCEPTANCE.md. Its build, browser, runtime and intake succeeded. Its changes shard (135935506050) was cancelled at the 15-minute job limit, and its full-push proof was skipped. The identical SHA passed the changes shard in the earlier run (135912296724). No failed test assertion was observed in the later run. [Earlier Verify](https://github.com/just-every/run-oncall/actions/runs/44623417157) · [Continuation Verify](https://github.com/just-every/run-oncall/actions/runs/44630131089)

Archive command gh run view 44630131089 --repo just-every/run-oncall --job 135943560481 --log-failed returned “failed to get run log: zip: not a valid zip file”. No HTTP status was supplied. The earlier aggregate job archive and the local exact workflow step established the contract-docs dependency failure. The failed archive was requested once.

Main advanced to e4123dded5d6a9f058880669ca10213bcfbe2646 after the fleet published the exact candidate. It carries release metadata for 0.5.20. The branch and receipt preserve the tested SHA for the lander's drift reconciliation. The continuation created no additional product commit.

Local completion passed the maintained browser journey, runtime core and machines journeys, typecheck and first-party check. The first maintained browser attempt stopped at the local Chromium readiness check. Installing the checkout's pinned Playwright browsers satisfied that check and the rerun passed while launching system Chromium for the journey. The final pinned source-lock check passed against the clean product tree.
