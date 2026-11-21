# OC-023 signed-in service directory search

Run Edit Run fleet, 21 November 2026

- Repository: just-every/run-oncall
- Branch: cloud/sd-oncall-c-f324
- Base: d0a94b025d5ef864b77485a56c1474ae805c569e
- Published candidate: 096838e61207530644e2a990296d218db4315f5c
- Clause counts before and after: 26 DONE, 41 PARTIAL, 34 MISSING (101 total).
- Clause status: OC-023 stays PARTIAL. Contract text and the Status, Gap and Evidence cells are identical to the base.

## Plan extract and results

1. Read OC-023 and the existing public-team, reviewed Backstage dependency and Unassigned ownership checks. The missing directory observation was a signed-in member searching real projected service names and environments and opening an exact matching link.
2. Add a local query in ServiceList at the existing ServicesHome route. Match a trimmed, case-insensitive substring against either displayed service name or environment. Keep the projected ordering and service links, the owner display, and existing admin Add service behavior. A visible Clear search button restores the full list and returns focus to the input. The no-match message is announced as status. No new icon-only controls or authority paths were added.
3. Extend the existing member browser journey with the public-team Checkout and the Unassigned, unscoped staging service. Create the latter with the existing UI, then set its dependency on Checkout by the existing revision-checked HTTP command. From a distinct password-authenticated responder session, compare the unfiltered list and links to protected state. Assert that the mixed-case name query shows only Checkout and the mixed-case environment query shows only the staging service, with exact text and hrefs. Verify zero rows plus the no-match message, then clear and recover the exact initial list. Tab to the stage result and press Enter at 1440 and 390. The exact URL and heading loaded both times. The desktop detail also showed the protected environment, empty owner selection and Checkout dependency.
4. Compare owner and responder protected snapshots, the complete D1 durable snapshot and protected paging state before and after, including service, member, dependency, revision and permanent audit rows. All compared equal. Browser requests stayed same-origin and the Worker outbound ledger was unchanged. Paging read OFF.
5. Run the touched browser script and typecheck, first-party check, generated document write and check, and pinned source lock write and check. Push the one candidate commit and observe exact-head Verify. The only plan row advanced is the planner's OC-023 searchable services and environments slice. The f155 and f288 holds remain.

## Acceptance and inherited duties

| Item | Finding | Evidence |
| --- | --- | --- |
| 1. Two teams and a dependent service, alert runbook read, Backstage ownership change, foreign-team direct, export and chat denial, and conflict resolution without losing incident history | PARTIAL. This slice proves signed-in search of populated public and unscoped services, keyboard navigation and read-only custody. Existing team and Backstage flows still ran. Remaining foreign-team and Backstage obligations stay held. | tests/member-coordination-browser.mjs lines 51–135 and 622–665. Existing alert runbook proof is recorded in CONTRACT.md line 300. |
| 2. Foreign-team incidents omitted from listing and selection | Held. | CONTRACT.md line 297. The candidate only filters the services already supplied to the signed-in route. |
| 3. D-1 team-scoped audit export with atomic rollback, erasure-safe output and interruption at the execution boundary | Held. | CONTRACT.md line 298. Durable equality at tests/member-coordination-browser.mjs lines 61–72 and 127–129 is evidence for search custody. |
| OC-065 private-team recent-change scope | Held. | CONTRACT.md line 293. |
| OC-061 team subscribers and private-team business-service visibility | Held. Existing stakeholder service detail and read refusals ran in the touched journey. | CONTRACT.md line 293 and browser run. |
| OC-068 role and team rules for creation and responder requests | Held. Existing public-team obligations, cancellation and viewer refusal ran in the touched journey. | CONTRACT.md line 293 and browser run. |
| OC-025 team-manager swap rules and OC-060 team list and selection privacy | Held. | CONTRACT.md line 293 and the OC-023 Status row. |
| Team ownership, scope and analytics, unsupported Backstage catalog cases and live imports | Held. | Existing public-team authoring and reviewed Backstage dependency, conflict, Retry and reload proof passed through the original journey. No additional Backstage surface or provider operation was part of this round. |

## DONE riders

| Rider | Finding |
| --- | --- |
| 1 | PARTIAL. The acceptance 1 directory slice passed. Full acceptance 1 and acceptances 2 and 3 retain the holds above. |
| 2 | Pass for the slice. The browser compares populated rows and real links against protected state, plus no match and complete recovery. Lines 52–59 and 74–104. |
| 3 | Pass. Exact-SHA push Verify 44920531001 completed successfully. Its existing runtime shard includes the touched member browser journey. |
| 4 | Pass for local proof. The build and touched journey ran on the candidate's source and test bytes. The candidate rebase was a no-op and only the generated source lock was subsequently reproduced. |
| 5 | Inspected. The existing clause names the received duties at line 293. The held team duties are listed above. |
| 6 | Mechanical pass. Both generated views passed after write, which produced zero changes. Main's judgment cells and counts were preserved. Search evidence is in this packet. |
| 7 | Pass. CONTRACT.md and both generated views are identical to the base. |
| 8 | PARTIAL for the clause. Existing authority and foreign direct, export and chat checks remain in place. The added filter consumes the signed-in projection, and the test compares protected state and durable custody. Lines 52–72 and 127–129. |
| 9 | No provider claim for this local slice. Paging OFF was observed. Provider, standby and real-phone proof remain held. |
| 10 | Pass for this change. The query introduces no custody, consent, spending, authority or other policy default. |
| 11 | Pending guarded landing. The candidate was pushed to its cloud branch. Publication scan, main equality, and Run site on the landed SHA are Mac lander gates. |

## Checks and gates

- Production build, full touched member coordination browser script, typecheck and rer first-party check exited 0.
- Browser proof used the system Chromium with the repo's sandbox argument. The first attempt stopped in the seed's prerequisite check because the Playwright headless-shell download was absent. After installing that prerequisite the full browser script passed, still using system Chromium for the browser launches. Both proof screenshots are in this packet.
- Existing visible text scales through the seed's 14px and 15px field and list styles. Both widths fit, a visible focus outline surrounds the exact result, existing accessibility assertions passed, and service configuration stays under Settings.
- Existing assertions were preserved. The changed list has text-labeled controls and full borders. The filter adds no server endpoint, write, or authority path. The existing member journey rechecked revoke and read refusals and the API client section rechecked erasure and stale restore refusal.
- MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none (no migrations).
- Publication precheck found zero email-shaped strings and zero disallowed bare slash tokens on added product lines. Every candidate commit was checked for fleet author and committer and zero trailers. Full-history publication scan is pending Mac custody. Candidate scan complete and historyScanned are unestablished. Findings are unestablished.
- Base push Verify 44916181661 and base Run site 44916181647 both completed successfully on d0a94b025d5ef864b77485a56c1474ae805c569e. Candidate push Verify 44920531001: completed with success. Exact candidate Run site is pending guarded main landing.
- The Verify watcher received one HTTP 401. Refreshing the launcher and reinstalling the fleet Git setup recovered the read, and the next response recorded success on the exact candidate.
- No PR was created. The branch push triggered the existing Verify entry point.

PROBE OC-023 1: Signed-in Settings Services with mixed-case Checkout and staging queries yielded exact protected service links. Non-match emptied the list, and Clear restored the projected rows. Tab and Enter opened the Unassigned staging service at 1440 and 390. Protected records, revisions, permanent audit and paging matched before and after, with zero outbound.

CLAIM OC-023 PARTIAL points=none tests=tests/member-coordination-browser.mjs#serviceDirectorySearch

GAP OC-023: Scoped team ownership and manager authority, foreign-team direct, export and chat denials and list and selection privacy, team analytics, team-scoped audit export, inherited team duties and the held unsupported Backstage and live import work remain open.
