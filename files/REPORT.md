# Oncall same-SHA handoff

Repository `just-every/run-oncall`  
Task `sd-oncall-c-f273-lin-2-c1`  
Product branch `cloud/sd-oncall-c-f273-lin-2-c1`  
Product HEAD `d043b91abfe1b99baf3bad37a178811e91dfe71e`

## Plan and execution

1. Verify the original `cloud/sd-oncall-c-f273-lin-2` remote ref against the leased SHA, then confirm that the destination ref is absent or matches it.
2. Inspect the full candidate range against `origin/main` for identity and trailers. Publish the destination through the fleet guard, then read back both refs.
3. Observe exact-SHA Verify on the original branch and any run started by the handoff push. Keep the product checkout clean and publish this report and the CI receipt on the evidence ref.

Both remote product refs advertise the leased SHA. The fleet guard created the destination ref on its first attempt. At publication, main was `6ef9bc1294fc981c71e990df9bf12104337c81b3`, the candidate's sole parent. The range contained one commit by the fleet identity, with zero trailers. The handoff required zero new product commits, zero product file edits, and zero PR operations.

## Checks and scope

- `git diff --check origin/main..HEAD` and `node --check` on both changed test files passed.
- `node src/base/contract-docs.mjs check` passed with 0 prose errors and 0 warnings.
- The original candidate changes two existing test files and `sources.lock.json`. The handoff uses the candidate's exact-SHA Verify for build and shard results. Both Verify runs completed successfully on the leased SHA. The original run was already green on attempt 2 when discovered at 13:10:01 UTC. Its first attempt had failed at the coveredSwap assertion in tests/stranger-trip-steps.mjs:34, as recorded in the brief. The handoff run was queued at discovery and green at the 13:15:03 UTC poll. No dispatch or rerun was needed in this handoff. [Original Verify 44296143431](https://github.com/just-every/run-oncall/actions/runs/44296143431) · [Handoff Verify 44310882732](https://github.com/just-every/run-oncall/actions/runs/44310882732)
- The committed counts are 26 done, 41 partial, 34 missing, 101 total before and after. `CONTRACT.md` records BASE-AGENT-012 as missing on both main and the candidate. The signed partial claim below is for lane review.
- The candidate covers four stale-revision cases for `oncall.actions.submit`: stale optional and required revisions under autonomous and held policies. The tests assert the authorized incident's exact current revision in text and metadata, unchanged native effect and approval state after refusal, and one attributed P2 completion after correction. The held cases exercise the named sponsor approval and saved review in the browser at 1440 and 390. The tests also assert zero outbound requests.

CLAIM BASE-AGENT-012 PARTIAL points=4 tests=tests/oncall-agent-action-evidence-replay.mjs#actionEvidenceReplay; tests/agent-door-browser.mjs#held P2 revision corrections

GAP BASE-AGENT-012: Other acceptance 4 diagnostics and the remaining coverage in acceptances 1, 2, 3, and 5 stay open.
