# sd-oncall-c-f241 — OC-052 continuation

Product repository: just-every/run-oncall. Branch: cloud/sd-oncall-c-f241.
Candidate: 9fef00d11e650030f7d9698326261562b4d24085.
Predecessor: 68ac127faf5d7c29d73a4a7dcde95022bd8bc93f.
Starting main: dd8f2de57d7ef33ef010dacfc42155253635b5fd.
Merged main: 69f6d7b3ac67b97241e9167472b212da976a242c.

The unfinished predecessor was replayed onto current main. All newer tests,
the explicit root build observation from OC-018 and the restored owner chooser
browser assertions were preserved. Only the source lock conflicted during most
replay steps; it was regenerated each time. One transfer conflict combined
main's owner-selection browser journey with the predecessor's exact held native
records comparison. Published saves were merged forward, never rebased.

The restore policy updates only staging tables before Base's atomic publication:
local agent Pause is set; the admission lease is cleared; pending and executing
approvals become expired with a version advance. Signed policy, local policy,
saved proposals, attribution, audit, calls, reviews and events remain history.
Both approval proposals are opened through real held-policy MCP calls. The second is then placed at the persisted executing boundary with fixture SQL before export; no live dispatch is claimed. A fresh local credential does not resume the agent door. Only the person door
can resume it; expiry survives resume. No Base refresh, migration, workflow,
homepage or new public execution door was introduced.

CONTRACT.md and all 101 judgment rows are unchanged. Its stale OC-052 Evidence
and Gap cells are reserved for the lander, despite the older instruction to
rewrite them in this round. No generated view was committed. Current counts:
25 DONE, 42 PARTIAL, 34 MISSING. A successful OC-052 promotion would make these
26 DONE, 41 PARTIAL, 34 MISSING; this report does not perform that promotion.

## Frozen acceptance and inherited-duty rubric

| Row | Requirement or observation | Public proof  Recorded result |
| --- | --- | ---  --- |
| A1 | Acceptance 1: protected populated HTTP and CLI export, complete durable categories, inactive receiving state, explicit local reauthorization and no replay | tests/transfer.mjs managed installation transfer; tests/checkpoint-cli.mjs checkpointRoundTrip; tests/activation.mjs checkpoint and paging archive journey  PASS: push Verify 43157854267, success on the candidate |
| A2 | Acceptance 2: malformed, over-limit, erased or unknown records and storage or concurrent failures preserve prior state | tests/transfer.mjs invalid archive and erasure fence legs; tests/checkpoint-cli.mjs checkpointCli; tests/activation.mjs checkpoint refusal, injected storage failure and two-writer restore  PASS: push Verify 43157854267, success on the candidate |
| A3 | Acceptance 3: denied AI, native incident lifecycle, literal input and absent public embed or arbitrary upload | tests/runtime.mjs automationJourney, PROBE OC-052 denied-AI, public-embed, arbitrary-upload; tests/product-browser-journey.mjs keyboardCoordination  PASS: push Verify 43157854267, success on the candidate |
| D1 | BASE-DATA-001 replacement: credentials and sessions remain installation-local while durable history travels | tests/transfer.mjs archive secret exclusion, empty credentials on import and explicit owner mapping  PASS: push Verify 43157854267, success on the candidate |
| D2 | Paused receiving agent state and terminal pending or in-flight approvals | tests/transfer.mjs transferDoor.prepareAgents, captureAgents and assertAgentsInactive through real MCP and managed rer export and import  PASS: push Verify 43157854267, success on the candidate |
| D3 | Agent audit, calls, reviews and events remain exactly retained history | tests/transfer.mjs complete populated table comparison immediately after receiving; retained rows compared by durable identity after receiving activity  PASS: push Verify 43157854267, success on the candidate |
| D4 | Native and paging records remain unchanged by refused old approvals and replay; zero network attempts | tests/transfer.mjs assertAgentsInactive, emitted Worker outbound edge  PASS: push Verify 43157854267, success on the candidate |
| D5 | No old actor or session is silently revived; explicit owner resume and local provisioning | tests/transfer.mjs managed owner mapping, expired source session, fresh client rotation, agents_paused, anonymous resume 401, owner resume read and old approval 409  PASS: push Verify 43157854267, success on the candidate |
| D6 | BASE-INPUT-002: runbook URLs and hostile notes stay literal and export verbatim | tests/product-browser-journey.mjs keyboardCoordination, existing 1440 assertions and 390 capture  PASS: push Verify 43157854267, success on the candidate |
| D7 | BASE-INPUT-003: bounded structured imports remain available; arbitrary attachments create no custody | tests/runtime.mjs automationJourney multipart refusals and complete non-audit table comparison; existing protected import journeys  PASS: push Verify 43157854267, success on the candidate |
| D8 | BASE-PUBLIC-002: incident pages and undeclared embeds disclose no private incident | tests/runtime.mjs automationJourney anonymous and foreign-origin GET, owner embed 404  PASS: push Verify 43157854267, success on the candidate |
| D9 | BASE-DATA-005: native coordination completes without AI | tests/runtime.mjs automationJourney resolved lifecycle, human note attribution and zero outbound attempts  PASS: push Verify 43157854267, success on the candidate |
| D10 | Door rule D-2: current durable categories travel inactive without execution credentials or replay; future categories retain their owning duties | CONTRACT.md OC-052 cites the Base duties and Rules D-2 explicitly; tests/transfer.mjs and checkpointRoundTrip compare the populated supported archive  PASS: push Verify 43157854267, success on the candidate |

## Scope and boundaries

No ct ruling or new policy default is needed: paused receiving custody is an
explicit existing OC-052 requirement. Unbuilt agent archive tools under
SURFACE-004, BASE-AGENT-011 feeder holds and the Base replay seam are unchanged.
Optional AI execution and agent egress authority remain held under their owning
clauses. Unbuilt responder destinations, verification history, live delivery,
escalation, calls, investigation, remediation, native mobile, independent standby
and publication retain their owning D-2 duties. Paging remains OFF.
Synthetic retained history grants no dispatch, delivery, readiness or publication
authority. No real provider or device acceptance is claimed.

## Validation results

The final typecheck and first-party check passed. Generator write and check
passed with zero generated changes. Source lock was regenerated last and its
check passed.

The complete initial transfer passed. On the final SHA, the transfer journey
passed again in 834.0 seconds inside the required local rer verify. That command
also passed production hydration checks (4 pages, 23 loads) and 8230 of 8230 agent
conformance points, ending with verify: complete (exit 0).

Exact-SHA push Verify 43157854267 completed SUCCESS:
https://github.com/just-every/run-oncall/actions/runs/43157854267
It loads the transfer, runtime, intake, changes and browser proof on
9fef00d11e650030f7d9698326261562b4d24085. No result from another SHA is used for
the DONE claim. Once full CI passed, only the scheduler for additional local
lanes was stopped; the already-running local rer verify completed normally.
Untouched lanes are supported by the successful full CI, not claimed as repeated
local runs.

The CI browser artifact download returned HTTP 403 Forbidden:
gh run download 43157854267 --repo just-every/run-oncall --name oncall-browser-evidence-browser --dir /tmp/f241-ci-browser.
The rejected host was productionresultssa1.blob.core.windows.net. No signed
query, credential or response token is retained, and no blocked blob retry was
made. The existing keyboardCoordination journey also PASSED locally on the candidate, asserted at 1440 and captured at 1440 and 390. Its exact exported runbook and note, zero hostile elements, zero script execution and zero outbound requests are recorded in browser/literal-input-receipt.json. Both captures were visually inspected; source HTML is rendered as text.

The separate report ref carries reports only and does not signal product
acceptance or landing.

## Plan and lane updates

The full execution plan is PLAN.md. Only the plan's OC-052 continuation row is
advanced; no other clause or campaign was started, and no lane file was read or
written. The independent lander still owns exact-SHA publication scanning,
integration, generated judgments, main equality and Run site.

## DONE riders and pre-ready checks

| Rider | Result and exact-candidate proof |
| --- | --- |
| 1 | Journeys reach all three acceptance outcomes. PASS: exact-SHA push Verify 43157854267 is completed success. Acceptance 1 also passed in the local rer verify; acceptance 2 is loaded in the changes shard and acceptance 3 in the intake and browser shards. |
| 2 | Populated source records and real MCP proposals precede restore. Source declaration succeeds; restored paused calls and expired approvals refuse, while complete native and paging snapshots remain unchanged. tests/transfer.mjs:58, :87, :94 and :681. |
| 3 | Push Verify 43157854267 targets the exact candidate. Its transfer, intake, changes and browser shards load the cited journeys; PASS: completed success on the candidate SHA, event push. No conclusion is inferred from another SHA. |
| 4 | Final lane receipts bind each local verification to 9fef00d11e650030f7d9698326261562b4d24085. Preliminary transfer proof is labeled preliminary and not substituted for final proof. |
| 5 | INSPECTED: OC-052:604 cites BASE-DATA-001, BASE-INPUT-002, BASE-INPUT-003, BASE-PUBLIC-002 and BASE-DATA-005, and names Rules D-2. Its requirement explicitly names inactive receiving authority. |
| 6 | Generator write and check pass. Contract judgments, generated views and counts remain main's; the lander updates OC-052's stale evidence and gap from the final claim. This is the brief's explicit one-writer rule. |
| 7 | INSPECTED: no acceptance point, clause text, ID or coverage map changed. No ruling or rewrite is needed. |
| 8 | Real native person sessions protect receiving authority. Anonymous resume returns 401; fresh credential provisioning still yields agents_paused; saved approval attempts return 409 approval_expired before and after owner resume. Old MCP retries make no native or paging mutation. tests/transfer.mjs:94–130. |
| 9 | Boundary preserved: native network-edge proof only, no new provider, legal, delivery, real-phone, standby or device acceptance. Optional AI and agent egress holds remain under their owning clauses. |
| 10 | INSPECTED: paused receiving custody already appears in the existing OC-052 requirement. No new policy default was adopted or counted. |
| 11 | PENDING GUARDED LANDING: main equality, full-history publication scan with zero findings and candidate-main Run site are fleet gates. This cloud has pushed only the named branch. No landing or scan completion is claimed. |

The round changes no UI source. Main's restored-owner 1440 and 390 browser
assertions remain intact; the existing literal-input journey records its
desktop assertions and phone capture on the candidate. No existing assertion
was removed, narrowed or moved behind a width or branch condition. The native
snapshot comparison was expanded for the additional agent fixture's held
deadlines and outbox work.

The restore, erasure and retry paths retain current authority: erased subjects
stay erased through later-journal refusal, source sessions and credentials do
not travel, and old agent approvals cannot regain execution on owner resume.
No migration was added or edited. No Base pin or derived Base source was updated.

Publication scan result: commit=9fef00d11e650030f7d9698326261562b4d24085,
complete=false, historyScanned=not established in cloud, findings=not established
in cloud. The cloud route assigns that scan to the guarded lander; these fields
are not a zero-finding receipt.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check, generated views restored from origin/main exit=0; ledger=none exit=0.

PROBE OC-052 1: real held-policy MCP proposals, managed rer export and import, fresh local credential and owner resume -> source active, receiving agents_paused, pending and executing approvals expired, retained agent history exact, old approvals and replay refused, native and paging records unchanged, outbound requests=0.

PROBE OC-052 2: public HTTP checkpoint and CLI restore of malformed, over-limit, erased and unknown records, injected storage failure and concurrent restores -> explicit refusals or one complete winning restore; prior records and authority preserved. Loaded and passed by the changes and transfer shards of exact-SHA Verify 43157854267.

PROBE OC-052 3: emitted Worker native incident coordination under denied network edge, anonymous and foreign-origin embed reads and multipart submission -> resolved human-attributed lifecycle, no incident disclosure, owner embed and attachment doors absent, non-audit tables unchanged and outbound requests=0. Literal keyboard runbook and note remain authored text and export verbatim. Loaded and passed by the intake and browser shards of exact-SHA Verify 43157854267.

CLAIM OC-052 DONE points=1,2,3 tests=tests/transfer.mjs#managed installation transfer; tests/checkpoint-cli.mjs#checkpointRoundTrip; tests/checkpoint-cli.mjs#checkpointCli; tests/activation.mjs#checkpoint consistency; tests/runtime.mjs#automationJourney; tests/product-browser-journey.mjs#keyboardCoordination

Local literal-input capture: existing keyboardCoordination at assertion width
1440, capture widths 1440 and 390, exit 0. Complete real native keyboard
declaration, runbook, note, archive, acknowledgment and independent-session
409 assertions passed. This is a one-off invocation of the existing journey,
not a new permanent test registration.

Riders 1–10 are satisfied by the recorded public journeys, exact-SHA success or
the explicit inspected or lander-owned mechanical rows above. Rider 11 remains
the guarded lander's receipt, not a cloud product blocker. No product blocker
remains. The source counts and judgment cells stay unchanged pending that gate.

Terminal ref readback confirms cloud/sd-oncall-c-f241 at 9fef00d11e650030f7d9698326261562b4d24085. Main advanced after the candidate push to 985c3205031072eb37af857eafc69b44090c938f; no published history was rebased and the guarded lander owns integration of that drift. No PR was needed: push Verify is the repository branch entry point.
