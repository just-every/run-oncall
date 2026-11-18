# Oncall missed initial acknowledgment

Task `sd-oncall-missed-ack-4` · `just-every/run-oncall` · UTC

## Plan and execution

1. Fetch current `main` and all three prior task refs. Confirm each prior ref has one round commit and use the latest round's net patch, excluding its generated lock.
2. Reproduce the failed portion of the intake shard through the emitted Worker, including the parent OC-058 snooze and scheduled deadline assertions. Capture the admitted alert's retained decision and compare the event timestamp to policy publication.
3. Apply only the leased patch on current `main`, retaining the newer notification run on the alert and both additions to the getting-started guide. Correct the test chronology and keep the existing deadline assertions.
4. Run the contract generator and check, restore the committed views from `main`, regenerate and check the source lock, and create one linear commit. Run the first-party check, production build, typecheck, release metadata validation and focused Worker regression against the candidate. Capture the four changed screens at 1440 and 390 after setting a one-minute timeout through Settings and letting the Worker sweep the unacknowledged incident.
5. Fetch `main` again, check the candidate history and identity, push once to the named product branch and observe exact-SHA Verify. Return this report, receipts and screenshots on the separate evidence ref.

## Reproduction and fix

The previous head was `22dfa7c115773cd59de20d1662183119b15638bb`. Verify 44201744450 attempt 2 failed in `shards (intake)`. A focused run of the same `tests/runtime.mjs` OC-058 block reproduced the exception on the first lookup, before any scheduled sweep. The PagerDuty-compatible POST returned 202 and the protected state read returned 200. The simulated event was accepted at 2026-11-17 23:59:30 UTC, before the fixture published the incident-declaring policy at 2026-11-18 01:26:24.800 UTC on the injected Worker clock. The alert therefore retained its default `alert-only` decision and no incident existed for the test to read. The parent OC-058 journey had already passed its expected 503 and 500 audit-fault assertions.

The test takes the clock instant used by the preceding scheduled deadline assertion, sets the Worker clock before fixture policy publication, and submits the alert on that same clock. It now fails explicitly if compatible intake returns without a declared incident. The existing OC-053 scoped incident-door and OC-058 snooze, restart, source recovery, rollback, and scheduled expiry assertions still run. The replay records an initial expiry and its covered responder once, retains it after late acknowledgment, cancels the pending clock after on-time acknowledgment or source recovery, supports uncovered services and timeout off, and carries the result through archive restore. Paging remains off.

## Scope and counts

The product change is one linear commit. Contract source, generated views, migration files, release metadata and the rer pin match the parent. Before and after, core is 25 done, 35 partial and 24 missing. Agent surface is 1 done, 6 partial and 10 missing. The full contract is 26 done, 41 partial and 34 missing, 101 total. The 10 homepage claims remain 7 done and 3 partial.

No contract clause claimed; these are owner-journey fixes (DIRECT 87).

## Candidate and local verification

- Product branch `cloud/sd-oncall-missed-ack-4` was pushed once and read back at `169944d31dca8a2987da32603b1ab56003d22153`. Its sole parent is the main tip fetched immediately before pushing, `d88d44c4e8dedd1bf69682d3d2abcf4116dad3c4`. Candidate history contains zero merges or co-author trailers. The 17 changed paths match round 3 exactly.
- The three earlier refs resolved to `2f02a12bc54cd0d48c46132b331239ae6562d876`, `e45028ce37460855f9ff1e87924236b969e0dda7`, and `22dfa7c115773cd59de20d1662183119b15638bb`. Relative to round 3, the additions from main are the recorded notification run and its proof, including the alert composition and docs. The other differences are the fixture clock and regenerated lock. Relative to the earlier rounds, the additional changes come from their respective main updates.
- Production build checks ran in the checkout's order on Node 22.20.0 and pnpm 10.12.4. The first-party check, production build and typecheck passed. This checkout has no `validate:release` script, so validation used the pinned release module's committed-source, release message and catalogue validators, then checked that the release and contract inputs match main. No release or tag was produced.
- The focused emitted-Worker OC-058 and missed-ack regression passed on the exact candidate. Chromium saved a one-minute service timeout through Settings, submitted an alert, observed the pending incident, ran the scheduled handler at the logged deadline, and saw the missed time and responder on the incident, its timeline, the alert, On call and Reviews. The alert's existing notification run remained visible. Four screen pairs are included, with assertions at 1440 and captures at 1440 and 390.
- The contract generator wrote zero views and the contract and pinned source-lock checks passed. The Mac lander retains custody of the publication scan and landing.

## Exact-SHA Verify

GitHub Verify run [44215774903](https://github.com/just-every/run-oncall/actions/runs/44215774903) completed successfully on push SHA `169944d31dca8a2987da32603b1ab56003d22153`. Observed at 2026-11-18 01:41:57 UTC. No rerun was needed. An API lookup found no PR for this branch. The product ref is ready for the lane's independent landing checks.

GitHub reported success for all eight full shards, including intake job 134506460140 and browser job 134506460341. The separate aggregate local `rer verify` passed the machine runtime, intake and routing journeys, then stopped on a loopback `ECONNRESET` during the existing saved-email import browser journey. The unchanged saved-email journey passed when rerun on its own. The existing alert notification run browser journey also passed on the candidate.

The packet includes the product, reproduction, browser and Verify receipts and the eight changed-screen captures. The publication scan remains with the lander.
