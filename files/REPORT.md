# Oncall SURFACE-001 schedule coverage

Run Edit Run fleet, 20 November 2026

## Plan and scope

The replan-89 SURFACE-001 row selected the schedule coverage class-set mismatch in acceptance 1. Compare the contract inventory entry with the emitted MCP tool metadata under autonomous and held policies, inspect the served agent guide at 1440 and 390, and compare native custody across those reads. Preserve the clauses, read scope and read-only annotation. Recheck the three shared-file predecessors, generate and check the contract views, restore the main views, and regenerate and check the pinned source lock. Submit the exact candidate to the branch Verify gate and return the report through the separate evidence ref.

The product diff changes the risk class cell for `oncall.schedules.coverage` and the generated lock entry for `CONTRACT.md`. The shipped tool already computes sensitive when its native schedule references participant records. The edited cell now reads **standard (+ sensitive)**. Product code, the generated agent guide, Base, workflows and tests were outside this edit. The maintained runtime and browser journeys remained intact. The focused comparison ran outside the product checkout.

Before and after counts are **26 DONE, 41 PARTIAL, 34 MISSING** across 101 clauses. SURFACE-001 remains MISSING. The acceptance 1 schedule coverage slice is complete. Full acceptance 1 still requires exact parity with every inventory row. Acceptance 2 still requires the complete resource and event surface. Acceptance 3 still requires the BASE-AGENT-013 conformance journey for the complete surface under both policies. The existing Status, Gap and Evidence cells match main byte for byte.

## Observed coverage

- `tests/oncall-agent-flow.mjs:840–884` checks the generated inventory against the live catalog and served guide in both policies. It compares native and paging state and checks that serving the guide produces no new permanent audit rows.
- `tests/agent-door-browser.mjs:915–945` compares the rendered inventory with live discovery under both policies and checks keyboard scrolling at desktop width. The guide captures measure viewport fit and accessibility at both widths. Both captures fit the viewport and reported zero serious or critical accessibility findings and zero undersized controls.
- The focused probe parsed the edited contract row independently of the live tool and compared the sole matching tool from MCP with the served guide row under each policy. It compared the native state, state-changing audit and paging responses before and after discovery and rendering. The receipt records observed results and fixture references. Each case retained workspace revision 15, paging revision 1 and all 15 mutation-audit rows. The archive mode remained synthetic-only and paging remained OFF. The guide fit both viewports, and the row’s smallest measured code text was 13.76 px.

## Predecessors and held work

- f244 is present in main at `183eef356bf1fd5eec173f2e5cbf27f3564ca0f7`. The candidate keeps its tool clause associations.
- f265's responder-list contract patch is present in main at `ec20de7b42e527cd205b7c42c2dde493948eca7f`. Its contract patch ID matches its branch head `bcd444494196597c1834818c2c78d3d8c13b6aa9`.
- f309's changes-read contract patch and proof are on the predecessor branch at `308c610d2edaebae3a9397e515bf2e6db2fdfb56`. Exact-SHA Verify runs 44636494868 and 44624425448 show failure. In 44636494868, the agents and hosted shards passed, the generated-contract check failed, the Changes shard was cancelled, and the aggregate gate failed. Its changes-read row and proof location are disjoint from this edit. Keep the existing predecessor landing gate and reconcile its admitted text when it lands.
- Preserve the holds on OC-045, OC-046, OC-048 and OC-049 egress authority, paging-OFF delivery, standby, real-phone proof and OC-023 team privacy. Other class-set and shipment discrepancies, unshipped and partial tools, services-update access and live classification, and privacy-erasure classification and replay remain outside this round. The complete resources, events, prompts, stranger-agent proof and BASE-AGENT-013 conformance remain held. BASE-AGENT-006 and BASE-AGENT-008 duties, the SURFACE-004 Base seam and the fleet queue and release gates retain their existing scope.


The held tool targets are bridges creation, triage bulk and saved views, page creation, policy updates, contact updates, readiness drills, swap responses, calendar subscriptions, routing publication, intake keys, member updates, SSO configuration, hand-off preparation and review, follow-up updates, update publication, archive export and restore, action updates and execution, remediation, investigation starts, ownership proposals, incident escalation and merge, paging history, alerts replay, client and endpoint create or register and rotate, and analytics usage.

## DONE riders

1. Partial proof. The named runtime and browser journeys and the focused probe cover the selected acceptance 1 row. Other inventory rows and acceptances 2 and 3 prevent DONE.
2. Selected slice passes. The comparison uses an emitted Worker backed by seeded D1 and reads a real rendered guide row. Native and paging comparisons include mutation audit.
3. The maintained journeys are configured for runtime and hosted Verify shards. The candidate Verify run and its observed result are in the receipt. The local receipt is separate from exact-SHA CI coverage.
4. The local test input tree matches the candidate, as recorded in the receipt.
5. The receiving clause already cites its six Base duties, including BASE-AGENT-013.
6. The generator write and check passed with 0 changes to the views. Main's Status section and generated views were preserved. Fresh judgment provenance belongs to the lander.
7. The acceptance sentences and coverage map match main. The inventory row records the existing runtime class set.
8. The selected operation is read-only. Both policies advertise identical scope and annotations. The existing runtime suite exercises insufficient and revoked credentials and erasure and replay cases independently.
9. Provider authority and live delivery proof remain held. Both policies retained paging OFF with zero outbound requests during the focused comparison.
10. The correction documents established sensitivity behavior. No policy default was adopted.
11. Candidate publication only. Main equality, full-history publication scanning and exact-main Run site remain fleet landing checks.

## Plan handoff

Record the replan-89 SURFACE-001 row as a completed schedule coverage slice with the clause still MISSING. Preserve the other entries and holds.

## Candidate and receipts

- Product branch `cloud/sd-oncall-c-f312`, head `b7244120f638bac66ab04d6544e0803165b06aac`, base `e13220ee432bc9ac531627b20a92790a0024433f`, tested tree `92ba8300b27e5a56411a3ebbd3d4c6ae4482a606`.
- Exact-SHA push Verify [44700858386](https://github.com/just-every/run-oncall/actions/runs/44700858386) was completed with conclusion success at 2026-11-20T08:33:55+00:00.
- Base exact-SHA push Verify 44696528833 and Run site 44696528969 passed. The full-history publication scan and Run site for the candidate remain with the fleet lander.
- The emitted app build, typecheck, first-party check, maintained runtime agents journey, maintained agent browser journey, focused comparison, contract generation and pinned source lock check passed. The report receipt includes explicit command results and the observed screen and native probe details. No PR was needed for the push workflow.
- The evidence includes the original guide captures at 1440 and 390. The desktop journey checked keyboard scrolling and inventory parity. The focused read compared the schedule coverage row at both widths on both policies.

```text
PROBE SURFACE-001 1: MCP tools/list and served agent guide under autonomous and held policies -> one read-only schedule coverage tool with standard and sensitive classes, OC-014, OC-020 and OC-076, schedules:read, and matching guide classes and scope at 1440 and 390. Native state, mutation audit and paging stayed unchanged, with zero outbound requests.
MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0
```
