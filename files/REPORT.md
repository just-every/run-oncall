# sd-oncall-c-f226 — OC-052

Repository: just-every/run-oncall. Product branch: cloud/sd-oncall-c-f226.

Candidate `68ac127faf5d7c29d73a4a7dcde95022bd8bc93f` is pushed on `cloud/sd-oncall-c-f226`. The complete local rer verify, separate managed transfer, typecheck, first-party check, contract generator and source-lock checks pass. Exact-SHA push Verify 43124777228 is green. OC-052 is claimed DONE for acceptance points 1, 2 and 3, subject to guarded landing. Product Status counts remain 23 DONE, 44 PARTIAL and 34 MISSING; the accepted claim would make 24 DONE, 43 PARTIAL and 34 MISSING. No PR was created.

## Plan and scope

The complete plan is in PLAN.md. The remaining native OC-052 observation is portable agent custody. The implementation pauses the receiving agent door, removes its admission lease and expires pending and executing approvals inside staged validation before atomic publication. It preserves policy records and populated audit, call, review and event history. The managed transfer journey creates real MCP held approvals before export, imports into an empty installation, maps the new owner explicitly and checks person-only resume, unusable old approvals, unchanged native and paging state and zero outbound requests at an emitted Worker network edge. The agent and data guides describe this receiving state.

The OC-018 explicit build journey is already on main and is preserved. All Status, Evidence and Gap cells remain main's judgments. No generated contract view is committed. No new test registration, removed assertion, migration, Base update, provider operation or screen change is introduced. Future unshipped categories retain D-2 duties under their owning clauses. Paging remains OFF.

## Acceptance and inherited duties

| ID | Acceptance sentence or inherited duty | Maintained proof and execution |
| --- | --- | --- |
| A1 | Protected HTTP and CLI populated export, durable category comparison, inactive restore to a fresh authorized installation, local secret provisioning and no replay | tests/transfer.mjs — managed installation transfer, checkpointRoundTrip and agent restore; tests/activation.mjs — populated paired recovery and pagingHistory; tests/checkpoint-cli.mjs — checkpointCli  tests/transfer.mjs:62–128 and :436–653; tests/activation.mjs:993–1012 and :1091–1166; tests/checkpoint-cli.mjs:120–215. Push event Verify 43124777228, completed success on this exact SHA. |
| A2 | Malformed, over-limit, erased and unknown input, storage and concurrent restore faults preserve prior state | tests/activation.mjs — paired checkpoint refusal and rollback; tests/checkpoint-cli.mjs — checkpointCli and checkpointErasureCli; tests/transfer.mjs — malformed CLI import, invalid product records and later erasure journal  tests/activation.mjs:1097–1118 and :1207–1210; tests/checkpoint-cli.mjs:120–254; tests/transfer.mjs:569–595 and :679–706. Push event Verify 43124777228, completed success on this exact SHA. |
| A3 | Optional AI access denied while native coordination works; literal structured input; no undeclared public embed or arbitrary upload | tests/runtime.mjs — automationJourney, PROBE OC-052 denied-AI, public-embed and arbitrary-upload; tests/product-browser-journey.mjs — keyboardCoordination, literal runbook and note with exact archive readback  tests/runtime.mjs:1536–1582; tests/product-browser-journey.mjs:1206–1280. Push event Verify 43124777228, completed success on this exact SHA. |
| D2 | Current durable categories remain inactive history, with no transferred execution authority or replay | managed installation transfer compares populated records, excludes credentials and private agent receipts, pauses timers and agent work, holds publication and integration definitions; unbuilt categories remain their owning clauses' obligations  tests/transfer.mjs:87–128 and :604–653; scripts/installer/archive-policy.mjs:20–30. Push event Verify 43124777228, completed success on this exact SHA. |
| BASE-DATA-001 | Explicit exclusions replace credential portability | CONTRACT.md OC-052 names exclusions; managed CLI archive checks secret absence and inactive definitions; agent history is retained without leases or usable approvals  tests/transfer.mjs:562–570 and :604–653; tests/activation.mjs:1092–1094. Push event Verify 43124777228, completed success on this exact SHA. |
| BASE-INPUT-002 | Literal text without arbitrary supplied HTML | keyboardCoordination asserts literal URL and note, absent hostile DOM and script effects, zero hostile fetch and verbatim exported text  tests/product-browser-journey.mjs:1261–1279. Push event Verify 43124777228, completed success on this exact SHA. |
| BASE-INPUT-003 | Bounded structured JSON, no arbitrary attachment custody | automationJourney sends multipart uploads to undeclared doors and compares every non-audit durable table; activation and checkpoint journeys refuse malformed and oversized structured archives  tests/runtime.mjs:1568–1582; tests/activation.mjs:1097–1112. Push event Verify 43124777228, completed success on this exact SHA. |
| BASE-PUBLIC-002 | No public incident embed | automationJourney attempts anonymous incident and foreign-origin embed reads and owner embed reads; private text remains absent and owner embeds are 404  tests/runtime.mjs:1554–1567. Push event Verify 43124777228, completed success on this exact SHA. |
| BASE-DATA-005 | Native coordination has no AI dependency | automationJourney resolves a real native incident while the outbound edge refuses every external request and records zero attempts  tests/runtime.mjs:1536–1553. Push event Verify 43124777228, completed success on this exact SHA. |

## DONE riders and pre-ready review

All passing execution below is on `68ac127faf5d7c29d73a4a7dcde95022bd8bc93f`. Push Verify 43124777228 completed successfully and loaded the runtime, intake, browser, transfer and changes shards. VERIFY-RECEIPT.json records the complete local rer verify exit 0; TRANSFER-RECEIPT.json records the separate managed transfer exit 0.

| Rider | Result | Proof |
| --- | --- | --- |
| 1 | PASS | A1–A3 above: managed installation transfer in tests/transfer.mjs; paired checkpoint and pagingHistory in tests/activation.mjs; automationJourney in tests/runtime.mjs; keyboardCoordination in tests/product-browser-journey.mjs. Exact-SHA push Verify 43124777228 success. |
| 2 | PASS | Real nonempty agent audit, call, review and event records; one real MCP pending approval and another real approval marked executing as an interrupted-state fixture. Supported owner resume and receipt read succeed; unsafe old approvals, replay and anonymous resume refuse with native and paging state unchanged. tests/transfer.mjs:62, :87, :92, :128. |
| 3 | PASS | CI-JOBS.json records successful runtime, intake, browser, transfer and changes jobs in push Verify 43124777228. The local full Verify also ran every maintained lane. |
| 4 | PASS | Both command receipts and the CI result name this exact 40-character SHA. SOURCE-PROVENANCE.json hashes all five changed files; no code changed after verification. |
| 5 | INSPECTED PASS | CONTRACT.md:604 explicitly cites all five Base duties and names D-2; its requirement names paused agent actions and no replay. No inheritance wording was added or removed. |
| 6 | PASS mechanical; lander metadata pending | Generator write and check exit 0, generated views restored whole from main, source lock fresh. Contract judgments and all 101 Status rows remain untouched; the lander owns the stale Gap, Evidence and eventual count update. |
| 7 | INSPECTED PASS | No acceptance, coverage map or clause ID changes; no dropped Status rows. Contract diff is zero bytes. |
| 8 | PASS | Fresh owner mapping and local credential provisioning do not resume agents. Anonymous resume is 401, valid owner resume enables the receipt read, and both restored approvals remain expired and return 409 approval_expired. tests/transfer.mjs:92. Runtime revocation and erasure journeys also pass. |
| 9 | INSPECTED PASS | No provider or legal proof claimed. Paging remains OFF; optional AI, external execution, standby, phone and unbuilt category duties remain with their owning clauses. |
| 10 | INSPECTED PASS | No new policy default: paused receiving state and no replay are already required by OC-052; the brief explicitly permits expired approval outcomes. |
| 11 | PENDING GUARDED LANDING | This branch is pushed and exact-SHA Verify is green. Main equality, complete full-history publication scan with zero findings, status promotion, generated views and candidate Run site remain the Mac lander's gates. |

Pre-ready checks: (1) each named outcome has the public-door journey in A1–A3 and green exact-SHA Verify; (2) no existing assertion was removed, narrowed, skipped or hidden behind a viewport condition, and there are no new test registrations; (3) revoked credentials, erasure fences and capture replay refuse without resurrecting records, including the expired restored approvals; (4) no app screen or control changed, and existing literal-input proof is captured at 1440 and 390; (5) source lock is current, added email-shaped strings are zero, and publication scanning and main Run site are explicitly delegated rather than claimed.

## Provenance and counts

Starting main: 2743e71f76044322080b1b136b9dce82c4793915. Its push Verify 43115851492 and Run site 43115851706 completed successfully. Product Status counts start at 23 DONE, 44 PARTIAL and 34 MISSING, 101 total. This branch leaves those counts unchanged. An accepted OC-052 DONE claim would make 24 DONE, 43 PARTIAL and 34 MISSING when the lander applies it.

Publication scan: NOT RUN in cloud; complete full-history scan and zero findings remain required at the Mac lander. Main equality and candidate Run site: not claimed. PR: none required; push Verify accepts this named cloud branch.

The final SHA, actual commands and exits, CI run and job IDs, source hashes and delegated gate states are recorded in RECEIPT.json. Logs explicitly selected into the evidence packet are actual process output. PLAN.md and this report are fleet evidence, never product changes.

## Local development iterations

The first transfer attempt stopped before agent proof because a relative settings-file path made the emitted Worker answer health with 503. An isolated reproduction produced 503 with the relative path and 200 with the absolute path; runtime-probe.log records it. The helper now passes the absolute path.

The next attempt reached actual MCP preparation, then refused the managed dev owner's cookie at the production Worker with 401 Sign in required. This is the expected production dev-credential fence. The journey now provisions a native workspace password through the signed-in owner's protected password door and signs in through the real native login door before switching to the emitted Worker. Restored passwords remain excluded and are provisioned again only after explicit owner mapping. No authentication rule was bypassed or weakened.

Source inspection also found that staged copies intentionally lack live-table primary-key constraints. The agent-state custody reset uses an UPDATE on retained state, consistent with the other staged hold transformations, rather than an upsert requiring those live constraints.

The next populated import reached the full native comparison. The new recovered agent target had also created pending native deadline and response outbox records; restore correctly held those records. The journey now explicitly compares their held state, incremented outbox revision, exact original history, cleared lease and appended restore reason, with the appended time bounded by the actual import. It continues to compare every original native field. No native assertion was deleted or narrowed.

The history snapshot is taken after all source-side fixtures, immediately before export. Full audit and event sequence is retained; calls are compared in durable composite-key order and reviews by ID, since physical SQLite row order is not an archive guarantee. The receiving comparison then passed those records, raw paused state, expired approvals, anonymous resume refusal and owner resume. A final test projection error (the shared read tool wraps its payload under `data`) was corrected without changing any product behavior.

The existing Business inactive-import assertion remains in its managed development-owner context before the new native-password assertions begin. This preserves that original authority check and keeps the emitted production Worker bound to its genuine native owner session.

## Recorded probes and handoff

PROBE OC-052 1: protected checkpoint HTTP, rer export and rer import, real held MCP approvals and fresh owner provisioning -> complete retained history, local agent Pause, expired old approvals, person-only resume, no native or paging replay, zero outbound requests.
PROBE OC-052 2: malformed and invalid product archives, unknown and oversized checkpoint data, current and older erasure journals, injected storage and concurrent restore faults -> explicit refusal with prior records retained.
PROBE OC-052 3: emitted Worker with denied outbound access, anonymous and foreign-origin embed reads, multipart attachment submissions and keyboard literal input -> resolved native incident, no private embed disclosure, no attachment custody, no hostile HTML, script or fetch, and verbatim export.
MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0.

Publication scan receipt: commit=68ac127faf5d7c29d73a4a7dcde95022bd8bc93f; complete=false; historyScanned=false; findings=not run. The cloud exemption applies only to branch custody; the Mac lander still requires the complete scan and zero findings. Current main is 25b173adff3e5a2e7bedd97e02428eebee9418f4; equality with the candidate is false. Candidate Run site remains pending main. Initial main's Verify 43115851492 and Run site 43115851706 were successful.

Plan row: OC-052 native work complete, claim PARTIAL to DONE after gate acceptance. No campaign plan file or other clause judgment changed. All stated account, provider, standby, optional execution and Base replay holds remain unchanged. No real blocker remains for this candidate.

CLAIM OC-052 DONE points=1,2,3 tests=tests/transfer.mjs#managed installation transfer; tests/activation.mjs#paired checkpoint refusal and restore; tests/checkpoint-cli.mjs#checkpointCli; tests/runtime.mjs#automationJourney; tests/product-browser-journey.mjs#keyboardCoordination
