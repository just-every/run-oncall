# Oncall append-only merge replay

Builder: Codex, 19 November 2026 UTC

- Repository: just-every/run-oncall
- Product branch: cloud/sd-oncall-union-merge-2
- Product HEAD: 407a14046e0d793e174c7df84985510f176e0330
- Main at final fetch: e4123dded5d6a9f058880669ca10213bcfbe2646
- Replay source: c31772574d3946b8737b89608614849202123cc5
- Published: 2026-11-19T23:04:26Z, first guarded push attempt
- Landing path: exact-SHA branch Verify, then the fleet's publication scan and landing. No PR was opened.

## Plan and results

1. Read the prior single commit and build a new linear candidate from fetched main. The separate Changes shard split was available at 03c3b2a27c311b525a4202451c4b873f4b5d7e2e and was absent from main at the final fetch. The rebase was already up to date.
2. Replay the five original path rules and comments in .gitattributes. Register the test once in the Changes lane and once in the verification plan's reviewed reader list. Preserve the existing shard layout and journeys. The sole behavior-neutral adjustment to the replay is a synthetic identity for commits inside the regression's temporary Git repository. Its address is formed from separate parts under the reserved example.test domain.
3. Run the registered command and verify that the scratch Git merge and rebase retain both independently appended assertion blocks exactly once, avoid conflict markers and leave JavaScript that parses. Remove the five rules in a scratch copy and confirm that the test fails with a content conflict at the fixture path. The candidate script also passes node --check.
4. Verify the push matrix and workflow policy, run typecheck and the documented build preparation in order, then regenerate and check the pinned edition source lock. The contract generator reported current views. The working tree stays clean. The local preparation built the staged source before the final lock and commit. The focused regression was rerun against the exact published HEAD.
5. Re-fetch main, rebase the unpublished commit, audit the single candidate's full identity, trailers and address patterns, and push the product branch once. Wait for the Verify push run whose SHA equals the published product HEAD, then publish this packet separately.

## Counts and scope

| Measure | Before | After |
| --- | ---: | ---: |
| Verification plan registrations | 21 | 22 |
| Push shards | 8 | 8 |
| Union-merge test paths | 0 | 5 |
| Done clauses | 26 | 26 |
| Partial clauses | 41 | 41 |
| Missing clauses | 34 | 34 |
| Total clauses | 101 | 101 |

No contract clause claimed; this is merge configuration for test files.

The five changed files are .gitattributes, tests/append-only-merge.mjs, scripts/verify-shards.json, scripts/verify-oncall-plan.mjs and sources.lock.json. The candidate has one commit and zero merge commits. Both author and committer were the configured fleet identity. There are no trailers.

## Local checks and address audit

Frozen dependency install, rer dependency setup and noninteractive local setup completed. The cloud shim initially selected the system versions and the first frozen install rejected the incompatible pnpm. The install and all passing checks used Node 22.20.0 and pnpm 10.12.4 selected explicitly from the installed toolchain.

The touched regression, plan, workflow policy, contract generation check, typecheck, first-party check, production build and edition-authoring lock check passed. The exact-SHA regression completed in 0.206 seconds. The negative-control output and command receipts are in local-checks.txt.

The requested added-line address extraction printed no rows. The requested commit-message at-sign count printed 0. The Mac lander owns the complete publication scan.

## Exact-SHA Verify

Verify run 44634418757 completed successfully for the exact published SHA. The terminal GitHub status was completed and conclusion was success. Attempt 1. Checked at 2026-11-19T23:24:35Z using 5 GitHub calls. https://github.com/just-every/run-oncall/actions/runs/44634418757
