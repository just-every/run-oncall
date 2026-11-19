# Oncall linear replay of the declaration and acknowledgment proofs

Prepared by Run Edit Run fleet, 19 November 2026 UTC.

## Plan and replay

1. Clone Oncall shallow and blobless, then deepen it to compare the continuation branches with fresh main. Inspect their own non-merge commits and all three preservation merges' remerge diffs.
2. Replay f289 first and f290 second on the named cloud branch. Carry the declaration fixture's seven relay-check lines into the first replay and preserve both browser blocks alongside main's newer assertions. Keep the contract observations and main's clause judgments. Generate the contract views, check them and restore the committed versions from main. Regenerate and check the edition source lock last.
3. Prove the exact new head with the ordered Verify build preparation, the existing agent browser journey and the agents runtime entry point. Record the changed incident screens at 1440 and 390 pixels. Reconcile against fresh main before a single candidate push, then check the exact branch Verify run. Return the public packet through the separate evidence ref.

Fetched main was d376e47b188ba8688ec7413341363fc7723c99dc. Both continuation histories share df8efefe31a9813ebc5aa3f0c2a319c19e2667d7 with that main. The f289 tip was 8318782d57443960556d505e27230ea371ab7ffd and the f290 tip was 320cf77b3bd92226c0fac0ea03c4b96ad05501a8.

| Continuation | Own commit | Replay |
| --- | --- | --- |
| f289 declaration | 643714fe17bad5ec6108f2e2eb6f1c5188f590c1 | ab2e07298e9c1ebf826ce689b62e459a8e09cef5 |
| f289 signed-in readback | 04347bf1a87f6d6617ca43dbbf04d9c227703bca | a6104c00385bc274036880377f42f428b8704638 |
| f290 native audit | 957f29b649add7de3e0965c74a1b79074fa21e0f | eac95487cb4e84414bf53ccba2537b4620efc98f |
| f290 signed-in parity | 6052b446cc8f6da18f0620fb4e2dabf6bed7cbf3 | 71c2f9235545e5392046cc2e155339faa9269e43 |

The remerge for 278752e shows the final placement of the f289 observation above the existing BASE-AGENT-003 readback paragraphs while retaining the service-runbook observation. The remerge for 8318782 shows the declaration fixture's seven relay-check lines and its regenerated lock. The remerge for 320cf77 contains the lock only. The four replay commits have linear ancestry.

## Per-file comparison

Compared zero-context additions and deletions against the sum of both continuation-tip diffs from their shared base. Every non-lock changed-line inventory matches.

| Path | Result |
| --- | --- |
| CONTRACT.md | Both observed-proof paragraphs match the continuation tips. The declaration observation uses the final f289 placement above the existing readback paragraphs. Main's newer observations and all Status, Gap and Evidence cells remain intact. |
| src/agent-door/coordination-tools.ts | The acknowledgment audit hunk matches f290. It records the same native command.transition kind as the browser and preserves named responder attribution. Main's newer incident resolution guard is retained. |
| tests/agent-door-browser.mjs | Both rounds' lines match. The shared insertion at the end of declaration proof keeps the declaration readback receipt followed by the acknowledgment journey, then main's subsequent journeys. |
| tests/oncall-agent-fixtures.mjs | Both rounds' lines match. The declaration test includes the seven lines from the refused f289 merge that check prior relay rows and exactly one appended row for the admitted read. The acknowledgment parity fixture remains as carried. |
| tests/oncall-agent-flow.mjs | The f290 import and native acknowledgment parity call match. Main's added replay assertions are retained. |
| sources.lock.json | The pinned edition tool generated new hashes for exactly the five combined files above on fresh main. The resulting digests reflect the combined tree. |
| ACCEPTANCE.md and docs/CLAIMS.md | Both generated views were restored from main after the generator passed. |

## Clause and test counts

| Count | Before | After |
| --- | --- | --- |
| Published clauses | 19 done, 3 partial, 0 missing | 19 done, 3 partial, 0 missing |
| Target and push further clauses | 7 done, 38 partial, 34 missing | 7 done, 38 partial, 34 missing |
| All clauses | 26 done, 41 partial, 34 missing, 101 total | 26 done, 41 partial, 34 missing, 101 total |
| Verification registrations in the seed lane plan | 21 | 21 |

BASE-AGENT-002 and BASE-AGENT-003 both retain main's stored missing judgment. The builder reports partial evidence below for lane judgment. The existing browser and runtime registrations carry both proofs.

CLAIM BASE-AGENT-002 PARTIAL points=none tests=tests/oncall-agent-fixtures.mjs#acknowledgeParity; tests/agent-door-browser.mjs#acknowledgmentBrowser

GAP BASE-AGENT-002: Full Core coverage and harness refusal, schemas and annotations, stable-error parity, other point 5 jobs, and embedded-agent registry and audit proof remain open.

CLAIM BASE-AGENT-003 PARTIAL points=4 tests=tests/oncall-agent-fixtures.mjs#declareFromAlertParity; tests/agent-door-browser.mjs#saved alert declarations

GAP BASE-AGENT-003: Other write links, complete discovery and role parity, missing-versus-scoped-out equivalence, grant byte budgets and broader untrusted-text markers remain held.

## Focused proof

- For ordinary acknowledgment the signed-in responder clicked Acknowledge and the equivalent MCP write named the same active responder. Both paths recorded matching Lead and Assignee, one incident and workspace revision advance and one permanent command.transition event. The agent-attributed history names the responder while retaining the distinct sponsor. The held case retained one open review. Both policies kept paging OFF and made zero outbound requests.
- For declaration readback the authenticated agent followed the actual returned resource_link in both policies. The full incident matched the admitted write and protected native state, including linked alert, copied runbook, revision and attributed declaration. The autonomous read completed directly. The held read opened a separate standard review and preserved the original write review. The read preserved the write result, native mutation custody and prior decision relay rows and appended exactly one relay row. Paging stayed OFF with zero outbound requests.
- The browser packet contains synthetic human and agent incidents under both policies at 1440 and 390 pixels. The committed journey makes the viewport-dependent assertions at 1440 and captures both presentations. The selected PNGs were checked for dimensions and screened for email addresses.
- The generator's write and check passed on the combined source before restoring the generated views. A check on the committed view then reports that ACCEPTANCE.md needs regeneration, with zero contract prose errors or warnings. The lander owns that view update and the full Base publication scan.

## Product push

Fresh main was still d376e47b188ba8688ec7413341363fc7723c99dc immediately before push. The pre-push rebase preserved the locally tested SHA. The fleet push guard published cloud/sd-oncall-c-f289-f290-lin-1 at 71c2f9235545e5392046cc2e155339faa9269e43 on its first attempt at 2026-11-19T12:50:13Z. Git remote readback advertised the same SHA. All four candidate authors and committers matched the fleet identity, with no commit trailers. The exact-SHA push created Verify run 44527593846.

## Local verification results

The workflow permission check, pinned edition source-lock check and seed dependency setup passed. The Verify build script passed on Node 22.20.0 and pnpm 10.12.4 in its declared order: first-party rer check, production build and TypeScript typecheck. The full existing agent-door browser script and the agents runtime entry point both exited successfully on the same SHA. LOCAL-VERIFY.md records the commands, timing and selected probe output.

The declaration observation retains its historical source line references. In the combined tree the native command, audit and link are at lines 145–152 of src/agent-door/coordination-tools.ts.

## Exact-SHA branch Verify

[Verify run 44527593846](https://github.com/just-every/run-oncall/actions/runs/44527593846) completed on the pushed SHA. The plan, shared build, all eight test shards and full-push-proof succeeded. The contract-docs job failed in the documented generator check. The final verify job requires the result of that check and failed with it. The checkout reproduces the stale ACCEPTANCE.md view, and the generator passes when it renders that view from the candidate CONTRACT.md. This is the generated-view exception in the builder brief. The local build and touched journeys all passed on the exact published SHA.

The two failed job archives were retrieved once each. The contract-docs archive identifies ACCEPTANCE.md as the sole differing view and reports zero contract-prose errors or warnings. The final verify archive records successful plan, build and shards alongside the failed contract-docs result. GITHUB-VERIFY.json contains the exact-SHA run and job results and the two sanitized archive observations. Seven GitHub CLI calls were used.
