# OC-009 acceptance 2 linear replay

Builder receipt for `sd-oncall-c-f292-lin-1`, 19 November 2026 UTC.

## Plan and execution

1. Fetch Oncall main and the feeder's rebased branch. The range from main to the feeder contained two commits, in replay order:
   - `f6ff162f402df6d5e3498d6aa66116325420e8cb` Restore keyboard focus after a stale incident note
   - `519e2fb244638aef8d2d5274d58e5186c83a0178` Regenerate contract views from CONTRACT.md
2. Start `cloud/sd-oncall-c-f292-lin-1` at `9a95d7c30457bdb5281193880f5c9612e059c27d`. Apply the two patches in order without creating intermediate commits. The final candidate carries the product and contract source in a single linear commit. Generate the contract views and check them, restore both published views from main, then regenerate and check the source lock against the tree being pushed.
3. Carry the feeder's focus restoration and real stale-note proof. Assert acceptance 2 for incident notes at 390 CSS pixels. Capture the same failure at 390 and 1440 CSS pixels, including the focus ring, current-record label and retained draft. The existing desktop keyboard-coordination checks still exercise declaration, acknowledgment, notes and the action dialog.
4. Run the first-party check, production build, typecheck and focused emitted-Worker browser journey. Fetch main again and rebase just before the guarded push. Main remained at the recorded parent. Verify the product ref and wait for branch Verify on the exact SHA.
5. Publish this report, the check receipts and the two scoped synthetic browser captures to the designated evidence ref. The Mac lander owns the full publication scan and regenerates the contract views before landing.

## Product provenance

- Repository `just-every/run-oncall`
- Product ref `refs/heads/cloud/sd-oncall-c-f292-lin-1`
- Product SHA `f4042c24eb5429651be0c04d099bb37aba27abaf`
- Parent main SHA `9a95d7c30457bdb5281193880f5c9612e059c27d`
- Candidate range contains one commit and zero merge commits. The named branch push succeeded on its first attempt. The remote ref advertises the candidate SHA.

## Clause result

OC-009 remains PARTIAL. Its stale incident note path returns a real HTTP 409, announces the conflict, gives keyboard focus back to Add note, keeps the draft editable and leaves the saved status empty. An independently authenticated session writes the winning note. Protected readback shows exactly one new note and one revision advance, with paging OFF and no new outbound work. Phone assertions include viewport fit and no serious or critical axe findings. The desktop capture uses the same incident and failure state.

| Tier | Done before → after | Partial before → after | Missing before → after |
| --- | ---: | ---: | ---: |
| Core | 25 → 25 | 35 → 35 | 24 → 24 |
| Agent surface | 1 → 1 | 6 → 6 | 10 → 10 |
| Full target | 26 → 26 | 41 → 41 | 34 → 34 |

The shard plan retains 21 registered lane entries. The round extends a registered journey and adds zero registrations.

CLAIM OC-009 PARTIAL points=2 tests=tests/product-browser-journey.mjs#keyboardCoordination

GAP OC-009: R-3 named screen-reader journeys, OC-029 native-app proof, R-4 VPAT publication, and wider Base accessibility conformance remain held.

## Earlier hosted cancellation

The hosted shard in run 44495924665 (job 135475816365) ran for 15m23s. Its `Run this shard` step ran for 11m36s and was cancelled. The preceding SDK cleanup alone took 2m50s. The workflow reads its job timeout from the shard matrix, which assigns hosted 15 minutes. The full run and job-specific archive reads returned empty output, so the Actions job and step timestamps provide the timing evidence.

The hosted shard runs hosted verification, the settings and documentation part of the product browser script, and the independent agent browser journey. The settings part branches before the changed keyboard-coordination call. The stale-note race runs in the core browser shard. The round adds no waits, requests or tests to the hosted path. The settings and documentation browser part also passed locally against the candidate build in 108.9 seconds. The timings fit a runner exhausting the job budget, though the empty archive leaves the last executed subcommand unconfirmed.

[Earlier Verify run](https://github.com/just-every/run-oncall/actions/runs/44495924665)

## Verification

The local receipt includes the focused browser output and the source-lock and contract checks. On the candidate tree, the generator reports that the inherited `ACCEPTANCE.md` differs. The write followed by check passed on the generated version, as required for the cloud-generated-view exception.

The exact-SHA workflow and its job results are in the CI receipt.

[Candidate Verify run](https://github.com/just-every/run-oncall/actions/runs/44513836996)

Verify 44513836996 completed for the exact product SHA. The build, all eight shards and full-push-proof passed. The hosted shard finished in 12m11s. The failed-step logs show that the contract job failed only on inherited `ACCEPTANCE.md`, and the aggregate verify job failed on that result. This meets the documented cloud exception for generated contract views.
