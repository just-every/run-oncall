# OC-060 personal saved-view round trip

19 November 2026 · Run Edit Run fleet · sd-oncall-c-f297

## Scope and plan

1. Check the planner base and the latest main, then map the existing 50-incident web, low-alert and unassignment probes and the alert-only chronology predecessor.
2. Extend the existing core browser journey through Save current view and the protected personal list. Read the exact stored search and filters back, check the list as a different signed-in responder, then recall from a clean Incidents URL at both widths.
3. Compare restored controls, URL, browser GET parameters, exact rendered incident IDs and count against the protected HTTP results. Compare all durable tables, revisions, permanent audit and paging state from the preference-write boundary and require empty Worker and browser outbound ledgers.
4. Record the observation in the clause body, validate the generated views locally, restore the published views and lock the final sources. Hand the pushed product to the guarded lander with the evidence packet.

## Results

The named view retained the storm search term, the Triage queue service, Low urgency, Snoozed status and Assigned to me. Saving returned HTTP 200. The saving member read back exactly one view with those values and the expected actor. The other responder authenticated as their own member and received HTTP 200 with an empty views list. On each viewport a clean Incidents page started with empty filters. Selecting the view restored all five values in the controls and URL and issued a successful protected triage GET with the same query. The page showed the exact five seeded incidents numbered 30 through 34 and the API count of five at both 1440 and 390 pixels. Both viewports fit without horizontal overflow. The Worker made zero outbound requests. Recall made zero browser outbound requests and left the complete durable snapshot and paging state equal to their post-write values.

The existing storm, low-alert retention, browser unassignment and f295 alert-only updated-time probes also passed. The published checkout contains the planner base 4eadad478aa00b538a9750a6727306937a4fd54c, the f283 unassignment implementation as 3a2f2eaba7d538a88d654c22cca56d6c359f4dfd, and the f295 alert chronology as 91aac69c200f2c15b5188aeda2804f3ea1954a71 and 103446c61bc8d5601fee154f74488127e8a78091. The named f296 tip was checked for overlap and is an independent agent resolution change. The planner's OC-060 row remains held with this narrower web result recorded. All other queue rows and existing release gates retain their scope.

OC-060 remains PARTIAL. Counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING, 101 total. The builder changed the observation in CONTRACT.md at line 729. The Status table and generated views match the base. The existing test registration was extended and the test count stayed flat.

## Acceptance and inherited duties

| Item | Result | Candidate proof |
| --- | --- | --- |
| 1. 50-incident storm across team, service, urgency, status and assigned-to-me on web and mobile | Web subset passes. Team and mobile remain held. | tests/product-browser-journey.mjs lines 992–1080 and 1081–1154. Existing browser unassignment at lines 1196–1249 and alert-only chronology at lines 1250–1302 also passed. |
| 2. Foreign team's incidents neither listed nor selectable | Held under OC-023. | The separate personal saved-query privacy check at lines 1083–1106 proves member-scoped preference isolation. |
| 3. Open low-urgency alert remains listed until acknowledged or resolved | Local pass. | tests/product-browser-journey.mjs lines 1156–1194 exercises two low alerts, attributed actions, reload, duplicate intake and source revocation. |
| OC-057 inherited low-alert triage duty | Local pass. | The clause names this duty and the low-alert journey exercises it. |
| OC-023 and OC-029 | Held. | Team scopes and foreign-team refusal plus native-mobile storm and shared queries remain with those clauses. |
| OC-079 and production paging prerequisites | Held. | Existing alert-only unassignment was rerun. Bulk bounds and bundled replies, delivery, timing, measured capacity, independent standby and real-phone prerequisites remain assigned to their existing gates. Paging stays OFF. |

## DONE riders and pre-landing review

1. **Partial.** Local named public-door proof covers the selected web slice and acceptance 3. Team and mobile portions of acceptance 1 and all of acceptance 2 remain held.
2. **Local pass for selected scope.** Fifty seeded incidents yield independently known incident IDs. Two real member sessions demonstrate successful save and readback with no cross-member disclosure. The all-table comparison detects state changes after saving.
3. **Workflow coverage mapped.** The existing core entry in scripts/verify-shards.json lines 30–36 invokes the same journey through tests/product-browser.mjs. Exact-SHA Verify 44544913966 ran the browser shard successfully as job 135634328821. All other executed product shards passed.
4. **Pass locally on candidate.** The receipt names the candidate and both screenshots come from its committed checkout.
5. **Pass for selected scope.** OC-060 names the OC-057 inherited retention duty and references OC-023, OC-029, OC-053 and OC-079 for their respective responsibilities.
6. **Generated check passed after write.** The fleet lander owns publishing the regenerated view and provenance. Judgment cells and counts match main.
7. **Pass.** Acceptance sentences and existing assertions were preserved. The dated observation is a clause body addition.
8. **Local pass for personal preference authority.** The saving member retrieves one populated view. The independent responder receives an empty list. The team-incident refusal is held under OC-023.
9. **Pass for reporting boundary.** Proof comes from the emitted local Worker and synthetic records. Hosted capacity, live delivery and native-device duties are held.
10. **Inapplicable.** The journey uses existing member authority and introduces no policy choice.
11. **Fleet landing pending.** Exact-SHA Run site and the full-history publication scan belong to the guarded lander. The packet contains no gate material or credentials.

The existing core workflow, runtime code and data doors were reused. Focused checks exercised prior authority, duplicate replay and revocation behavior in the low-alert leg. No erase path changed. The captured Incidents view is the existing interface with no product UI change. Its icon-only saved-view removal button uses the existing tooltip. Both captures were inspected and show only synthetic data.

CLAIM OC-060 PARTIAL points=3 tests=tests/product-browser-journey.mjs#triageFiltersBrowser

GAP OC-060: Team and my-teams filtering and foreign-team listing and selection remain held under OC-023. Native-mobile storm and shared queries under OC-029, OC-079 bulk bounds and bundled replies, direct urgency-edit chronology, eventless intake, wider filter coverage, hosted capacity, production paging, timing, delivery, standby and real-phone duties remain held.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

## Verify 44544913966

The push workflow finished with a raw conclusion of failure. Plan, build, all eight shards and full-push proof passed. The generated contract job 135632989315 reported that ACCEPTANCE.md differs. The aggregate job 135643547357 requires that generated check to pass. This is the generated-view exception in the fleet handoff rule. The product commit is READY for guarded regeneration, scanning and landing.

The archive command for job 135632989315 confirmed the generated-view mismatch. The command gh run view 44544913966 --repo just-every/run-oncall --job 135643547357 --log-failed exited 1 with “failed to get run log: zip: not a valid zip file”. No HTTP status was supplied. The jobs response and the aggregate workflow’s explicit CONTRACT_DOCS requirement identify the dependent guard failure.

## Publication and local receipts

Product branch cloud/sd-oncall-c-f297 advertises 3636c1a6c7a2ccd99c85bee1f40abc3391d6c4d9. The initial save was cdc88948d948efd8db5722e442efa23ff29d9175. Latest checked main was 50a05ac92632c5eba8f30cc0b9405fcab4df685b. Its Verify runs 44542108898 and 44535859837 and Run site 44542108915 completed successfully. Candidate Verify 44544913966 was completed with conclusion failure at packet creation. Candidate Run site, full-history publication scanning and main equality are fleet landing gates. No pull request was needed for push-triggered Verify.

The emitted Worker build, focused browser journey, typecheck, first-party check, generated view write and check, and pinned source lock passed. The first core browser invocation passed all OC-060 assertions, then exited 1 on a local Worker connection reset during the existing incident workflow state read. The core retry exited 1. It passed the OC-060 assertions and incident workflow, then hit a local connection reset in the existing imported email check. Restoring the published views makes the standalone generated view check report the anticipated ACCEPTANCE.md difference. Screenshots and the exact candidate receipt accompany this report.

https://github.com/just-every/run-oncall/actions/runs/44544913966

## Runtime probes

PROBE OC-060 acceptance 1 web: 50 incidents -> rendered IDs and counts equal protected HTTP for service, urgency, triggered, declared, acknowledged, snoozed, resolved and mine; controls and URL agree; all durable rows, audit and paging unchanged, zero outbound requests

PROBE OC-060 acceptance 1 personal saved view: exact member-scoped query saved; another signed-in responder sees no view; clean Incidents URL recalls five exact protected IDs and count at 1440 and 390, with unchanged durable rows, revisions, audit and paging after save, and zero outbound requests.

PROBE OC-060 acceptance 3 web: two native low alerts -> retained explicit low urgency across reloads, separate attributed acknowledgment and close, retained acknowledged and resolved history despite duplicate intake and source revocation, active source state, unchanged paging and zero outbound requests; changed screens captured once at 1440 and 390

PROBE OC-060 acceptance 1 web: bulk Reassign to Unassigned cleared one of two owned alert-only items. Reloaded Assigned to me and Unassigned rows and counts agree with protected HTTP and retain the attributed clear. Paging custody unchanged, zero outbound requests, reloaded screens captured at 1440 and 390.

PROBE OC-060 acceptance 1 web chronology: alert-only controls and shared URL return exact protected HTTP order and time cohorts. Created sorting, both updated boundaries, replay cutoff, durable records, revisions, audit, paging and zero outbound pass. Changed filter view captured at 1440 and 390.
