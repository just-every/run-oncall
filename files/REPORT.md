# Oncall mitigation audit parity

Run Edit Run fleet, 19 November 2026.

## Selected work

The replan-84 BASE-AGENT-002 row selects the permanent audit event for evidence-free acknowledged-to-mitigating. The plan was to trace the signed-in command and MCP call, align their audit kind at the native call site, retain the existing replay and refusal coverage, and compare equivalent seeded incidents through the emitted Worker and the signed-in browser. The final changes stay within that transition and its evidence. The remaining BASE-AGENT-002 work stays held.

The audit selection applies to the evidence-free acknowledged-to-mitigating input of the existing incident update tool. The MCP name, tool event, result, resource link, classification, actor, sponsor and native authorization remain as shipped. The existing OC-053 override in src/agent-door/native.ts still selects automation.incidents for the REST operation. Existing audit history remains immutable. The intentional permanent kind assertion originally at line 79 of tests/oncall-agent-transition-replay.mjs now expects command.transition. The emitted tool event assertion still expects incidents.update. The effect, refused foreign and stale requests, lost responses and idempotent retry assertions remain active.

## Claim scope

| Acceptance | Coverage in this round |
| --- | --- |
| 1 | Held. Complete Core job mapping and the harness and real CLI refusal on a coverage gap remain outside the selected proof. |
| 2 | Held. Complete result-schema validation remains outside the selected proof. |
| 3 | Held. Complete annotation judgment remains outside the selected proof. |
| 4 | Held. The existing replay refusal assertions exercise this tool, while stable-error parity across doors remains outside the selected proof. |
| 5 | Scoped to the evidence-free mitigation transition under autonomous and held policy. Existing declaration evidence and the separate acknowledgment effort retain their scope. Other UI and tool jobs, including held standard notes and retry, remain held. |
| 6 | Held. Embedded-agent registry and audit parity remains outside the selected proof. |

The plan row for BASE-AGENT-002 may record the selected mitigation observation. The f184 note hold, f281 declaration evidence and f290 acknowledgment scope remain separate. The active BASE-AGENT-003 resource-link and BASE-AGENT-012 replay and revision tracks keep their existing custody. OC-023 team privacy, BASE-AGENT-005, BASE-AGENT-006 and BASE-AGENT-008 holds, erasure and approval replay, the SURFACE-004 Base seam, and OC-045, OC-046, OC-048 and OC-049 egress authority remain in their owning rounds. Paging stays OFF. Authorization, A2P, timers, delivery, standby, devices and real-phone cutover remain held.

## Results

The product candidate is 8470abfd4f365e0ad584dae3016758b2852d2a7f on cloud/sd-oncall-c-f299. The branch push succeeded and GitHub advertised that exact head. The BASE-AGENT-002 Status row remains MISSING. Counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING across 101 clauses. The only contract edit records the observed mitigation behavior in the clause body.

The initial save was 261c1d68e46780d222cce5aff5d712b116c2dfe4. Main moved from 50a05ac92632c5eba8f30cc0b9405fcab4df685b to 49dc3d821091644713c8d1e418f04135f84ac3f9 while the local checks ran. The fast-forward landing of that predecessor carried f290's acknowledgment and f289's declaration resource readback. The merge save f2c37ad2ffee14a0db9b1fc8309916182f64fa44 preserved both audit variants, the landed acknowledgment fixture and the declaration readback assertions. The predecessor's Verify runs 44543427790 and 44548697738 and Run site run 44548697830 completed successfully. The initial main also had successful Verify 44542108898 and Run site 44542108915. f294's follow-up readback and f296's resolution conflict proof were checked for shared files and retain their separate scope.

The emitted Worker ran against the merged code with Node 22.20.0. Both complete local journeys passed. The first browser attempt exposed a heading locator ambiguity because the two fixtures also appeared in the sidebar. The locator now targets the incident detail region. The merged browser run passed the corrected checks, preserved the existing declaration and acknowledgment journeys, and completed its trailing resource parity checks.

PROBE BASE-AGENT-002 5 autonomous: signed-in Mark mitigating and one MCP update using the same summary on equivalent incidents in one granted service → matching mitigating state, unchanged roles, equivalent lifecycle timeline, one incident and workspace revision advance, one permanent command.transition per door, distinct attribution, zero reviews, unchanged paging and zero outbound requests.

PROBE BASE-AGENT-002 5 held: the same human action and one MCP update under held policy → the same native result with one open review for the tool call, unchanged paging and zero outbound requests.

PROBE BASE-AGENT-002 5 retry and refusal: tests/oncall-agent-transition-replay.mjs through tests/runtime.mjs → a lost response and exact retry recover the original outcome. Changed summary and stale revision are refused. Scoped-out and missing records give identical refusals without disclosing revisions. The original audit effect, emitted MCP event, revision and review custody survive in both policy modes.

The eight browser screenshots show the four saved case records at 1440 and 390 pixels. The desktop test asserted the lifecycle, visible roles, timeline summary and separate attribution. All eight recorded measurements showed viewport fit, zero serious or critical accessibility findings and zero undersized controls. The full browser journey exercised the existing Incident actions focus tooltip. The product change is confined to server audit selection.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

The first-party check and typecheck passed. Restoring ACCEPTANCE.md and docs/CLAIMS.md from main leaves ACCEPTANCE.md intentionally older than the new clause paragraph. The committed source lock then passed at the exact candidate, and the Status section and generated views matched their main blobs. Added text had no email-shaped values or bare repository-like tokens. The author and committer checks covered all three candidate commits, including the merge, with no trailers.

## Riders

| Row | Result and evidence |
| --- | --- |
| 1 | Scoped pass. The actual browser action and one MCP call per company policy exercised point 5's selected lifecycle variant. The other acceptance outcomes remain held. tests/agent-door-browser.mjs:152 and tests/oncall-agent-fixtures.mjs:797. |
| 2 | Pass for the selected case. Each distinct incident was populated and observed in protected HTTP and durable D1, including the exact revision, four coordination roles and one accepted permanent audit row. tests/oncall-agent-fixtures.mjs:797 and tests/oncall-agent-transition-replay.mjs:73. |
| 3 | See the exact-SHA Verify entry below. The maintained Verify plan includes the agents runtime and agent browser journeys. |
| 4 | Pass. Both touched journeys were rerun after the f290 merge and the tested source and test blob IDs match the pushed commit. The receipt lists the blob IDs. |
| 5 | No newly delegated duty. The observation belongs to the existing BASE-AGENT-002 acceptance 5. CONTRACT.md:1028. |
| 6 | The generated contract check passed after regeneration. The Status, Gap and Evidence cells and the Judged from line come from main. The guarded lander owns refreshed views and any whole-clause judgment. |
| 7 | Pass by inspection. The sole added contract paragraph records observations. Existing acceptance wording and citations carry forward. CONTRACT.md:1028. |
| 8 | Pass for the scoped effect and existing denials. The actor and sponsor fields were read back. Foreign and missing targets and stale revisions were refused without native changes. The OC-053 override and shared replay and erasure fixtures retain their coverage. tests/oncall-agent-transition-replay.mjs:8 and src/agent-door/native.ts:98. |
| 9 | The packet records zero attempted outbound requests and unchanged paging custody, with live provider and device gates held. tests/agent-door-browser.mjs:152. |
| 10 | No new policy choice. Both existing company policies and their distinct review behavior are exercised. tests/oncall-agent-fixtures.mjs:828. |
| 11 | Pending guarded landing, full-history publication scan and Run site for the candidate. Main equality is reported below. |

CLAIM BASE-AGENT-002 PARTIAL points=5 tests=tests/agent-door-browser.mjs#mitigationParity; tests/oncall-agent-fixtures.mjs#mitigationParity; tests/oncall-agent-transition-replay.mjs#transitionReplay

GAP BASE-AGENT-002: Point 5 covers evidence-free mitigation in this round. Other job parity, held note review and retry, and acceptances 1–4 and 6 remain held.

## Candidate CI and custody

Exact-SHA push Verify 44553218914 completed on 8470abfd4f365e0ad584dae3016758b2852d2a7f. Build, all eight shards and the full push proof passed. The agents shard was 135663787268 and the hosted shard, which runs the agent browser journey, was 135663787381. Full push proof was 135670832351.

The workflow conclusion was failure. The archived output for contract-docs job 135662456459 identifies only the expected stale ACCEPTANCE.md view, with zero contract prose errors and warnings. The downstream final verification job 135670904188 failed its contract-docs dependency check. The cloud handoff accepts this generated-view exception. [Verify 44553218914](https://github.com/just-every/run-oncall/actions/runs/44553218914)

At candidate push, main was 49dc3d821091644713c8d1e418f04135f84ac3f9. After the candidate was pushed, f296 reached main at a84709b61fcbfbba9743ac55e5779d6e9186887a with its separate resolution replay proof. Main does not equal the product head. The guarded lander owns integration with the newer main, regenerated views, exact-head verification for landing, the full-history publication scan, and subsequent Run site. The candidate's publication scan has no cloud receipt. The report and screenshots are attached to the exact branch commit through the separate evidence ref.
