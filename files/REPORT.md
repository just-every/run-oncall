# sd-oncall-c-f308 · Oncall reassignment audit parity

Prepared by Run Edit Run fleet on 19 November 2026. The reviewed product head is `c88515d973486ba9908d54d6574b3c00c0047e4a` on `cloud/sd-oncall-c-f308`. The published saves are `20183c0f63e40632391e9a12df33f59a995fcbc9` and `3758276c97afbee077577119373af6d23ae41a71`. The branch uses push Verify. No pull request was created.

## Scope and plan

1. Read the contract, the planner's reassignment point and the DONE riders. Check current main, f290 and f299 before changing the shared coordination code.
2. Map the signed-in picker to the native command and MCP dispatch. Align the permanent kind for a completed non-null reassignment and preserve the registered tool, prior permanent rows and the OC-053 REST override. Push the source change and the two intentionally revised expectations as a save.
3. Reuse the native fixtures through the existing agent runtime and browser journeys. In each policy create equivalent acknowledged incidents in one public service with a single-service credential. Submit the same assignment without a reason via each door. Compare protected state, full assignment effect, permanent audit and review custody. Read the saved incident at 1440 and 390.
4. Recheck the base and merge main’s Hono update with a second published save. Run the existing REST reassignment probe and repeat the touched checks on the exact candidate, record observed proof in the clause body, regenerate and check the views, restore main's views, and regenerate the pinned source lock last. Publish the candidate and identify exact-SHA Verify and landing custody.

## Result and plan rows

BASE-AGENT-002 acceptance 5 now has passing signed-in and MCP evidence for the non-null reassignment slice. The judgment and plan rows remain open. Main records MISSING. Status counts before and after the candidate are 26 DONE, 41 PARTIAL and 34 MISSING, 101 total. The clause's heading, six acceptance sentences and judgment cells are inherited from main.

- The public browser action used the existing Assignee button and selected an existing active responder. The request carried type, incident, revision and member. The tool used that same member on the paired incident, with an incident-write credential bound to the same single service.
- Protected state showed the target assignee, original Lead, Scribe and Communications, matching timeline text, one incident revision and one workspace revision per door. Both permanent events were accepted `command.reassign` entries. The session member and the agent acting for its distinct sponsor were retained in timeline and history. Earlier permanent rows retained their bytes. The MCP decision retained `oncall.incidents.update`.
- The signed-in and autonomous actions opened zero reviews. The held tool call opened exactly one, linked to the completed decision. Paging stayed OFF with identical custody, and the Worker and signed-in browser attempted zero outbound requests during the scoped journey.
- The changed expectations in `tests/oncall-agent-incident-replay.mjs` and `tests/oncall-agent-incident-revisions.mjs` now read `command.reassign` where they formerly read `incidents.update`. Changed reason still refuses with `idempotency_conflict`, stale native revision still refuses with `revision_conflict`, a foreign or missing incident still returns the same `not_found`, and exact replay returns the original result and review without a second effect. The link and dropped-response journeys stay in the existing agent runtime.
- The existing OC-053 REST reassignment in `tests/runtime.mjs` checks the accepted `automation.request` bookkeeping followed by one accepted `automation.incidents` incident mutation with the machine actor. The first local assertion targeted the request revision and returned `automation.request`. The corrected assertion checks both consecutive rows and passed the native REST probe. The existing REST override remains in `src/agent-door/native.ts`.
- Main carries f290's acknowledgment implementation and browser proof via `5dba1886397cbcbaaf1881a02f266475629cba06`. The older f290 branch head `6052b446cc8f6da18f0620fb4e2dabf6bed7cbf3` had failed Verify runs 44419575441 and 44410867187. f299's mitigation head `8470abfd4f365e0ad584dae3016758b2852d2a7f` was outside the starting main history. Its Verify run 44553218914 recorded successful build and all eight shards, with generated contract documents job 135662456459 and its downstream coverage guard red. The failed-job archive command returned exit 0 with no output. A read-only merge rehearsal found overlap with the separately published mitigation branch in the clause body, native audit mapping, fixture file and generated source lock. The mitigation and reassignment predicates cover different changes. The product candidate merges only main, and the f299 branch retains its own mitigation evidence. Main at the initial `eeb1ac5166482fc1a2a54e68deb587080f72d95e` observation had successful Verify 44585616014 and Run site 44585615890. The proof branch first merged the Hono 4.13.16 update at `738f5efacaad9f65191a4a851b701c6fc953cd5d`, with Verify 44594320217 and Run site 44594320372. The final integration merged `071c74a352196f6778eb3b2942c351b4cf1e0ace`, with Verify 44599061529 and Run site 44599061677, and kept its newer triage paging proof and generated views. See the receipt for the candidate and final main observations.

## Clause coverage

| Point | Scoped observation and remaining work |
| --- | --- |
| 1 | Deferred. Full Core inventory, reasons and real CLI rejection remain open. |
| 2 | Deferred. Whole-registry output-schema coverage remains open. |
| 3 | Deferred. Whole-registry tool annotations remain open. |
| 4 | Deferred. The replay and revision refusals ran independently. Full stable-error equality remains open. |
| 5 | Non-null reassignment parity passed locally through the Assignee picker and scoped MCP. Separate accepted declaration and acknowledgment proof was retained. Held notes still open review, and f299 mitigation retains separate custody. Other parity jobs remain open. |
| 6 | Deferred. Embedded-agent audit identity across the registry remains open. |

The f184 note hold, f281 declaration, f290 acknowledgment and f299 mitigation retain their scope. The separate link, replay and revision proofs apply to their own clauses. Team privacy, agent authority and egress, human follow-up acceptance, approval replay and erasure, the ambiguous SURFACE-004 hold and Base seam, OC-037, OC-044 and OC-054 ownership, and provider or delivery work remain held. Paging authorization and A2P, timers, delivery, standby, devices, real-phone proof and cutover retain their release gates.

## DONE riders

| Row | Result | Evidence |
| --- | --- | --- |
| 1 | Scope passes. Whole clause open. | `tests/oncall-agent-fixtures.mjs` at line 766 and `tests/agent-door-browser.mjs` at line 1019 cover the selected ordinary reassignment. Remaining outcomes are listed above. |
| 2 | Pass for this slice. | Distinct populated fixtures, real browser and MCP mutations, protected state and permanent audit, plus the changed-reason and stale-revision refusals in `tests/oncall-agent-incident-replay.mjs` at line 57 and `tests/oncall-agent-incident-revisions.mjs` at line 75. |
| 3 | See candidate CI receipt. | The registered agent runtime and hosted browser lanes execute the named journeys. |
| 4 | Pass for local proof. | The touched journeys were rebuilt and run on the exact candidate after the Hono merge. The receipt records their exit codes. |
| 5 | Not applicable. | No inheritance change. |
| 6 | Local mechanical pass. Judgment pending. | The generator write and check passed on the source. The candidate takes both view files from main. The fleet lander owns the canonical judgment and provenance. |
| 7 | Pass. | Acceptance text, existing rulings and the coverage map are inherited verbatim. |
| 8 | Pass for the selected authority effects. | Native replay and revision refusal journeys still exercise accepted, stale, changed-reason and scoped non-disclosure paths. The existing runtime retains credential revocation and erasure checks. |
| 9 | Not applicable. | The test ledger proved zero outbound attempts. Live provider and field duties remain held. |
| 10 | Not applicable. | The change uses the existing rules in both policies. No new policy default was adopted. |
| 11 | Fleet landing gate. | The candidate is branch-only. Main equality, complete history scan, the generated views and Run site belong to the fleet landing. |

No existing assertion or journey registration was removed. No width condition was added to an existing assertion. The new browser action asserts at 1440 and the evidence records 1440 and 390. The picker close tooltip was observed on focus, and existing UI controls and layout were reused. The cloud run leaves the exact-head publication scan and main-only workflow to the fleet lander. The exact-SHA CI status, main SHA and lock verification are in the accompanying receipt.

## Candidate CI

Verify run 44601711462 reported in progress at the last workflow-status read. The later exact-SHA job response showed all jobs terminal. Build and seven shards succeeded, including agents, hosted and browser. Changes shard 135836796984 was cancelled. Contract documents job 135834829102 failed its generated check, and the coverage guard 135846112556 failed. The candidate check locally identified the retained ACCEPTANCE.md view. The cancellation leaves incomplete remote coverage beyond the generated-view exception. The exact changes shard command completed locally with exit 0. The GitHub API budget was exhausted after the terminal-job read.
