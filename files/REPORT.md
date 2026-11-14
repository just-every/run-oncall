sd-oncall-c-f245 actual report, generated 2026-11-14T14:16:20.625816+00:00.

Repository: just-every/run-oncall. Product branch: cloud/sd-oncall-c-f245.
Candidate: 92be1b36796181d3a1cde56004f2ae38900900a8.
Rechecked origin main: 4d1fc62d4d2b8bf90008ac87bbaa626bc1a5494b. Main is an ancestor of the product branch; main does not equal this unlanded candidate.
Published save: c0f996974256f96bad77fba641c7277c979cf154.
PR: none. Verify has a pre-main push entry point for this branch; no workflow or PR change was needed.
Exact candidate Verify: 43602784077, event push, status in_progress, conclusion pending, head 92be1b36796181d3a1cde56004f2ae38900900a8.
URL: https://github.com/just-every/run-oncall/actions/runs/43602784077.

Counts before and after: 26 DONE, 41 PARTIAL, 34 MISSING, 101 total, unchanged. BASE-AGENT-012 stays MISSING in CONTRACT.md. The bounded implementation claim is PARTIAL, with no complete acceptance point promoted.

The selected result is nine standard-only aged-replay cases: the two retained declaration and note cases plus seven additional cases. Each executes under autonomous and held signed policies at T, then replays at T plus 24 hours and T plus 24 hours plus one second. This gives 36 replay observations, 28 newly added. There is no production change.

The added cases are acknowledgment naming an active responder; action creation with a real owner, a UTC due date, P1 priority, human-review completion and open state; a service edit changing only its name while preserving environment, owner, runbook, pager and dependency custody; reassignment to a distinct active responder while preserving Commander and incident companions; and Scribe, Communications and Commander assignments. Commander starts with an explicit assignee and populated Scribe and Communications companions.

Every original write verifies exactly one workspace increment and state-changing permanent audit fact with native agent, subject and real sponsor attribution. It stores the completed D1 call, structured result, original expiry, original decision and policy-appropriate review. Existing calls, reviews and approval custody survive. Incident writes verify a single appended attributed timeline entry; service writes verify the native service audit and projected ETag.

At both elapsed-time boundaries the runtime renews the already-adopted signed policy. Its authority, sequence, revision and revision signature are unchanged; only issued and expiry times renew. All retained native tables are compared before and after renewal, allowing only the intentionally renewed policy envelope and one explicitly verified policy.adopted event. Prior events remain exact and the new event retains the previous event’s authority. The replay baseline is taken afterwards. Each retry uses a new JSON-RPC ID and a distinct newly signed five-minute bearer with the original person, agent, client, consent, audience and scopes.

Each replay returns the exact stored structured result and review identity even though its original native revision or ETag is stale. The original call, outcome and expiry do not slide. Application records, revisions, timelines, state-changing permanent audit, approvals, all original reviews and paging remain byte-equal to the post-renewal baseline. The only additional audit decision is linked to the original call and operation, with its original actor and sponsor; its Business relay is checked. Appended permanent audit rows are only agent-door persistence bookkeeping without workspace, paging or handoff effects. The outbound edge ledger remains empty throughout.

The extracted helper is exported by tests/oncall-agent-retention.mjs and invoked exactly once by tests/oncall-agent-flow.mjs, which tests/runtime.mjs loads in its machines part. It adds no verification registration, does not change workflow configuration and retains the existing declaration and note proof. No obsolete test is removed and no original assertion is weakened; generalized comparisons also preserve every companion field.

BASE-AGENT-012's contract judgment remains MISSING. No Status, Gap, Evidence, summary, acceptance or requirement text is edited. No other clause is targeted. This round does not complete the full mutating-tool and operation-variant matrix for acceptance 1, the remaining dropped-stream and changed-argument matrices for acceptances 2 and 3, other diagnostics for acceptance 4, or acceptance 5's foreign-person job-handle refusal and long-work status independent of Tasks. All other launched proof, especially the f232 consolidation, is retained.

OC-045, OC-046, OC-048 and OC-049 retain their agent and AI egress authority holds. Erasure and approval replay, SURFACE-004's ambiguous hold and Base seam, BASE-AGENT-006 and BASE-AGENT-008 holds, all queue entries and notes, model, investigation, ownership, remediation, recurrence and executor omissions, and every publication, predecessor and release prerequisite remain unchanged. Paging remains OFF. There is no provider authorization, A2P, automatic timer, delivery, independent standby, device, real-phone, cutover, account, outbound, activation, publication or release authority.

An initial ad hoc invocation with node --input-type=module hung before assertions because that flag propagated to Miniflare worker threads. Diagnostic logging was added only to an installed dependency, then restored to identical original bytes before passing runs. A normal .mjs entry point starts the actual Worker correctly. No dependency, production fallback or test harness change is committed for that startup issue. Those aborted startup attempts are not behavior failures or CI repair rounds.


The selected POINT was exhausted. No selected-case blocker remains. The only plan-row advance reported is completion of these seven additional acceptance-1 retention observations. No plan file, queue entry or other clause changed. The full execution plan is PLAN.md in this same packet.

Observed proof through emitted Worker HTTP and real D1:

| Case | Scope | Assertion location | Observed result at both boundaries under both policies |
| --- | --- | --- | --- |
| Retained declaration and note | Existing cases | tests/oncall-agent-retention.mjs:144 | Original declaration is returned even after the later note; note text and native timeline remain exact. |
| Acknowledgment | New case | tests/oncall-agent-retention.mjs:76 | Active responder becomes Commander and assignee; acknowledged state and exact lifecycle metadata; every other field survives. |
| Action creation | New case | tests/oncall-agent-retention.mjs:83 | Owner, UTC due date, P1, human-review policy, open state and empty completion evidence; prior actions and companion fields survive. |
| Service name | New case | tests/oncall-agent-retention.mjs:46 | Only the name changes; projected ETag changes once; environment, owner, runbook, pager and dependency custody survive. |
| Reassignment | New case | tests/oncall-agent-retention.mjs:92 | Distinct active responder replaces the owner assignee; Commander and all companions survive. |
| Scribe assignment | New case | tests/oncall-agent-retention.mjs:99 | Exactly the selected role changes from unassigned; exact attributed role timeline and all companions survive. |
| Communications assignment | New case | tests/oncall-agent-retention.mjs:99 | Exactly the selected role changes from unassigned; exact attributed role timeline and all companions survive. |
| Commander assignment | New case | tests/oncall-agent-retention.mjs:168 | Explicit owner assignee, populated Scribe and Communications remain unchanged while Commander changes. |

Every case also uses the shared original-write checks at tests/oncall-agent-retention.mjs:35 and the shared aged replay checks at tests/oncall-agent-retention.mjs:174. Policy and bearer identity checks are at lines 29 and 198; exact result, call, expiry, native effect, review, audit, relay and outbound comparisons start at line 206. These are real calls to /mcp, with native preparation through protected /api/command and service projection through oncall.services.read. The single invocation remains tests/oncall-agent-flow.mjs:572, loaded by tests/runtime.mjs:2108.

One row per clause acceptance sentence, preserving its full scope:

| Acceptance | Outcome and evidence on this candidate | Whole-point result |
| --- | --- | --- |
| 1. Two calls with one key give one effect and equal results. | agedReplayRetention covers nine standard-only cases, both policies, both 24-hour boundaries, exact stored result and review, one native effect, no outbound work. All other existing replay assertions remain in the machines journey. | Selected seven cases PASS; complete tool and operation-variant matrix remains omitted. |
| 2. New JSON-RPC id after dropped stream returns the recorded outcome. | Existing droppedDeclarationReplay, droppedCoordinationReplay, droppedNoteReplay and existing service and role replay helpers remain unchanged and execute in the machines journey. | No expansion claimed; remaining matrix omitted. |
| 3. Same key with different arguments conflicts without effects. | Existing changedArgumentConflicts and service, reassignment and role conflict helpers remain unchanged and execute in the machines journey. | No expansion claimed; remaining argument combinations omitted. |
| 4. Stale revision conflicts with the current revision. | Existing staleNoteRevision, staleCoordinationRevision and reassignment, Scribe, Communications and Commander diagnostics remain unchanged and execute in the machines journey. | No expansion claimed; other diagnostics omitted. |
| 5. Foreign person's job handle reads as not found. | No new proof; outside this selected replay-retention scope. Long-work status independent of Tasks is also not claimed. | UNPROVED. |

Inherited duties are unchanged. BASE-AGENT-012's requirement-level retention sentence is proved only for these nine cases. The erasure, approval, authority and provider duties named in the brief remain with their existing clauses and holds; this test-only change gives no additional authority and does not claim the entire Base duty.

Exact candidate local command receipts, outside push Verify:

- npx -y @runeditrun/rer build → exit 0, 8.13 s.
- timeout -k 10 1200 env ONCALL_RUNTIME_PART=machines node tests/runtime.mjs → exit 0, 429.576 s.
- pnpm run typecheck → exit 0, 2.89 s.
- pnpm exec rer check --profile first-party → exit 0, 0.916 s.
- node scripts/edition-authoring/cli.mjs check → exit 0, 0.227 s.
- node src/base/contract-docs.mjs check → exit 0, 0.12 s.

The development machines journey passed with exit 0 in 429.2 seconds before the final token and renewal-event assertions were finalized. The final exact candidate run in RECEIPT.json is the primary receipt. The clock proof is simulated elapsed platform time, with genuinely issued and expired short-lived credentials; it is not a claim of a wall-clock 24-hour soak. No full local suite was run: the builder rule permits touched journeys and typecheck, with the full Verify in branch CI. No screens changed, so browser proof is not applicable.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0 (no migrations).
The generator wrote zero documents. ACCEPTANCE.md and docs/CLAIMS.md were restored from origin main. Source lock was generated after the final test edit and its freshness check passed. CONTRACT.md and generated views have no diff against main. No source pin, release, homepage, looks, brand or workflow changes are included.

DONE-RIDERS review of this deliberately incomplete clause:

| Row | Result | Evidence or limitation |
| --- | --- | --- |
| 1 | FAIL for full-clause DONE; selected scope PASS | Seven cases exhaust the selected POINT; the whole-clause matrix and job authority remain unproved. Shared aged replay assertions above reach every selected outcome. |
| 2 | PASS for selected scope | Real seeded records, exact original effects and outcomes, distinct responder, open owned work, stale original revisions and ETag, strict zero duplicate effects; lines 35 to 140. |
| 3 | PENDING | Existing push Verify loads tests/runtime.mjs, whose machines part imports the single helper invocation. Exact-SHA run 43602784077 is in_progress, pending. Outside-Verify exact-SHA clock receipt is in RECEIPT.json. |
| 4 | PASS locally | RECEIPT.json binds the final build and machines journey to 92be1b36796181d3a1cde56004f2ae38900900a8; no relevant source byte changed afterwards. |
| 5 | INSPECTED, unchanged | No receiving clause or acceptance text edited; existing Base inheritance and owning-clause holds retained. |
| 6 | Mechanical PASS; judgment remains reserved | Contract generator write and check pass. All 101 parent rows and counts remain unchanged. No judgment cell or generated view committed. |
| 7 | PASS | Zero CONTRACT.md diff; no acceptance rewrite, added point, ruling change or lost duty. |
| 8 | PASS for selected replay boundary | Every original is standard-only under existing signed autonomous or held authority. Fresh same-identity tokens and exact effects prevent broader cached authority or a second mutation. Existing authority and erasure paths also remain exercised by the machines journey. |
| 9 | PASS boundary | No provider or legal claim, no account operation, empty outbound ledger and paging OFF; all named provider and device duties retained. |
| 10 | Not applicable | No policy default adopted, no new authority or ct scope decision. |
| 11 | PENDING fleet landing | This cloud does not land main or run the fleet publication scan. Main equality, publication and Run site remain with the guarded lander. |

Pre-ready checks: selected behavior is exercised through real public doors and would fail on a wrong stored result, duplicate effect, wrong review, moved expiry, changed authority, altered native record or unexpected outbound work. Existing assertions were retained or generalized into stronger complete-record comparisons. Revocation, erased-person and captured replay flows remain unchanged and are included in the machines journey; no authority or erasure implementation changes. UI rules are not applicable because no screen changed. Exact-SHA CI is reported above, without borrowing main's green result. Source lock is fresh.

Publication scan result for commit 92be1b36796181d3a1cde56004f2ae38900900a8: complete=NOT RUN in cloud; historyScanned=UNESTABLISHED; findings=UNESTABLISHED. The full-history clone was used, and the cloud-only route delegates the publication scan to the fleet lander. No scan success or zero-findings claim is made. Main's prior green Verify was 43589736078 (also 43587169224), Run site 43589735969, Nightly journeys 43592091764, all on 4d1fc62d4d2b8bf90008ac87bbaa626bc1a5494b; those are predecessor results only.

The failed development strengthening attempt in retention-final-development.log compared the renewal's own policy.adopted event against the pre-renewal event table and failed at that extra event. The final assertion explicitly verifies precisely that appended renewal event and retains every prior event. Replay still compares the entire post-renewal snapshot exactly. This corrected an unpublished assertion beyond the original proof, without weakening a shipped assertion or changing production. The subsequent focused and exact candidate journeys provide the passing proof. There were no CI repair rounds.

CLAIM BASE-AGENT-012 PARTIAL points=none tests=tests/oncall-agent-retention.mjs#agedReplayRetention
GAP BASE-AGENT-012: Seven selected retention cases are closed; complete acceptance-1 tool and operation variants, remaining acceptances 2 and 3 matrices, other acceptance-4 diagnostics, acceptance-5 foreign-person job-handle refusal and long-work status remain unproved, with all existing authority and provider holds retained.
