# gr-mt-oncall-dep-1 result

Repository: just-every/run-oncall
Outcome: verified no-change; GHSA-qx66-fv34-fjm8 already fixed on current default branch.
Local branch: cloud/gr-mt-oncall-dep-1
Product HEAD and freshly fetched origin/main: 8adae6c836f2fabda29e8a091b052450410c8ca5
Existing fix on main: d009af8859f38727c619df281f93920ca9afd5ed
Existing fix title: Security: TanStack Start 1.168.60 (GHSA-qx66-fv34-fjm8) (#18)

## Plan and completed results

1. Configure global and clone-local fleet identity, refresh the launcher, install the bundle-backed Git setup and commit-message hooks, and read launcher AGENTS.md plus the inline RULES.md.
2. Clone the declared repository with full history and filtered blobs into the assigned maintenance work directory; create the named cloud branch from origin/main. Read AGENTS.md, CLAUDE.md, CONTRACT.md, ACCEPTANCE.md, package.json, package-manager/Node pins and Verify workflow. No TESTING.md is present.
3. Inspect the current manifest and root lockfile before selecting an upgrade. Both dependencies already meet the advisory's first patched versions. Fetch main again; HEAD still equals origin/main.
4. Run the attached investigation script against the actual parsed manifest/lockfile. Check every affected package and snapshot record, every affected transitive dependency reference, manifest/importer agreement, clean working tree and existing-fix ancestry. All assertions passed. This script is report evidence, not a new product test.
5. Query Actions using the refreshed bundle credential in the gh process environment. Exact-SHA main Verify and tag nightly jobs are completed/success. Retain the actual sanitized API response as ci-runs.json. One GitHub API call used; no polling or log calls needed.
6. Return result.json with status no-change, leave product sources and history untouched, and publish only the explicit report packet on refs/heads/evidence/gr-mt-oncall-dep-1. No new product commit, product push, PR, default-branch write or deployment is needed under the brief's no-change exception.

## Dependency findings

| Dependency | Required patch | Current main before | After investigation |
| --- | --- | --- | --- |
| @tanstack/react-start | >=1.168.60 | 1.168.60 | 1.168.60 |
| @tanstack/start-server-core | >=1.169.39 | 1.169.39 | 1.169.39 |

Root package.json and pnpm-lock.yaml agree on the direct exact pin.
The lockfile contains exactly one package record and one snapshot record for each affected package. All three server-core references (from react-start-server, react-start and start-plugin-core) resolve to 1.169.39 and have matching snapshots. No override is needed.

Vulnerable affected resolved packages: 0 before / 0 after.
The three historical Dependabot references are addressed by these existing resolutions. This task did not query alert state or claim the alerts were administratively closed.
Product files changed: 0. Product commits created: 0. Product tests added/deleted/weakened: 0.
Clause statuses changed: none.
Generated counts unchanged: Core 25 done / 35 partial / 24 missing (84 total); Agent surface 1 done / 6 partial / 10 missing (17 total); overall 26 done / 41 partial / 34 missing (101 total).
CONTRACT.md, generated views and sources.lock.json are untouched; no regeneration is needed.

## Commands and validation

- git fetch origin main: passed; main remains 8adae6c836f2fabda29e8a091b052450410c8ca5.
- PACKET=<packet directory> node <packet directory>/verify-dependencies.mjs, after sourcing /tmp/rer-cloud-toolchain.sh from the checkout: passed. Actual full findings and SHA-256 file hashes are in dependency-receipt.json.
- git merge-base --is-ancestor d009af8859f38727c619df281f93920ca9afd5ed origin/main: passed.
- git status --porcelain: empty.
- git log origin/main..HEAD --format="%an <%ae>%n%cn <%ce>%n%(trailers:only,unfold)": empty; no unpublished product candidate commits.
- gh api 'repos/just-every/run-oncall/actions/runs?head_sha=8adae6c836f2fabda29e8a091b052450410c8ca5&per_page=100', selecting run metadata: passed.
- A broad content-history search was stopped because a filtered clone fetched historical blobs; the commit-message search and ancestry check established the pre-existing fix without that search.

Local dependency install, owner setup, build, typecheck and application journeys: NOT RUN. No product or dependency file was changed; validation uses source/lockfile inspection and already completed exact-SHA CI, rather than making a redundant upgrade. The prescribed toolchain setup selected pnpm 10.12.4 and retained the VM's compatible Node 24.19.0; no local build is claimed under Node 22.20.0.

Exact-SHA CI observations, all at 8adae6c836f2fabda29e8a091b052450410c8ca5:
- Verify (main push): 43487199874, completed/success, https://github.com/just-every/run-oncall/actions/runs/43487199874
- Verify (existing release cloud branch): 43482317147, completed/success, https://github.com/just-every/run-oncall/actions/runs/43482317147
- Nightly journeys (v0.5.13 tag): 43489531232, completed/success, https://github.com/just-every/run-oncall/actions/runs/43489531232
- Run site (main): 43487200024, completed/success, https://github.com/just-every/run-oncall/actions/runs/43487200024

No new branch Verify was requested, dispatched or rerun. Existing green runs establish current-main validation; they are not a claim that this task published a product branch.

## Custody and limits

Full local result: work/maint/gr-mt-oncall-dep-1/result.json, copied into this packet.
Complete evidence: REPORT.md, result.json, dependency-receipt.json, ci-runs.json and verify-dependencies.mjs.
No secret material, environment dumps, private gate material or symlinks are selected.
Evidence publication is separate from product readiness and landing. This task makes no READY or PUSHED product claim.
Base's publication scanner is not shipped in this environment; no product publication is attempted or required for the verified no-change outcome. Evidence uses only the prescribed report-only entrypoint.
No application/browser/server processes were started. The exploratory Git search was stopped by its own recorded PID.
Blockers: none to resolving this already-fixed maintenance item.
Default: accept verified no-change; do not introduce unrelated dependency upgrades or modify acceptance judgments.
