# OC-025 own-shifts subscriptions across an accepted swap

Run Edit Run fleet, 19 November 2026. Task sd-oncall-c-f306.

Product branch `cloud/sd-oncall-c-f306` advertises `4efb655d24cccca45d8fdabd205f93a88189734a`. The first save was `beb4e9458020569fd3643f5d4c6a9bfd3b7062cb`. The candidate was based on main `eeb1ac5166482fc1a2a54e68deb587080f72d95e`. The f282 remote tip was `cc1111675053e8ade57a09d9f39bfbc09c608f3d`. Its landed equivalent `33ba96ca35c12421697ea3e345d7cc1569727ff1` is an ancestor of main. The f282 service-scope test section and feed implementation matched main byte for byte and the service-scope proof passed in activation.

## Plan and results

1. Read the leased OC-025 clause, its status judgment, R-14 and the campaign extract. Compare the existing Worker schedule and subscription doors with the f282 service-scoped proof. The missing local outcome was an existing own-shifts feed tracking a bounded primary transfer for both subscribers.
2. Extend the single `scheduleCoordination` journey with a clock-controlled case. Provision two responder sessions, one rota with a third responder as backup, and a decoy rota with real coverage belonging to neither subscriber. Freeze schedule time after sign-in because D1 also checks session expiry against its own clock. Issue a single own-scope subscription for each responder. Request as the holder, approve as the administrator, and accept as the named substitute.
3. Read the same two capabilities as anonymous calendar clients before and after the swap. Compare event start, end and summary to the protected coverage sequence filtered by each member and role. Assert the literal transfer boundaries, the one persisted override and revision increment, and the unchanged decoy. Compare workspace and paging snapshots and durable rows around each two-feed read. Confirm attributed calendar-export audit as the only durable side effect and an empty outbound ledger.
4. Push the working proof as a save. Record its dated observation in the OC-025 clause body and preserve the earlier f282 observation. Regenerate and check the contract views, restore the two main versions, then regenerate and check the edition lock using pinned rer 0.2.118. Push the landing candidate to the same branch and record Verify for that SHA.

## Observed UTC windows

On 5 January 2026, before acceptance the holder saw 12:34:56–18:00 UTC and the substitute had an empty calendar. After acceptance the holder saw 12:34:56–15:00 and 16:00–18:00 UTC. The substitute saw 15:00–16:00 UTC. Each interval was half-open. Neither feed contained the distinct backup's windows, decoy rota, raw member names or IDs, contact fields, or either bearer. Each pair of reads preserved all product rows, assignments, paging custody and workspace and paging revisions and wrote exactly two accepted, attributed calendar-export audit entries. The outbound count was zero.

The existing scope and masking are in `src/schedule-coordination/feed.ts` lines 21–32. The event role filter and UTC interval formatting are in `src/calendar.ts` lines 7–16. The relevant journeys are `tests/activation.mjs` lines 117–246 and 332–414. Existing swap authority, race, audit rollback, immediate revocation, inactive restoration, and overdue cancellation assertions still run in that same file.

PROBE OC-025 1: protected schedule coordination request, administrator approval, and named-substitute acceptance with an existing own-shifts capability each → the same two feed URLs move only the 15:00–16:00 UTC primary window and match protected coverage before and after, with no backup, decoy, member or bearer disclosure, unchanged read-side product and paging state, two calendar-export audits per read pair, and zero outbound requests.

CLAIM OC-025 PARTIAL points=1 tests=tests/activation.mjs#scheduleCoordination

GAP OC-025: R-14 dated owner-role Google Calendar and Microsoft Outlook viewing is still held. Team managers and privacy remain under OC-023, mobile swaps under OC-029, actual schedule-change notices and visible delivery failures under OC-077, and automatic reminders under OC-027.

The claim identifies the selected local part of acceptance 1. Provider proof, release prerequisites, independent standby and real-phone requirements remain held, and paging remains OFF. The replan-86 OC-025 row gains this proof and retains the existing f282 hold for R-14. The contract judgments and counts are 26 DONE, 41 PARTIAL, 34 MISSING before and after. No other plan row needs an update.

## Riders and candidate checks

| Rider | Result on this scope | Evidence |
| --- | --- | --- |
| 1 | Selected local outcome passes. The combined acceptance remains partial. | `tests/activation.mjs` lines 117–246 and 332–414. See the R-14 and inherited gap above. |
| 2 | Pass for populated allowed and excluded coverage with independent UTC boundaries. | `tests/activation.mjs` lines 140–240. Both subscribers are real active responders and the decoy has real assignments. |
| 3 | Exact candidate push Verify 44592740985 is completed with conclusion failure. | Verify is invoked by push. `scripts/verify-shards.json` lines 43–46 selects activation in the changes lane. |
| 4 | Pass. Activation ran at the exact candidate with Node 22.20.0 and pnpm 10.12.4. Build, typecheck and first-party check also passed. | The saved test and all source files also match the candidate bytes. |
| 5 | Pass by inspection for the selected scope. | Existing D-1 boundaries and OC-023, OC-029, OC-077 and OC-027 ownership apply. No new inherited obligation. |
| 6 | Mechanical pass after generation. | Candidate-only Observe paragraph is dated. Main Status, Gap, Evidence and judgment provenance were preserved. The lander updates checked-in generated views. |
| 7 | Pass by inspection. | Clause acceptance and prior evidence remain byte-identical. |
| 8 | Pass for the selected read boundary. | `tests/activation.mjs` lines 148–240 check private fields and exact persisted change. Existing outsider denials and f282 revocation still run around lines 285–310 and 400–413. |
| 9 | External proof held. | R-14 is not run. The local Worker result makes no provider or delivery claim. |
| 10 | Pass by inspection. | Existing own-scope authority and swap approval policy were exercised without a policy change. |
| 11 | Landing receipt pending. | Main remains at `071c74a352196f6778eb3b2942c351b4cf1e0ace` as last observed. Mac full-history publication scanning and candidate Run site are landing gates. |

Pre-ready coverage checked the public behavior through native Worker HTTP and the actual ICS output. The change adds assertions to the existing activation journey and preserves all previous assertions. The existing activation run covers revoked and erased calendar access and inactive restore. No UI files or routes rendering screens changed.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0

The candidate keeps both generated views at main. The candidate-view check locally reports `ACCEPTANCE.md: generated content differs`, with zero contract prose errors and warnings. The same check passed after local generation. The lock check passed with main's views restored and `git diff --check` passed. Added lines passed the email, credential-shaped strings and slash-separated token preflight. Full-history publication scan on `4efb655d24cccca45d8fdabd205f93a88189734a` is due at landing. The scan result and finding count are pending.

## CI provenance

Exact-SHA push Verify [44592740985](https://github.com/just-every/run-oncall/actions/runs/44592740985) reported completed with conclusion failure. Failed jobs contract-docs 135802997019, verify 135813689320. Cancelled jobs shards (changes) 135804136847. The changes job took 915 seconds total, including 118 seconds before the shard command and 795 seconds in that command. An exact-SHA local rerun of the changes command recorded elapsed_seconds=795 exit=124.

VERIFY_REPRODUCED {"command": "node scripts/verify-oncall.mjs changes", "exit": 124, "failure": "The exact shard hit the observed 795-second CI step deadline while tests/import-door.mjs was still running. ELIFECYCLE Command failed.", "head": "4efb655d24cccca45d8fdabd205f93a88189734a", "job": 135804136847, "observedTiming": "elapsed_seconds=795 exit=124", "test": "tests/import-door.mjs"} The same command at the original main SHA also remained unfinished at the 795-second deadline on the same runner. Its observed timeout exit was 124.

GitHub accepted one rerun of the cancelled changes job 135804136847 under Verify 44592740985 (HTTP 201). The task GitHub call budget was exhausted after submission.

`gh run view 44592740985 --repo just-every/run-oncall --job 135804136847 --log-failed` returned no failed-step log or HTTP diagnostic for the cancelled job.

The base SHA had green Verify 44585616014 and Run site 44585615890. The cloud branch uses the repository's push Verify entry point. Run site triggers on main at landing.
