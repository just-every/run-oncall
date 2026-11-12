# sd-oncall-c-f242: scoped agent triage search

Repository: just-every/run-oncall. Product branch: cloud/sd-oncall-c-f242. The selected slice is SURFACE-001 acceptance 1's oncall.triage.list row. This is a PARTIAL implementation claim, with no whole acceptance point or clause promoted. The source Status remains MISSING.

## Scope and implementation

Added the tool through the existing read helper and incidents:read permission. Native triageQuery parses the maintained search, kind, status, severity, urgency, priority, service, assignee, mine, time-range and sort fields. A focused adapter filters incidents by their original and canonical service provenance, filters alerts, events and intake receipts by granted services, and excludes every incident-linked alert from the alert-only cohort before matching or counting. In particular, a granted source merged into a foreign target is removed as well as a granted target with a foreign merged source. Foreign merged text cannot produce a search hit. Service-less unrouted alerts remain absent.

Incident rows use the shipped incident list record, with kind and triageStatus. Alert rows reuse the exported shipped alert allowlist, with those two triage fields. Mine uses the active sponsoring member for local clients and Business agents. Cursors hash a canonical normalized query, workspace revision, sponsor, agent, client, consent and sorted service grant. Native date-range refusals cross the existing native error adapter. Read classification uses exactly the existing computed protected-record rule, so standard and sensitive follow the same company-policy treatment as incident reads. Reads do not fire deadlines, resume work or send network requests.

The manifest and guide were regenerated through scripts/write-agent-surface.mjs, including maintained standard and sensitive conformance fixtures. Only the triage tool table's class and Today cells changed in CONTRACT.md; personal saved views remain explicitly unshipped. All Status, Gap and Evidence cells equal current main. The stale SURFACE-001 judgment prose is preserved because the builder is forbidden to edit it; this report provides new evidence for the lander. The already-landed alert read is exercised by tests/oncall-agent-alerts.mjs, alertReads, and passed in both policies in this candidate run; the new triage tool reuses its allowlist rather than repeating payload projection. Base copies, workflows, homepage, logos, permissions, migrations and release authority are unchanged.

## Frozen rubric for the selected slice

Each row is proved by tests/oncall-agent-triage.mjs, triageReads, invoked once from tests/oncall-agent-flow.mjs through the existing tests/runtime.mjs machine journey. There is no new independently registered Verify test and no existing assertion removed, narrowed or moved behind a condition.

| ID | Outcome | Public-door proof |
| --- | --- | --- |
| R1 | Discover the tool with scope, clauses, classes and read-only metadata; serve the updated guide | Lines 54–58: emitted MCP tools/list and served HTTP guide |
| R2 | Return exactly the granted incidents and alert-only items, with scoped totals and no foreign or unrouted IDs | Lines 38–48, 59–68, 87, 95–104: populated native and routed fixtures, both cross-service merge directions, explicit expected IDs, forbidden-output scan and zero foreign search hits |
| R3 | Preserve native filters, sponsor mine, status and ordering | Lines 78–107: native query matrix, overdue snoozed record, explicit priority and urgency, unassigned and sponsor cohorts, both client and Business identities, all four sorts and date ranges |
| R4 | Stable bounded cursor pages and refusal after query, principal, grant or workspace changes | Lines 73–79, 97–99, 108–111, 119–124: repeated first page, complete three-page enumeration, normalized-query reuse, changed query, other principal with a different grant, and a foreign-record workspace edit |
| R5 | Project only the shipped incident and alert records and compute risk under both policies | Lines 19–35, 59–72, 95–96: exact projection comparisons, held sensitive nondisclosure until human approval, standard review and sensitive approval parity |
| R6 | Refuse malformed queries, foreign services, missing permission and revoked tokens | Lines 108–115, 125–127: real MCP refusals and absent structured results |
| R7 | Erased client cannot reuse a captured cursor to retrieve records | Lines 128–134: owner HTTP erasure followed by the original credential and captured cursor, 401 and no private result |
| R8 | Reads preserve native records, pending deadlines, paging and permanent audit apart from documented read custody; zero outbound attempts | Lines 53, 116, 124, 127, 134; tests/agent-door-runtime.mjs assertAgentReadUnchanged compares application and every native table, immutable prior audit and identity rows, and value-free appended audit effects |

The fixtures use native and routed HTTP admissions on two services, real D1 records, a declared incident with evidence, an acknowledged snoozed incident after its due time, an unassigned incident, merged provenance in both directions, native and routed alert-only items, and a real record-unrouted receipt. Fixture setup uses no direct application-record injection. Ordinary owner configuration remains independent of paging, which is OFF.

## Clause acceptance and retained gaps

Acceptance 1: the selected triage read row is implemented and exercised; the full tool table is still incomplete. Personal saved views remain member-owned and omitted. Other unshipped rows retain their named account, policy, timer, team and predecessor holds from the supplied brief.

Acceptance 2: resources, events and prompts are not advanced by this change. Their current declaration and predecessor work remain authoritative.

Acceptance 3: this change supplies class fixtures to the maintained Base harness and runs the selected public-door proof under both policies; it does not claim complete conformance or stranger-agent completion. BASE-AGENT-013 and other inherited holds remain.

Team filtering, foreign-team refusals, my-teams privacy, team authority, saving or reading personal views, provider actions, actual paging, activation, publication and release authorization are all unclaimed. No new policy default was adopted. No next unblocked clause exists in the supplied queue.

## Main reconciliation and counts

Initial main was 59af2f80bb67eb3382828f5c736698491006254c: Verify 43174252562 and Run site 43174252741 completed successfully. The first real save acabbc2ed621b7ad1e07093c7ef5dd359be0ca74 was pushed with skip CI.

Before the final candidate, merged main 6b4689cbf0d25f36c43c0d9967fd0a3e00a22a41, retaining its newer OC-052 DONE judgment and source changes. Its exact-SHA Verify 43181655382 and Run site 43181655448 completed successfully. CONTRACT.md was resolved and compared first; generated contract views were taken whole from main, the agent manifest and guide regenerated, and the source lock generated last. The only content conflict was the generated source lock.

Relative to refreshed main, clause counts stay 26 DONE, 41 PARTIAL and 34 MISSING, all 101 rows retained. Initial counts were 25 DONE, 42 PARTIAL and 34 MISSING; the intervening OC-052 change belongs to main, not this round. Source manifest tools increase from 41 to 42, current exposed tools from 40 to 41, and maintained class fixtures from 62 to 64. SURFACE-001 remains MISSING; no clause status or plan row was changed by this builder. The plan extract's selected triage read slice is completed, with its other holds retained.

## DONE riders and pre-ready checks

1. Full-clause outcome coverage: FAIL for a whole DONE claim; unshipped table rows and acceptance 2 and 3 remain. PASS is claimed only for selected rubric R1–R8.
2. PASS, populated allowed and denied paths: selected proof uses explicit nonempty expected cohorts, native admissions and real authorization refusals.
3. Exact-SHA Verify coverage: PASS for the selected slice. Push Verify 43184206807 completed successfully on a206fb7f6186f78558bcfa645906a7764795d7f4; the new proof is in the existing runtime machine entry point and the class fixtures in the existing conformance harness. Full-clause completion remains unclaimed.
4. Evidence freshness: PASS. RECEIPT.json binds the final local gates and screenshots to the same candidate as successful Verify 43184206807. The product tree remained clean and no source or test changed after the candidate commit.
5. Inheritance: INSPECTED; SURFACE-001 retains its Base citations, and the new row retains OC-060 with the existing incidents:read authority.
6. PASS mechanical source and views: mechanical generator write and check, restored main views and source-lock check are recorded separately; all current main judgment cells remain intact by instruction.
7. Acceptance changes: PASS by diff inspection; the three acceptance sentences and their inherited duties are unchanged.
8. PASS permission and authority: selected runtime checks granted, foreign, insufficient, revoked and erased callers, including captured-cursor refusal, with native effect isolation.
9. Provider and legal boundaries: PASS by scope; no external provider, delivery, capacity, legal or readiness claim.
10. Policy defaults: no new default; the existing native grant and sponsor authority apply. Saved preferences and team privacy remain omitted.
11. Landing: PENDING fleet custody; main equality, complete full-history publication scan with zero findings and exact landed Run site are not cloud receipts and are not claimed.

Pre-ready self-check: selected behavior is exercised through public MCP and native HTTP; no existing assertions were weakened; captured cursors cannot restore erased or revoked client authority. No app control or screen implementation changed, and the served generated guide receives 1440 and 390 proof. Fresh lock and generator receipts are required before candidate push. Publication scanning and guarded landing remain with the fleet, with no cloud claim that scanning completed or main equals this product head.

## Validation and terminal custody

Actual commands, exits, candidate head, workflow conclusions and report hashes are recorded in RECEIPT.json. Candidate proof and browser outcomes are recorded below as their commands complete. PLAN.md carries the full performed plan. Reports and receipts are separate from the product tree and published only on the named evidence ref.


## Completed candidate validation

Candidate a206fb7f6186f78558bcfa645906a7764795d7f4 is committed and pushed to cloud/sd-oncall-c-f242. Required local verification completed with exit 0: `ONCALL_VERIFY_LANE=intake ONCALL_CHROMIUM_PATH=/usr/bin/chromium CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium cloud_run timeout 1500 npx -y @runeditrun/rer verify`. The machine runtime completed in 457.1 seconds, intake in 70.2 seconds and routing in 124.5 seconds. The CLI hosting check and hydration check passed, including four pages and 23 loads. The native agent-door conformance harness passed 8,688 of 8,688 points, including both maintained triage class fixtures. This local lane selection does not change default branch CI coverage.

Final typecheck, generated agent inventory freshness, contract write and check, source-lock check and first-party check all exited 0 on the candidate. Contract write produced zero changed views, and both views were restored whole from current main. No migration ledger applies. The final source lock was generated after staging the added files and after the merge, and its freshness was checked again before the guarded push. Source, tests and contract bytes are unchanged after these checks.

The served guide was captured once at 1440 and 390 with system Chromium and no sandbox. Assertions were at 1440. Both proofs show the new triage row; the desktop row and scope are readable. Visual inspection found the existing wide inventory table clips later columns in the 390 viewport, as it does for preceding inventory rows; that documentation layout is a minor follow-up and no layout code is changed by this slice. Both browsers and the temporary Worker were closed. Screenshots are actual output files in this packet.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check, main views restored exit=0; ledger=none exit=0.

The product push guard succeeded on attempt 1 for the final head. Every candidate author and committer, including side parents outside origin/main, was inspected as fleet with no trailers. The product worktree was clean; an untracked synthetic routing-test receipt was moved outside the product clone instead of being committed. GitHub CI discovery was attempted once before the final push completed and returned no runs; the next observation respects the same 300-second polling limit and the ten-call budget. It is not a passing CI receipt. The exact-SHA CI observation is recorded in RECEIPT.json when available.


## Final CI and handoff

Push Verify 43184206807 completed successfully on exact head a206fb7f6186f78558bcfa645906a7764795d7f4, observed 2026-11-12T08:51:17Z: https://github.com/just-every/run-oncall/actions/runs/43184206807 . One watcher made six GitHub calls in total, including two exact-main discoveries and the initial pre-push empty discovery; subsequent observations respected the 300-second interval. No workflow was dispatched or rerun. No PR was required or created because branch push is the existing Verify entry point.

All selected rubric rows R1–R8 pass through public doors on the candidate and are covered by successful exact-SHA push Verify. Inherited transport, policy, revocation, audit and replay duties are exercised by the unchanged maintained runtime and conformance journeys in the same successful run. This does not complete the other tools, resources, events, prompts or full-clause conformance duties. No policy default, account, egress, paging, publication, activation or release authority is added.

The selected triage read row is complete; the full SURFACE-001 acceptance sentences remain incomplete. Builder counts and Status, Gap and Evidence cells do not advance. Plan change for the Mac: record the selected triage read slice as implemented with this proof; preserve every other queue entry and hold. The fleet owns any judgment-cell reconciliation.

Scan receipt: commit=a206fb7f6186f78558bcfa645906a7764795d7f4 complete=false historyScanned=not-run-in-cloud findings=not-run-in-cloud. The required complete full-history publication scan with zero findings, guarded landing and resulting main Run site remain fleet gates. Main equality to the product head is not claimed. No real product blocker remains for this slice.

CLAIM SURFACE-001 PARTIAL points=none tests=tests/oncall-agent-triage.mjs#triageReads
GAP SURFACE-001: The triage read row is proved; saved personal views, other unshipped rows, undeclared resources and events and prompts, and complete conformance retain their named holds. No whole acceptance point or clause is promoted.
PROBE SURFACE-001 1: emitted Worker MCP triage -> exactly three granted incidents and three alert-only items under both policies, sponsor mine and overdue snooze retained, stable pages and scoped totals, foreign and merged-foreign and unrouted non-disclosure, stale or foreign cursor refusals, revoked and erased credential refusals, unchanged native state and zero outbound requests.
READY repo=just-every/run-oncall branch=cloud/sd-oncall-c-f242 head=a206fb7f6186f78558bcfa645906a7764795d7f4
