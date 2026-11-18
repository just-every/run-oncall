# Oncall assignee-clear resource readback

Codex, 18 November 2026. Fleet round sd-oncall-c-f279.

## Scope and plan

The replan-79 row advances the assignee-clear case of BASE-AGENT-003 acceptance 4. It starts from the existing acknowledged incident with a populated Lead, a separate active assignee, and assigned Scribe and Communications roles. The existing runtime and browser journeys issue the standard-only incident update with change=reassign and member=null. They follow the link from the first successful response as the writer under each company policy, compare the whole incident with the write and the sponsor's protected native state, and compare durable state before and after the read. The browser opens the returned incident and records its saved assignee, roles and timeline at 1440 and 390 pixels. This round adds no test registrations.

## Product custody

- Declared repository `just-every/run-oncall`, branch `cloud/sd-oncall-c-f279`.
- First save `ce7bcb3a263b17d4e2400649b8dd5f904fede8ea` used skip CI.
- Candidate `ae8aaa0285d20d0abc75b9db90d3e74f27e7ffa8`. Latest integrated main `93b25a01d22f5b16bf679c6f4008f0e444980196`.
- On the starting main, Verify run 44283231598 and Run site run 44283231793 both completed successfully at `93b25a01d22f5b16bf679c6f4008f0e444980196`.
- Candidate push Verify 44289287171 was completed with conclusion failure. The stale generated ACCEPTANCE.md check and its dependent summary were the only failures. The build and all eight shards passed. The cloud handoff rule accepts that view result for READY.
- The candidate is branch-only. The guarded lander owns the full-history publication scan, exact main equality and main Run site receipt. Cloud publication scan status is unestablished.

Main advanced after the candidate push to `6ef9bc1294fc981c71e990df9bf12104337c81b3`. It includes the landed f276 readback at `9b45b5855714925909e811aeba2709792642061a`. A read-only merge preview found conflicts in the adjacent observations in `CONTRACT.md` and in `sources.lock.json`. The browser changes merge without a content conflict. The published candidate remains the exact head that ran Verify.

## Observations

The runtime uses `tests/runtime.mjs` with the agents part. `tests/oncall-agent-flow.mjs:1041–1043` invokes the existing role and assignee journeys. `tests/oncall-agent-role-clear-replay.mjs:27–43` sets the case up through native HTTP. Lines 67–104 compare the saved write to the incident revision, untouched roles, attributed reassign entry, native record and original write review. Lines 143–204 reuse the first response after the existing replay, stale revision and nondisclosure observations.

`tests/oncall-agent-assignee-clear-replay.mjs:7–48` follows that response's actual resource URI with `completeResource` from `tests/agent-door-runtime.mjs:119–139`. The authorized entire JSON incident matches the write and the protected GET `/api/state`: explicit null Assignee, one new incident revision, preserved Lead, Scribe and Communications, and one agent-and-sponsor-attributed reassignment. The snapshot at `tests/agent-door-runtime.mjs:13–24` compares native records and revisions, the state-changing audit and the original saved call outcome. The test also compares protected paging state and the Worker outbound ledger. Both reads left those unchanged and made zero outbound requests.

| Policy | Read decision | Original write custody |
| --- | --- | --- |
| Autonomous | The direct standard read returned the full incident for the same admitted agent without a review. | The original terminal call and outcome were identical across the read. |
| Held | The standard read returned the full incident and opened its own review for its own decision. The current policy permits this read with review. | The original open write review, call and outcome were identical across the read. |

Both reads completed under the configured direct and review dispositions. The existing resource helper supplies the saved approval revision and summary hash when a policy requires approval.

`tests/agent-door-browser.mjs:381–444` follows the returned incident, checks effective Unassigned, the selected Unassigned option, Lead, Scribe and Communications and the attributed native timeline at the ordinary signed-in incident door. Browser receipts and both policies' timeline and People and priority screenshots are included. Existing browser keyboard focus checks cover the Close dialog tooltip. The browser journey checks the page and its UI controls for state changes. An initial execution exposed an overly broad empty-ledger assertion because an earlier browser fixture exercises a synthetic provider. The corrected assertion compares the complete outbound ledger across the read, preserving that earlier entry and proving zero new requests. The standalone runtime fixture also starts with an empty ledger.

The native mutation and URI are defined at `src/agent-door/coordination-tools.ts:140–147`. The authorized resource projection is in `src/agent-door/resources.ts:154–157`. The wire emits the successful response's resource link at `src/modules/agent-door/wire.ts:39–43`.

## Acceptance coverage and judgment

| Point | Evidence or held scope |
| --- | --- |
| 1 | Existing scoped discovery at `tests/oncall-agent-flow.mjs:627`. Complete target-surface discovery still needs coverage. |
| 2 | Existing admin and viewer native parity in `tests/oncall-agent-resource-parity.mjs`. Private team and scoped ownership authority remain held under OC-023, including the members and public teams viewer mismatch. Complete lease-free native outbox and independent erasure GET projections remain held. |
| 3 | Existing absent-incident and scoped refusals, including `tests/oncall-agent-flow.mjs:883`. Complete missing and scoped-out equivalence remains held. |
| 4 | The assignee-clear readback passed in both policies through the emitted MCP and protected native HTTP doors. Other write links remain outside this round. |
| 5 | Grant byte-budget refusal and the absence of partial bytes depend on unfinished copied Base code. |
| 6 | Existing marker assertions at `tests/oncall-agent-resource-parity.mjs:105` and `tests/oncall-agent-resource-parity.mjs:237`. Complete untrusted-marker coverage remains held. |

The replan-79 row records point 4's assignee-clear case as proven. BASE-AGENT-003 remains MISSING in the product Status table. Before and after counts are 26 DONE, 41 PARTIAL and 34 MISSING across 101 clauses. The claim is PARTIAL for the proven slice. The Status, Gap and Evidence cells remain the lander's judgment. The observation is in the clause body, leaving its acceptance text intact.

## DONE riders

| Rider | Result for this candidate |
| --- | --- |
| 1 | Pass for the selected point 4 case. Other clause outcomes remain open as listed above. |
| 2 | Pass for the selected case. The ordinary populated incident exercised explicit null with a real Lead and distinct assignee. The existing shared fixture still checks missing and scoped-out write refusals without a native effect. |
| 3 | Verify 44289287171 ran the required shards on the exact candidate. The agents job 134751184244 and hosted browser job 134751184355 passed. The generated-view check is the sole root failure. |
| 4 | The receipt binds the locally executed browser and runtime assertions to the candidate's unchanged test bytes. The clause observation and regenerated lock were the only later edits. |
| 5 | Inspected. SURFACE-001 cites BASE-AGENT-003 in `CONTRACT.md:1279`. The receiving clause and its duties stay in scope with their existing ownership. |
| 6 | Local contract generation and its check passed. Main's two generated views are retained in the product commit for lander regeneration. Existing judgment provenance and Gap stay in custody. |
| 7 | Pass by source comparison. The six acceptance sentences and Status table are identical to the integrated base. |
| 8 | Pass for the selected read boundary. The agent's admitted authority and separate review are asserted, original custody is compared and the existing refusal paths still run. Full role parity stays open under point 2. |
| 9 | Existing provider and legal boundaries stay held. The network-edge ledger was empty and paging stayed off. |
| 10 | Existing autonomous and held decisions were exercised. The round makes no new authority, consent, spending or custody policy decision. |
| 11 | Guarded landing, exact main equality, a complete publication scan and candidate Run site remain with the lander. |

## Shared predecessor checks

- f229 note, f253 assignee clear replay, refusal and retention, f266 mitigation and f269 reassignment to a distinct responder were checked against integrated main. The existing runtime and browser journeys retain their assertions. The candidate adds no change to those other link scopes.
- f271 Scribe-clear and f276 P2 completion link proofs were checked as independent predecessor refs. Both exact predecessor heads were separate from integrated main at the candidate push.
- Held scope also includes BASE-AGENT-010 f228, BASE-AGENT-013 conformance and stranger-agent completion, SURFACE-003 attribution, BASE-AGENT-006 and BASE-AGENT-008, human follow-up and approval replay, SURFACE-004 ambiguity and the Base seam, and OC-037, OC-044 and OC-054 ownership. OC-045, OC-046, OC-048 and OC-049 retain ct's agent and AI egress authority hold. Paging remains OFF. Provider authorization, A2P, timers, delivery, independent standby, devices, real phones and cutover remain held.

## Handoff checks

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

- Existing proof ran through the emitted Worker with native D1 and headless Chromium. The original role-clear matrix and unrelated completed calls remained in the test. No existing assertion was deleted, narrowed, or moved behind a width condition.
- Local Worker build, touched agent runtime and browser coverage, typecheck, first-party check, contract generation and source lock results are in the selected receipt.
- The product branch contains the existing journey changes, the clause observation and the source lock. Evidence belongs to the separate evidence ref.

CLAIM BASE-AGENT-003 PARTIAL points=4 tests=tests/oncall-agent-assignee-clear-replay.mjs#focusedAssigneeClearReplay; tests/agent-door-browser.mjs#Assignee clear browser

GAP BASE-AGENT-003: Other write links, complete discovery and missing or scoped-out equivalence, two-role authority and native parity, grant byte budgets and complete untrusted-text coverage remain held.
