# Oncall missed acknowledgment replay

| Field | Value |
| --- | --- |
| Task | sd-oncall-missed-ack-3 |
| Repository | just-every/run-oncall |
| Product branch | `cloud/sd-oncall-missed-ack-3` |
| Exact product head | `22dfa7c115773cd59de20d1662183119b15638bb` |
| Main fetched immediately before push | `76e7ed5eb83d6cf3dba8b591a10cf63028eb4f4a` |
| Proven replay source | `e45028ce37460855f9ff1e87924236b969e0dda7` |
| Original round source | `2f02a12bc54cd0d48c46132b331239ae6562d876` |
| Product push | 2026-11-17 23:42:40 UTC |
| Exact-SHA Verify run | [44201744450](https://github.com/just-every/run-oncall/actions/runs/44201744450) |

## Plan and replay

1. Fetch main and both predecessor refs, verify the stated heads and deepen the clone until each range from main identifies the one missed-acknowledgment commit.
2. Start the candidate from main. Apply the proven second round's product and test patch. Add its getting-started paragraph after main's newer installation-name paragraph. Regenerate and check the contract views, restore them from main, then regenerate and check the source lock with the pinned tool.
3. Compare the candidate to both predecessor heads and their corresponding bases. Confirm a single linear commit and review author, committer and trailers.
4. Build and test the exact candidate. Run first-party checks, the ordered Verify build preparation, pinned release-source validation, and the focused Worker flow. Save a one-minute timeout through the browser, send synthetic PagerDuty Events intake, move the fixture clock to the deadline and invoke the emitted scheduled Worker. Check the four surfaces at 1440 px and capture each at 1440 and 390 px.
5. Fetch main immediately before pushing. Rebase, refresh and recheck the source lock, confirm the built SHA and push the candidate once through the fleet guard. Poll Verify on the pushed SHA. Publish the explicitly selected evidence files to the evidence ref.

Main's changes account for the delta against each predecessor tip. The replay retained the newer paging notice on On call, the alert's obligation details control, main's runtime assertions and its installation-name documentation. The replay patch differences are recorded in `replay-range-diff.txt`. The committed source lock reflects the resulting tree. The candidate has one ordinary commit with main as its parent, zero merge commits, checked fleet author and committer and no trailers. The product push succeeded on its first attempt and the remote ref read back the product SHA. This direct branch run created no pull request.

## Journey and checks

The browser saved the timeout through Settings → Services. Synthetic Events intake created and linked the alert and incident. The incident showed a pending acknowledgment before expiry. At expiry, the four surfaces showed the same missed time and named responder. The incident stayed declared, and the outbound ledger remained empty. The 1440 px assertions compared the displayed deadline and coverage, and the 390 px captures show those same four screens.

| Screen | Desktop | Phone |
| --- | --- | --- |
| Incident | [1440 px](incident-1440.png) | [390 px](incident-390.png) |
| Alert | [1440 px](alert-1440.png) | [390 px](alert-390.png) |
| On call | [1440 px](on-call-1440.png) | [390 px](on-call-390.png) |
| Reviews | [1440 px](reviews-1440.png) | [390 px](reviews-390.png) |

The focused Worker test also proved restart, audit rollback, concurrent and repeated sweeps, coverage at deadline despite delayed processing, late and on-time acknowledgment, cancellation on source recovery, timeout-off behavior, an uncovered service, archive acceptance and stable paging job, receipt and callback lists. The browser and focused HTTP harnesses are included for replay.

The checkout's ordered build preparation passed. It runs first-party check, production build, then typecheck and writes the build SHA receipt. The installed runner exposes no separate `validate:release` build step. Its pinned release-source validator passed on the committed candidate, including agreement on version 0.5.18. The contract and release manifest match main byte for byte, so the replay requires no contract-related release entry.

## Contract status

| Tier | Main done / partial / missing | Candidate done / partial / missing |
| --- | --- | --- |
| Core | 25 / 35 / 24 | 25 / 35 / 24 |
| Agent surface | 1 / 6 / 10 | 1 / 6 / 10 |
| Later | 0 / 0 / 0 | 0 / 0 / 0 |
| Full target | 26 / 41 / 34 | 26 / 41 / 34 |

No contract clause claimed; these are owner-journey fixes (DIRECT 87).

## Exact-SHA Verify

The first attempt of Verify run 44201744450 completed with conclusion `cancelled`. Job 134457504545 reached its 25-minute build timeout during `actions/checkout`. Job 134457504726 passed the generated-contract check. The application shards were skipped because no build artifact was available. The single failed-job archive read for job 134469575030 succeeded and confirmed that the final gate failed on `BUILD: cancelled` and `SHARDS: skipped`. The build had not reached a product assertion.

GitHub accepted one retry of build job 134457504545 with HTTP 201 at 00:23:38 UTC on 18 November. The retry uses the same workflow run and candidate SHA, with no new product commit or push.

The retry completed with conclusion `failure` on `22dfa7c115773cd59de20d1662183119b15638bb`, observed at 00:46:38 UTC on 18 November. The ten-call GitHub budget was exhausted by the terminal status read, so the retry's failed job and assertion remain unidentified. The branch is published and blocked on successful exact-SHA Verify. The [CI receipt](ci-receipt.json) records the observations used for that disposition.

## Local verification conclusion

The complete application lane set, hosted-output and hydration checks passed locally across the initial and resumed commands. The managed-transfer fixture needed the blobless checkout's promised objects hydrated. The member-browser preflight needed a regular local launcher for system Chromium. [CHECKS.md](CHECKS.md) records the commands, the environmental failures and their recoveries.
