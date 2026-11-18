# Oncall P2 evidence-completion revision diagnostics

Run sd-oncall-c-f273-lin-2 for just-every/run-oncall. Written by Run Edit Run fleet on 2026-11-18.

| Provenance | Value |
| --- | --- |
| Original feeder head | b068148c87bcfdc84150ea3e73578a355176ebdc |
| Single linear source commit | 19d32524cc798ad2506d46315851420d1cb7765c |
| Fresh main and candidate parent | 6ef9bc1294fc981c71e990df9bf12104337c81b3 |
| Product branch | cloud/sd-oncall-c-f273-lin-2 |
| Exact product head | d043b91abfe1b99baf3bad37a178811e91dfe71e |
| Product ref confirmed on origin | 2026-11-18T11:35:53Z |

## Plan

1. Confirm the original feeder and first linear replay heads and replay the one linear commit onto fresh Oncall main.
2. Resolve the overlap using main's browser and Worker assertions, then add the P2 stale-revision checks beside them. Regenerate the source lock after restoring the generated contract views to main.
3. Build and prove the candidate locally. Run the focused Worker replay, the existing agent-flow invocation and the signed-in browser journey. Assert at 1440 pixels and capture the relevant approval and review screens at 1440 and 390.
4. Refresh main immediately before the guarded product push. Require a single linear candidate and review all candidate commit identities and trailers. Use the exact advertised candidate SHA for Verify and attach the report and receipts through the evidence ref.

## What the replay proves

- The emitted Worker's MCP door returns the incident's current revision in both the error metadata and text when the optional expected revision is stale, and when the required revision is stale with the optional field omitted. Both errors withhold private results and approval or review handles. The fixtures distinguish the incident revision from the workspace revision.
- Under autonomous and held company policies, stale calls preserve native records, revisions, timeline, retained calls and outcomes, approvals, reviews and paging. The attempt adds an attributed refusal to the agent audit, with permitted bookkeeping and zero outbound requests.
- A fresh call corrected from the returned revision completes exactly one P2 evidence-policy follow-up. Its original owner, due date, escalation contact, policy and companion follow-up are retained. The completion records the agent's submission and acceptance, and the held path uses one sponsor approval with the saved revision and summary hash.
- The signed-in browser opens the pending and executed approvals and the protected review for both held corrections. The review shows the completed P2 follow-up and its evidence link. The test asserts the approval request, saved material and page behavior at desktop width and captures the screens at 1440 and 390 pixels. The browser makes zero requests to the evidence URL.

## Integration decisions

Main's original evidence completion, changed-argument conflict, exact replay and linked incident read assertions were retained. The original held write and linked read still require separate recorded approvals. The two revision variants run beside the original journey, with their own correction evidence. The shared agent-flow invokes the same focused journey and kept main's source verbatim.

The contract generator ran before the source lock was regenerated. Main's contract and generated views are byte-for-byte identical on the candidate. The full-history publication scan runs at fleet landing.

The initial ad hoc focused launcher stalled before fixture setup because its module-mode flag was inherited by Miniflare's worker. The successful retry used CommonJS dynamic import and the checkout's Node pin, with the standard runtime and browser scripts following it.

## Verification

The build, typecheck, first-party profile, contract generator check, source lock check, focused replay, full agent-flow entry point and browser script passed locally on the product head. The local receipt records their outcomes and the probe output. The browser packet includes both held corrections, with a pending approval, an executed approval and the saved review captured at each width.

The final fetch and rebase found main already current. The candidate has one ordinary commit and zero merges. The guarded push succeeded on its first attempt and the remote advertised the exact tested SHA.

## Counts and clause disposition

| Count | Main | Candidate |
| --- | --- | --- |
| Full contract, done / partial / missing | 26 / 41 / 34 | 26 / 41 / 34 |
| Core, done / partial / missing | 25 / 35 / 24 | 25 / 35 / 24 |
| Agent surface, done / partial / missing | 1 / 6 / 10 | 1 / 6 / 10 |
| Registered Verify push commands | 21 | 21 |
| BASE-AGENT-012 source judgment | Missing | Missing |

The partial claim concerns acceptance 4 for P2 evidence completion. It adds four HTTP scenarios and two held browser scenarios to the existing journeys. Contract status edits are owned by the lander.

CLAIM BASE-AGENT-012 PARTIAL points=4 tests=tests/oncall-agent-action-evidence-replay.mjs#actionEvidenceReplay; tests/agent-door-browser.mjs#held P2 revision corrections

GAP BASE-AGENT-012: Other acceptance 4 diagnostics and the remaining coverage in acceptances 1, 2, 3, and 5 stay open.

## Exact-SHA GitHub Verify

Verify completed with failure on the advertised product SHA. Plan, contract-docs, build and seven of the eight shards succeeded. The agents shard and the hosted shard that includes the changed agent browser journey both passed. The core product browser shard failed at Run this shard, and the required aggregate Verify job failed at Require the selected coverage and its proof. [Verify run 44296143431](https://github.com/just-every/run-oncall/actions/runs/44296143431)

The core browser shard runs tests/product-browser.mjs with ONCALL_PRODUCT_PART=core. That test and its product code are outside the replay lease. The failed shard leaves the exact-SHA landing prerequisite open.

The archived core browser log identifies coveredSwap at tests/stranger-trip-steps.mjs:34:9. Its swap sheet assertion expected text matching /cover/i. The sheet showed “You have no eligible upcoming shift in these two weeks.” The failure receipt records the log command and the implicated test path.
