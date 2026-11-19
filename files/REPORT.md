# Oncall agent inventory proof

Run Edit Run fleet, 19 November 2026 · sd-oncall-c-f309

## Scope and plan

1. Reconcile the pinned main, the f244 and f265 predecessors and the newer shared-file changes.
2. Compare the existing `oncall.changes.read` row with emitted MCP and the served agent guide before editing. Repeat under autonomous and held policies, at 1440 and 390 pixels, with native records, permanent mutation audit, paging and outbound requests observed.
3. Correct the possible class set and record the observation in the clause. Preserve the Status section, acceptance sentences and existing tests. Regenerate and check the contract views, restore them from main and regenerate and check the pinned source lock.
4. Push the class correction as a save, then verify and push the observation as the landing candidate. Publish this packet separately against its advertised product SHA.

## Result

Pinned main was `071c74a352196f6778eb3b2942c351b4cf1e0ace`. It had 26 DONE, 41 PARTIAL and 34 MISSING out of 101. The candidate has the same counts and SURFACE-001 remains MISSING. The fleet plan row for replan-87 advances only the selected portion of acceptance 1. The plan itself remains on the fleet machine.

Main contains f244 `183eef356bf1fd5eec173f2e5cbf27f3564ca0f7`. The f265 branch tip `bcd444494196597c1834818c2c78d3d8c13b6aa9` is outside main ancestry, and its shipped responder row already appears verbatim on current main. The changes read row still said standard on both predecessor branches. The candidate preserves main's responder row, ten corrected clause associations, and all changes to the computed definition, manifest and agent journeys. The product diff is limited to `CONTRACT.md` and `sources.lock.json`.

| Observation | Before | After |
| --- | --- | --- |
| Contract possible classes | standard | standard (+ sensitive) |
| Emitted tool under both policies | `oncall.changes.read`, `OC-065`, standard and sensitive, `services:read`. Read-only true, destructive false, open-world false | Same |
| Agent guide at 1440 and 390 | Exact name, scope and both classes, with `changes` as the fixture for each | Same |
| Safety effects | Native D1 records and revisions, permanent mutation audit and paging preserved with zero outbound requests | Same, and paging explicitly read back as OFF |

The contract table has columns for name, job, Core clauses, possible classes and shipping status. The scope and read-only annotation come from the emitted MCP listing, the manifest and source. The guide renders the scope and class evidence. MCP can retain its protocol bookkeeping. The guide reads preserved the permanent audit.

PROBE SURFACE-001 1: emitted Worker MCP tool listing under autonomous and held policies and served agent guide at 1440 and 390 -> one read-only `oncall.changes.read` entry for `OC-065` with `services:read` and both standard and sensitive. The corrected class cell agrees, native records and permanent mutation audit match their snapshots, paging stays OFF and the outbound ledger is empty.

The definition is in `src/agent-door/read-tools.ts` at lines 21–24 and 81–85. The manifest lists the tool at line 159 and the computed-class fixture at line 1761. `tests/runtime.mjs` selects the agent flow at line 140, with the emitted inventory and permanent-audit comparison in `tests/oncall-agent-flow.mjs` at lines 840–884. The browser's served inventory comparison is in `tests/agent-door-browser.mjs` at lines 915–942.

## Remaining acceptance and riders

- Acceptance 1 remains open for the complete table. The selected row is proved. Other class mismatches, service access and live classification, erasure classification and replay, and unshipped tools were outside this slice. Remaining jobs include bridge creation, bulk triage and saved views, manual pages, policy and contact changes, readiness drills, swaps, calendar subscription, routing publication, intake keys, member access, SSO, handoff preparation and review, follow-up changes, status publication, archive movement, library actions, remediation, investigation, ownership proposals, escalation, incident merge, paging history, alert replay, client and endpoint enrolment and rotation, and usage analytics.
- Acceptance 2 still needs the complete resource and event types and their record URIs. Keep the BASE-AGENT-003 and BASE-AGENT-010 boundaries and the remaining prompt targets.
- Acceptance 3 still needs full Base conformance under both policies, including the stranger-agent workflow and the held BASE-AGENT-013 work. The local two-policy checks establish inventory parity for the selected row.
- OC-045, OC-046, OC-048 and OC-049 still require ct authority for agent and model egress. Live paging needs authorized delivery, standby and a real phone. Team privacy remains held under OC-023. Existing account, authority, cleanup and provider prerequisites, BASE-AGENT-006 and BASE-AGENT-008 holds, and the ambiguous Base seam in SURFACE-004 remain in force. 

| Rider | Result for this round |
| --- | --- |
| 1 | The selected registry row passes through emitted MCP and the guide. Complete table parity, resources and event delivery, and full conformance remain open. |
| 2 | The focused probe checks an actual emitted inventory and browser row against independent expected metadata and checks native D1 and paging before and after. |
| 3 | Open for DONE. Existing public-door journeys cover inventory. The exact-SHA push Verify selected the full build and shard set. Its agents, hosted and browser shards passed. The changes shard was cancelled. Exact run and job information is in the receipt. |
| 4 | The final focused probe is bound to the candidate in the receipt. The full tests and built runtime inputs are identical to main. |
| 5 | SURFACE-001 cites BASE-AGENT-001, 002, 003, 010, 012 and 013. |
| 6 | Status, Gap, Evidence, counts and judgment provenance stay on main's text. Generated views pass after writing them locally and are restored for the lander. |
| 7 | The three acceptance sentences and inherited coverage remain intact. |
| 8 | The read-only annotation and existing service scope pass under both policies. Existing authority and negative coverage remains in the agent journeys. |
| 9 | Live vendor, standby, team and phone evidence stays held. Paging stays OFF. |
| 10 | No authority, custody, consent or spending default is adopted. |
| 11 | The exact-SHA publication scan, guarded main landing and candidate Run site are lander duties. Publication and acceptance are separate. |

The existing inventory assertions still run at their original width. The packet contains the focused browser observation at both requested widths and the complete observed row data. Existing authority, erasure and replay tests were preserved. Only the contract source and its lock changed.

The supplied hook block installed but its shell quoting produced invalid Python in the forwarding hook. The generated hook quoting was corrected and the clone-local hooks stayed active for both commits and the unpublished amendment. The hook correction lives under the clone’s Git directory.

## Candidate and quality checks

Product save: c15cc0b862a6ad6cd17e3aa732fed21704230602.
Product candidate: 308c610d2edaebae3a9397e515bf2e6db2fdfb56.
Main before candidate publication: 071c74a352196f6778eb3b2942c351b4cf1e0ace, with Verify 44599061529 and Run site 44599061677 both completed successfully on that SHA.

Local setup, emitted build, typecheck, first-party check and workflow validation passed. Local contract regeneration and freshness passed before restoring the generated views. After restoration the contract check reports only stale ACCEPTANCE.md, which the lander must regenerate. The pinned source lock was regenerated last and passed its freshness check on the candidate. There was no migration.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

The full emitted runtime agent journey and agent browser journey both exited 0. The runtime agreed on all 42 listed tools and 17 scoped resource templates under both policies. The browser verified the served inventory under each policy and captured the guide at 1440 and 390, with no serious or critical accessibility findings at either width. The final focused probe reran on the exact candidate. The 390-pixel crop scrolls the existing inventory horizontally to show both class labels. The receipt records the entire row at both widths.

## Exact-SHA CI

Push Verify 44624425448 completed with failure. The plan and build passed, including the pinned source-lock check. The agents, hosted, runtime, browser, intake, triage and transfer shards passed on the candidate. Job 135914547236 failed on the known stale ACCEPTANCE.md view. Changes job 135916392172 was cancelled during the shard command and its failed-step archive was empty. The aggregate job 135925221090 failed with the contract-docs and shard conclusions. The changes job is independent of the contract-view check.

The exact shard command is CI=true SHARD=changes node scripts/verify-oncall.mjs changes under Node 22.20.0 and pnpm 10.12.4, using its exact-SHA build receipt. It ran locally in the dedicated VM. The candidate completed both lanes in 884 seconds with exit 0, 16 seconds below the workflow's 15-minute job limit before any CI setup steps. This establishes timing pressure. The reason GitHub cancelled the job is still unconfirmed. The ten-call GitHub budget was spent on exact-SHA discovery, pacing-compliant status reads, job results and the one archive read per affected job.

The same command on pinned main also passed both lanes, with exit 0 in 874 seconds. Both runs used separate builds identified by their own SHA and the same VM and pinned Node. The cancellation did not reproduce locally. The recorded GitHub conclusion remains failure, so the candidate is in pushed custody. The publication scan, regenerated landing views and candidate Run site remain with the guarded lander.
