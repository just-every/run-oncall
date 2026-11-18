# Oncall PagerDuty import same-SHA handoff

Task sd-oncall-import-pagerduty-1-fix-1-c1 carries the existing PagerDuty import fix to the handoff branch in just-every/run-oncall. The leased commit is 99d5821836301d0cf2c7788625f92df2c335427d.

## Plan and results

1. Confirm the original remote ref and require the c1 ref to be absent or already at the leased commit. The original ref was at the requested commit and the c1 ref was absent.
2. Inspect the complete candidate commit range against origin/main for author, committer and trailers. The initial depth-1 blobless clone was deepened to find the merge base and inspect all four candidates. No reachable shallow boundary fell outside main. All four candidates use the fleet author and committer identity and have no trailers.
3. Create the c1 branch through the fleet push guard and verify the advertised remote ref. The ordinary push created the branch at 03:35:55 UTC on 18 November 2026. Source and destination have identical commits and trees. This handoff made no product commit or file edit, opened no PR and performed no provider, deploy, release, pin or tag operation.
4. Discover Verify by the complete commit SHA and watch the new c1 run using GitHub REST. The original Verify, run 44206885711, completed successfully on attempt 2 after the prior round's cancellation. The c1 branch push started Verify run 44231548546 on the same commit.
5. Publish the report and actual ref, contract and CI receipts to the c1 evidence ref. Remove the disposable product clone after confirming the evidence publication.

## Contract

Contract counts before and after the handoff are 26 done, 41 partial and 34 missing out of 101. The merge-base contract has the same counts. OC-021 and OC-022 remain done. OC-038, OC-040 and OC-042 remain partial. The following are the existing claims from the original round.

CLAIM OC-021 DONE points=1 tests=tests/import-door.mjs#documented PagerDuty account; tests/activation.mjs#OC-021/022 saved-response journeys; tests/product-browser-journey.mjs#documentedPagerDutyReview
CLAIM OC-022 DONE points=1 tests=tests/import-door.mjs#documented PagerDuty account; tests/activation.mjs#OC-022 unfinished checkpoint and native-edit undo conflicts
CLAIM OC-038 PARTIAL points=none tests=tests/import-door.mjs#documented PagerDuty account
CLAIM OC-040 PARTIAL points=none tests=tests/import-door.mjs#documented PagerDuty erasure
CLAIM OC-042 PARTIAL points=none tests=tests/import-door.mjs#documented PagerDuty account credential refusal
EVIDENCE repo=just-every/run-oncall ref=refs/heads/evidence/sd-oncall-import-pagerduty-1-fix-1 head=cbcddbe5439e3d11c3f27889f8332d5e555622a1

## Verify result

Both exact-SHA Verify runs completed successfully. The c1 run was confirmed at 03:41:23 UTC on 18 November 2026. The original run, 44206885711, succeeded on attempt 2. The c1 run, 44231548546, succeeded on attempt 1. This handoff did not dispatch or rerun Verify. No local product test run was needed for this ref-only handoff.

- Original Verify, attempt 2. https://github.com/just-every/run-oncall/actions/runs/44206885711
- Handoff Verify, attempt 1. https://github.com/just-every/run-oncall/actions/runs/44231548546

The handoff has no product blockers.
