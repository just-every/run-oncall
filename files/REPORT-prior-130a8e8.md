# sd-oncall-c-f212 — focused Scribe replay proof

The selected work is BASE-AGENT-012 acceptance 3's changed-reason conflict for oncall.incidents.update with change=assign-role and role=scribe. This is a bounded PARTIAL evidence claim. The actual CONTRACT judgment remains MISSING; no whole-clause promotion, Status row, Gap cell, Evidence cell, acceptance text or summary count is edited.

The plan and results live in this separate evidence packet. PLAN.md records the complete execution plan. The product change adds tests/oncall-agent-role-replay.mjs and imports and invokes changedScribeReasonConflict from tests/oncall-agent-flow.mjs. Existing tests/runtime.mjs calls that flow in its machines journey, which the existing push Verify intake shard runs. No new standalone test registration or workflow is added. No existing assertion is removed, narrowed, skipped or relocated. There is no UI change, so browser screen proof does not apply.

The helper reuses agentEffectSnapshot from tests/agent-door-runtime.mjs and the landed reassignment helper's assertion pattern. Implementation files, classifiers, declarations, capabilities, migrations and the held Base replay seam are unchanged.

## Selected public-door proof

For each autonomous and held policy, a fresh ordinary incident has no linked alerts, actions or recovery evidence and starts with an unassigned Scribe. A real native HTTP declaration prepares the incident. MCP assigns an existing active responder with the current native incident revision, literal reason and a fresh idempotency key. The helper asserts standard-only classification, the correct autonomous or review disposition, exact D1 and HTTP native readback, one agent-attributed assign-role timeline entry, exactly one incident and workspace revision increment, and one native state-changing permanent audit commit with agent, incident and human sponsor attribution. Other incident data and paging remain unchanged. Exactly one new open review is retained only under held policy.

The original arguments, key and revision remain in the helper; its D1 completed-call row, stored result, original decision and review identity are retained and compared after refusal and retry. A second schema-valid reason changes no other argument. Reusing that key and original revision must return isError and idempotency_conflict in metadata and text with no private structuredContent. Exact original arguments with a distinct JSON-RPC id return the saved structured result and original review identity. After each request, snapshots compare native records, revisions, timelines, permanent state-changing audit, original call and outcome custody, approvals, reviews and paging. Separate assertions permit only an attributed refusal and linked replay-attempt audit plus native persistence and capacity bookkeeping. The network-edge ledger must remain empty.

## Clause coverage and retained gaps

| Acceptance | This round |
| --- | --- |
| 1 | The selected assignment and exact replay produce one native effect and saved result. Complete mutating-tool coverage and the full retention obligation remain unproved by this round. |
| 2 | Existing dropped-response journeys are preserved. Scribe response-loss coverage is outside this selected changed-reason observation. |
| 3 | Selected Scribe changed-reason conflict and exact original-argument replay are exercised through emitted Worker MCP with native D1 under both policies. Other tools and argument combinations remain omitted. |
| 4 | Existing revision diagnostics are preserved; other optional and native diagnostics remain omitted. |
| 5 | Foreign-person job-handle refusal and long-work status independent of the Tasks extension remain omitted. |

OC-045, OC-046, OC-048 and OC-049 keep their agent and AI egress authority holds. Erasure and approval replay, SURFACE-004's ambiguous hold and Base seam, BASE-AGENT-006 and BASE-AGENT-008 holds, model, investigation, ownership, remediation, recurrence and executor flows remain outside this slice. Paging stays OFF. Provider authorization and A2P, production delivery, independent standby, native-device, real-phone, publication and release duties remain held. No new default or authority is adopted.

## Main and predecessor custody

Baseline main is f4f0bdb097de881accfb709543d551c71e674d7a. Its exact-SHA push Verify runs 42448381960 and 42442352392 succeeded; Run site 42448381952 succeeded. Full REST discovery is in main-ci.json.

The f209 head 9d5d500c0cf68bcc3f0a3caed08c38d253c615e2 and f211 head 9af4af4a353932948029d768a29b9a34d48c2de3 are ancestors of main. The f208 advertised head da68efdaef7a90b568122189f3c4a554eda27171 is not an ancestor, but its complete changed-reassignment-reason helper is retained on main as changedReassignmentReasonConflict. Main carries the accepted helper commit 7d2fb0b418c3247678bf49ed650367776ce50034 and merge 6858a3c3b5fa01f7f4a90d40bdce1f2f09e60bb9. No f210 branch is advertised. The shipped helpers, aged retention, service diagnostic, declarations, note, acknowledgment, action-create, dropped-response and reassignment scopes all remain in place and are not repeated by the new helper. predecessors.json records the checks.

Counts before and after are 20 DONE, 47 PARTIAL and 34 MISSING across all 101 Status rows. BASE-AGENT-012 remains MISSING. No plan row is rewritten; this report supplies only the selected observation for the lane's existing plan.

## DONE-RIDERS and pre-READY review

This is not a DONE claim. The riders are recorded to make the boundary explicit.

| Rider | Result for this bounded candidate |
| --- | --- |
| 1 | Whole clause remains unproved. Only the selected Scribe conflict and replay outcome is added. |
| 2 | Selected path tests an actual successful assignment, a changed-reason refusal and unchanged native custody after refusal and replay. |
| 3 | The helper is wired into the existing push Verify intake shard through tests/runtime.mjs. Candidate run status is recorded in the terminal receipt. |
| 4 | proof-inputs.json binds the relevant implementation and journey bytes; the candidate retains these exact bytes. |
| 5 | No inheritance or clause text changes. |
| 6 | Generator write and check pass; generated views are restored from main. Status, Gap and Evidence cells remain main's. |
| 7 | No acceptance changes or obligation rewrite. |
| 8 | Allowed assignment and conflict refusal both execute through MCP. Existing authority and erasure journeys remain intact; no new authority is introduced. |
| 9 | No provider or legal proof is claimed; all external boundaries remain held. |
| 10 | No policy default adopted. |
| 11 | Main equality, exact landed Verify, Run site and full-history publication scan remain the fleet lander's gates. No cloud-side landing or publication-scan result is claimed. |

Pre-READY: the selected behavior has direct result and side-effect assertions; existing assertions are preserved; the emitted runtime journey includes retained credential, erasure and replay fences. No screen is touched. Source lock is generated last and checked. New test text contains no email-shaped fixture, provider-shaped credential or invented repository reference. The full publication scan is not available in this cloud and remains a required independent lander gate. Local command receipts and exact product provenance are appended after completion.

## Local draft correction

The initial emitted machines run exited 1 in the new helper at line 93 with `TypeError: Cannot read properties of undefined (reading 'id')`. This draft assertion attempted to read conflict.decision.id on an early idempotency refusal. That response intentionally contains no decision metadata. The existing retained-audit pattern reads the refusal directly from D1. The correction removes that incorrect response-shape assumption while retaining refusal identity distinct from the original decision, agent and sponsor attribution, tool, code, key, null approval and review, exact saved-call custody and the full unchanged-effect comparison. No application change or existing assertion was required. The initial actual log is retained separately in runtime-machines-initial.log; the same emitted machines command is rerun after the correction. This was a local draft failure, before any candidate or CI run.

## Focused proof map

| Frozen observation | Test and lines |
| --- | --- |
| Ordinary fresh incident, unassigned Scribe, active responder, original revision and key | tests/oncall-agent-role-replay.mjs, changedScribeReasonConflict, lines 17 to 27 |
| Standard-only policy disposition, native Scribe assignment, literal agent-attributed timeline and exact revision increments | same helper, lines 28 to 44 |
| Native state-changing permanent audit with actor, subject and sponsor; original call, saved outcome and held-only open review | same helper, lines 45 to 77 |
| Changed reason with original key and revision gives private-result-free idempotency_conflict and zero further native effect | same helper, lines 78 to 96 |
| Exact original arguments with new RPC id return saved result and original review identity; only linked attempt audit and persistence bookkeeping | same helper, lines 97 to 115 |
| Zero outbound requests under both policies | same helper, lines 115 to 116 |

The line-numbered actual helper excerpt is in proof-lines.txt. The inherited broad clause duties are retained in CONTRACT.md unchanged; this map claims only the selected public-door observation.

## Validation commands

- `cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive`: exit 0, local setup and temporary application shut down. No provider deployment. The private setup log stays outside the packet.
- `cloud_run npx -y @runeditrun/rer build`: exit 0, production Worker and assets built; actual log in build.log.
- `pnpm run typecheck`: exit 0; actual log in typecheck.log.
- `cloud_run npx -y @runeditrun/rer check --profile first-party`: exit 0, including the final locked source tree; actual empty success log in first-party.log.
- `node src/base/contract-docs.mjs write` and `node src/base/contract-docs.mjs check`: exit 0, wrote zero documents and found no prose errors; actual log in views.log. ACCEPTANCE.md and docs/CLAIMS.md were restored from origin/main.
- `node scripts/edition-authoring/cli.mjs lock`, its `check`, and the installed edition-authoring `check`: exit 0 after the final helper edit. The tracked helper is included in the lock. lock.log records the command outcomes.
- `node --check tests/oncall-agent-role-replay.mjs` and `git diff --cached --check`: exit 0.
- Migration ledger: not applicable; no migration changed.

The complete machines runtime command, terminal result, candidate SHA, Git identity and trailer review, exact-SHA CI status and packet hashes are recorded in candidate-receipt.json after completion. Full Verify runs only in CI; no unrelated full local suite or browser journey was added.

## Product custody

Product branch: cloud/sd-oncall-c-f212. Full candidate: 130a8e814ca96d9520b5ec3b061342c30cb8587d. The first real commit was pushed through the fleet cloud push guard on attempt 1. Fresh main was unchanged and the unpublished candidate rebase was a no-op. After the rebase, generator write and check were repeated, generated views restored from main, source lock regenerated and checked, and CONTRACT.md was verified unchanged against main. All one candidate commit, including any side parents, passed the fleet author, committer and trailer scan; trailers are absent. No PR was needed because the existing push workflow is an entry point.

The emitted machines journey passed with exit 0 in 324.3 seconds. Both autonomous and held Scribe probes passed. The candidate's relevant source and journey bytes match those tested; proof-inputs.json and candidate-receipt.json bind that comparison to the full SHA. No further product edit was made after proof.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

CLAIM BASE-AGENT-012 PARTIAL points=3 tests=tests/oncall-agent-role-replay.mjs#changedScribeReasonConflict
GAP BASE-AGENT-012: Only acceptance 3's Scribe changed-reason observation is added; the complete clause remains unproved and its main MISSING judgment and all stated held remainders are retained.

Exact-SHA push Verify run: 42523954688 at https://github.com/just-every/run-oncall/actions/runs/42523954688. Its observed status and final disposition are in candidate-ci.json and candidate-receipt.json. Main landing, publication scan and subsequent Run site remain the fleet's responsibility.
