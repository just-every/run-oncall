# Oncall OC-043 interrupted workflow observation

Run Edit Run fleet · 2026-11-18T08:32:55+00:00

- Product branch `cloud/sd-oncall-c-f277`. Pushed head `b4c3ab269146796413a9943566b017c6f8df22f2`. Predecessor main `fd67732578ab13b03f883bbbe1dc9bbd70bc114f`. Observed remote main `731bacf72abc4538e728628d85bf9d844d3b4da0`.
- Exact candidate Verify 44265407081 from push, completed successfully. [Verify 44265407081](https://github.com/just-every/run-oncall/actions/runs/44265407081)
- Predecessor CI on `fd67732578ab13b03f883bbbe1dc9bbd70bc114f` had Verify 44260227040 (success), Run site 44260227102 (success). Candidate Run site follows guarded landing.
- Publication scan for `b4c3ab269146796413a9943566b017c6f8df22f2` is pending the fleet lander. Completion, full history scan and findings are unestablished.
- Push triggered Verify directly. No pull request was required.

## Browser proof

- [Uncertain at 1440](uncertain-1440.png)
- [Uncertain at 390](uncertain-390.png)
- [Cleared at 1440](cleared-1440.png)
- [Cleared at 390](cleared-390.png)
- [Completed at 1440](completed-1440.png)
- [Completed at 390](completed-390.png)

## Outcome

OC-043 stays PARTIAL. The selected observations in acceptances 2 and 4 passed through the emitted Worker, real local D1 and the approving administrator's Incidents page. The browser assertions ran at 1440. The uncertain, cleared and completed states were each captured at 1440 and 390. The existing browser journey now exercises these assertions in Verify. The test registration count is unchanged.

| Contract status | Before | After |
| --- | ---: | ---: |
| Done | 26 | 26 |
| Partial | 41 | 41 |
| Missing | 34 | 34 |
| Total | 101 | 101 |

## Plan executed

1. Read the leased OC-043 clause, D-1, the selected plan extract, the DONE riders and the Oncall rulings. Confirm the lease's base in current main. Compare the existing HTTP fault fixture and successful browser resume to identify the absent browser observation.
2. Share the declaration audit trigger between the existing runtime and core browser journeys. Limit D1 fixture writes to installing and removing that trigger and backdating the stored lease. Perform approval, admission, refusals, clearance and both resumes through the ordinary Worker or browser doors.
3. Compare the browser, protected workspace state, permanent audit, paging state and Worker outbound ledger. Capture the three states at both widths and recheck the existing custody and routing assertions.
4. Run the touched runtime machines and core browser journeys, typecheck and the first-party check. Check the unpublished candidate against the fetched main, regenerate and check the contract views, restore main's views, then regenerate and check the source lock.
5. Push the product branch through the fleet guard, track exact-SHA Verify and return the report, receipt and six screenshots on the evidence ref. Relay the existing OC-043 row to the sd lane with the retained gap.

## Acceptance trace

| Point | Verdict in this round | Public door and assertion |
| --- | --- | --- |
| 1 | Predecessor passed locally | The exact-candidate routing journey admits correlated and unrelated Datadog, Alertmanager and application error events, compares policy versions at replay and exercises the exact maintenance end with no timer. The runtime machines run rechecked Worker restart with an uncertain reservation and again between declaration and notification. |
| 2 | Selected observation passed | In the core browser, Settings publishes a real approved policy version. Native ingress returns 201 for a single original and creates one run with one attributed reassignment. Incidents shows the rule and workflow versions and one retained step. After the 503, the uncertain state remains visible. Premature clearance returns 409 and explains the refusal. The lease, first step and permanent reservation persist with zero linked incidents. Expired clearance returns 200. After reload the row is still interrupted, one of three processed and declaration pending. |
| 3 | Predecessor passed locally | The runtime machines approved-rule workflow sends through the compatible routed key and checks routing version, service-rule version and linked rule-workflow custody. |
| 4 | Selected observation passed | One real D1 audit failure rolls back declaration and its successful step audit. Protected readback and the permanent audit corroborate that boundary. The browser clears the expired lease and reloads. One explicit resume declares the linked alert exactly once under the approving administrator, retaining the frozen template even after another version is saved. Reload observes zero requests. The next explicit resume records one pending, unsent responder obligation. The audit preserves the refusal and clearance and keeps attribution and exact committed revisions for both successful steps. The runtime machines run retains erasure-safe export, stale and concurrency refusals and replay protection. |

PROBE OC-043 2: Browser approves the service rule, admits one native alert, resumes under the declaration audit fault and reloads Incidents -> original retained, one reassignment, one uncertain reservation, zero declarations; clear returns 409 and workspace state is identical; expired clear returns 200 and reload shows interrupted with one of three steps and no incident.

PROBE OC-043 4: Browser explicitly resumes the cleared workflow, reloads, then resumes the notification independently -> one approving-admin declaration from the frozen checklist, one unsent responder obligation, ordered attributed audit facts, paging state identical and zero new outbound requests.

## Contract evidence and gap for the lander

**Evidence.** Extend OC-043's evidence citation to the approved-rule part of `triageBulkBrowser` in `tests/product-browser-journey.mjs` and the existing “OC-043 approved rule workflows” journey in `tests/runtime.mjs`. The browser uses the same `oc_admin_audit` fault as the runtime fixture and checks the administrator's visible uncertain and interrupted record, intact first step, early refusal, explicit declaration and separate unsent notification against protected state and permanent audit.

**Gap.** Unattended continuation and real responder delivery remain under OC-027, OC-026 and OC-042. Provider accounts, production paging, reference load, independent standby, real-phone drills and cutover remain held. Team, privacy, imports and provider duties stay with OC-023, OC-072, OC-083 and their related clauses. RL-102 reserves the routed-key explanation and replay move for OC-085 after accepted cleanup or on its separately held stack. No new policy default applies. Paging remains OFF.

The lander owns the Status, Evidence and Gap cells. The candidate diff is limited to four existing test files and their four source-lock hashes. The verification shard wiring and earlier assertions are intact. Replayed captures, revoked authority and erased subjects retain the existing runtime fences.

## DONE riders and delivery gates

| Rider | Result |
| --- | --- |
| 1 | Pass on the selected interrupted-workflow outcomes through the browser and protected Worker doors. OC-043 as a whole stays partial for held delivery and unattended continuation. |
| 2 | Pass. Real synthetic admission, a refusal that preserves workspace data, valid expired clearance, and successful attributed resumes all execute against populated records. |
| 3 | See the exact-SHA Verify record below. The core browser runs in the browser shard and the runtime machines run in intake. Desktop behaviour assertions and both viewport captures use the ordinary browser journey. |
| 4 | The build and focused capture ran on the committed candidate. The earlier local runtime and core browser checks used the same relevant source and test bytes. |
| 5 | Pass. OC-043 names D-1. OC-041 audit and subject-erasure custody were rechecked by the runtime machines journey. |
| 6 | Mechanical pass. Contract generation and check passed. The report records the new evidence and remaining scope for the lander, with the source judgment retained. |
| 7 | Pass. The contract, coverage map and all acceptance text are identical to main. |
| 8 | Pass in scope. Existing runtime checks exercise anonymous, viewer, absent approval, stale and erased resumption refusals. The browser tests early clearance and the approving administrator's valid actions. |
| 9 | Held. The unsent obligation remains a local record. Provider and handset boundaries remain open. |
| 10 | Pass. No new policy default or authority decision. |
| 11 | Pending guarded landing. The fleet owns the full-history publication scan and post-landing Run site. |

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

The three workflow states used existing text-labeled controls. Browser overflow, hydration and axe checks in the affected desktop journey passed. The phone captures record the same state without repeating mutations. The changed text check found zero email-shaped strings or ambiguous bare slash tokens. The checkout uses full history with blobless transport.

## Claim

CLAIM OC-043 PARTIAL points=2,4 tests=tests/product-browser-journey.mjs#triageBulkBrowser approved rule interruption and clearance; tests/runtime.mjs#OC-043 approved rule workflows

GAP OC-043: Unattended continuation and live responder delivery remain held under OC-027, OC-026 and OC-042. Paging remains OFF.

## Assertion anchors

- Acceptance 2 and D-1 interruption. Native admission and retained reassignment at lines 1263 to 1285. Uncertain lease, premature refusal and expired clearance at lines 1317 to 1371. [Browser journey](https://github.com/just-every/run-oncall/blob/b4c3ab269146796413a9943566b017c6f8df22f2/tests/product-browser-journey.mjs#L1263)
- Acceptance 4 completion. Checklist, separate explicit resumes, attributed timeline, permanent audit and no provider work at lines 1373 to 1427. [Browser results](https://github.com/just-every/run-oncall/blob/b4c3ab269146796413a9943566b017c6f8df22f2/tests/product-browser-journey.mjs#L1373)
- Protected authority, restart, concurrency, replay, archive and erasure at lines 69 to 132, with the shared D1 trigger in the Worker fixture. [Runtime machines](https://github.com/just-every/run-oncall/blob/b4c3ab269146796413a9943566b017c6f8df22f2/tests/runtime.mjs#L69)
