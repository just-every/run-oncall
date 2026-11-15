# gr-mt-oncall-code-11 maintenance report

Author: Run Edit Run fleet, 2026-11-15.

Repository: just-every/run-oncall.
Product branch: cloud/gr-mt-oncall-code-11.
Product head: e995ff2d930b0e17f4d480f7f085d85033f9355e.
Terminal custody: READY; product branch pushed and exact-SHA Verify completed successfully.
Base: 44ca722b6a5dde173b5253df7b5e0eab762df459.
PR: none created; existing repository workflow accepts branch pushes.

## Finding and fix

CodeQL alert 18 (js/redos) is valid. `scripts/delivery/base/native-export.mjs` validated the producer's `nativeExport.path` with a nested repeated character run and optional slash. A malformed suffix forced the regex to explore exponentially many partitions. The 256-character limit did not make this safe: a path containing slash, 254 ASCII letters and an exclamation point timed out after 1.5 seconds; a 28-character path did too. Comparable pinned Node 22.20.0 receipts run the unmodified baseline modules from their committed Git bytes in an isolated temporary directory, then run the fixed modules. The baseline 256-character path timed out at 1512 ms; the post-fix receipt rejects it in 31 ms including process startup; timings are measurements on this VM, not a portable performance claim.

The repeated group now requires a slash after each segment. Segment boundaries therefore have one partition. The last segment is handled separately, retaining root paths, nested paths, trailing slashes, unreserved ASCII characters, the 256-character bound and the existing dot-segment restrictions. Coverage validation for Durable Objects and virtual-table D1 databases is unchanged.

## Product changes

- `scripts/delivery/base/native-export.mjs`: replace the ambiguous path regex and explain its mandatory separator.
- `tests/native-export.mjs`: one bounded declaration-validation journey through `validateCandidateSpec`, with accepted paths and all supported binding combinations, malformed paths, traversal and delimiter refusals, and near-limit hostile suffixes. The child-process timeout turns a regression into a bounded failure.
- `scripts/verify-shards.json`: run this journey in the existing runtime shard.
- `base-copies.json`: acknowledge the intentional seed adaptation using the documented `adapt-base` command, preserving the recorded upstream baseline.
- `sources.lock.json`: generated last using the documented authoring command; checked successfully.

## Plan and execution

The complete plan is in PLAN.md. Fleet identity and commit hooks were installed before committing. The checkout was cloned with complete commit history and a partial blob filter. Only this declared product repository was cloned. Read-only Base scanner discovery used two gh API calls; the installed pinned rer package already includes the full scanner, so the fetched reference files were not substituted into it.

The focused regression was first run against main's implementation: it failed with ETIMEDOUT after its five-second child bound. The same committed journey passes after the fix. Eighteen supported declaration combinations pass and fifteen malformed path cases refuse. Existing tests were not removed, skipped or weakened.

The initial pre-commit rebase attempt refused the dirty checkout. After committing, the clean-checkout rebase against freshly fetched origin/main completed as up to date without rewriting this commit. No published history was rewritten.

## Checks and receipts

- `node tests/native-export.mjs`: PASS on Node 22.20.0, pnpm 10.12.4; regression-before.txt records the expected baseline failure and regression-after.txt records the pass.
- `pnpm run typecheck`: PASS on the pinned toolchain; typecheck.txt.
- `pnpm exec rer check --profile first-party`: PASS, exit 0; rer-check.txt (the successful check emitted no output).
- `node src/base/contract-docs.mjs check`: PASS, current documents, zero prose errors/warnings; contract-check.txt.
- `node scripts/edition-authoring/cli.mjs adapt-base scripts/delivery/base/native-export.mjs`: PASS, acknowledged the local bytes and mode.
- `node scripts/edition-authoring/cli.mjs lock` then `check`: PASS; source-lock-check.json contains the complete actual check result.
- `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check`: PASS using CI's installed-tool entry point; installed-source-lock-check.json.
- `git diff --cached --check`: PASS before the commit.
- Post-commit focused check: PASS, same head.
- Full local verify/build/browser suite: not run; the brief requires only touched local tests plus typecheck and exact-SHA branch CI. No UI changes require browser proof.

## Counts and clause custody

Root verification lane entries: 17 before, 18 after (one added declaration-validation journey). Native export path regression journeys: 0 before, 1 after. The fixtures are data inside that one behavior registration.
Contract totals before and after: 26 done, 41 partial, 34 missing, total 101. No clause text, status, gap or evidence changes are claimed; CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md were not edited. This maintenance fix does not assert completion of any product clause. No CodeQL server-side alert dismissal or closure is claimed; independent scanning must reassess the pushed code.

## Publication and CI

Base's installed pinned publication scan returned COMPLETE/PASS with zero findings on e995ff2d930b0e17f4d480f7f085d85033f9355e, tree b897fdb4ecdb7c62dbec1f48088e0fd12c482a6f, after inspecting 1182 commits, 1136 trees and 7113 blobs. Its public base was remote main; existing public-base observations remain separately classified in the complete receipt. Implementation: rer 0.2.113, Gitleaks 8.30.1. Product custody and evidence transport are separate.

The first publication invocation completed its inspection but returned FAIL solely for destination.invalid because its --repository argument was supplied as an owner/name rather than the scanner's required HTTPS URL. The original receipt is retained as publication-scan-invalid-invocation.json. The corrected invocation uses https://github.com/just-every/run-oncall, with the same candidate head and scanner implementation; no scanner rules or product bytes were changed.

The named product branch was pushed successfully on the first guarded attempt. `product-push.txt` records the exact push and the per-attempt identity/message check, including side parents. Every candidate author and committer is Run Edit Run fleet with the fleet address; there are no commit trailers. No other product branch, main, tag, PR, comment or release was written.

Exact-SHA Verify was discovered via REST: run 43719386291, https://github.com/just-every/run-oncall/actions/runs/43719386291, head e995ff2d930b0e17f4d480f7f085d85033f9355e. It was in progress at discovery; the second status poll returned completed/success on the exact candidate head. ci-final.json retains that response.

The initial exploratory Node 24 timing receipt is retained as redos-before-node24.json; redos-before.json and redos-after.json are the comparable pinned Node 22 measurements. Temporary baseline copies were removed after their bounded child processes exited.

## Toolchain and setup

The supplied launcher refresh succeeded. The exact fleet decrypted-bundle Git helper and push guard were installed, the global and clone-local identities were set, and the preserving commit hook was installed again after dependency setup. A clone-local pre-push hook also validates every candidate's author, committer and complete message on every guard attempt, including side parents.

`pnpm install --frozen-lockfile` succeeded with pnpm 10.12.4. The VM initially supplied Node 24; `npm install --prefix $HOME/.rer/toolchain/node-22.20.0 --no-audit --no-fund node@22.20.0` succeeded, and subsequent checks used the exact Node 22.20.0 pin through the supplied toolchain shell. No dev server, browser, deploy, setup account or provider operation was needed.

The pinned scanner is present in the installed @runeditrun/rer 0.2.113 package. `go install github.com/gitleaks/gitleaks/v8@v8.30.1` could not run because this VM's Go command rejects the install option. The official Gitleaks 8.30.1 Linux x64 release archive was then downloaded over HTTPS, its executable installed outside the product repository, and `gitleaks version` returned exactly 8.30.1. The actual publication scanner used that required version and completed successfully.

The first exact-SHA status poll still reported in_progress. ci-poll-1.json retains that response. The sole watcher waits at least 300 seconds between discovery and the first status call, then 600 seconds between later status calls to preserve the ten-call GitHub budget; no workflow dispatch or rerun was requested.

## Final result

COMPLETE: the valid CodeQL finding is fixed in code and covered by the bounded producer declaration journey. The exact pushed commit passed all touched checks, the complete passing publication scan, and Verify run 43719386291. `ci-discovery.json`, `ci-poll-1.json`, `ci-poll-2.json` and `ci-final.json` retain the actual REST receipts. Five explicit gh API invocations were used by this builder (two read-only source discovery calls and three CI discovery/status calls); the two publication scanner executions performed their own batched repository-reference inspection. No failed-job logs were needed, and no workflow was dispatched or rerun.

Blockers: none. Defaults: no owner ruling was needed. No clause status changes are claimed. The fleet still owns independent gate checks and landing to main. The task writes no inbox files; the final message relays the required POST line.

Evidence is explicitly selected from this packet and published only to evidence/gr-mt-oncall-code-11 through cloud_evidence.py. Product head/index/checkout remain unchanged by that report-only transport. The passing receipts do not claim a main landing, deployment or server-side CodeQL alert closure.
