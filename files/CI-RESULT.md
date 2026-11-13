# Exact-SHA Verify

Run: https://github.com/just-every/run-oncall/actions/runs/43353936328
Head: 8b21d6ea781a11d750e5434cb3d107b534d01215
Terminal status: completed / failure.

Build, browser, transfer, runtime, triage, hosted and changes passed. Intake job 131652627715 failed in “Run this shard”: analyticsFixture at tests/oncall-agent-fixtures.mjs:284 asserts 200 but receives 401. This is the known main session-clock failure named in the brief. No fix or rerun was attempted. The final verify job 131657422100 consequently fails “Require the selected coverage and its proof”.

The one watcher made five REST calls (initial discovery, then observations at least 300 seconds apart). One completed-job listing and two failed-job archive invocations bring the budget to 8/10. No other repository API calls, PR, workflow dispatch or rerun.

The intake archive succeeded and the full actual log is ci-intake-failed.txt. Each failed job's archive was requested only once. This aggregate-job archive command failed:

    gh run view 43353936328 --repo just-every/run-oncall --job 131657422100 --log-failed

Sanitized diagnostic: `failed to get run log: zip: not a valid zip file`. No HTTP status or response body was supplied. It was not retried. The public jobs response records that aggregate failure; the successful intake log identifies the assertion.

Product custody: pushed, not READY. The standing exact-SHA Verify prerequisite remains unmet. The fleet can integrate the independently owned clock fix and rerun its own final gates. Evidence publication is not landing or acceptance.
