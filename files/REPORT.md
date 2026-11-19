# Oncall Verify shard split handoff

The destination branch cloud/sd-oncall-ci-changes-split-c2 was published at 03c3b2a27c311b525a4202451c4b873f4b5d7e2e, the SHA already advertised on cloud/sd-oncall-ci-changes-split-1. Its parent and the observed main tip were both 071c74a352196f6778eb3b2942c351b4cf1e0ace. The destination was absent before publication. The product checkout remained clean. This handoff created zero product commits and zero PRs.

## Plan executed

1. Compare the leased source and main refs with the candidate. Audit every candidate commit reachable outside main.
2. Validate the workflow and shard plan on the leased SHA. Compare the command multiset with its parent.
3. Publish the destination ref with the guarded Git push. Read back source, destination, and main.
4. Read the source and destination Verify results for the exact product SHA via GitHub Actions REST.
5. Return this packet on the dedicated evidence ref.

## Shard plan

Push shards went from 8 to 9. Nightly shards remained at zero. The 21 explicit test commands and their per-command environment overrides were identical. The separate hosted verification command was retained.

| Push shard | Lanes |
| --- | --- |
| runtime | runtime, member-browser |
| intake | intake |
| agents | agents |
| browser | browser |
| hosted | hosted, browser-settings, agent-browser |
| transfer | transfer |
| changes | changes, imports |
| activation | activation |
| triage | triage |

Local checks

- Workflow permissions check passed
- Shard matrix validation passed
- Plan check passed with full coverage, push tier, and all nine shards
- Contract documents current with zero prose errors and warnings
- Git diff whitespace check passed

The full plan output is in PLAN_CHECK.txt. Before and after totals were 26 done, 41 partial, 34 missing across 101 clauses.

No contract clause claimed; this is a CI shard split.

## Exact-SHA Verify

- Run 44614800229, attempt 2, completed/success on the source ref. The original handoff recorded an ECONNRESET in its browser job on attempt 1. [GitHub Actions](https://github.com/just-every/run-oncall/actions/runs/44614800229)
- Run 44623235127, attempt 1, completed/success on the destination ref. [GitHub Actions](https://github.com/just-every/run-oncall/actions/runs/44623235127)


