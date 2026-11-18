# Oncall rota override revision replay

Run Edit Run fleet · 18 November 2026 · sd-oncall-c-f278-lin-1

## Plan and replay

1. Verify the feeder ref and select only its two linear commits. Start the candidate at fresh Oncall main.
2. Replay the runtime case and the signed-in browser readback. Keep main's newer alert-declaration, runbook, Scribe-clear and reassignment browser coverage. Regenerate the source lock from the resolved trees.
3. Build, typecheck, run the first-party check, exercise the agent runtime and browser entry points, and check the generated views and source lock on the candidate.
4. Fetch and rebase on latest main before the guarded product push. Verify the exact advertised SHA, then attach the report, receipts and four viewport captures to the evidence ref.

The two feeder commits were a0f87bbf151bf170139617c4a0b95a0457e60381 and cd0db34aa24058645045604b9601f92d5bee4aa5. I applied their leased test changes and regenerated the lock in each commit. The browser import conflict was resolved by adding the rota helper alongside main's combined product-browser import. The feeder's documentation paragraph was outside the stated file lease, so the candidate's contract text and generated views are main's versions. The two candidate commits form a linear history. The candidate diff consists of the three test files and the source lock.

## Acceptance evidence

The existing required-native revision case remains registered alongside the optional revision case. The optional case passes the current native revision and a stale expected revision. Both company policies return the current rota revision in MCP error metadata and text. The scope and missing-target refusals match and omit the revision. The conflict leaves durable records, approvals, reviews and paging custody intact. A corrected optional revision with a fresh key saves one primary override and one native audit entry. The held case uses one exact signed-in sponsor approval. An identical retry returns the recorded result, and the tests observe zero outbound requests.

The signed-in schedule page displays the retained primary cover for both policies. The browser journey asserts at 1440 px and captures each policy at 1440 and 390 px. The durable state and outbound ledgers are checked around the browser readback.

CLAIM BASE-AGENT-012 PARTIAL points=4 tests=tests/oncall-agent-schedule-replay.mjs#staleOverrideRevision; tests/agent-door-browser.mjs#override-revision-retained-autonomous; tests/agent-door-browser.mjs#override-revision-retained-held

GAP BASE-AGENT-012: Other revision and mutation variants, full 24-hour retention, remaining lost-stream and changed-argument cases, foreign-person job handles and Tasks-independent long-work status remain unproved.

| Contract counts | Done | Partial | Missing | Total |
|---|---:|---:|---:|---:|
| Main before replay | 26 | 41 | 34 | 101 |
| Candidate | 26 | 41 | 34 | 101 |

BASE-AGENT-012 remains recorded as Missing. This round supplies a Partial claim for the bounded acceptance 4 case. The push plan registers 21 lane commands across eight shards before and after. The replay adds one optional-revision invocation to the existing agent runtime entry point and two policy readbacks within the existing agent browser entry point.

## Verification and custody

See CHECKS.md for the exact candidate, commands, results and remote run. The fleet's independent publication gate runs at landing. The cloud candidate passed the changed-file scope, whitespace, credential-pattern diff, and all-commit identity and trailer checks.

Exact-SHA Verify completed successfully for 3802fdced907d69aed43abb72602dccfd772e2f7. [Verify run 44350705483](https://github.com/just-every/run-oncall/actions/runs/44350705483)
