# Oncall cloud round sd-oncall-c-f278

Run Edit Run fleet, 18 November 2026

The selected observation for BASE-AGENT-012 acceptance 4 passed locally under autonomous and held company policies. The contract still records MISSING. Both Status tables record 26 DONE, 41 PARTIAL and 34 MISSING across 101 clauses. The builder claim is PARTIAL and covers the selected schedule override observation of acceptance 4.

## Plan and execution

1. Read the clause and current judgment from Oncall main. Confirm the named predecessor refs, the landed equivalent of the f274 native-revision proof, and the retained incident and P2 paths.
2. Extend the existing emitted Worker journey with the stale optional revision case, using a separate real rota and a distinct responder in each policy. Preserve the required-native-only case. Use native reviewed apply to move the rota from revision 1 to revision 2 independently of MCP.
3. Submit the same valid primary cover with the current native revision 2 and stale optional revision 1. Check the refusal and complete custody. Exercise one existing foreign rota and one absent rota with the same input apart from identity and idempotency key.
4. Correct the optional revision only and submit with a fresh key. Verify one saved override, one attributed native audit, zero approvals in autonomous mode and one exact signed-in sponsor approval in held mode. Retrieve the identical stored result with a new JSON-RPC id. Read both saved covers through the existing browser capture fixture at 1440 and 390.
5. Record the observation in the clause text, regenerate and check contract views, restore main's generated files and update the pinned lock. Push a save and the checked candidate on the named cloud branch. Observe the exact-SHA Verify and return the report and receipts on the dedicated evidence ref.

## Provenance

- Repository: just-every/run-oncall
- Product branch: cloud/sd-oncall-c-f278
- Product candidate: `cd0db34aa24058645045604b9601f92d5bee4aa5`
- Save: `a0f87bbf151bf170139617c4a0b95a0457e60381`
- Candidate main base: `93b25a01d22f5b16bf679c6f4008f0e444980196`
- Planner pin `dfdd894` is an ancestor. f274's advertised head `012bdc342a362ee1882ebc623718ef7498224986` has identical schedule-tool and native-diagnostic journey files to the landed `e22e1840df3128e88363e5349a6637693678af3f` version in the base. Earlier P2 evidence retention and dropped-response coverage remain on main at `cea90c2b967bc78a7aee2d29d84b9915c40a6c7a` and `c7c61ef6e03c39d5863a1d472a99eb2436bf73dd`.
- f232 is advertised at `25c0fe55b1f2928c526119d79d3629dfb8be7931`, outside main ancestry. Its separate branch remains subject to the predecessor gate. The candidate uses current main's declaration, note, acknowledgment, follow-up, service, role and assignee journeys.
- Initial main `93b25a01d22f5b16bf679c6f4008f0e444980196` had successful Verify 44283231598 and Run site 44283231793. Remote main at terminal readback was `6ef9bc1294fc981c71e990df9bf12104337c81b3`.
- Exact candidate Verify: push run 44287329926, completed with failure. The only originating failure was contract-docs job 134743473903 on the restored generated ACCEPTANCE.md view. Verify aggregate job 134751923236 failed on that dependency. Build, all eight shards and full-push-proof passed, including agents job 134745459817 and hosted job 134745459783. The generated-view exception applies. https://github.com/just-every/run-oncall/actions/runs/44287329926
- The guarded lander owns the complete history publication scan and exact-main Run site. No cloud scan receipt exists for this candidate. The cloud task created no PR.

## Observations

PROBE BASE-AGENT-012 4: emitted MCP schedule override with native revision 2 and stale optional revision 1 → exact revision 2 in the conflict. The same cover with a fresh key and corrected optional revision → one override, one native audit, exact sponsor approval only when held, and a stable stored result.

- PROBE BASE-AGENT-012 4 autonomous: override native revision 1, no expected_revision -> revision_conflict, current_revision 2 in metadata and text; scoped-out and absent indistinguishable; fresh revision -> one native override and audit, autonomous; replay unchanged; zero outbound requests
- PROBE BASE-AGENT-012 4 held: override native revision 1, no expected_revision -> revision_conflict, current_revision 2 in metadata and text; scoped-out and absent indistinguishable; fresh revision -> one native override and audit, one exact sponsor approval; replay unchanged; zero outbound requests
- PROBE BASE-AGENT-012 4 autonomous: override native revision 2, stale expected_revision 1 -> revision_conflict, current_revision 2 in metadata and text; scoped-out and absent indistinguishable; fresh revision -> one native override and audit, autonomous; replay unchanged; zero outbound requests
- PROBE BASE-AGENT-012 4 held: override native revision 2, stale expected_revision 1 -> revision_conflict, current_revision 2 in metadata and text; scoped-out and absent indistinguishable; fresh revision -> one native override and audit, one exact sponsor approval; replay unchanged; zero outbound requests

- Browser proof override-revision-retained-autonomous 1440: fits=true serious/critical=0 undersized-controls=0
- Browser proof override-revision-retained-autonomous 390: fits=true serious/critical=0 undersized-controls=0
- Browser proof override-revision-retained-held 1440: fits=true serious/critical=0 undersized-controls=0
- Browser proof override-revision-retained-held 390: fits=true serious/critical=0 undersized-controls=0

The runtime journey checks the actual saved revised rota, its foreign counterpart, populated calls and outcomes, populated approvals, and retained schedule notices. It compares durable native rows, workspace and paging controls, mutation audit, calls and outcomes, approvals, reviews and paging. The Agent Door audit records each refusal while capacity bookkeeping remains permissible. The successful path adds one idempotent call and one revision on the rota and both control records. The held fixture requires sponsor approval for sensitive participant details. The approval binds the stored revision and summary hash through the native signed-in owner session. The browser observes the retained cover and paging state in a seeded local installation. Browser requests stay on the local origin and the Worker outbound ledger remains empty.

## Checks

- `cloud_run timeout 1200 npx -y @runeditrun/rer build` exited 0.
- `pnpm typecheck` exited 0.
- `pnpm exec rer check --profile first-party` exited 0.
- `ONCALL_RUNTIME_PART=agents node tests/runtime.mjs` exited 0.
- `node tests/agent-door-browser.mjs with system Chromium` exited 0.
- `node src/base/contract-docs.mjs write` exited 0.
- `node src/base/contract-docs.mjs check after generation` exited 0.
- `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock` exited 0.
- `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check` exited 0.
- `git diff --check` exited 0.
- The runtime journey completed in 544.2 seconds. No new test registration or migration.
- Reference lines
  - Clause evidence at `CONTRACT.md:1157`.
  - Runtime enrollment at `tests/runtime.mjs:142`.
  - Journey enrollment at `tests/oncall-agent-flow.mjs:1035`.
  - Metadata and text at `tests/oncall-agent-schedule-replay.mjs:101`.
  - Independent edit at `tests/oncall-agent-schedule-replay.mjs:132`.
  - Scope and effect custody at `tests/oncall-agent-schedule-replay.mjs:153`.
  - One approval and write at `tests/oncall-agent-schedule-replay.mjs:169`.
  - One audit at `tests/oncall-agent-schedule-replay.mjs:207`.
  - Identical retrieval at `tests/oncall-agent-schedule-replay.mjs:240`.
  - Browser readback at `tests/agent-door-browser.mjs:160`.
  - Scoped native target at `src/agent-door/schedule-tools.ts:73`.
  - Base optional check at `src/modules/agent-door/pipeline.ts:142`.
- The cloud branch preserves the generated views from main. The post-restore generated-document check reports the expected stale ACCEPTANCE view.

Both failed-job archives were retrieved once. Job 134743473903 reports the restored ACCEPTANCE.md difference and zero contract prose errors. Job 134751923236 logs failing CONTRACT_DOCS with BUILD, SHARDS and PUSH_PROOF successful.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

## Acceptance and rider review

| Item | Observation |
| --- | --- |
| Acceptance 1 | Identical retry returns the saved schedule result and receipt with one override and one audit in the selected scope. Complete mutating-tool coverage and the full retention window remain gaps. |
| Acceptance 2 | This round adds no dropped-stream observation. The runtime rechecked the existing declared incident, note, role, assignee and follow-up paths within their prior scopes. |
| Acceptance 3 | This round adds no changed-argument observation. Existing conflicts and effect-free retrieval remain in their current journeys. |
| Acceptance 4 | The new optional revision observation passes under both company policies. The existing native revision diagnostic with optional revision omitted also passed. Other tools and variants remain gaps. |
| Acceptance 5 | Foreign-person job handle and Tasks-independent long-work status remain held. The scoped-out rota refusal tested here concerns schedule authority. |
| Rider 1 | The selected MCP and rota browser paths reach all outcomes assigned to this round. The parent clause has the acceptance gaps above. |
| Rider 2 | The populated native rota was independently edited. The same valid cover fails on stale optional revision and succeeds after correction. |
| Rider 3 | Verify push run 44287329926 on the exact candidate concluded completed with failure. The only originating failure was contract-docs job 134743473903 on the restored generated ACCEPTANCE.md view. Verify aggregate job 134751923236 failed on that dependency. Build, all eight shards and full-push-proof passed, including agents job 134745459817 and hosted job 134745459783. The generated-view exception applies. |
| Rider 4 | Local browser and runtime checks cover the candidate test bytes. The browser captures run once per width and policy. |
| Rider 5 | The clause owns the revision duty. This change does not reassign an inherited duty. |
| Rider 6 | Generator write and check passed locally. Main's judgment, counts and generated files were kept in the cloud commit. |
| Rider 7 | Acceptance points and status rows match main. The clause prose records only the selected observation. |
| Rider 8 | The scoped local client can change the authorized rota. Existing foreign and absent rotas return the same revision-free result and leave the custody snapshot unchanged. |
| Rider 9 | The Worker and browser send no outbound requests in this slice. Paging and provider duties retain their prior holds. |
| Rider 10 | Both policy modes are exercised under the existing contract. No new policy decision was needed. |
| Rider 11 | Main equality, full-history scan and Run site on the landed SHA are lander checks. |

The diff preserves the existing assertions, including the authority, erasure and replay journeys. The browser reads the shipped rota page. The observed cover uses the existing tooltip on its icon-only remove control.

## Plan row and held work

Replan 79, BASE-AGENT-012: selected optional schedule override diagnostic observed in both policies. Main status stays MISSING. All other queue entries remain as planned. Required-native schedule diagnostics, P2 replay and diagnostics, and prior incident, note, acknowledgment, follow-up, service, role, and assignee proofs stay in their prior scopes.

Other revision combinations, schedule creation and reviewed updates, remaining mutating tools and variants, full at-least-24-hour retention, other changed-argument and lost-stream cases, foreign-person job handle, and Tasks-independent long-work status remain outside this slice. The OC-023 owning-team scope, OC-024 own-member PTO ruling, OC-025 field receipt R-14, OC-077, human follow-up acceptance, BASE-AGENT-006 and BASE-AGENT-008, broader attribution, erasure and approval replay, the SURFACE-004 Base seam, and OC-037, OC-044 and OC-054 ownership remain held. OC-045, OC-046, OC-048 and OC-049 await agent and AI egress authority. Paging stays OFF, with provider authorization, A2P, automatic timers, delivery, independent standby, devices, real-phone proof and cutover held.

CLAIM BASE-AGENT-012 PARTIAL points=4 tests=tests/oncall-agent-schedule-replay.mjs#staleOverrideRevision; tests/agent-door-browser.mjs#override-revision-retained-autonomous; tests/agent-door-browser.mjs#override-revision-retained-held

GAP BASE-AGENT-012: Other revision and mutation variants, full 24-hour retention, remaining lost-stream and changed-argument cases, foreign-person job handle and Tasks-independent long-work status remain unproved by this round.
