# sd-oncall-c-f239 results

Repository: just-every/run-oncall. Product branch: cloud/sd-oncall-c-f239. Product head: 8810246317c7f72e7f6415ddb88d1f7aa996de08. Parent main: dd8f2de57d7ef33ef010dacfc42155253635b5fd. No PR is required or created: push Verify is the repository's pre-main entry point. Product push succeeded on the guard's first attempt. Main was never pushed or fast-forwarded by this task.

The selected oncall.alerts.list row is implemented. SURFACE-001 remains MISSING on the unchanged source Status table. This is a PARTIAL claim of the selected row, not completion of acceptance 1's whole table or the parent clause. Counts remain 25 DONE, 42 PARTIAL and 34 MISSING, 101 total. Source manifest declarations change from 40 to 41 tools; the currently exposed catalog changes from 39 to 40 because the existing event target remains undeclared.

## Implementation

The tool uses the existing read helper and incidents:read permission. Its focused projection returns alert identity, service, source, environment, key, generation, state, urgency, original severity and priority, current priority, suppression, owner, observations and retained admission policy or routing selection. It explicitly omits raw source details, prefix custody, routing input, routing diagnostics, member snapshots and aggregate counts. It scopes alerts, observations and receipts before joining them, excluding service-less records and foreign services.

Pages default to 50 alerts and accept 1 to 100. IDs determine alert order; acceptance time and ID determine observation order. Cursors bind the authorized anchor to the principal, current service grants and filters. An absent or no-longer-visible anchor is refused. Current native authority is re-read through the existing helper for every execution and approval continuation.

Classification uses exactly the protectedRecords predicate used by incident reads. Standard-only records stay standard; returned retained personal or incident evidence adds sensitive. Imported text carries the existing untrusted metadata. Company-policy handling, read audit, approval and review remain the shared door's behavior. The contract tool row documents the computed class; no permission, outbound authority, release authority or Base module changes are introduced.

The manifest and guide inventory were regenerated with scripts/write-agent-surface.mjs. The guide also explains filters, page bounds, ordering, privacy exclusions and policy treatment. The only CONTRACT.md edit is the alert tool row. Every Status, Evidence and Gap cell remains byte-for-byte main's text. The stale whole-clause Gap is reserved for the lander's judgment; it is not silently treated as current implementation evidence.

## Proof rubric

Each row below concerns the selected alert row. tests/oncall-agent-alerts.mjs exports alertReads, the scoped alerts and retained observations journey; tests/oncall-agent-flow.mjs invokes it in one line, and tests/runtime.mjs loads that flow in the machines partition. CHECKS.json binds completed final checks to the full candidate SHA. Verify is the push event, run 43154671717; its final status is recorded separately in CANDIDATE-CI.jsonl.

| Item | Proof on the selected row |
| --- | --- |
| R1: Actual alert records and observations | alertReads lines 20 to 70 admit real native, compatible and monitoring inputs on both services, plus scoped incomplete and record-unrouted inputs through emitted HTTP and D1. Lines 102 to 160 inspect six scoped alerts and their actual native records. |
| R2: Stable bounded pagination and filters | Lines 127 to 150 and 169 to 175 check a populated recovered low-urgency result, three stable two-record pages, all scoped IDs, active and urgency filters, refused limits and invalid or changed-filter cursors. |
| R3: Original classification and retained explanations | Lines 134 to 160 inspect original severity and priority, suppression, policy version 1 and chosen service after live policy and routing are changed. Observation titles, timestamps and evidence equal retained native observations. |
| R4: Foreign and unrouted non-disclosure | Lines 104 to 114, 150 and 177 reject foreign alert, event and receipt IDs, member profiles, payloads, prefixes, credentials, snapshots and aggregate counts. Explicit foreign service selection returns not_found without content. |
| R5: Incomplete flags without bytes | Lines 163 to 164 observe a genuinely truncated, incomplete native admission. The recursive exclusion and raw-prefix assertions in lines 105 to 114 prevent retained bytes from entering the result. |
| R6: Existing scope, revocation and captured-cursor refusal | Lines 177 to 188 exercise missing incidents:read, cross-service requests, token revocation and replay of a previously valid captured cursor, with no returned records or native effect. |
| R7: Computed classes and company policy | Lines 89 to 100 and 127 to 168 exercise standard and sensitive results under all-autonomous and held policies, with held sensitive content withheld until actual person approval. Disposition equals existing computed incident reads. Returned imported text is marked untrusted. |
| R8: Native effects and outbound boundary | unchanged at lines 8 to 21 preserves application and every non-audit native table, every pre-existing permanent audit row and identity, and permits only documented agent-door.persistence append rows with unchanged application, paging and handoff revisions. Lines 179 to 188 also require zero outbound requests and current policy decision audit. |
| R9: Public discovery, clauses, classes and served guide | Lines 119 to 126 read actual tools/list metadata and the served guide. Generated class fixtures alerts-list-standard and alerts-list-sensitive execute via tests/agent-door.mjs. |
| R10: Existing duties and untouched assertions | SURFACE-001 retains its existing Base citations. The existing agent flow is preserved and extended by one invocation. No existing assertion is deleted, skipped, narrowed or placed behind a condition. Base sources under src/modules/agent-door are unchanged. |

## Full-clause acceptance boundaries

| Acceptance sentence | Result |
| --- | --- |
| 1: The tool catalog equals the entire contract table, with Core clauses and classes | The selected alerts.list row is proved by R1 to R9. All other omitted rows remain outside this slice; the whole sentence is not claimed complete. |
| 2: All specified resource types and event record URIs | Unchanged and not claimed complete. The initial main still lacked the pending alert resource projection and event candidate; no pending branch was adopted as landed code. |
| 3: Complete Base conformance on all required Oncall work under both policies | New alert class fixtures are included in the maintained harness. The parent clause's broader capability and conformance remainder remains omitted; no whole-clause completion is inferred from the passing current subset. |

## DONE-RIDERS review

| Rider | Result for this partial selected-row claim |
| --- | --- |
| 1 | PASS for the selected row through R1 to R9; whole acceptance 1 and remaining parent outcomes are unproved and expressly retained. |
| 2 | PASS: populated real admissions, allowed reads, sensitive approval, denied scope, foreign access and revoked captured-cursor replay are executed. No empty list substitutes for the selected record proof. |
| 3 | Current Verify invokes the runtime machines path and the maintained agent harness; exact-SHA run status is in the CI receipt. No whole-clause DONE claim is made. |
| 4 | Final focused proof, build, typecheck and first-party checks are recorded on the exact candidate in CHECKS.json. |
| 5 | INSPECTED: the receiving SURFACE-001 meta line already cites BASE-AGENT-001, 002, 003, 010, 012 and 013. Existing incidents:read and current membership checks are reused. |
| 6 | Contract write and check pass locally, generated views are restored whole, and the source lock is regenerated and checked last. Judgment cells remain with the lander, including their stale parent Gap. |
| 7 | PASS: no acceptance sentence, ID, coverage map or ruling is rewritten. Only the tool row's shipped behavior and class declaration change. |
| 8 | PASS for this read door: R4, R6 and R7 execute both supported and refused authority paths, preserving native state. |
| 9 | PASS: real local Worker and D1 proof is identified as local. No provider, live paging, phone, legal or account qualification is claimed. |
| 10 | NOT APPLICABLE: the brief explicitly authorizes reuse of incidents:read and the existing computed class rule. No new policy default is adopted. |
| 11 | PENDING FLEET: publication scan, guarded landing, main equality and Run site on the landed SHA remain with the Mac lander. This branch-only task does not claim them. |

## Remaining scope and plan return

The extract's selected SURFACE-001 POINTS row is complete only for oncall.alerts.list. No plan file or other clause is rewritten. SURFACE-001 stays MISSING, without whole-clause promotion. Existing omissions retain their owning holds: the rest of the tool table, declared resources and events, full conformance, private team scope under OC-023, accounts and provider acceptance, agent egress authority, paging OFF, standby and real-phone prerequisites, Base replay and erasure holds, and release authority. No policy default or new account dependency was introduced. There is no product blocker for the selected row.

The full work plan is PLAN.md. Actual check receipts and complete selected successful logs are returned in this evidence packet, alongside CI receipts and the served guide proof. Product custody is separate from this report-only publication.

CLAIM SURFACE-001 PARTIAL points=none tests=tests/oncall-agent-alerts.mjs#alertReads; tests/agent-door.mjs#alerts-list-standard; tests/agent-door.mjs#alerts-list-sensitive
GAP SURFACE-001: The alerts.list slice of acceptance 1 is proved; the rest of the table and acceptances 2 and 3 remain omitted under their existing holds. Keep MISSING and all counts unchanged.

PROBE SURFACE-001 1: Emitted Worker MCP, a client granted one service and real native, compatible, monitoring, incomplete and unrouted admissions -> exactly six authorized alerts across three stable pages, retained observations and decisions, filtered state and urgency, no foreign or unrouted IDs or counts, scoped truncation flags without bytes, policy parity, refused permission and revoked captured cursor, unchanged native effects except documented read custody audit, zero outbound requests.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check, restored from origin/main exit=0; ledger=none exit=0.

## Validation and pre-ready review

On the exact product SHA, the focused alert proof passes; the production build, typecheck and first-party profile pass. The maintained agent conformance reports 8459 of 8459 points passed, followed by its native adoption checks. CHECKS.json records each command, start, end, exit and full head. The normal runtime machines entry is also exercised and its final receipt is returned there.

The served guide was captured once at each of 1440 and 390 pixels using system Chromium with no sandbox. The new row, permission and class declaration are asserted at 1440; both screenshots are inspected. BROWSER.json binds the screenshots to the candidate. The guide retains the existing table layout and native look. No icon-only control, Settings flow, homepage, logo or application screen is changed.

One one-off browser helper initially failed before browser launch because the package resolved through its CommonJS entry and the namespace import supplied no chromium export. The helper was corrected to use the package's require export; browser-guide-fixed passed without any product change. The actual failed helper receipt and successful replacement are both retained, with their logs. This is not a product assertion failure or a CI repair.

Pre-ready review: (1) R1 to R9 cover the selected visible behavior and dangerous authority paths; the whole clause stays unclaimed. (2) No prior assertion is removed, weakened, skipped or moved behind a condition. (3) Missing permission, current native membership, revoked credentials and captured-cursor replay are enforced; the existing broader flow also passes sponsor erasure and redacted retained audit. The new read stores no replayed application content and uses current native state on approved continuations. (4) The guide proof is inspected at both widths and introduces no application controls. (5) Source-lock freshness, contract generation and first-party checks pass. Exact-SHA Verify status is the separate CI receipt; publication scanning, guarded main equality and candidate Run site remain fleet-owned and unclaimed. The added source diff has no email-shaped string and changes no Base copy, workflow or generated contract view.

Publication scan result for 8810246317c7f72e7f6415ddb88d1f7aa996de08: NOT RUN IN CLOUD; complete=unestablished; historyScanned=unestablished; findings=unestablished. No clean scan is invented. The product clone has full history for the fleet's eventual scan. No main equality or landing receipt is claimed.

Exact-SHA CI result: Verify 43154671717, event push, completed success, head 8810246317c7f72e7f6415ddb88d1f7aa996de08. The final REST observation is VERIFY-STATUS-3.json. The workflow is green normally; no generated-view exception, rerun or repair is used. The initial main observation at 31813dc294a6bbc7c0fe23b398e454b4a0f15b1b had green Verify 43150201084 and Run site 43150201142; the product is rebased onto newer main dd8f2de57d7ef33ef010dacfc42155253635b5fd and does not claim candidate main equality or Run site.

Local runtime transport observation: ONCALL_RUNTIME_PART=machines timeout 1200 node tests/runtime.mjs at the exact candidate exited 1 after its new alert proof passed, while the existing Scribe optional-revision flow was running. The terminal error was TypeError: fetch failed, caused by SocketError: other side closed in Miniflare's synchronous D1 proxy bridge (worker eval line 32). No application AssertionError was emitted. Cgroup oom and oom_kill counters were both zero; all owned processes exited. Exact-SHA push Verify is green and the earlier full agent flow passed. No source or assertion was changed for this observation. One fresh-runtime repeat of the exact command is recorded separately; there is no CI rerun or product repair.

Fresh-repeat result: the unchanged exact candidate completed the normal runtime machines entry successfully, exit 0, from 2026-11-12T04:46:27Z through 05:00:38Z. It passed the prior Scribe phase, Communications cases, native specialist flow and sponsor erasure, and printed Runtime machines completed. This establishes the first local socket failure as transient; the original failed log and both actual receipts are retained. There was no test change, product repair, CI rerun or additional product commit. All selected local checks now pass, and exact-SHA Verify is green.

Final candidate disposition: selected alert row complete; whole SURFACE-001 remains MISSING. Counts remain 25 DONE, 42 PARTIAL, 34 MISSING. Publication scan and guarded landing remain with the fleet. No blocker remains for the selected row. Product custody is verified in CUSTODY.json; this report is returned only through the separate evidence ref.
