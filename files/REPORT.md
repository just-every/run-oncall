# gr-mt-oncall-dep-5 — seroval security dependency maintenance

Author: Run Edit Run fleet (Codex), 2026-11-15. Workflow: Codex Security fix-finding skill, with one independent read-only investigator and one independent read-only candidate reviewer.

Repository: just-every/run-oncall. Product branch: cloud/gr-mt-oncall-dep-5. Candidate: 5aa6831eab93dcc606f6ce89200b47bd87f55fa5. Product tree: 685cf33bfcec6b4c932dd0c809fefc22a1532c33. Base inspected: 98d633ee7d20ebbb1d68842eaab998bbdffb284b. No PR, landing, deployment, tag or default-branch push is performed by this cloud task.

## Change and dependency counts

pnpm-lock.yaml updates seroval from 1.6.7 to 1.8.1 through the existing supported TanStack ranges. The four direct framework consumers and seroval-plugins' peer all resolve the patched package. No parent/plugin bump, package.json change or override is needed. sources.lock.json records only the changed pnpm-lock.yaml SHA-256. Those two files are the complete product patch: 12 insertions and 12 deletions.

Before: one locked seroval version, 1.6.7, affected by the five supplied advisories. After: one locked seroval version, 1.8.1, zero versions in those supplied affected ranges. Total dependency package nodes remain 236 → 236. Unrelated dependency package changes: zero. The exact installed graph and structural YAML comparison are retained in dependency-graph.txt and lock-audit.json. This is dependency-remediation evidence, not a claim that GitHub has closed the five Dependabot alerts; alert closure was not queried.

Contract status counts are unchanged: done 26 → 26, partial 41 → 41, missing 34 → 34, total 101 → 101. Clause status changes: none. No application, UI, homepage, migration, contract source or generated acceptance-view file changed. Product test registrations added/deleted/weakened: zero. The one-off validation scripts live only in this evidence packet.

## Security boundary and compatibility

The supplied issues concern attacker-chosen typed-array constructors, RegExp source escaping in script output, malformed array/Sequence lengths, and deserialization invoking a forged source.on callable. The selected package rejects or safely encodes these representations while preserving ordinary structured values. All four installed TanStack parents declare ^1.6.7, and plugins 1.6.7 peers ^1.0, so 1.8.1 is in the supported graph. Its Node >=20 requirement is below the checkout's pinned 22.20.0. ESM/CJS exports and every seroval API imported by current consumers remain available.

Application /api requests use Hono and ordinary JSON with session authorization; Start serves the document shell. Private workspace JSON is escaped separately. No application server function or custom seroval adapter was found. This explains why no application transport redesign is needed; it is not a claim that arbitrary framework serialization is unreachable. REVIEW.md records source evidence, independent review conclusions and limits.

## Plan executed and local results

PLAN.md contains the full plan and the scanner adjustment. The clone uses full history and the fleet identity, clone-local co-author cleanup and preserved repository hooks. Node 22.20.0 and pnpm 10.12.4 were used. Main was fetched and the unpublished candidate rebased; it was already current. The candidate has one commit, explicit fleet author/committer, and no trailers.

- pnpm update seroval --depth 100 --lockfile-only: passed; only the intended package changed. A prior version-qualified attempt caused unrelated transitive updates; its lockfile was discarded before committing.
- pnpm install --frozen-lockfile: passed.
- cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive: passed. Its private output and generated credentials are excluded from evidence.
- cloud_run npx -y @runeditrun/rer build: passed, with existing Vite import/dynamic-chunk warnings.
- pnpm run typecheck: passed.
- node scripts/edition-authoring/cli.mjs lock, then check: passed. Only the lockfile hash changed.
- node src/base/contract-docs.mjs check: passed, zero errors/warnings; generated views remained current.
- cloud_run env ONCALL_RUNTIME_PART=core node tests/runtime.mjs: passed. The core journey completed in 160.5 seconds and exercised public HTTP authorization, state transitions, data retention/restore, audit rollback, revocation, restart and related behavior. Eighteen linked pages/files answered 200 in local hosted-mode execution. No live-provider proof is inferred.
- Bounded security-probe.mjs: seven checks passed, covering ordinary JSON/cross-JSON round trips, safe typed-array constructor handling, unknown constructor rejection, script-safe RegExp serialization, malformed array-like rejection, invalid Sequence doneAt rejection, and rejection of forged async-iterator source callables without invocation.
- browser-smoke.mjs: passed against emitted production Worker with /usr/bin/chromium and --no-sandbox. Owner bootstrap, hydration, protected service creation, interactive autosave and reload preserved the changed runbook, with no page errors. Assertions used 1440; synthetic screenshots show 1440 and 390.
- Structural lock audit and independent source review: passed, no concrete surviving bypass or legitimate-behavior regression found.

The security probe initially lacked fromCrossJSON's required options and the VM's atob function. Those harness defects were corrected; the retained probe and log are the successful executed version. No product code changed to satisfy a check.

The production build ran before the maintenance commit, against the changed lockfile; its embedded health source identity is the base SHA. Its actual log and this limit are retained honestly. The product candidate's exact-SHA Verify is the separate full verification wall. No full local rer verify was run because the cloud brief requires focused checks and full branch CI. No live account operation, mixed-release custom RPC protocol proof or provider deployment was required or attempted.

## Publication and custody

Base's maintained scanner is supplied by pinned @runeditrun/rer 0.2.113. Its required Gitleaks 8.30.1 Linux binary was downloaded through gh api and verified against the release asset's SHA-256 551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb. The initial Go installation attempt could not run because /usr/bin/go is not the Go language toolchain; the authenticated release asset path succeeded.

The first scan completed and found only ignored generated setup keys, local database and build files in the developer working tree. No reported finding was in the product commit. That value-free report is retained as publication-initial-worktree-scan.json. Following Base's sourcePublicationScan pattern, the publication tree is a clean git archive of the exact candidate with full-history mirror metadata attached. It is checked clean, has the identical candidate tree hash, and is scanned against the declared public remote main with known injected environment values checked in memory. No scanner policy is weakened and no finding is waived.

Final scan, push and exact-SHA CI status are recorded in product-provenance.json, publication-scan.json, validation-receipt.json, push-receipt.txt and CI receipt files when available. Evidence publication is separate from product readiness and goes only to evidence/gr-mt-oncall-dep-5. Report and receipt files contain no environment dumps, private setup output, credentials or held-out gate material.

## Remaining work/defaults

Contract clauses have no new claims or status changes. Ordinary mixed-version custom RPC compatibility is not separately tested because no application RPC definitions were found. Existing contract gaps and provider/human field-proof gaps remain unchanged. The Mac fleet owns final landing and its independent publication/verification checks.

## Terminal result

Outcome: fixed. Product branch cloud/gr-mt-oncall-dep-5 is pushed at 5aa6831eab93dcc606f6ce89200b47bd87f55fa5. Exact-SHA Verify run 43726517309 completed successfully: https://github.com/just-every/run-oncall/actions/runs/43726517309. Base publication scan is COMPLETE/PASS with zero findings. All required local touched checks passed. No blockers remain. No PR was required or created. The Mac fleet owns landing.

Before/after dependency counts: 236/236 package nodes; vulnerable seroval versions 1/0. Contract counts and clause statuses are unchanged. Evidence publication uses the separate evidence/gr-mt-oncall-dep-5 report-only ref; its exact transport head is reported in the final handoff.

READY branch=cloud/gr-mt-oncall-dep-5 head=5aa6831eab93dcc606f6ce89200b47bd87f55fa5
