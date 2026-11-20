# Oncall append-only test merges

Builder report for sd-oncall-union-merge-3. Product head `e13220ee432bc9ac531627b20a92790a0024433f` was
advertised on `cloud/sd-oncall-union-merge-3` at 2026-11-20T05:47:45Z.

## Replay

1. Fetched main and both historical branches. Inspected the original
   `c31772574d3946b8737b89608614849202123cc5` and clean replay
   `407a14046e0d793e174c7df84985510f176e0330`. Confirmed that fresh main
   `33cafdc7750103f51ac4173c7b52c8dbcf1efbe0` includes the Activation split
   `8b30370587527f91331d9fc84deb82688dbfa67a`.
2. Carried the five path-specific union rules with their original comments and
   the unchanged clean replay test. Its scratch identity uses a reserved
   example domain assembled at runtime. Registered the test once in the
   Changes lane, which runs without Chromium, and added the corresponding
   reviewed-reader entry. Activation stays in its own shard. The plan adds
   one command, from 21 to 22 registrations, with nine
   push shards before and after.
3. Ran the test through its Verify plan command. The scratch repository merges
   and rebases the two independent additions, keeps each assertion block exactly
   once, and passes the Node parser. A temporary copy with all union rules
   removed fails on the content conflict. See the local receipt for the output.
4. Confirmed the push plan, generated contract views and exact-head build and
   typecheck. Regenerated and checked the pinned source lock last. Its changed
   entries correspond to the four leased input paths.
5. Fetched main again and rebased before the guarded push. The resulting
   candidate has one linear commit and no merge commits. The added-line
   address scan produced no rows and the commit-message scan counted zero at
   signs. The fleet identity is both author and committer, with no trailers.
   The Mac lander runs the full Base publication scan.

No contract clause claimed; this is merge configuration for test files.

| Contract status | Before | After |
| --- | ---: | ---: |
| Done | 26 | 26 |
| Partial | 41 | 41 |
| Missing | 34 | 34 |
| Total | 101 | 101 |

## Exact-SHA Verify

Verify run 44683394137 completed successfully on the advertised candidate.
Observed 2026-11-20T06:03:03Z after 4 REST observations.

[GitHub Actions run](https://github.com/just-every/run-oncall/actions/runs/44683394137)

Prepared by Codex for sd, 2026-11-20T06:03:21Z.
