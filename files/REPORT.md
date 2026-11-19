# Oncall Verify Changes shard split

No contract clause claimed; this is a CI shard split.

## Plan and implementation

1. Read the Oncall matrix, workflow and command runners. The workflow takes each job's 15-minute limit from the plan matrix. The current Oncall runner and its direct journey dispatcher call subprocesses synchronously without a separate command timeout. The 795 s and 900 s limits in the incident report describe earlier runs or local wrappers; this round preserves the workflow timeouts.
2. Isolate `tests/activation.mjs` in a new non-browser Activation job. The Changes job retains `tests/changes.mjs` and the imports lane, in their existing order. Imports still runs the import door, subject erasure, roster erasure and triage reports journeys. The existing Changes name stays in use.
3. The plan validator now rejects duplicate effective journey invocations even when they occur in different lanes, while recognizing distinct environment-selected parts. The existing matrix, evidence name patterns and proof jobs obtain shard names from the plan. The aggregate requires the complete successful matrix for full coverage. The added activation job participates in both mechanisms automatically.
4. Compare the before and after per-tier command multisets including environment overrides and hosted verification. Run the repository plan and workflow checks, source lock generation and check, contract generation and check, and the production check/build/typecheck. Push the latest-main-based candidate once, then verify the exact head on GitHub and measure the two affected shards and the longest job.

## Scope and counts

| Measure | Main | Candidate |
| --- | ---: | ---: |
| Push matrix jobs | 8 | 9 |
| Push commands including hosted Verify | 22 | 22 |
| Nightly matrix jobs in this plan | 0 | 0 |
| Contract clauses done | 26 | 26 |
| Contract clauses partial | 41 | 41 |
| Contract clauses missing | 34 | 34 |
| Total contract clauses | 101 | 101 |

The split requires a ninth job because the brief preserves the seven unrelated shards. Tests and test registrations have identical bytes. The seed guide's existing wording about eight shards sits outside the named edit lease. Contract evidence mentioning Changes records earlier runs. All contract text and generated views match main byte for byte.

## Historical timing

The brief recorded Changes failures or cancellations in Verify runs 44592740985, 44597070445, 44601711462 and 44605997400. The last Changes job timed out after 15m17s.

| Successful main Verify run | Exact main SHA | Changes timing availability |
| --- | --- | --- |
| 44599061529 | `071c74a352196f6778eb3b2942c351b4cf1e0ace` | Reused verification. The matrix was skipped. |
| 44594320217 | `738f5efacaad9f65191a4a851b701c6fc953cd5d` | Reused verification. The matrix was skipped. |

The log query for successful producer run 44595350511 on the first main SHA yielded no matching Changes timing lines. Local measurement of the original shard supplied the command-level comparison. The CI receipt records actual candidate job timings when available.

On the original plan and shared build, `tests/changes.mjs` took 47.8 seconds and `tests/activation.mjs` took 406.7 seconds. This supported isolating activation while keeping Changes and imports together. The full local receipt shows the import door was slower still at 822.6 seconds, so the eight-minute target cannot be inferred from local measurements. The import door has no existing part selector. The runner’s environment-selected triage reports part stays in the imports lane.

## Product branch

- Repository: `just-every/run-oncall`
- Branch: `cloud/sd-oncall-ci-changes-split-1`
- Base: `071c74a352196f6778eb3b2942c351b4cf1e0ace`
- Product HEAD: `03c3b2a27c311b525a4202451c4b873f4b5d7e2e`
- Push: 2026-11-19T21:02:53Z. The named branch advertised the exact candidate. Main and the product branch's history were left under fleet custody. Oncall's landing rules did not require the builder to open a PR.
- Publication: local first-party check and candidate diff/identity checks passed. Base's full publication scan runs in the Mac lander.

## Exact-SHA Verify

Verify run 44614800229, attempt 1, ran the full push matrix for `03c3b2a27c311b525a4202451c4b873f4b5d7e2e`. The plan, contract docs and build jobs passed. Both affected shards passed on their separate 15-minute budgets.

| Shard | Job ID | Job wall time | Journey step | Result |
| --- | ---: | ---: | ---: | --- |
| Changes | 135881849181 | 9m54s | 7m26s | success |
| Activation | 135881848994 | 6m09s | 4m11s | success |
| Hosted, longest matrix job | 135881849180 | 13m05s | 10m53s | success |
| Browser | 135881849170 | 3m53s | 1m26s | failure |

Both affected journey steps finished under eight minutes. Changes was 1m54s over the approximate eight-minute job target with setup included, leaving 5m06s before its limit. Activation had 8m51s before its limit. The unchanged Browser shard failed in “Run this shard” after successful Chromium setup and build restoration. The aggregate job 135889677866 failed and full-push-proof was skipped. This is a CI blocker. The contract-docs job succeeded, so the generated-view exception does not apply.

https://github.com/just-every/run-oncall/actions/runs/44614800229

The failed job log archive confirmed that Playwright's `apiRequestContext.get` received `ECONNRESET` on `/api/paging/state` inside the existing browser schedule journey. The same exact candidate failed locally with `ECONNRESET` on a schedule-override POST in that journey. These browser/Worker requests are outside the plan lease. Successful exact-SHA Verify remains the landing prerequisite. The 10 task GitHub calls covered historical evidence, candidate discovery, terminal job results and the failed-job archive.

Reported by Run Edit Run fleet on 2026-11-19 UTC.
