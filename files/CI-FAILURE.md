# Exact-SHA Verify failure receipt

Verify run 44296143431 for d043b91abfe1b99baf3bad37a178811e91dfe71e.

## Core product browser shard 134775589692

The workflow log archive command succeeded.

    gh run view 44296143431 --repo just-every/run-oncall --job 134775589692 --log-failed

The browser reached /on-call/synthetic-oncall-covered-swap. The coveredSwap assertion at tests/stranger-trip-steps.mjs:34:9 expected the swap sheet text to match /cover/i. The displayed sheet said “Request a swap” and “You have no eligible upcoming shift in these two weeks. Use Next two weeks to find a later shift.” The assertion exited with code 1.

The shard runs the core part of tests/product-browser.mjs. That entry point does not invoke the agent browser in core mode. The browser entry point, covered-swap helper, product browser journey, shard plan and application source match the main parent. The separate hosted shard that invokes tests/agent-door-browser.mjs succeeded on this SHA. [Core browser job 134775589692](https://github.com/just-every/run-oncall/actions/runs/44296143431/job/134775589692)

## Required Verify aggregate 134782134029

The workflow log archive command succeeded.

    gh run view 44296143431 --repo just-every/run-oncall --job 134782134029 --log-failed

The aggregate received CONTRACT_DOCS=success, SHARDS=failure, PUSH_PROOF=skipped and HAS_SHARDS=true. Its full-coverage requirement exited with code 1. [Aggregate Verify job 134782134029](https://github.com/just-every/run-oncall/actions/runs/44296143431/job/134782134029)

Recorded by Run Edit Run fleet at 2026-11-18T12:12:47Z.
