# OC-060 triage assignment report

Run Edit Run fleet · 18 November 2026

## Plan and result

The OC-060 row in planner return sd-oncall-replan-80 stays PARTIAL. Its selected work covered the alert-only assignment projection within acceptance 1. The plan was to seed two independently routed and unlinked alerts owned by the current actor, clear one through existing bulk reassignment, compare the durable coordination record against the protected triage filters and reload the corresponding views. The fixture preserves the existing storm and low-alert lifecycle coverage in their original journeys.

- Protected HTTP used a signed-in member with the responder role. Both uncoordinated items initially matched Mine. One bulk result committed an explicit null with a revision advance, a reason and a human-attributed operation entry. Mine and the explicit responder filter each returned only the untouched item. Unassigned returned the cleared item as triggered with null assignee and the committed timeline.
- The emitted browser used the signed-in installation owner. The existing Reassign control submitted Unassigned on one of two initially owned alert-only rows. After reload, the rendered row IDs and totals for Assigned to me and Unassigned agreed with protected HTTP. The desktop assertion run captured both reloaded views at 1440 and 390 pixels.
- The original alert owner, admission events and intake receipts survived. The untouched record stayed identical. The HTTP comparison also retained the full original alert payload apart from its coordination and revision fields, and the incident collection. Alert paging obligations and paging state stayed identical apart from the workspace revision associated with the accepted mutation. The outbound request ledger remained empty. Filter reads left durable records and audit unchanged.
- Against the pre-fix emitted Worker, the new HTTP assertion failed at the Mine total with actual 2 and expected 1 after the null had committed. The same scenario passed after honoring the coordination assignee when its record exists.
- The existing 50-incident storm and low-urgency retention proofs remain in Verify's runtime and browser shards. The low-alert journey retains anonymous and intake-only refusal, duplicate admission and revoked-source assertions. Erasure code and authority checks are outside this projection change. No policy default was needed.
- Existing triage typography uses 13-pixel filter chips and 14-pixel labels, counts and row metadata. The saved-view icon button uses the existing hover and focus tooltip. Filter, bulk action and capture checks use the existing controls and styles.

## Coverage and judgment

| Acceptance | Observed proof | Judgment |
| --- | --- | --- |
| 1 | Protected Worker HTTP in `tests/triage.mjs`, triageBulkCompletion. Emitted browser in `tests/product-browser-journey.mjs`, triageFiltersBrowser, invoked from `tests/product-browser.mjs`. Existing 50-incident web storm and new alert assignment readbacks. | Selected native coordination outcome proved. Team filtering, mine on native mobile and shared native-mobile queries remain open. |
| 2 | OC-023 team privacy dependency. | Foreign-team listing and selection refusals remain held. |
| 3 | triageBulkCompletion and triageFiltersBrowser exercise open low alert retention followed by independently attributed acknowledgment or closure. | Existing proof rerun. |

| DONE rider | Result for this partial candidate |
| --- | --- |
| 1 | Open. Acceptance 1's team and native mobile outcomes and acceptance 2's foreign-team outcomes remain held. |
| 2 | Passed for the selected slice. Two populated records, committed clear and retained peer were tested. The pre-fix read returned both items. |
| 3 | Refer to the exact-SHA Verify receipt below. The runtime and browser shards register these journeys. |
| 4 | Local tests used the candidate's source and test bytes. Main advanced to release metadata for Oncall 0.5.19. The source and test digests stayed identical, and the candidate also records the observation and updates the lock. |
| 5 | OC-023 and OC-029 are named in the clause, as are OC-053, OC-057 and OC-079. No new inherited duty was introduced. |
| 6 | The contract write and check results are in the mechanical receipt. The status row, Gap, Evidence and historical judgment are preserved as on main. |
| 7 | No acceptance text changed and no test assertion was removed. |
| 8 | Active responder reassignment was exercised over HTTP. Prior authority, refusal and replay checks remain. Team permission scope remains held by OC-023. |
| 9 | Only local Worker and browser evidence is claimed. No production paging, timing, delivery, standby, real-device or release inference. |
| 10 | Existing bulk reassignment semantics established the observed clear. No new authority, consent or custody policy. |
| 11 | Pending guarded landing. Main equality, full-history publication scan and candidate Run site remain lander duties. |

GAP OC-060: Team and my-teams filtering and foreign-team listing and selection refusals remain held under OC-023. Native-mobile storm, mine and shared queries remain held under OC-029. OC-079 bulk bounds and bundled replies and production paging, timing, delivery, standby, real-phone and release prerequisites remain outside this selected proof.

## Candidate and checks

- Branch `cloud/sd-oncall-c-f283`, SHA `2b35bfca9945f8a0e288a7e76de93864770abd45`, parent `518317b385c4535599bfc670dd676da46069b451`. Direct branch push succeeded. Verify starts on push.
- OC-060 PARTIAL to PARTIAL. Counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING of 101.
- Build, the full existing triage file, focused triage browser, typecheck, first-party profile, contract regeneration and regenerated source lock check passed.
- Source evidence lines. `tests/triage.mjs:181` covers protected reassignment and readback. `tests/product-browser-journey.mjs:1056` covers the browser control and reloaded filter comparisons.
- Main parent Verify 44322242486 and Run site 44322242470 completed successfully. Candidate Verify 44323938445 is completed. The build, all eight shards and full-push-proof passed. The only underlying failure was the expected ACCEPTANCE.md freshness difference (contract-docs job 134870296576). The final verify job 134881536706 failed on that dependency. Both job logs were read successfully. The cloud handoff rule treats this generated-view-only result as eligible for READY.
- Local contract regeneration and check passed. Restoring main's generated views yields the expected ACCEPTANCE.md freshness difference. Full-history publication scanning and candidate Run site follow through the fleet lander.

PROBE OC-060 1: protected bulk control clears one of two routed native alert-only records. Mine and the responder filter keep the untouched record. Unassigned returns the cleared record with null assignment and attributed history. Reloaded browser counts and IDs agree. Admission and paging are unchanged and the outbound edge is empty.

MECHANICAL lock=edition-authoring lock and check exit=0; views=contract-docs write and check exit=0; ledger=none exit=0
