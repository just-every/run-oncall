# sd-oncall-c-f332 · First Scribe assignment audit

Signed by Run Edit Run fleet, 21 November 2026.

- Repository `just-every/run-oncall`
- Product branch `cloud/sd-oncall-c-f332`
- Product head `885d4320e17f06d23fb397e40266ee8c7fca4292`
- Main used for integration `a88277234a1c53ac983f6df2f90a7a8bd6d684a6`
- Main Verify push run 44944251462 and Run site push run 44944251302 succeeded on the integration base.
- Candidate Verify push run 44944743801 completed successfully on the exact product SHA. [Verify run](https://github.com/just-every/run-oncall/actions/runs/44944743801)
- Before and after the patch, counts are 26 DONE, 41 PARTIAL, 34 MISSING, and 101 total. BASE-AGENT-002 remains MISSING. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md match the integration base.

## Plan and results

1. Read the six acceptance points, the Status row, and the round's held remainder. Select only the permanent native audit event for the first non-null Scribe assignment in acceptance 5. The declaration, acknowledgment, mitigation, reassignment, resolution and Scribe clear and replay work remains in scope only for regression coverage.
2. Route the first standard Scribe assignment to the native `command.assign-role` audit kind in `src/agent-door/coordination-tools.ts:137`. Check the pre-command Scribe and retained role history so a clear, later assignment or protected-evidence incident retains its established path. Keep the actual MCP tool and emitted event as `incidents.update` with the agent and sponsor. The OC-053 scoped REST audit still uses `automation.incidents`.
3. Reuse the real People and priority picker from `tests/product-browser-journey.mjs:2416` and extend the existing standard-only Scribe replay in `tests/oncall-agent-role-replay.mjs:127`. For each policy, create two ordinary incidents on the same public service with populated Lead, Assignee and Communications roles, no linked alerts or follow-up evidence, and paging OFF. Assign the same responder with the same literal reason through the signed-in picker and the agent tool. Compare protected and durable state, both revisions, prior history, one new timeline entry, the permanent event type and identities, the original tool decision and emitted event, and the one held review. An exact retry retained its original result and review. A changed reason with the original key was refused with no native effect.
4. Reload People and priority and Timeline for both doors under both policies. `tests/agent-door-browser.mjs:1069` asserts the visible effect at 1440 pixels and captures 1440 and 390 pixel readbacks. The 16 selected captures include the existing close tooltip, Scribe and Communications values, Lead and Assignee, and timeline attribution. The proof measured zero serious or critical axe findings and zero undersized controls. The browser and Worker outbound ledgers were empty, and paging custody stayed unchanged.
5. Confirm the first Scribe assignment through scoped REST preserves the original permanent audit kind, actor and subject in `tests/runtime.mjs:1756`. The existing signed outbox test now expects the extra queued role event from its own opted-in endpoint fixture and still checks the ten-delivery per-step bound. The parity service had no endpoints and made zero outbound requests.
6. Keep the held BASE-AGENT-002 row from f184 and record this acceptance 5 result against round 94. Preserve held work, predecessor and landing gates. No new test registration, clause status change, policy default, PR or deployment.

## Acceptance and inherited duties

| Point | Result | Public-door evidence |
| --- | --- | --- |
| 1 | Held | Full Core inventory and CLI coverage remain outside this slice. |
| 2 | Held | Complete result schema fixtures remain outside this slice. |
| 3 | Held | Complete tool annotations remain outside this slice. |
| 4 | Held | Stable error parity across doors remains outside this slice. The existing changed-argument replay refusal still returns its stable code. |
| 5 | First Scribe variant proved locally | `tests/oncall-agent-role-replay.mjs:174` compares equivalent signed-in and MCP writes, exact roles and revisions, identities and permanent event type. `tests/agent-door-browser.mjs:1069` repeats the comparison with the native picker and reloaded UI. Other action variants remain held. |
| 6 | Held | Complete embedded-agent audit coverage remains outside this slice. |
| BASE-AGENT-005, BASE-AGENT-006, BASE-AGENT-008 | Preserved | Existing tool, authorization, approval and classification paths are unchanged in the diff. The paired Scribe call remains standard under both policies, with one open review under the held policy. |
| BASE-AGENT-012 | Preserved | The existing missing-response, changed-reason and optional-revision journeys retain their behavior and now expect the native first Scribe audit kind. |
| OC-053 | Preserved | `tests/runtime.mjs:1756` asserts the scoped REST audit kind, actor and incident. |
| Other held work | Held | OC-023, human follow-up acceptance, SURFACE-004, copied Base, OC-037, OC-044, OC-054 and OC-045, OC-046, OC-048, OC-049 are outside the change. Paging remains OFF. Production delivery, provider authorization, A2P, timers, standby, device, real-phone and cutover proof remain held. |

## DONE riders

| Rider | Result | Evidence |
| --- | --- | --- |
| 1 | Scoped proof only | The paired Scribe journeys reach the selected acceptance 5 outcome. The remaining acceptance outcomes stay held. |
| 2 | Pass for the slice | Populated incidents, exact audit identity and all companion roles. The changed argument refuses and leaves custody intact. Reverting the audit mapping in an isolated copy of the emitted Worker makes the comparison fail with incidents.update in place of command.assign-role. |
| 3 | Pass for the slice | Existing agents, browser, hosted and intake Verify lanes cover the journey. See the candidate Verify above. |
| 4 | Pass for the slice | The emitted Worker and first Scribe browser code are byte-identical between browser proof commit 4de60c8b9b7ff35bdac16be2d43141bfc5a7bbb1 and the candidate. The amendment updated REST outbox fixture expectations and the source lock. Main then advanced with a separate schedule-tool risk description in CONTRACT.md. The rebase retained that change and the source lock was regenerated. |
| 5 | Inspected | The clause states the shared native action duty. SURFACE-001 cites BASE-AGENT-002 in its metadata in `CONTRACT.md:1321`. |
| 6 | Pass mechanically | Contract write and check passed with zero generated changes and all 101 Status rows retained. No judgment promotion. |
| 7 | Pass | No acceptance text, coverage map, status, gap or evidence cell changed. |
| 8 | Pass for the slice | Distinct responder and sponsor using existing native authorization. Candidate scope changes only audit kind. Replay refusal preserves state, and existing revocation and erasure journeys remain part of touched coverage. |
| 9 | Outside the slice | Local paging OFF and zero-outbound proof. Provider and real-world holds remain. |
| 10 | Outside the slice | No new custody, consent, spending or authority decision. |
| 11 | Fleet landing pending | Candidate branch custody and exact-SHA Verify are separate from main equality, Run site and the Mac publication scan. No candidate main equality or Run site is claimed. |

## Mechanical and publication checks

The emitted Worker build, exact-candidate Scribe probe, agent runtime shard, machine runtime shard, agent browser journey, focused product role journey, typecheck and first-party check passed locally. The agent browser assertions ran at 1440 pixels. The selected browser captures were checked for visible email addresses before publication.

- `node src/base/contract-docs.mjs write` and `check` passed. Main's generated views were restored. The pinned edition-authoring `lock` and `check` passed. No migration changed.
- The candidate's Git range includes one commit. Author, committer and all commit messages passed the fleet policy. The difference against main has zero new email-shaped strings, bare owner and repository tokens or provider-shaped token matches. The full-history publication scan remains with the Mac lander. This VM lacks the pinned Gitleaks scanner.
- No existing test assertion was removed, narrowed or conditionally skipped. Two existing first-Scribe expectations now require the matching native event type. The REST test includes the extra write in its exact outbox counts. Touched UI uses the existing controls and tooltips.
- The separate evidence ref records the report, command receipt and named first Scribe browser captures. The independent lander owns final judgment and release gates.

GAP BASE-AGENT-002: Full Core and CLI coverage, complete schema and annotation proof, stable-error parity, remaining UI and tool variants and embedded-agent audit remain held. The f184 held review and retry remainder remains queued.
