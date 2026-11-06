# sd-oncall-c-f205 — service optional revision diagnostic

Repository: just-every/run-oncall. Branch: cloud/sd-oncall-c-f205. Candidate: 4f07968cdaa53d9cbf209f16d912a93342f0ae46. No PR is needed: Verify runs on the branch push. Product push succeeded on its first attempt; main was neither pushed nor changed.

BASE-AGENT-012 remains MISSING → MISSING. Counts remain 17 DONE, 50 PARTIAL, 34 MISSING, with all 101 Status rows retained. The selected optional expected_revision diagnostic for oncall.services.update is proved; the whole clause is not promoted. Only the target row's observed Evidence and Gap were reconciled. No acceptance sentence or other Status row changed.

## Plan and result

The full execution plan is in PLAN.md. Read current instructions, contract and existing tests; checked exact-main CI; extended the existing runtime sanity journey with a focused helper; ran the public-door proof and typecheck; generated and checked contract views and restored them; regenerated and checked the source lock after staging the new helper; checked Status row preservation and commit identity; committed, reconciled against fetched main and pushed the named branch. Build and broader runtime both passed on the exact committed candidate. Typecheck, first-party check, contract generation and lock checks passed. Actual command exits and log hashes are recorded in RECEIPT.json; exact-SHA CI is recorded in CI.json.

The public doors are protected native HTTP for preparation, emitted Worker MCP for tools, and real local D1 for retained state and audit comparisons. No production implementation change was needed: the shipped service revision callback and pipeline already satisfy this diagnostic. tests/oncall-agent-service-revisions.mjs exports staleServiceRevision; tests/oncall-agent-flow.mjs imports and invokes it, and tests/runtime.mjs invokes that existing journey in its machines part. The push intake shard already selects that part. No workflow was changed, no test registration was added, and no assertion was deleted, narrowed, skipped or conditionalized.

Under both autonomous and held policies:

- A real previous service ETag becomes stale after an owner edit. An otherwise-valid name edit uses the current required native etag and that stale optional string expected_revision. The result is isError with revision_conflict and the exact authorized current_revision in both metadata and text, without structuredContent. See helper lines 27–55.
- The snapshot compares the full native application plus durable tables, preserving records, revisions, incident timeline, state-changing audit, original calls and outcomes, approvals, reviews and paging. Only required refusal audit and capacity bookkeeping are permitted. See helper lines 39–55 and tests/agent-door-runtime.mjs agentEffectSnapshot.
- A fresh key puts the returned ETag in both revision fields. Exactly one application revision, name-only edit, service audit entry and state-changing audit commit result, attributed to the actual agent and sponsor. Autonomous has no review; held has exactly one open review. See helper lines 57–97.
- An identical retry with a different JSON-RPC id returns the stored result and review, preserving the single native effect, original outcome custody and state-changing audit; only a linked replay-attempt audit is appended. See helper lines 98–107.
- Missing and scoped-out service targets return identical not_found errors without a revision or private result and preserve custody. See helper lines 109–116.
- With a private dependency retained in the native record, the scoped caller's ETag differs from the owner's full-record ETag. A stale optional revision refusal returns only the authorized projected ETag and preserves private dependencies and custody. See helper lines 117–129.
- The outbound ledger is empty. See helper line 130 and the two actual PROBE lines in PROBES.log.

## Evidence and retained gates

Baseline main was 8e02f6674fad992d1a972cfd567a47144296e5a0. Verify runs 42153902730 and 42151170333 succeeded; Run site 42153902508 succeeded. Candidate push Verify is 42178613345, event push, on exactly 4f07968cdaa53d9cbf209f16d912a93342f0ae46; CI.json records its observed status and conclusion. It completed with failure solely because ACCEPTANCE.md differs from generated content (build job 127762823219); the verify aggregate job 127763434430 failed as its dependent gate and shards were skipped. Both failed-job logs were read once. The exact generator command reproduced exit 1 locally. This is the explicit permitted generated-view exception, not an ordinary green Verify. No product failure or test failure was observed. No repair, dispatch or rerun was attempted. CI-FAILURE.txt contains the actual error excerpt. The candidate is READY under that exception; the lander still regenerates views and checks its resulting exact SHA. There was no dispatch, rerun, other-SHA green claim or workflow modification.

The f203 branch tip 6e382fa725b9ab7c2517e3a044faa0826b8d0a30 and f204 branch tip 32c0f370f6ebc8cf2a4b55da03901933f300950a were not ancestors of the fetched baseline main. Their predecessor gates remain with the fleet; their separately launched diagnostic scopes were neither repeated nor represented as landed. See BASELINE.json. This branch is not a substitute for their acceptance or publication gates.

Acceptance 1's complete mutating-tool coverage and at-least-24-hour retention, acceptance 2's other dropped-response cases, acceptance 3's remaining tools and argument combinations, acceptance 4's other optional and native diagnostics, and acceptance 5's foreign-person job-handle refusal and long-work status independent of the Tasks extension remain unproved by this slice. Prior note, acknowledgment, action, declaration, retention, changed-argument, dropped-response and required-native service diagnostic scopes remain separate. Erasure and approval replay, SURFACE-004's Base seam, BASE-AGENT-006 and BASE-AGENT-008 holds, existing queues and notes, and all release prerequisites remain intact. OC-045, OC-046, OC-048 and OC-049 still need agent and AI egress authority. Model, investigation, ownership, remediation, recurrence and executor flows remain omitted. Paging remains OFF; provider authorization and A2P, production delivery, independent standby, native-device and real-phone duties remain held. No account, capability, outbound, activation, publication or release authority is added.

## DONE riders and self-check

No DONE claim or judge request is made. The whole-clause outcomes remain unproved, and the target retains main's MISSING judgment.

1. Whole clause unmet; the selected diagnostic is exercised through MCP in both policies, as mapped above. Other acceptance gaps remain explicit.
2. Selected slice passes allowed and refused paths with populated native custody and exact no-effect comparisons. It does not infer whole-clause completion.
3. Existing push Verify loads tests/runtime.mjs machines through the intake shard. Exact candidate run failed only on expected generated-view freshness and therefore did not execute its shards. CI.json records that limitation; exact-SHA local runtime passed. No earlier green is substituted.
4. Final runtime receipt identifies the exact candidate; no relevant implementation or helper bytes changed after the successful focused proof.
5. No new receiving clause or inherited duty was introduced or claimed complete.
6. Evidence and Gap match observed proof; contract write and check passed, then generated views were restored as instructed. A candidate generated-view freshness failure is expected and belongs to the lander. Existing historical Judged from text was not advanced to imply a new whole-contract judgment.
7. All acceptance sentences remain unchanged; no rewrite, split, duty deletion or coverage-map change occurred.
8. Authorized success, scoped denial and no private error result are exercised; retained revoked-credential and erased-person journeys were not weakened.
9. No provider, deployment, clock, scale, legal or real-device proof is claimed.
10. No new policy default, delegation or egress authority was adopted.
11. Not landed: main equality, complete publication scan with zero findings, exact landing Verify and Run site remain guarded fleet duties. This report does not claim those gates passed on the branch.

Pre-ready inspection: assertions directly check each changed behavior, exact projected revision and no-effect security paths. No existing assertion was removed or weakened. Retained authority, erasure and replay coverage still runs in the unchanged broader agent journey. No screen changed, so browser widths, font and tooltip checks are not applicable. Added text contains no email-shaped string; new fixtures use synthetic-oncall identifiers. Source lock is fresh. Cloud publication scanning is not required for this branch push and remains with the lander. Evidence publication is report transport only.

## Mechanical receipt

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0. Generated ACCEPTANCE.md and docs/CLAIMS.md were restored from origin/main before the commit. The new helper is present in the generated source lock. No migration was added or edited.

The initial new assertions were corrected locally to account for the native attributed service audit and to keep held read reviews outside the mutation/replay snapshot interval. Product behavior was not changed and no existing assertion was weakened. These were pre-commit test-development runs, not CI repair rounds.

Plan row changed for relay only: sd-oncall-replan-36 BASE-AGENT-012, selected optional service expected_revision diagnostic closed; retain MISSING and all other held or omitted work. No lane file was read or written in this VM. Complete actual receipts and this report are published only under evidence/sd-oncall-c-f205, separate from the product branch.

Final local outcome: explicit production build, complete machines runtime, focused full agent journey, typecheck, first-party check, source lock and generated-view write/check all passed. The restored generated view intentionally fails a later freshness-only check. All commands completed. No product blocker is reported; retained predecessor, scan and landing gates are not waived. Six GitHub budget calls were used.
