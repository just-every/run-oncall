# gr-mt-oncall-code-1

Author: Run Edit Run fleet, 17 November 2026.

Repository: just-every/run-oncall. Branch: cloud/gr-mt-oncall-code-1.
Candidate: 3f73b67596555cf5ee43ffcdf336dd0907ba93d1.

## Finding and change

CodeQL alert 16 (js/overly-large-range) identifies the session-cookie value expression in src/modules/portability/cli-options.mjs. The former printable ASCII ranges admitted comma and backslash. Those characters are outside the intended RFC 6265 cookie-octet grammar. The fix expresses the five allowed ASCII ranges with explicit hexadecimal escapes. It also removes the redundant separate semicolon check, since the character class excludes it.

Changed product files:

- src/modules/portability/cli-options.mjs: enforce cookie-octet ranges and explain the grammar.
- tests/portability-cli.mjs: one CLI integration journey with a real loopback HTTP endpoint, three accepted values covering all permitted cookie octets, and twelve malformed values. The accepted Cookie header must arrive unchanged; malformed session files must fail before HTTP and keep their contents out of diagnostics. Child commands have a five-second timeout, and the server and temporary files are closed in finally.
- scripts/verify-shards.json: include the journey in the existing runtime lane.
- sources.lock.json: regenerate hashes for those three files with the pinned edition authoring package.

## Verification

The original main version failed the added journey as expected: it forwarded the malformed comma-containing cookie. The fixed implementation passed all fifteen CLI inputs. The focused journey and pnpm run typecheck passed with Node 22.20.0 and pnpm 10.12.4. Source-lock generation and check passed. Git whitespace validation passed. Actual logs and structured command results accompany this report.

No full local suite, app setup or browser run was needed for this Node-only CLI change. No UI changed. CodeQL itself was not rerun locally; remote code-scanning dismissal remains GitHub's determination.

## Counts and clauses

One CLI journey added. Verification-plan entries: 20 before, 21 after. Existing entries were neither deleted nor weakened. Contract judgments unchanged: 26 done, 41 partial, 34 missing, total 101 both before and after. No target acceptance clause was promoted or demoted, and CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are unchanged.

## Plan and defaults

The full plan is in PLAN.md: inspect instructions and CLI; restrict cookie octets; prove actual CLI forwarding/refusal; typecheck and lock; commit, synchronize, scan and push the named branch; inspect exact-SHA Verify; return separate evidence custody. Use the RFC cookie grammar as the existing validator's intended character set. No owner ruling or production account operation is required.

## Publication and CI

The pinned Base publication scanner inspected exact commit 3f73b67596555cf5ee43ffcdf336dd0907ba93d1 and tree c471899750153debc8703fa2264de55c6c0bff22. Result: COMPLETE/PASS, zero current findings, history scanned and injected-environment matching checked. It inspected 1,213 commits, 1,167 trees, 7,304 blobs, 1,213 commit messages and 25 tag messages. Four entries already in public history remain in the report's preExisting list. None is newly introduced. The full value-free scanner report and publication receipt accompany this report.

The initial invocation's only finding was destination.invalid because it supplied incomplete destination context. The corrected invocation used the committed logical project and credential-free repository URL, passed the destination validator and completed the full passing scan. No scanner policy or source was changed.

All candidate commits, including side parents, were inspected. The sole candidate has fleet author/committer identity and no trailers. The cloud push guard published the product branch on its first attempt; a Git remote probe verified the exact SHA. No main push or PR was made. Exact-SHA Verify run [44079698768](https://github.com/just-every/run-oncall/actions/runs/44079698768) completed with success on 3f73b67596555cf5ee43ffcdf336dd0907ba93d1. One watcher made 3 REST queries, each at least 300 seconds apart; the actual response summaries and timestamps are in ci-receipt.json. No failure logs, workflow retries or workflow dispatches were needed.

## Recovery and return

The maintenance result.json is saved at $HOME/rer-consolidation/work/maint/gr-mt-oncall-code-1/result.json and copied into the report packet. The clone remains available at $HOME/rer-consolidation/work/maint/gr-mt-oncall-code-1/repo. Complete relevant reports and receipts are selected explicitly for the separate evidence/gr-mt-oncall-code-1 ref. Evidence publication does not authorize product landing. Blockers: none. The product is a READY candidate at the pushed SHA, subject to the fleet’s independent landing gates. No default-branch write, deployment or production operation was performed.

## Return packet

The selected evidence packet includes this report, the complete plan, verification and publication receipts, the exact-SHA CI receipt, result.json, focused test and typecheck logs, final source-lock check output, the push receipt and both actual publication scan reports. The earlier source-lock generation log is retained locally; the final source-lock check is the applicable proof. Every selected file is a regular file, and the packet was checked against injected secret values before transport.
