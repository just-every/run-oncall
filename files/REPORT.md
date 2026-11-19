# Oncall acceptance 4 linear replay

Run Edit Run fleet, 19 November 2026 (UTC). Task `sd-oncall-c-f291-f294-lin-1`.

## Plan

1. Fetch main and the two source branches, list their own non-merge commits, and inspect the rejected merges with `git show --remerge-diff`.
2. Carry the two ordinary commits in order onto fresh main. Resolve the contract source before the test conflicts. Keep main's existing judgments and test coverage. Generate and check the contract views, restore main's copies, then regenerate and check the source lock for each replay.
3. Build the exact candidate, typecheck, and exercise the existing signed-in browser and emitted-Worker agent journeys. Refresh the main ref before the candidate push. Inspect the entire candidate range for identity, trailers, and scope, and use the guarded cloud product push.
4. Check the exact-SHA Verify run over REST. Publish the selected proof files through the separate evidence ref.

## Replay and scope

- Main used for the replay was `49dc3d821091644713c8d1e418f04135f84ac3f9`. The f294 source range contained only `b375c995f5a06cb63b8e42f83b841e308b25fbce`. The f291 source range contained only `da6f6cfd973c83ff5fc9fdd240c7d34e6178ea7b`.
- The f294 preservation merge `2248108a262aece8279a0f783b3d2c6f70ebf2b8` resolved a contract hash. The f291 resolver merge `90a05a77` resolved source-lock hashes and kept both the existing required-revision and new optional-revision calls in the runtime journey. The replay used that same call order and carried no merge commits.
- The cloud preservation protocol published the first replay as `969a03e95c6b0347b5a3be68def78acc23864d72` with the skip marker. The final replay commit `30202e35dcbc97fdb9cf5db94d49f18ff7e88481` has no skip marker.
- BASE-AGENT-003 and BASE-AGENT-012 each gain an acceptance-4 observation. Both retain main's recorded missing judgment. Their Status, Evidence, and Gap rows are byte-identical to main. The builder claims partial proof for point 4 of each clause.
- Contract counts before and after are 26 done, 41 partial, and 34 missing across 101 clauses. The configured push journey count is 21 before and 21 after. The two proofs extend existing jobs. Main at the final push still pointed to the f289/f290 landing. The f296 replay was on its own branch at the source-ref check.
- Scope is the three leased test files, the two contract observations, and the source lock. No application, migration, release, generated view, or workflow file changed.

## Per-file comparison

| File | Replay result |
| --- | --- |
| `CONTRACT.md` | Both source paragraphs carried verbatim. Main's surrounding plan and clause judgments are retained. |
| `tests/agent-door-browser.mjs` | The two source browser proof hunks are carried. The resolution fixture import also retains main's `acknowledgeParity` import. |
| `tests/oncall-agent-fixtures.mjs` | Source changes to the recovered-incident fixture and the native advance helper carried verbatim. |
| `tests/oncall-agent-flow.mjs` | The follow-up readback and stale optional revision assertions are carried. The fixture import includes main's acknowledgment helper. The stale optional revision call follows main's required revision call, matching the f291 resolver tree. The new read-snapshot imports coexist with those from main. |
| `sources.lock.json` | The pinned edition-authoring tool regenerated the four leased-source hashes for the combined tree. Main's generated view hashes were retained alongside the restored files. |

The focused results and exact-SHA workflow receipt accompany this report. The fleet publication scan and landing run on the Mac.

## Acceptance claims

CLAIM BASE-AGENT-003 PARTIAL points=4 tests=tests/oncall-agent-flow.mjs#staleCoordinationRevision (readCreatedFollowUp); tests/agent-door-browser.mjs#follow-up-created

GAP BASE-AGENT-003: Other write links, complete discovery, role parity, scoped-out equivalence, broader untrusted markers, and Base grant byte budgets remain open.

CLAIM BASE-AGENT-012 PARTIAL points=4 tests=tests/oncall-agent-flow.mjs#staleResolutionExpectedRevision

GAP BASE-AGENT-012: Other revision diagnostics, complete mutating-tool and 24-hour retention coverage, remaining changed-argument and dropped-stream cases, foreign-person job handles and Tasks-independent status remain open.

## Exact-SHA Verify

Verify run 44554518018 completed with the expected generated-view failure. Its plan, build, all eight shards, and full-push-proof marker succeeded. The contract-docs job failed its generated-view check and the dependent Verify job rejected that result. The candidate reproduced the ACCEPTANCE.md difference locally only after restoring main's views. Generation and its check succeeded locally before restoring them, and the source lock and every required local build step passed. The fleet's generated-view exception applies to this candidate.

[GitHub Actions run 44554518018](https://github.com/just-every/run-oncall/actions/runs/44554518018)
