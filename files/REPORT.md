# Oncall assignee-clear resource readback

Run `sd-oncall-c-f279-lin-1` · Run Edit Run fleet · 18 November 2026 UTC

| Role | Ref or commit |
| --- | --- |
| Repository | `just-every/run-oncall` |
| Product branch | `cloud/sd-oncall-c-f279-lin-1` |
| Main used for replay | `0d1c25846fdb7454d3d7f4382bf4037f2850c7bd` |
| Feeder head confirmed | `ae8aaa0285d20d0abc75b9db90d3e74f27e7ffa8` |
| Feeder commit 1 | `ce7bcb3a263b17d4e2400649b8dd5f904fede8ea` |
| Product commit 1 | `515a9db09dd98cf341e7868ac2a9f219cc45cbe1` |
| Product commit 2 | `f0b38b2ca9669faa3944622cc46f268e1dd1f688` |

## Plan and replay

1. Fetch fresh main and the feeder. Apply the assignee-clear resource readback and its browser coverage as two linear commits.
2. Resolve the shared browser test in place. Preserve main's Scribe readback and width captures, the Assignee picker and companion-role checks, and all existing calls in the agent flow. Add the first returned Assignee resource link to the browser journey and capture both policies at 1440 and 390 pixels.
3. Resolve the contract conflict with main's complete source. The feeder's observations belong in this report under the branch lease. Run the documented generator and check, retain main's generated views and regenerate the source lock last.
4. Verify the exact candidate locally through the focused replay and browser entry points, typecheck, build and check the first-party profile. Fetch and rebase onto current main immediately before the single product push. Wait for the candidate's exact-SHA Verify and publish this packet under the evidence ref.

## Clause evidence

The focused replay follows the resource link from the first successful standard Oncall reassignment that clears a populated Assignee. Under both company policies the resource matches the full saved write response and the sponsor's protected incident readback, including the explicit null Assignee, new revision, unchanged Lead, Scribe and Communications roles, and attributed reassignment. The autonomous read completes directly. The held read opens its own review and preserves the original open write review and saved outcome. Both reads preserve native records, revisions, state-changing audit and paging and make zero outbound requests. The signed-in browser shows the saved Unassigned value, companion roles and attributed timeline at 1440 and 390 pixels under both policies.

The contract records 26 done, 41 partial and 34 missing out of 101 before and after. BASE-AGENT-003 remains recorded as missing and this round claims partial evidence for point 4. Verify has 8 push shards and 21 scheduled journey entries before and after. The new observations live inside existing journeys.

CLAIM BASE-AGENT-003 PARTIAL points=4 tests=tests/oncall-agent-assignee-clear-replay.mjs#focusedAssigneeClearReplay; tests/agent-door-browser.mjs#Assignee clear browser

GAP BASE-AGENT-003: Other write links, complete discovery and nondisclosure, two-role native parity, grant byte budgets and complete untrusted-text coverage remain held.

## Results

Local verification passed on the advertised SHA. The packet includes replay and browser receipts, the two screen views at each width under both policies, and the product push receipt. The pinned Node 22.20.0 build, typecheck, first-party profile and source-lock check passed. The contract generator reported current views.

The final fetch and rebase confirmed the same main SHA and two non-merge commits. The product branch was pushed once and advertised at the verified head. Both candidate commits use the fleet identity and have empty trailers. The added test lines passed the local credential-shape check. The fleet lander owns Base’s publication scan and landing.

Exact-SHA Verify completed successfully. [Verify 44350067013](https://github.com/just-every/run-oncall/actions/runs/44350067013)
