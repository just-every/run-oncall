# Oncall portable contract anchor

UTC report date: 2026-11-13
Tag: sd-oncall-contract-anchor-2
Repository: just-every/run-oncall
Branch: cloud/sd-oncall-contract-anchor-2
Candidate: f563821f4f85b005ee1ced7675b34a358606e621
Base: 37fd6d2446588971e8c611b826461d01eb192a0d
PR: none; the repository exposes Verify on branch push and the fleet owns landing.

## Plan and execution

1. Set fleet author/committer configuration, read the launcher rules, refresh the launcher bundle, and install the supplied Git authentication, commit cleanup and push guards. Use a full-history, filtered clone of the declared write repository. Create only the named cloud branch from current origin/main.
2. Read repository AGENTS.md, CONTRACT.md, ACCEPTANCE.md, the generator and anchor implementation, the edition lock instructions, rer-project.json and Verify workflow. Find the original contract SHA from the coverage and ID maps. Inspect Lamp's recorded anchor through gh api only, without cloning or writing Lamp.
3. Reproduce contract_anchor_missing in a history-less scratch repository with exactly two new commits and no remote. Run the generator's anchor subcommand in the full clone using the original SHA, then prove the generated anchor works in a second two-commit repository without the original commit object.
4. Run the full-clone contract-docs check, the documented source-lock generation and check, and the typecheck. Run the scratch declared cheap verify steps; report any later failure without fixing unrelated product behavior.
5. Inspect the complete candidate diff, allowed files, identity and trailers; commit only ANCHOR.json and sources.lock.json. Push through cloud-push.py. Observe the existing exact-SHA Verify through REST at intervals of at least 300 seconds, within the ten-call budget.
6. Keep full non-secret reports and actual receipts outside the product tree. Publish the explicitly selected packet on the separate evidence ref. Delete successful product and scratch clones after publication; leave landing and the publication scan to the fleet.

## Implementation

The brief's generic scripts/contract-docs.mjs path is absent here. This repository's documented and CI path is src/base/contract-docs.mjs, which vendors the Base generator beside contract-anchor.mjs.

COVERAGE.json old.commit and ID-MAP.json old both name ab49afbe8bfc3f196b29aa1c82edc7647d8b743a. CONTRACT.md's provenance agrees. The generator rejects an --old value that differs from either declared original. The exact command was:

    node src/base/contract-docs.mjs anchor --old ab49afbe8bfc3f196b29aa1c82edc7647d8b743a

It reported:

    Recorded docs/contract/ANCHOR.json for ab49afbe8bfc3f196b29aa1c82edc7647d8b743a.

Lamp's existing ANCHOR.json, read via gh api, uses the same schema 1, original-commit and authenticated-object representation; its original commit is 0c54dbcd4352babe9163e1600b6b7c3e0c8d760e. Oncall's command uses Oncall's own original SHA. The generator records the original commit, necessary tree objects and source blobs with canonical base64 bytes; the reader verifies Git object identities. No content was hand-assembled.

Changed product files:

- docs/contract/ANCHOR.json: new generated portable anchor, 533175 bytes, SHA-256 2a0472bfd9fb5c8ac6d67a68cdeb48affac50c727137bc0ef63385eb260f7f1e.
- sources.lock.json: four lines registering that anchor and its digest; regenerated last with node scripts/edition-authoring/cli.mjs lock.

No product code, tests, homepage, CONTRACT.md, ACCEPTANCE.md or docs/CLAIMS.md changed.

## Local evidence

Before anchor, the full-history clone passed node src/base/contract-docs.mjs check. A scratch repository made from main's complete tree, git init, a root commit and a second fixture commit had exactly two commits, no remote, and failed the same command with exit 1:

    docs/contract/ANCHOR.json: contract_anchor_missing: original ab49afbe8bfc3f196b29aa1c82edc7647d8b743a is unavailable; record it with anchor --old <ref> in a checkout with history. Command failed: git rev-parse --verify --end-of-options ab49afbe8bfc3f196b29aa1c82edc7647d8b743a^{commit}
    fatal: Needed a single revision

After generation, the second scratch repository has exactly two commits, no remote, and no original commit object (git cat-file -e exits 1). Its complete committed tree equals the candidate tree, 8d5aa0e30c08e9d9a9c1084cb2c40a2e200b8872. The contract check exits 0:

    Contract prose: 0 errors, 0 warnings.
    Contract documents are current.

Full-clone contract check: PASS, exit 0, same output.
Documented source lock generation: PASS, exit 0.
Documented source lock check: PASS, exit 0; ok=true.
Full-clone pnpm run typecheck: PASS, exit 0.
Scratch pnpm exec rer check --profile first-party: PASS, exit 0, no stdout.
Scratch pnpm run typecheck: PASS, exit 0.
git diff --check: PASS.
Candidate clean worktree and exact scratch/product tree equality: PASS.
Injected bundle value comparison against new anchor (including decoded original objects) and source lock: zero matches. Values were held only in memory and never printed.

The toolchain script selected the installed Node v24.19.0 and the packageManager-pinned pnpm 10.12.4. pnpm warns that engines.node names 22.20.0; all requested checks passed. Dependency installation used the frozen lockfile, and fleet hooks were reinstalled after setup.

rer-project.json declares verify as pnpm exec rer check --profile first-party && pnpm run typecheck. These cheap steps passed in the scratch copy after the direct contract check. No later scratch verification failure was observed. No full local test suite, build, browser journey, provider action or deployment was run for this anchor-only change.

## Counts and claims

Before: 101 clauses, 26 done, 41 partial, 34 missing.
After: 101 clauses, 26 done, 41 partial, 34 missing.
Clause status changes: none.
CLAIM: none.
Tests added, removed, skipped or weakened: none.

## Publication and CI

One real product commit, without a CI skip marker, was pushed once successfully through the required cloud push guard. All commits reachable in origin/main..HEAD, including side parents, were inspected before push: the sole candidate author and committer are Run Edit Run fleet <fleet@runeditrun.com>, with no co-author trailers. No default branch or tag was pushed and no published history was rewritten.

Verify run: 43439350354
Exact SHA: f563821f4f85b005ee1ced7675b34a358606e621
URL: https://github.com/just-every/run-oncall/actions/runs/43439350354
Status: completed/success on the exact candidate SHA, observed 2026-11-13T14:25:14Z.
GitHub calls used: 6 of 10, including the Lamp reference read. The single watcher waited at least 300 seconds between discovery/status calls.

The fleet's publication scan is not available in this cloud environment. It remains a Mac landing gate, as the cloud instructions require. Evidence publication is separate from product READY, acceptance and landing.

## Blockers and scope limits

No blocker. Exact-SHA Verify is green. No clause ruling was required. No landing, status change or deployment was attempted. The successful product and scratch clones are removed after evidence publication; the complete packet remains.
