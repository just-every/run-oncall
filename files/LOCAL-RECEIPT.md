# Local verification receipt

- Product HEAD `03c3b2a27c311b525a4202451c4b873f4b5d7e2e` and base `071c74a352196f6778eb3b2942c351b4cf1e0ace`
- `node scripts/verify-ci.mjs --check-workflows` passed. Reusable workflow permissions and shared artifact names are valid.
- `node scripts/verify-oncall.mjs --plan` passed. Full coverage emits nine named matrix items, including Changes and Activation, each with its own 15-minute job limit.
- The push multiset is 22 commands before and after, including the hosted Verify command, with distinct environment-selected parts counted separately. All 22 have multiplicity one. The nightly list is empty before and after. The seven unrelated shards retain their order, commands, flags and timeouts.
- A fixture that registered the runtime core invocation a second time in Activation was rejected. A prior proof missing Activation caused the planner to schedule all nine shards. A proof with all nine successful shards remained reusable.
- The contract generator write made zero changes and the check reported zero errors or warnings. The candidate's contract and generated views match its latest main base. The pinned edition authoring lock was generated last and its check returned true.
- `git diff --check origin/main..HEAD` passed. All candidate author and committer identities and complete commit messages were inspected. The sole candidate commit has no trailers.
- The product push guard succeeded on attempt one. A separate Git ref read returned the exact product HEAD.

## Original Changes shard on the local VM

The original shard command `node scripts/verify-oncall.mjs changes` ran from the original plan and the production build prepared on the base SHA. Both lanes exited successfully. The CI toolchain shim used Node 24.19.0 and pnpm 10.12.4 for this measurement.

| Lane | Command | Time |
| --- | --- | ---: |
| changes | `node tests/changes.mjs` | 47.8 s |
| changes | `node tests/activation.mjs` | 406.7 s |
| imports | `node tests/import-door.mjs` | 822.6 s |
| imports | `node tests/oncall-agent-erase-subjects.mjs` | 8.8 s |
| imports | `node tests/oncall-agent-erase-roster.mjs` | 6.8 s |
| imports | `node tests/triage.mjs` (reports part) | 79.8 s |

Journey time as logged by the runner excludes job setup. Activation was 358.9 seconds slower than Changes. The local import door alone exceeded the eight-minute target and exposes no existing command selector. Hosted timings are recorded separately.

## Exact candidate build

At 2026-11-19T21:17:37Z, the dependency step, first-party check, production build and typecheck had passed on the exact product HEAD with Node 22.20.0 and pnpm 10.12.4. The shared-build receipt resolved to the pushed SHA.

## Browser failure reproduction

On the same product HEAD, `node scripts/verify-oncall.mjs browser` exited 1 at 2026-11-19T21:26:07Z using the installed headless Chromium. Playwright reported `apiRequestContext.post: socket hang up (ECONNRESET)` while posting a schedule override in the existing desktop journey. The failure reached `productBrowserJourney` at `tests/product-browser-journey.mjs:2485`. Browser code, the Browser lane and its tests sit outside the edit lease.
