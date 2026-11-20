# Oncall OC-050 stale split confirmation

20 November 2026 · Run Edit Run fleet · sd-oncall-c-f314

Product branch is the named cloud branch at 00f9dd0288f07139f9be1f7387489ed828c6ef7f. Starting main was e13220ee432bc9ac531627b20a92790a0024433f, a descendant of the lease at 33cafdc. The intermediate save is 35cb938e844e2cc56aad934861d0fdba2e43e255. Counts before and after were 26 DONE, 41 PARTIAL and 34 MISSING (101 clauses). OC-050 remains PARTIAL. The observed evidence paragraph is the only contract source addition.

## Plan and result

1. Read the full OC-050 requirement, both acceptance points and the held plan rows. Reuse the existing service template, role, successful merge and split journey, and the protected triage storm journey. Keep the f311 merge-source confirmation separate.
2. Use the two-alert child of the existing successful split as the source incident. Review one alert as the owner. Sign in an independent responder in a separate context, save a note on the same source, and submit the frozen split from the first browser.
3. Assert the reviewed split payload and HTTP 409, visible conflict and absence of success or a child. Compare the incident, linked alert records, timeline, revisions, paging and durable snapshots. Require a single refusal audit attributed to the confirming user and source, and empty Worker and browser outbound ledgers. Capture review and refusal at 1440 and 390 with assertions at 1440. The independent note advances the revision once and appends its expected local event and audit bookkeeping.
4. Recheck predecessors and preserved journeys, check the regenerated contract views, restore main's view files, regenerate and check the pinned source lock, and run touched coverage, build, typecheck and first-party checks. Push the save and the checked candidate. Return the reports separately and leave publication scanning, generated-view landing and Run site to the guarded lander.

PROBE OC-050 2: Split selected alerts in the signed-in incident browser after a separate responder notes the same source → reviewed revision 1 sent, saved revision 2 retained, HTTP 409, visible reload conflict, zero new children, two retained alert links, source and generation custody preserved, one attributed refusal audit, unchanged paging and zero outbound requests.

Existing Controls and relations already enforce the frozen revision and conflict presentation. The change extends the existing journey without new test registrations and preserves the existing successful split, roles, template, checklist, merge, alias and native authority assertions.

| Acceptance | Result and public door |
| --- | --- |
| 1 | Native template publication, typed declaration, Lead, Scribe and Communications assignment and transfer are covered by tests/product-browser.mjs (incidentWorkflowBrowser) and tests/product-browser-journey.mjs (incidentRolesBrowser). Chat and backup responder paging remain held. This acceptance is incomplete. |
| 2 | Same-source stale split confirmation is covered by tests/product-browser.mjs (staleSplitConfirmation). Its containing journey keeps successful merge, split and alias readback. tests/triage.mjs (storm journey) retains stale and concurrent relation refusal, viewer authority, audit rollback and archive custody. Browser-closed reminders and stakeholder deadlines remain held. This acceptance is incomplete. |

## DONE riders

| Rider | Result |
| --- | --- |
| 1 | Partial. The selected stale split outcome is observed in staleSplitConfirmation. The acceptance table names the held outcomes. |
| 2 | Pass for the selected point. The existing journey moved real linked alert groups successfully. The reviewed stale confirmation after a real second-session note was refused with exact application and paging readback. |
| 3 | The unchanged browser Verify lane runs the core journey. Exact-SHA workflow status appears in the check receipt. |
| 4 | The touched browser and storm commands were run on the cited product SHA. See the check receipt and browser captures. |
| 5 | Inspected. Existing door rules and inherited role, workflow and paging obligations apply. This observation creates no new inherited duty. |
| 6 | The candidate preserves the existing Status cells. Generation and check passed locally before restoring main's view files. The committed view check reports only the expected ACCEPTANCE.md drift. |
| 7 | Pass. Both acceptance sentences are byte-for-byte the same. The change adds dated evidence outside the Status table. |
| 8 | Pass for the selected point. The existing storm checks include viewer and invalid-session refusals. The split test has distinct current sessions and retained signer attribution. |
| 9 | Held. Paging stays OFF. Provider delivery, authorization and A2P, standby, devices, real-phone and cutover proof remain outside this receipt. |
| 10 | Inspected. The test exercises the existing revision, role and paging policies. No policy default was added. |
| 11 | Pending guarded landing. Main equality, the full-history publication scan and exact-main Run site are lander gates. Base main had Verify 44696528833 and Run site 44696528969, both successful on e13220ee432bc9ac531627b20a92790a0024433f. |

## Predecessors and handoff

The shipped plan's OC-050 continuation and held row gain the stale split result, with status still PARTIAL. The f287 native Communications proof is present on main as bf9f806 and afa0187. The advertised f300 and f311 branches remain independent of this base. An isolated merge preview on the candidate automatically combined their test files and identified only CONTRACT.md and sources.lock.json conflicts. This branch does not import either predecessor. The lander retains predecessor ordering and resolves source evidence before regenerating the lock.

GAP OC-050: Chat role transfer, backup paging, stakeholder cadence, browser-closed reminders, broader workflows and team mobilization remain held. Chat is covered by OC-034 and OC-067, backup paging by OC-068 and OC-026, timers by OC-027, broader workflow automation by OC-043 and OC-056, and team scope by OC-023. Publication, Run site, predecessor and release gates remain in force.

The browser proof asserts at 1440 and captures both states once at 1440 and 390. It checks visible conflict, overflow, serious and critical Axe violations, and the keyboard-focus Close dialog tooltip. The test adds no controls and uses the existing split panel. Product build and verification evidence is tied to the exact pushed SHA in CHECKS.json. Local execution used Node 24.19.0, pnpm 10.12.4 and system Chromium. The Verify workflow selects the checkout’s Node pin.

CLAIM OC-050 PARTIAL points=none tests=tests/product-browser.mjs#incidentWorkflowBrowser; tests/product-browser.mjs#staleSplitConfirmation; tests/product-browser-journey.mjs#incidentRolesBrowser; tests/triage.mjs#storm journey

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

Verify 44700604079 was in progress on the exact candidate when the cloud CI wait ended. The workflow conclusion, publication scan and exact-main Run site remain pending.
