# Oncall BASE-AGENT-012 acceptance 4

Prepared by Run Edit Run fleet on 2026-11-18 UTC.

- Repository: `just-every/run-oncall`
- Product branch: `cloud/sd-oncall-c-f273-lin-1`
- Candidate: `19d32524cc798ad2506d46315851420d1cb7765c`
- Main base: `731bacf72abc4538e728628d85bf9d844d3b4da0`
- Confirmed feeder head: `b068148c87bcfdc84150ea3e73578a355176ebdc`

## Plan

1. Confirm the feeder head and both source commits, 9f27ae7f and fe45c0e1. Apply their leased test changes to current main in one ordinary commit so the first product push is also the final candidate push.
2. Keep main's existing replay, lost-response and aged evidence retention coverage. Exercise the optional and required revision inputs under autonomous and held policy. Use the signed-in sponsor and review pages for the two held corrections.
3. Generate and check the contract views, restore main's generated views and regenerate the source lock last. Check the exact candidate with first-party validation, build, typecheck, focused MCP, the full agent flow, and the browser journey. Capture the pending approval, executed approval and saved review for each held correction at 1440 and 390 pixels.
4. Fetch main again immediately before pushing. Confirm linear ancestry, the leased diff, fleet identity and trailer hygiene for all candidate commits. Push only the named product branch and check Verify on its full SHA. Publish the report and local and CI receipts through the separate evidence ref.

## Replay and counts

The original linear candidate passed all local checks. Main advanced before publication to the missed-acknowledgment change. The candidate rebased cleanly and the two leased tests were byte-for-byte equal across the rebase. The source lock was regenerated and checked again on the replay.

The source lock and shared browser journey overlapped main. The replay retained the newer aged evidence retention browser assertions, including the executed approval readback, and extended the shared approval request check to compare the URL and exact saved revision and summary hash. The original autonomous and held replay cases remain covered. The leased test changes use the existing runtime and browser entries, so those two registrations remain two. The focused P2 execution matrix grows from two to six cases, with four stale-revision refusal/correction cases added. Verify keeps eight push shards.

The feeder's observational paragraph in CONTRACT.md was outside the explicit file lease. This candidate changes two test files and the regenerated source lock. The contract views regenerate from main's contract with zero changes. No clause status was edited. BASE-AGENT-012 remains missing in the published contract table. The builder claim is partial for acceptance 4. Overall counts before and after are 26 done, 41 partial and 34 missing (101 clauses). Agent-surface counts before and after are 1 done, 6 partial and 10 missing (17 clauses).

## Acceptance scope

A stale optional expected revision with a valid required revision, or a stale required revision with the optional revision absent, returns revision_conflict with the authorized parent incident revision in MCP metadata and text. The checks compare native records and revisions, timelines, state-changing audit, stored calls/outcomes, approvals, reviews and paging before and after the refusal. A fresh corrected call completes one P2 action with agent attribution. The held sponsor submits one approval for the exact saved revision and summary. The signed-in review shows the retained completed action and its evidence link, and the fixture records zero outbound evidence requests.

CLAIM BASE-AGENT-012 PARTIAL points=4 tests=tests/oncall-agent-action-evidence-replay.mjs#actionEvidenceReplay; tests/agent-door-browser.mjs#held P2 revision corrections

GAP BASE-AGENT-012: Other acceptance 4 diagnostics and the remaining coverage in acceptances 1, 2, 3, and 5 stay open.

## Exact-candidate local results

All eight recorded checks passed on the pushed SHA. The focused test and the agent runtime each recorded the four stale-revision cases. The complete browser journey passed and captured all three screens for each held correction at 1440 and 390 pixels. The twelve captures reported no horizontal overflow, serious or critical accessibility findings, or undersized controls. The contract-view and source-lock generators and their checks passed. The pre-push history inspection found one candidate commit with fleet author and committer and no trailers. The added lines passed the local credential-pattern review. The full publication scan is a fleet landing gate.

The product branch was pushed once from the latest fetched main. Git readback confirmed its exact SHA. The branch has no PR as of the post-push GitHub query.

## GitHub Verify

Verify run 44270445506 completed successfully on the exact pushed SHA. Final observation at 2026-11-18T09:10:47Z. [GitHub Actions](https://github.com/just-every/run-oncall/actions/runs/44270445506)
