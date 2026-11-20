# sd-oncall-c-f320 · Oncall schedule creation replay

Codex · 20 November 2026

## Scope and plan

This round selected the schedule creation slice of BASE-AGENT-012 acceptance 1 and its minimum retention period for one granted public-service rota per company policy. Reuse the existing create arguments, real Worker and D1 fixture, and controlled-clock policy renewal pattern. Complete a creation under each policy. For the held policy, submit the signed-in sponsor's exact pending approval revision and summary digest once. Retry with the original arguments and key at both boundaries after renewing equivalent signed policy and minting a fresh token with the same person, agent, client, consent and scopes. Compare response and native custody, then read the rota through its protected product page.

The native implementation satisfied the selected behavior. The candidate extends the existing agent runtime and browser journeys. The contract clause remains MISSING. Counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING across 101 clauses.

## Observations

- Autonomous and held initial calls each saved one revision-1 rota and one attributed native creation audit commit. That commit advanced the workspace and paging-store revisions once. The rota's recorded notices named the expected recipients and retained paging off and no sender. The held path had zero native effects while pending and one executed sponsor approval with the same completed result as the original call.
- At T+24h and T+24h+1s the MCP response returned the exact stored structured outcome and textual payload. The held response returned the original approval receipt. New JSON-RPC IDs and token IDs were checked. Baselines were taken after each renewal. The original terminal call and expiry, schedule, notices, approvals, reviews and paging records stayed stable. Each retry added one linked replay audit and one matching relay record. Native audit additions were limited to persistence bookkeeping with unchanged native revisions. The outbound request ledger was empty.
- The protected rota page displayed the saved schedule and its primary and backup coverage in both modes. The desktop readback asserts the roster and paging state. The 390px capture shows the same route and loaded coverage. Both widths fit, with zero serious or critical axe findings and zero undersized controls in the existing browser capture checks. The browser made zero requests to another origin. The packet contains four captures of existing UI on synthetic records.

PROBE BASE-AGENT-012 1: MCP oncall.schedules.create with the original schedule, key and fresh same-authority token in each policy at T+24h and T+24h+1s → exact original result, original held receipt, one native creation, only linked retry bookkeeping and zero outbound requests.

## Coverage and riders

| Rider | Result |
| --- | --- |
| 1 | The selected acceptance 1 slice was exercised through tests/oncall-agent-schedule-replay.mjs at lines 262–487, invoked by tests/oncall-agent-flow.mjs through the agents shard. Acceptance 1's other tool variants and the round's held acceptances remain open. |
| 2 | Populated runtime and browser journeys exercised autonomous execution, an effect-free pending held call, exact sponsor completion, and zero additional native effects from four aged retries. |
| 3 | The existing agents and core browser Verify shards invoke the runtime and browser test entry points respectively. See the exact-head Verify receipt. |
| 4 | The full agent runtime and browser journeys were run on the candidate. The packet's captures come from that browser run. |
| 5 | The retention obligation is in BASE-AGENT-012's own requirement. The round adds no new inherited duty. |
| 6 | Contract generator write and check passed. The lander retains judgment custody and the status and count rows stay as on main. |
| 7 | Acceptance text and generated view bytes match main. Existing assertions still run. |
| 8 | The held call remained effect-free until the active sponsor submitted its exact approval. Aged replay used renewed authority and returned only the authorized terminal result. Other authority and erasure matrices remain held. |
| 9 | The fixture recorded notices without a sender and made zero outbound requests. All live-provider, paging and release boundaries remain held. |
| 10 | The fixture exercised the existing signed company policies. No policy default was needed. |
| 11 | Full-history publication scan, guarded landing and Run site remain with the fleet lander. |

## Shared-file predecessors and retained scope

Main at the final fetch contains the f274 rebased stale-override diagnostics and f278 rebased optional-revision rota readback. Their existing assertions remain. The f316 aged resolution branch was first advertised separately and subsequently landed on main before the repaired candidate. Main's resolution changed-summary assertions remain intact. A read-only three-way rehearsal of the shared runtime file used its union merge behavior, parsed successfully and retained both f316 resolution calls, the existing action submission call and the new schedule creation call. The plan update is the BASE-AGENT-012 row from replan 90, with the schedule-creation slice recorded here.

GAP BASE-AGENT-012: Acceptance 1's other tools and variants, the remaining dropped-stream, changed-argument and revision matrices in acceptances 2–4, and acceptance 5 foreign-person job handles and Tasks-independent long work remain held.

Erasure and approval POST replay, BASE-AGENT-006 and BASE-AGENT-008, SURFACE-004's ambiguous hold and Base seam, human follow-up acceptance, broader attribution, OC-023, OC-037, OC-044 and OC-054 remain held. Model, investigation, ownership, remediation, recurrence and executor flows and OC-045, OC-046, OC-048 and OC-049 authority remain held. Copied Base, the paging OFF boundary, provider authorization and A2P, timers, delivery, standby, device, real-phone and cutover proof, queue gates and release gates remain held.

## Mechanical checks and custody

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none

The candidate diff consists of the existing runtime and browser journey changes and the regenerated source lock. Product branch pushes were guarded, with both commits checked for author, committer and trailers. The push-triggered Verify workflow provides the branch entry point. Evidence is published on its dedicated ref.

Product branch cloud/sd-oncall-c-f320 advertises f1990cc0bac8219c01998614609cd5275f3c1dde. Save 3a7cc619ca22f5d9f26efb647a899c6c3fcb2db6. Main at the final fetch was 406ab473a22034b09d09a5c9e70595e78064c834.

Exact-head Verify run 44762915901 on push was completed with conclusion success. https://github.com/just-every/run-oncall/actions/runs/44762915901

The prior push Verify 44752763658 was cancelled. Hosted job 136346587769 stopped after 15m22s. The coverage guard job 136355148138 received a cancelled shard result and exited 1. Replaying the archived guard step with the same inputs exited 1. The local hosted command run at the 900-second budget exited 124. The same hosted command on main exited 124 at the same limit. The new rota proof now runs in the existing core product browser shard. Main’s f316 resolution tests were merged and their invocations retained.

The first full local browser and runtime calls hit the initial ten-minute limits after the selected proofs completed. The exact-commit reruns used twenty-minute limits. The runtime exited 0, the browser exited 0 and the build exited 0.

VERIFY_REPRODUCED {"head":"75915723547e9117fed96e3abe2cea081bed7648","job":136355148138,"command":"bash -x /tmp/f320-verify-guard-step.sh","test":"Require the selected coverage and its proof","exit":1,"failure":"test \"$SHARDS\" = success received cancelled"}

Full local outcomes and the per-width screenshot hashes are in verification.json.

CLAIM BASE-AGENT-012 PARTIAL points=1 tests=tests/oncall-agent-schedule-replay.mjs#agedScheduleCreateRetention
