# OC-061 merged incident recovery

Run Edit Run fleet, 19 November 2026. Round sd-oncall-c-f307. Candidate `7a20b6b326c81c99ff9711e90c7ac1c68dbb3344` on `cloud/sd-oncall-c-f307`. Save `836105ee73c4fafb8d9f373861956e64d991d095`. No pull request.

## Scope and plan

1. Recheck current main, the f272 stakeholder private-door proof and the f298 communications-owner override proof. Use the existing member audience, owner transition command and status view.
2. Demonstrate the bug through emitted Worker HTTP before changing the status calculation. Resolve aliases only for their effective lifecycle and keep the source incident’s supporting service, severity and history.
3. Extend the existing runtime and signed-in browser journeys. Prove the status sequence, retained attribution, zero status-read writes, paging custody and zero egress. Capture the existing Checkout status at 1440 and 390.
4. Record locally observed results in the OC-061 clause, regenerate and check the views, restore both views from main and regenerate the pinned source lock. Push the exact candidate, observe Verify and publish this packet separately.

Plan row advanced is the selected OC-061 acceptance 2 item in replan-86. OC-061 remains PARTIAL. Counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING, totaling 101. The dated observation at `CONTRACT.md:764` is the only contract change. Acceptance text, summary counts, Status, Gap and Evidence cells are identical to main.

Main at integration and product push was `eeb1ac5166482fc1a2a54e68deb587080f72d95e`. Main Verify `44585616014` and Run site `44585615890` both completed successfully on that exact base. Predecessor f272 advertised `eff87aeb96794c01e1db7801a673c734b38342c9`; its landed counterpart on main is `fdfc6d4c4dbd8698a14978b9c875886f96b6883d`. Predecessor f298 advertised `8b9d6a9c069e39ccb0527f5c3f17ad8dc328c16d`; its landed counterpart on main is `26b686df336d403204c21fabe83ea8862cb5505a`. The main clause contains both observations, and the existing assertions are retained.

## Results

- The emitted baseline Worker failed the new recovery assertion with actual `degraded` and expected `operational`. The candidate uses the existing incident alias resolver for lifecycle in `src/business-status/model.ts:32`. Supporting-service membership and severity still come from the original incident. `src/business-status/model.ts:15` derives the protected projection from loaded state, so existing stored status from older builds is corrected on read without writing it back.
- The expanded storm journey in `tests/triage.mjs:819` creates two warnings, merges the duplicate, acknowledges and recovers the canonical incident with evidence, then resolves it with a summary. Stakeholder status reads produce degraded, degraded and operational, and persisted status from the resolution is operational. The alias, merge actor and reason, source timeline, canonical merge and recovery history, resolution summary and actor all survive. Per-read D1 comparisons include application state, workspace revision and audit. Paging custody remains identical as the incident commands advance the workspace revision. The Worker network ledger is empty.
- The signed-in Checkout stakeholder in `tests/member-coordination-browser.mjs:914` sees the same sequence in the existing status view and through protected HTTP. The test clears the older manual override before this sequence and retains the same subscription. Full custody snapshots compare native state, permanent audit, paging and status before and after reads. The browser and Worker outbound ledgers are both empty. The four selected screenshots show the merged degraded and resolved operational statuses once at each width. They also show the existing recorded impact obligation preserved as history. At 1440, overflow, hydration, and the existing serious and critical accessibility checks passed. The status composition and its labeled controls are unchanged.
- A separate local probe seeded the stale persisted derived value observed on the baseline. The signed-in stakeholder read operational. The persisted rows, revisions and audit were identical across the read, and the Worker outbound ledger was empty.
- Local commands passed for the emitted app build, the triage storm, the full member coordination browser journey, typecheck, and the first-party profile. Browser preflight initially lacked Playwright assets. Installing the project’s Chromium assets resolved it, and the full rerun passed with system Chromium and the no-sandbox launch argument. Both maintained journeys were extended in place. No new test registration or workflow change.
- The contract write updated one generated view. The subsequent check passed with zero prose errors and warnings. The views were restored from main and the pinned lock regenerated and checked. The committed tree’s generated-document check reports the intentionally stale `ACCEPTANCE.md`, with zero prose errors or warnings.

PROBE OC-061 2: signed-in Checkout stakeholder GET `/api/status` and existing `/status` after two warning declarations, merge, and evidenced canonical resolution with summary -> degraded, degraded, operational. Alias and attributed history retained, reads write nothing, paging OFF custody unchanged, zero browser and Worker outbound requests.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check exit=0; views=node src/base/contract-docs.mjs write followed by node src/base/contract-docs.mjs check exit=0; ledger=none exit=0

## Browser proof

- Merged warning incidents, Checkout degraded. [1440 pixels](oc061-merged-impact-1440.png) · [390 pixels](oc061-merged-impact-390.png)
- Canonical incident resolved, Checkout operational. [1440 pixels](oc061-resolved-impact-1440.png) · [390 pixels](oc061-resolved-impact-390.png)

## Acceptance and riders

| Item | Candidate evidence and result |
| --- | --- |
| Acceptance 1 | Existing Checkout subscription depth retained in the runtime and member browser journeys. Outside this round’s claim. |
| Acceptance 2 | PASS locally. Protected stakeholder status and rendered Checkout status progress from degraded through merge to operational after canonical resolution. `tests/triage.mjs:819`, `tests/member-coordination-browser.mjs:914` and the four screenshots. |
| Acceptance 3 | Held. Existing web and API denials retained, including the populated direct-door checks from f272. Approved updates, chosen-channel delivery and mobile proof lack the held dependencies below. |
| Acceptance 4 | Held. Local no-sender and unsubscribe record behavior remains exercised. Actual delivery absence remains unestablished. |
| Acceptance 5 | Held. Private-team scope remains with OC-023. |
| Acceptance 6 | Existing attributed override and current-role refusal re-executed in the touched journeys. Outside this round’s claim. |
| Rider 1 | Selected outcome reached through protected HTTP and the signed-in browser. Other clause outcomes remain held. |
| Rider 2 | Real synthetic D1 incident, business-service and stakeholder records. The baseline assertion produced degraded after resolution. |
| Rider 3 | Both journeys are in the existing push Verify shard plan. See the exact run and conclusion below. |
| Rider 4 | The storm journey, full member browser journey and stale-cache probe passed from the clean candidate HEAD. The selected screenshots are from that browser run. |
| Rider 5 | The retained clause names OC-023 dependencies, OC-039 identity, OC-051 approved updates and OC-029 device delivery. OC-042 custody and OC-067 chat prerequisites remain held. No inherited duty moved between clauses. |
| Rider 6 | Local regenerated views passed. Existing Status, Gap, Evidence and judged-from provenance stay with main. |
| Rider 7 | Existing requirement and acceptance points preserved verbatim. No scope ruling needed. |
| Rider 8 | Existing explicit audience and stakeholder role boundaries retained. Touched suites exercised anonymous and revoked refusals, private direct web and data-door refusals, and a present-but-demoted communications owner’s valid override refusal. No authority change. |
| Rider 9 | No live delivery or public publication is claimed. RL-5 notices and email-list subscriptions remain records with no sender. |
| Rider 10 | No new policy default. Paging remains OFF under the existing policy. |
| Rider 11 | Guarded landing pending. Publication scan, exact landed Verify, main equality, Run site and release gates belong to the fleet lander. A full-history clone was used and added text was checked for email-shaped strings and ambiguous slash tokens. |

CLAIM OC-061 PARTIAL points=2 tests=tests/triage.mjs#OC-061 2 merged incident impact; tests/member-coordination-browser.mjs#OC-061 merged Checkout status

GAP OC-061: Approved updates and publication under OC-051, chosen-channel delivery and its SendGrid sender under OC-042, actual delivery absence, mobile and push under OC-029, private-team scope and team subscribers under OC-023, SSO and SCIM under OC-039, channel subscriptions, Slack and Teams under OC-067, and public status publication remain held. Paging remains OFF.


## Exact candidate Verify

Push Verify 44593189787 observed on `7a20b6b326c81c99ff9711e90c7ac1c68dbb3344` with status completed and conclusion failure. Plan, build, all eight shards and full push proof succeeded. The contract-docs job (135804656819) failed only on the deliberately retained generated ACCEPTANCE.md. The final verify job (135816517134) failed its dependent contract-docs condition. Both job logs confirmed this, and the contract check reproduced the same result locally. This is the fleet generated-view exception for READY. https://github.com/just-every/run-oncall/actions/runs/44593189787

| Verify job | ID | Conclusion |
| --- | ---: | --- |
| plan | 135804419513 | success |
| build | 135804656768 | success |
| contract-docs | 135804656819 | failure |
| light | 135804659787 | skipped |
| shards (agents) | 135807778927 | success |
| shards (browser) | 135807778975 | success |
| shards (changes) | 135807779012 | success |
| shards (intake) | 135807779014 | success |
| shards (triage) | 135807779033 | success |
| shards (runtime) | 135807779046 | success |
| shards (transfer) | 135807779052 | success |
| shards (hosted) | 135807779069 | success |
| full-push-proof | 135816451857 | success |
| nightly-proof | 135816454788 | skipped |
| verify | 135816517134 | failure |
