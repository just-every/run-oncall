# Oncall 0.5.20 same-SHA handoff

Repository `just-every/run-oncall`. Branch `cloud/sd-oncall-release-0-5-20-c2`. Product commit `e4123dded5d6a9f058880669ca10213bcfbe2646`.
The candidate is one commit ahead of main at `071c74a352196f6778eb3b2942c351b4cf1e0ace`, with zero commits behind at branch creation.

## Plan and results

1. Read the c1 branch advertised by Git and compare it to the leased SHA. The ref matched `e4123dded5d6a9f058880669ca10213bcfbe2646`.
2. Create the c2 branch at the same commit through the fleet push guard. The candidate author and committer passed the identity check and the commit message had zero trailers. The push succeeded on attempt 1. The remote ref readback confirmed the same full SHA on both c1 and c2. Product commits added in c2: 0. PRs created: 0.
3. Hash `rer-setup.json` from the advertised product commit and read the declared `setup.sha256` from its `rer-project.json`. Both returned `7296a21b69f52706bb0043c0f82321b54c2d3dc3a0eeb788cd2de65815092f5a`, the value declared by main.
4. Discover and monitor Verify through the GitHub Actions REST API filtered by the exact product SHA. The c1 run completed successfully on attempt 2. The c2 push created Verify 44616826084, attempt 1, with status `completed` and conclusion `success` at the last observation. Workflow dispatches and reruns initiated during c2: 0.
5. Return this report and the observed receipts through the separate evidence ref.

## Before and after

| Measure | Main | Candidate |
| --- | --- | --- |
| Package, seed, and release version | 0.5.19 | 0.5.20 |
| Migration SQL files | 68 | 68 |
| Core done / partial / missing | 25 / 35 / 24 | 25 / 35 / 24 |
| Agent surface done / partial / missing | 1 / 6 / 10 | 1 / 6 / 10 |
| Full target done / partial / missing | 26 / 41 / 34 | 26 / 41 / 34 |

The migration and contract trees are byte-identical to main. The candidate changes six release metadata and source-lock files. Local checks passed for diff whitespace, contract generation, workflow permissions, version consistency, and the source-lock hashes and executable modes of the five changed files recorded in the lock.

No contract clause claimed; this is release metadata.

## Exact-SHA Verify

- c1 Verify 44605997400, attempt 2, completed successfully. https://github.com/just-every/run-oncall/actions/runs/44605997400
- c2 Verify 44616826084, attempt 1, completed / success. https://github.com/just-every/run-oncall/actions/runs/44616826084

Product status: READY. Blockers: 0.
