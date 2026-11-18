# Oncall verification receipt

## Build and source

| Check | Result |
| --- | --- |
| Frozen dependency install and `npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive` | Passed. Applied 68 local migrations, created a local owner and stopped the temporary setup app. |
| `npx -y @runeditrun/rer build` | Passed. Rebuilt the production Worker and regenerated the declared deployment specification. |
| `node scripts/verify-oncall-build.mjs` | Passed in order. First-party Rer check, production build and TypeScript typecheck. |
| Packaged deployment specification comparison from `tests/runtime.mjs` | Passed. The built, packaged and declared plans compare deeply equal. |
| `pnpm run validate:release` | The checkout defines no such package script. Ran the pinned Rer release source validator `inspectSource` against the clean candidate instead. Seed, package and release versions match at 0.5.18. |
| `node src/base/contract-docs.mjs write` and `check` | Passed. Zero documents changed and zero prose errors or warnings. |
| Pinned edition-authoring `lock` and `check` | Passed. Regenerated from combined source and checked with toolchain 1.1.0. |
| `node scripts/verify-ci.mjs --check-workflows` | Passed. Workflow permissions and shared artifact names are valid. |

## Historical diagnostics

Historical Verify run 44130574848 reported four failed jobs.

| Command | Observed result |
| --- | --- |
| `gh run view 44130574848 --repo just-every/run-oncall --job 134207650528 --log-failed` | Exit 1. `failed to get run log: zip: not a valid zip file`. The command supplied no HTTP status. |
| `gh run view 44130574848 --repo just-every/run-oncall --job 134207650579 --log-failed` | Exit 0. Empty output. |
| `gh run view 44130574848 --repo just-every/run-oncall --job 134207650591 --log-failed` | Exit 0. Empty output. |
| `gh run view 44130574848 --repo just-every/run-oncall --job 134207650598 --log-failed` | Exit 0. Empty output. |

Each archive command ran once. No direct job-log blob downloads were made.

## Cloud test setup

The first Transfer attempt could not make an isolated local clone from the shallow partial checkout. Hydrating main's Git objects resolved that. The first hydrated run reached Chromium but failed when its socket path exceeded the Unix path limit. The next run used the pinned Node 22.20.0, pnpm 10.12.4, system Chromium with the repository tests' no-sandbox option, and a short scratch path with more than 15 GiB free. The recovery steps left product files and assertions intact.

## Product custody

- Rechecked main at `76e7ed5eb83d6cf3dba8b591a10cf63028eb4f4a` immediately before publication. The requested rebase reported the branch was current.
- Scanned the single candidate commit and its full message. Author and committer were Run Edit Run fleet <fleet@runeditrun.com>. The candidate had zero trailers and zero merge commits.
- The guarded push succeeded on its first attempt at 2026-11-18T00:08:40Z. The exact remote branch ref resolved to `588b45da0cdd4a0f09774688e48cce743552dbe2`.
- GitHub's push invitation to create a PR did not create one. This candidate is for the fleet lander.

## Four historical failure paths

| Journey | Result |
| --- | --- |
| `ONCALL_PRODUCT_JOURNEY=support-start node tests/product-browser.mjs` | Passed. Urgency policy details reopen after reload with the same rendered history. |
| `node tests/transfer.mjs` | Passed from a fresh isolated clone of the exact candidate. The native restore accepted the backup file, and the managed transfer finished all 24 recorded command outcomes. See `transfer-receipt.json`. |
| `ONCALL_PRODUCT_PART=settings node tests/product-browser.mjs` | Passed. The single related alert and its evidence disclosure were visible, and the settings journey finished. |
| `ONCALL_RUNTIME_PART=core node tests/runtime.mjs` | Passed. The packaged declaration matched, the emitted hosted build served linked pages, and the native runtime and held-data checks finished. |

## Extended browser run

The full local browser core reached and passed the workspace-link, rota, alert-history, and response-policy assertions. A later saved-email step hit a loopback `ECONNRESET` on `GET /api/email` in the unchanged `importedEmailBrowser` journey. The local diagnostic contained a synthetic session identifier, which was removed from the retained log. The raw diagnostic is excluded from this packet. The focused retry and changed-screen proof results are recorded below.

## Exact-SHA Verify

GitHub Verify run 44205374436 completed successfully for product head `588b45da0cdd4a0f09774688e48cce743552dbe2` at the 2026-11-18T00:23:45Z observation. The run was discovered by full head SHA and the final REST response confirmed the same head. [Verify run](https://github.com/just-every/run-oncall/actions/runs/44205374436)

## Follow-up verification and proof collection

- The pinned Node 22.20.0 build sequence passed again on the exact candidate. `ONCALL_VERIFY_LANE=hosted ONCALL_VERIFY_PREBUILT=true pnpm exec rer verify --non-interactive` passed the hosted application, hydration, agent-door and statement-size checks.
- The focused owner-faults journey passed all four phone formats, verified the archived rota and override data after browser restore, and recorded zero outbound requests. The focused Readiness journey also passed.
- `gh run download 44205374436 --repo just-every/run-oncall --name oncall-browser-evidence-browser --dir <scratch>` was refused by the artifact blob host with `Forbidden`. The packet uses local browser captures.
- Focused response-numbers and Events source journeys passed and supplied paired captures. Events source coverage retained the same alert address and request payload, recovery lifecycle, sample copying, and secret exclusion.
- The saved-email retry passed in isolation, including native activation and its one-time address. This resolved the local loopback transport failure without a product change.
- The exact-candidate `node tests/oncall-agent-resource-parity.mjs --browser` run passed all 36 protected native-to-agent parity cases, including the reviewed date range and plain timing labels. The paired review material captures show the completed durations and the human-reported recovery wording.
- The exact-candidate member coordination browser journey passed. Uploading an old backup after erasure still returned HTTP 409 and preserved the current workspace state.
