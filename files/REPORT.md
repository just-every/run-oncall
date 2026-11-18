# Oncall Scribe-clear resource readback

Run Edit Run fleet · 2026-11-18T09:11:38Z

Product branch cloud/sd-oncall-c-f271-lin-1, head b137b6349f252df6296e31c3abdf2eaf19a29a94. First parent 731bacf72abc4538e728628d85bf9d844d3b4da0.
Feeder tip 54b973e8d4d712b2913f18e5ed5ccb148e2a5a7f and replayed commit df7cb7a914aa53f13385f8c32e99bff0c29b0fb6.
Product ref confirmed on GitHub: yes. Exact-SHA Verify: run 44270440851 completed successfully on the candidate SHA.

## Plan and replay

1. Fetch Oncall main and confirm the feeder tip. Replay the original Scribe-clear change as one ordinary commit on main.
2. Preserve main’s reassignment, action replay, approval response loss and completion-retention assertions. Keep main’s existing HTTP harness registration. Resolve the browser import conflict by keeping both imports. Generate the lock from the combined tree and check it.
3. Build the candidate and run the touched HTTP and browser journeys, typecheck, first-party profile, generated contract check and source-lock check. Capture the Scribe timeline and People dialog in both modes at 1440 and 390 pixels.
4. Fetch main immediately before publication, validate ancestry and commit identities, and use the product push guard. Require branch Verify for the candidate SHA. Return public-safe proof through the evidence ref.

## Results

The first browser run exposed an outbound trigger recorded by its setup declaration. The replay now takes a fresh ledger snapshot immediately before the resource read and requires the ledger to stay equal afterward. The focused and browser fixtures keep their broader outbound assertions. Main advanced during the first attempt, so the candidate was rebased and the checks were rerun on the final SHA.

The autonomous and held reads follow the exact resource link returned by the Scribe-clear mutation with the original admitted credential. The full incident equals both the write result and the sponsor’s protected incident. The payload contains a cleared Scribe, the new revision and attributed assign-role history. The autonomous read opens no review. The held read opens a distinct review and preserves the original open write review. Native records, revisions, state-changing audit and paging are preserved, and the resource read adds zero outbound requests.

The desktop browser assertions observe the cleared Scribe, companion responsibilities and attributed incident timeline. The same synthetic screens are captured at desktop and phone widths.

The registered verification lane entries count is 21 before and 21 after. The push shard count is 8 before and 8 after. The contract summary is 26 done, 41 partial and 34 missing before and after. The trial supplies point 4 evidence for a PARTIAL claim while BASE-AGENT-003 remains missing in the source judgment.

The first focused invocation stalled in the Miniflare D1 helper when launched with the inline module flag. The successful retry used ordinary Node module loading with the pinned Node and loopback requests outside the HTTP proxy. Setup, build and local checks are recorded in the receipt.

The fleet performs the publication scan and landing from its own machine.

## Checks

- build — pass
- typecheck — pass
- first-party — pass
- contract-docs — pass
- source-lock — pass
- agent-door-browser — pass
- focused-role-clear — pass
- oncall-agent-flow — pass

## GitHub Actions

- [Verify run 44270440851](https://github.com/just-every/run-oncall/actions/runs/44270440851)

## Scribe browser proof

- [autonomous timeline 1440 px](browser/agent-door-scribe-autonomous-cleared-timeline-1440.png)
- [autonomous timeline 390 px](browser/agent-door-scribe-autonomous-cleared-timeline-390.png)
- [autonomous people 1440 px](browser/agent-door-scribe-autonomous-cleared-people-1440.png)
- [autonomous people 390 px](browser/agent-door-scribe-autonomous-cleared-people-390.png)
- [held timeline 1440 px](browser/agent-door-scribe-cleared-timeline-1440.png)
- [held timeline 390 px](browser/agent-door-scribe-cleared-timeline-390.png)
- [held people 1440 px](browser/agent-door-scribe-cleared-people-1440.png)
- [held people 390 px](browser/agent-door-scribe-cleared-people-390.png)

CLAIM BASE-AGENT-003 PARTIAL points=4 tests=tests/oncall-agent-role-clear-replay.mjs#scribeClearReadback; tests/agent-door-browser.mjs#Scribe clear browser

GAP BASE-AGENT-003: Other write links and remaining target-surface coverage stay queued. Grant byte budgets depend on unfinished Base work.
