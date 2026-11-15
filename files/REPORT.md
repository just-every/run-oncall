# gr-mt-oncall-dep-7 maintenance result

Author: Run Edit Run fleet. Date: 2026-11-15.

Outcome: no-change (security workflow outcome: no_change). The supplied affected range is already absent from current default main. This is an already-fixed report, not a claim that the original advisories were false positives.

Repository: just-every/run-oncall.
Local branch: cloud/gr-mt-oncall-dep-7.
Exact product HEAD and origin/main: de562d49f481af1827a59112dd172dbcc63ae033.
Remote refs/heads/main was independently probed twice and matched that full SHA.
Existing fix: c682f802d4ae3e34caa65c5c99e9c2b45f715844, Update vulnerable undici and zod dependencies, 2026-11-14T14:07:35Z; it is an ancestor of current main.

## Plan and completed work

1. Set fleet Git identity, read and refresh the supplied launcher, install the decrypted-bundle Git helper and push guard, and read launcher AGENTS.md.
2. Clone only the declared repository with complete history and blob filtering into work/maint/gr-mt-oncall-dep-7/repo, configure its identity, and create the named cloud branch from origin/main.
3. Read repository AGENTS.md, CLAUDE.md, CONTRACT.md, ACCEPTANCE.md, both manifests, both lockfiles and Verify workflow. Follow the supplied inline RULES.md. No INBOX or STATE was read or written.
4. Inspect the reported package, all actual undici package/snapshot records and incoming dependency edges in both graphs; compare manifest overrides/importer specifiers; inspect the existing fix and prove it is on current main. Obtain independent read-only investigation and review under the security-fix workflow.
5. Use pnpm 10.12.4. The provided toolchain accepts a newer ambient Node, so additionally install/use exact Node 22.20.0 for final structural and frozen validation. Validate without regenerating or changing an already-correct lockfile.
6. Discover existing exact-SHA workflow results in one GitHub REST call. Record no-change result.json, report and actual receipts outside the product tree. Publish only the explicitly selected evidence packet to evidence/gr-mt-oncall-dep-7.

## Dependency and security evidence

The invariant for this assignment is that every npm undici runtime dependency recorded by both independent pnpm dependency graphs resolves to >=7.30.1. The supplied GHSA-4w7w-5xrc-9h26, GHSA-2m5v-pch6-74hx, GHSA-qrxm-fqhp-jwvm and GHSA-9fm3-97px-rjf6 affect >=7.0.0 <7.30.1.

- package.json:66 and src/modules/mail/package.json:16 both have pnpm.overrides.undici = 7.30.1.
- pnpm-lock.yaml:10,1203,2220,2358 consistently contains override 7.30.1, exactly one undici package, the Miniflare dependency edge, and exactly one snapshot.
- src/modules/mail/pnpm-lock.yaml:9,271,467,515 contains the corresponding consistent records.
- Both package records have the same sha512 integrity and Node engine >=20.18.1, satisfied by the pinned Node 22.20.0.
- Root consumers: direct dev miniflare, and @cloudflare/vite-plugin / wrangler through the same miniflare 5.20260907.0-alpha. Mail consumer: dev miniflare 5.20260907.0-alpha.
- undici-types@6.21.0 is a separate types-only package, not a vulnerable undici runtime.
- Historical parent of the existing fix had undici 7.29.1 in each graph. Current main has undici 7.30.1 in each graph.

Counts at task start -> finish: affected undici runtime package records 0 -> 0 across both graphs; patched records 2 -> 2. Historical existing fix: affected records 2 -> 0. Eight supplied alerts represent four advisories across two graphs; alert closure status was not queried or changed.

This establishes absence of the affected package versions; no local exploit reproduction, HTTP/TLS/WebSocket runtime proof or claim about other advisories is made. No new enforcement boundary was needed: pnpm's existing per-manifest override is already the shared resolution constraint. Since the product tree is unchanged, this task introduces no legitimate-behavior/API changes.

## Ordered verification and commands

PASS: git ls-remote origin refs/heads/main (two freshness probes): exact HEAD match.
PASS: git show c682f802d4ae3e34caa65c5c99e9c2b45f715844 -- package.json pnpm-lock.yaml src/modules/mail/package.json src/modules/mail/pnpm-lock.yaml: shows both overrides and all runtime records upgraded from 7.29.1 to 7.30.1 by the existing fix.
PASS: git merge-base --is-ancestor c682f802d4ae3e34caa65c5c99e9c2b45f715844 HEAD (also run by retained verification script).
PASS: node <packet>/verify-locks.mjs on Node 22.20.0: parse both YAML graphs using the checkout's vendored YAML parser; verify overrides, importer specifiers, package/snapshot parity, every undici edge, patched semver range, integrity presence and fix ancestry. Actual structured results: dependency-receipt.json.
PASS: pnpm install --lockfile-only --frozen-lockfile --offline --ignore-scripts (root), pnpm 10.12.4 / Node 22.20.0.
PASS: pnpm --dir src/modules/mail install --lockfile-only --frozen-lockfile --offline --ignore-scripts, same versions.
PASS: git diff --exit-code origin/main and git status --porcelain=v1: no product diff or untracked product files.
PASS: git log origin/main..HEAD --format="%an <%ae>%n%cn <%ce>%n%(trailers:only,unfold)": empty candidate range; no new product commits.

The first lockfile-only checks also passed with the provided toolchain's Node 24.19.0 and pinned pnpm 10.12.4, emitting an exact-engine warning. Final retained validation.log repeats those checks with exact Node 22.20.0 and no warning.

NOT RUN: full dependency install, rer setup, rer build, typecheck, local application/runtime/browser tests, source-lock regeneration and publication scan. The task's explicit no-change option applies because the item is already fixed on current main; no product code, contract, docs or lockfile edit exists to validate, publish or land. Frozen lockfile-only validation does not claim tarball installation or runtime compatibility. Existing exact-SHA green workflows are recorded separately.

## CI and custody

One GitHub API call, loading GH_TOKEN from the refreshed bundle without logging it:
gh api 'repos/just-every/run-oncall/actions/runs?head_sha=de562d49f481af1827a59112dd172dbcc63ae033&per_page=100' --jq '[.workflow_runs[] | {id,name,status,conclusion,head_sha,html_url}]'

Actual receipt: ci-runs.json. All listed results are on the exact product SHA:
- Verify 43733750453: completed/success, https://github.com/just-every/run-oncall/actions/runs/43733750453
- Verify 43731408011: completed/success, https://github.com/just-every/run-oncall/actions/runs/43731408011
- Run site 43733750414: completed/success.
- Push on main 43733750230: completed/success.
- Run demo 43733750438: completed/skipped.

These are existing main runs, not newly triggered branch proof. No workflow dispatched or rerun, no PR created, no product branch pushed, no main push, no landing. Local named branch remains at existing main. A READY or PUSHED product claim would be inaccurate for this no-change result. Evidence publication is report-only and conveys no landing authority.

## Changes, defaults and remaining work

Product files changed: none. Product commits: none. Test registrations added/removed: 0/0. No clause status/text/evidence changes or CLAIM lines apply to this dependency-only no-change result. Contract summary stays Core 25/35/24, Agent 1/6/10, total Done 26 / Partial 41 / Missing 34 / Total 101.

Default adopted: use the brief's no-change result when current default main already satisfies the dependency requirement. Preserve all unrelated code and prose. A stale historical dependency note in SEED-COMMAND-CONTRACT.md still mentions 7.29.1; actual manifests and lockfiles govern resolution, and this task leaves unrelated prose intact.

Blockers: none for the no-change determination. Runtime verification was not repeated locally; existing exact-SHA CI is green. The security-fix skill's referenced artifact-storage resource was unavailable through its tool, so the user's explicit packet and result paths govern retained output. No additional repositories were cloned or modified.

The clone remains at work/maint/gr-mt-oncall-dep-7/repo as the maintenance brief's requested output; result.json is beside it and copied into the packet. No product changes or unpushed work require rescue. Packet files contain only non-secret reports, receipts and the one-off resolution verifier. Evidence transport uses an isolated report-only tree and leaves product checkout/head/index untouched.
