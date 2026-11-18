# Oncall acceptance 4 — stale native incident resolution

Run Edit Run fleet, 18 November 2026. Campaign row `sd-oncall-replan-80`, task `sd-oncall-c-f286`. The launch base was `443c3613cefdf7359fac0ca728da428cf9e280a0`. The candidate includes main’s release metadata update at `518317b385c4535599bfc670dd676da46069b451`; the tested source and regression test carried forward byte-for-byte. Candidate and workflow provenance are recorded in CHECKS.md.

## Plan and implementation

1. Use the existing protected incident resolver to check the submitted native revision during fresh MCP preparation. Scope is checked before any revision is disclosed. An authorized stale native revision returns the actual incident revision even if the optional expected revision was omitted.
2. Keep the execution-time fence for a revision that changes after preparation. Preserve Base's terminal replay path and the existing tests for policy, drift, authority and replay.
3. Extend the emitted runtime journey with a recovered incident advanced by a signed-in note, and run the autonomous and held cases with the existing resolution fixture. Exercise foreign and absent targets through the same service-scoped client. Read back the corrected resolution, audit, approval, replay and paging state.
4. Reuse the existing signed-in resolution browser leg at 1440 and 390. Regenerate and check the contract views and source lock, publish the product branch, then attach this report and its receipts to the separately published evidence ref.

## Contract and evidence

Counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING, totaling 101. BASE-AGENT-012 remains MISSING. Its five acceptance points are listed below in their contract order. The claim records progress on the selected diagnostic within point 4.

| Point | Evidence and remaining coverage |
| --- | --- |
| 1. Same key and arguments, one effect and equal results | The new case retrieves a completed resolution with the same arguments and a new RPC ID. Prior scoped replay tests remain. Complete mutating-tool coverage and the full 24-hour retention bar remain open. |
| 2. Dropped stream, same key, new RPC ID recovers the first result | Existing launched scopes in the runtime journey remain. Other dropped-stream permutations remain outside this round. |
| 3. Changed arguments under the same key produce a conflict and zero effects | Existing launched scopes in the runtime journey remain. The full changed-argument matrix remains outside this round. |
| 4. Stale revision names the current revision | `tests/oncall-agent-flow.mjs`, `staleResolutionRevision`, via `tests/runtime.mjs`. The result reports the authorized native incident revision in metadata and text. Stale, missing and foreign calls preserve durable application and paging effects and create no call outcome, approval or review. A corrected call with a new key records one resolution and one state-changing native audit. Held mode requires a separate signed-in decision with the saved revision and hash. Exact retrieval returns that result without another effect. The signed-in decision also refuses drift after preparation. An identical retry reads that retained refusal and appends only a linked replay-attempt audit. Other native and optional diagnostics remain outside this round. |
| 5. Foreign-person token sees no job handle | Foreign-person handle refusal and Tasks-independent status remain outside this round. |

The case exercises authorized correction and unauthorized non-disclosure together. The browser assertions run at 1440 with proof at 1440 and 390. The product change is in the MCP preparation path. The existing browser and runtime assertions remain in place, including execution-time drift and earlier replay and erasure paths. Neither the acceptance text nor its inherited duties changed. No new policy default was adopted.

Preserve the f232, f274 and f278 scopes. Copied Base, erasure and approval replay, SURFACE-004's ambiguous Base seam, BASE-AGENT-006 and BASE-AGENT-008 holds, human follow-up acceptance, OC-037, OC-044 and OC-054 ownership, and team authority remain outside this round. OC-045, OC-046, OC-048 and OC-049 still need ct's agent and AI egress authority. Paging remains OFF. Authorization and A2P, timers, actual delivery, independent standby, devices, real-phone and cutover proof, and the release prerequisites remain held.

The DONE riders are not met for the full clause. Rows 1, 2, 8 and 9 have bounded native proof as above. Rows 5 and 7 retain the existing clause and inheritance. Row 6 has a passing generated-document check and the existing status, gap and provenance. Row 10 required no new ruling or default. See CHECKS.md for the exact candidate proof and CI under rows 3 and 4. The guarded lander owns row 11, including the complete publication scan and any new main Run site receipt.

CLAIM BASE-AGENT-012 PARTIAL points=4 tests=tests/oncall-agent-flow.mjs#staleResolutionRevision

GAP BASE-AGENT-012: Other native and optional revision diagnostics, full mutating-tool and 24-hour retention proof, remaining dropped-stream and changed-argument combinations, foreign-person job-handle denial, and Tasks-independent status remain unproved.
