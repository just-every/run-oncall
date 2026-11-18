# sd-oncall-c-f290 · Ordinary acknowledgment audit parity

Run Edit Run fleet · 18 November 2026

## Scope and plan

The replan-81 BASE-AGENT-002 row selects the ordinary acknowledgment slice of acceptance 5. Compare the signed-in Acknowledge action with the named-responder MCP call on equivalent ordinary declared incidents. Exercise autonomous and held policies, inspect saved responsibility and history at 1440 and 390 pixels, recheck the prior declaration and coordination journeys, and hand off the branch with the observed clause prose and pinned source lock. The plan extract and its queue were used as provided.

The work started from main at `82a4b02d2be3a0031afbeb08bca7ccdd25cc5a72`, then incorporated main at `f585355904fed9ce76c09b128f16e45c9051b497` before the first publication. The runtime save `957f29b649add7de3e0965c74a1b79074fa21e0f` was pushed with `[skip ci]`. The browser-and-contract commit `6052b446cc8f6da18f0620fb4e2dabf6bed7cbf3` is the candidate for `cloud/sd-oncall-c-f290`. Verify starts on branch push. Main's Verify `44405167937` and Run site `44405167651` succeeded on the incorporated base.

## Observations

- `src/agent-door/coordination-tools.ts` records the MCP acknowledgment as `command.transition`. The MCP name, emitted operation, domain call and explicit named-member audit binding keep their existing identities. `src/agent-door/native.ts` still gives an OC-053 service-account REST operation its `automation.incidents` audit kind. The change applies to new actions and the fixture compares the prior permanent audit rows byte for byte.
- `tests/oncall-agent-fixtures.mjs` runs the same fixture from `tests/runtime.mjs` via `tests/oncall-agent-flow.mjs` and from `tests/agent-door-browser.mjs`. The fixture reuses the maintained acknowledgment tool arguments, a dedicated public service within the agent's incidents grant, and equivalent declarations without linked evidence or an outgoing delivery subscription.
- Each action advances the protected incident and workspace revision once, saves the same acknowledged state, Lead and Assignee, and appends one accepted native transition event. The protected workspace comparison covers all other incidents, alerts and native delivery state. Each native event identifies the correct incident. The human event identifies the signed-in responder, and the MCP event identifies its agent, a distinct sponsor and the explicitly named responder. The MCP decision retains the original tool name. Autonomous returns zero new reviews. Held returns exactly one open review linked to the decision.
- Browser assertions used the real text-labeled Acknowledge button at 1440 pixels. The same signed-in responder read both saved records for each policy at 1440 and 390. Eight selected synthetic screenshots show the state, responsibility and timeline. Each fits its viewport, with zero serious or critical Axe findings and zero controls under 44 pixels in the existing capture measurements. The existing Incident actions icon and tooltip were exercised by the preceding declaration coverage. Loading the saved records preserves native and paging custody. Worker and browser outbound ledgers are empty in this fixture.
- The wrong audit type was tried in a temporary copy of the built Worker. The same protected HTTP and MCP fixture failed at `oneTransition` with actual `incidents.acknowledge` and expected `command.transition`, then the unmodified product build passed the focused probe. The product checkout was untouched by that experiment.
- The first exploratory fixture used the shared Payments API service with seeded subscription endpoints and observed queued acknowledgment events. The final fixture uses a dedicated granted service and asserts no pending delivery for that service. The product delivery path stayed as shipped.

## Coverage and clause status

| Acceptance | Result and proof |
| --- | --- |
| 1 | Open. Complete Core coverage and harness and real CLI gap refusal remain held. |
| 2 | Open. Full tool output schema judgment remains held. |
| 3 | Open. Full annotation judgment remains held. |
| 4 | Open. Stable-error parity across the UI and tools remains held. |
| 5 | Ordinary acknowledgment proved through `acknowledgeParity` and `acknowledgmentBrowser`. The f281 `declareFromAlertParity` journeys recheck ordinary declaration parity. Other jobs in point 5 remain held. |
| 6 | Open. Embedded-agent registry and audit proof remain held. |

The BASE-AGENT-002 Status, Gap, and Evidence cells keep main's judgment. Counts are 26 DONE, 41 PARTIAL, 34 MISSING, total 101 before and after. The replan-81 row can record the observed acknowledgment slice. The f184 held-standard notes review, all launched acknowledgment and declaration replay, conflict, revision and response-loss scopes, and the other plan entries retain their scope.

OC-023 team privacy and the BASE-AGENT-005, BASE-AGENT-006 and BASE-AGENT-008 holds continue. Erasure and approval replay, the SURFACE-004 Base seam, and OC-045, OC-046, OC-048 and OC-049 agent and AI egress stay with their owning work. Paging remains OFF. Production delivery, provider authorization and A2P, unattended timers, standby, devices, real-phone drills and cutover remain held.

## DONE riders

| Rider | Result |
| --- | --- |
| 1 | The ordinary acknowledgment slice passed the native and browser probes. The full clause remains open as listed above. |
| 2 | The nonempty fixture asserts state, revision, responsibility and audit effects. Reinstating the old audit type in a disposable Worker fails the new assertion. |
| 3 | Branch Verify and its exact commit are recorded in the checks receipt. |
| 4 | The browser ran the same application and test bytes as the candidate. The final commit adds that tested browser code, the observed contract prose and the lock. |
| 5 | The requirement and point 5 retain the Base duty to reuse the UI action and its audit type. |
| 6 | The contract document generator write and check succeeded. The two generated views are carried over from the latest main for the lander, along with the existing judgment. |
| 7 | The six acceptance sentences and the existing coverage map are identical to main. |
| 8 | The person and MCP call ran with active, distinct responder and sponsor identities under the two existing policies. This round exercises the scoped ordinary path and preserves the existing authority and erasure checks. |
| 9 | The evidence comes from the emitted local Worker and Chromium. Account, provider and release proof remain held. |
| 10 | The round exercises the existing signed policies. It adopts no policy default. |
| 11 | Guarded landing, full-history publication scan and candidate Run site are fleet steps. The publication scan has no cloud receipt. |

## Source references

- `src/agent-door/coordination-tools.ts:141` aligns the permanent type and retains the named-member binding.
- `tests/oncall-agent-fixtures.mjs:532` implements `acknowledgeParity`; the runtime calls it at `tests/oncall-agent-flow.mjs:661`.
- `tests/agent-door-browser.mjs:878` implements `acknowledgmentBrowser` and includes both presentation widths.
- `tests/runtime.mjs:1751` asserts the distinct OC-053 named-member identity in the service-account permanent history.
- `CONTRACT.md:1016` records the observation.

PROBE BASE-AGENT-002 5 acknowledgment: signed-in Acknowledge and the named-responder MCP call with the button summary under autonomous and held policy → matching acknowledged records, Lead and Assignee, incident and workspace revisions plus one, one permanent command.transition each, separately attributable identities, with zero and one open review respectively, unchanged paging custody and zero outbound requests.

GAP BASE-AGENT-002: Full Core coverage and gap refusal, schema and annotation judgment, stable-error parity, the other point 5 jobs and held standard notes review, and embedded-agent registry and audit proof remain open.

CLAIM BASE-AGENT-002 PARTIAL points=none tests=tests/oncall-agent-fixtures.mjs#acknowledgeParity; tests/agent-door-browser.mjs#acknowledgmentBrowser

Only a slice of point 5 was selected, so the claim lists zero complete acceptance points. The evidence paths name the two journeys for that slice.

## Pre-landing checks

The candidate diff preserves the original assertions, role and scope checks, and revocation, erasure, approval and replay logic. The full agent runtime and browser journeys passed with f281, the selected shared-file predecessors and the existing negative authority and replay checks. The branch contains no UI source edits. The lock is fresh and the generated views are ready to be written by the lander. The local regenerated check was clean, and the checked-in main copy of the generated acceptance view has the expected difference. The guarded landing scan and post-landing Run site are pending.

The exact candidate is published on its product branch. Verify run 44410867187 was in progress at the packet cutoff on 18 November 2026, 22:39 UTC. The independent lander owns the complete publication scan and the resulting main SHA's Run site check.
