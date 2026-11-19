# OC-025 own-shifts subscription continuation

Run Edit Run fleet, 19 November 2026. Repository: just-every/run-oncall.
Product branch: `cloud/sd-oncall-c-f306-pc2`. The exact submitted commit, local exits and GitHub receipts are in `candidate.json`.

## Scope and plan result

Resumed the advertised pc1 save at `0462eff8318f6e672783d93cce1f6af0cfcb01a8`. Rechecked the lease base, the refreshed main and f282's landed replay. Continued on the designated branch with a new commit. The five commits already present on pc1 are retained, including its shard split in `scripts/verify-shards.json`. This continuation strengthens the existing activation journey and refreshes its pinned source lock. It retains the dated own-shifts observation in `CONTRACT.md` beside f282's service-scoped override and revocation observation. No UI, app runtime, migrations, workflow YAML or test registration changed in this continuation.

The plan row for OC-025 records completion of the selected local slice of acceptance 1. The full clause stays PARTIAL. Totals before and after are 26 DONE, 41 PARTIAL and 34 MISSING across 101 clauses. The contract Status table, acceptance wording and existing judgment were preserved. The dated R-14 owner-role Google Calendar and Outlook viewing remains open. Team managers and privacy remain under OC-023, mobile swaps under OC-029, notice delivery and visible delivery failures under OC-077, and automatic reminders under OC-027. Paging remains OFF. Providers, independent standby, real-phone work and all other queue and release prerequisites stay held.

## Probe and acceptance

PROBE OC-025 1 local slice: From the emitted Worker, issue one own-scope subscription each to the primary holder and named substitute. At a fixed Worker time, request, approve and accept the future primary swap. Read the same bearer feeds before and after without a signed-in session. The holder's original 12:34:56–18:00:00 UTC window splits at 15:00 and 16:00, and the substitute gains only 15:00–16:00 UTC on 5 January 2026. Each event matches protected coverage filtered to the subscriber and role. Both feeds omit the distinct backup, populated decoy rota, raw member information and bearer links. Reads preserve assignments, workspace and paging revisions and durable paging records. Each read appends only attributed calendar-export audit and its bookkeeping. The outbound request ledger stays empty.

- `tests/activation.mjs:117–247`, `ownShiftsAcrossSwap` inside `scheduleCoordination`, exercises exact before and after windows, the approved role-specific override and disclosure checks. Those assertions fail if a feed drops the substitute's window, retains the original holder's bounded window, includes backup or decoy coverage, exposes raw member details or changes application state.
- `tests/activation.mjs:309–334` exercises request, approval and racing acceptance, wrong-substitute and unapproved refusals, one effective override, audit rollback, recorded notice obligations and the reminder's not-sent state.
- `tests/activation.mjs:345–425` preserves f282's separate service-scoped override and immediate revocation proof. A different responder is refused, subscriber revocation returns 404 on the same URL, and paging and assignments survive. Erasure revokes an outstanding feed at `tests/activation.mjs:1595`.
- `src/schedule-coordination/feed.ts:21–32` selects the rota scope, hashes exported rota IDs and masks member names. `src/calendar.ts:7–16` filters each role by member and writes UTC event windows. The proof stops at the local ICS door. Google Calendar and Outlook display, actual change delivery, actual reminders and a live failed-notification outcome remain unproved.

CLAIM OC-025 PARTIAL points=none tests=tests/activation.mjs#scheduleCoordination

GAP OC-025: Acceptance 1 still needs R-14 dated owner-role viewing in Google Calendar and Outlook. The inherited team, mobile, delivery and timing duties remain assigned to OC-023, OC-029, OC-077 and OC-027 respectively.

## DONE riders and pre-READY checks

| Rider | Result | Evidence |
| --- | --- | --- |
| 1 | PARTIAL | The selected local outcome passes through actual HTTP and ICS doors. The full acceptance still includes the held outcomes above. |
| 2 | PASS for selected proof | Populated public and decoy rotas, two same-capability reads, literal expected UTC windows and wrong-substitute refusal in `tests/activation.mjs:117–247` and `:309–318`. |
| 3 | See candidate receipt | Verify loads `tests/activation.mjs` in the changes shard through `scripts/verify-shards.json` and `tests/verify.mjs`. The exact run and conclusions are in `candidate.json`. |
| 4 | PASS for selected proof | Local emitted Worker and test inputs match the candidate by checked source lock. The exact cloud run is tracked separately. |
| 5 | INSPECTED | No inherited duty transferred or redefined. OC-025 preserves its existing language and the other clause IDs retain their obligations. |
| 6 | PARTIAL | Local generated write and check passed. The committed views are main's. Judgment cells and provenance remain the lander's responsibility. |
| 7 | PASS | Acceptance wording, clause IDs, and source judgment cells match main. |
| 8 | PASS for selected doors | Only the authorized substitute accepts after approval. Another responder's revocation attempt is refused. Accepted own-scope reads emit only calendar-export audit. |
| 9 | HELD | R-14 owner-role viewing awaits dated provider proof. This round makes no authorization, delivery or field claims. |
| 10 | N/A | Existing scope and authority were exercised with no new policy default. |
| 11 | PENDING | Guarded landing, complete publication scan and candidate Run site are fleet gates. Main Run site is recorded in the receipt. |

This continuation adds no test registrations and weakens no existing assertion. Revocation, erasure and swap replay and concurrency coverage remain in the activation journey. No browser view changed. No migration ledger work was triggered.

## Predecessor Verify reproduction

On the saved SHA, Verify 44621149532 passed the build, eight shards and full push proof. The contract-docs job 135903074676 failed on the expected generated `ACCEPTANCE.md` difference. Aggregate job 135913733914 also failed. The exact log archive request for the aggregate job returned `failed to get run log: zip: not a valid zip file`. Locally on the same saved SHA and pinned Node 22.20.0, the aggregate shell rejected the observed upstream failure and passed with only the contract-docs outcome toggled. The reproduction receipt records the command and exit. Locally generated views passed their check and were restored from main, following the lander protocol.

## Local checks and custody

The full activation file exited 0. The emitted build, typecheck, first-party check, local written-view check and pinned source-lock check also exited 0. The remote product branch advertised the exact candidate SHA after the guarded push. The clone had full commit history, and all six candidate commits including side parents passed author, committer and trailer inspection. The updated checkout was clean.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none

The product branch keeps main's generated artifacts. The source observation adds two lines to locally regenerated ACCEPTANCE.md. Main's two generated files were restored before the lock was written. Exact-SHA Verify and the full scan and Run site status are recorded in the candidate receipt.

The candidate and saved predecessor have byte-identical contract source, generated views, generator and Verify workflow. On the checked-out candidate, before regeneration, the exact contract-docs command independently returned exit 1 and named only the generated ACCEPTANCE.md difference. Contract prose reported zero errors and zero warnings.

Local reproduction used Debian 13 and the workflow pin Node 22.20.0. GitHub ran the jobs on Ubuntu 24.04.

## Exact-SHA Verify result

Push Verify 44630545063 completed every job for the candidate. Plan, build, all eight product shards and full push proof passed. The changes shard that runs activation was 135938081468. Job 135936055645 failed only at the generated-documents check. Job 135947109482 rejected that upstream failure at its final gate. The checked-in view mismatch qualifies for the generated-view-only READY exception. Main Verify 44599061529 and Run site 44599061677 passed on the inspected main commit. Candidate publication scanning, regeneration and Run site await guarded landing.
