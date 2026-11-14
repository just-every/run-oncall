# Oncall v0.5.14 predecessor metadata repair

Task: sd-oncall-release-0-5-14-meta-fix-1
Repository: just-every/run-oncall
Branch: cloud/sd-oncall-release-0-5-14-meta-fix-1
Candidate: 4d1fc62d4d2b8bf90008ac87bbaa626bc1a5494b
Base: 54e2434253aeb8510759b15e3589ae2643d02abd
Report generated: 2026-11-14T10:52:09.855678+00:00

The predecessor in RELEASE.json changes from 0.5.12 to 0.5.13. Version remains 0.5.14. The only other product change is the RELEASE.json SHA-256 in sources.lock.json, regenerated last with the seed's documented command. The buyer instructions, public notes, rer 0.2.113 pin, migrations, package identity, edition identity and all other source bytes remain unchanged. Paging remains OFF.

## Plan and execution

1. Set global and repository fleet identity; refresh the existing launcher; install bundle-only Git authentication, push guard and preserved-repository commit hooks. Read launcher AGENTS.md, seed AGENTS.md, CONTRACT.md and ACCEPTANCE.md, and the inline builder and release rules.
2. Make one shallow --depth 1 --filter=blob:none clone of only just-every/run-oncall. Create the named cloud branch from main. Main is exactly the prior metadata commit 54e2434253aeb8510759b15e3589ae2643d02abd.
3. Independently read current main's tuple and public GitHub Releases and tags. The tuple was version 0.5.14 / previousVersion 0.5.12. The public non-draft Oncall 0.5.13 Release exists at https://github.com/just-every/run-oncall/releases/tag/v0.5.13 (published 2026-11-13T19:42:50Z). Tag object 97b1b608247524f068178de4004fb738e95907e5 peels to 8adae6c836f2fabda29e8a091b052450410c8ca5. No v0.5.14 tag was advertised; the exact Release-by-tag read returned HTTP 404. No release peer or changed tuple was observed. These are pre-edit observations, not a future release authorization.
4. Replace only the previousVersion string. Byte-for-byte reversal of that replacement reproduces main's original RELEASE.json. The actual edition id is just-every/run-oncall; no identifier was renamed.
5. Install frozen pinned dependencies and run affected metadata validation, typecheck and contract document freshness check. Regenerate sources.lock.json LAST and check it. Confirm that the lock's RELEASE.json entry is the only differing lock entry.
6. Commit once with explicit fleet author and committer environment and the cleanup hook active. Fetch and rebase origin/main before the first push; main had not advanced and rebase reported up to date. Inspect ALL candidate commit identities and complete messages, including side parents; there is one candidate commit, fleet author/committer, no trailers, and no skipped-CI marker. Push only the named product branch through cloud-push.py. Push succeeded on attempt 1; read back the remote branch SHA and verify the clean product checkout.
7. Discover Verify by exact candidate SHA and poll its REST run endpoint with one watcher, at least 300 seconds between calls for that run, within the ten-call budget. No workflow dispatch or rerun.
8. Keep the actual report and receipts outside the product clone, publish explicitly selected non-secret regular files to refs/heads/evidence/sd-oncall-release-0-5-14-meta-fix-1, and delete the clean pushed clone and dependencies after completing evidence publication.

## Validation

All local commands exited 0:

- pnpm install --frozen-lockfile
- pnpm exec rer check --profile first-party (success is silent)
- pnpm run typecheck
- node src/base/contract-docs.mjs check
- node scripts/edition-authoring/cli.mjs lock
- node scripts/edition-authoring/cli.mjs check
- git diff --check

Read-only calls to the pinned rer's inspectSource and releaseMessage validated the clean committed candidate's seed/package/release version agreement and release notes. Additional local receipt assertions confirmed previousVersion 0.5.13, buyer instructions beginning From 0.5.13, edition id just-every/run-oncall, rer pin 0.2.113, zero migrations and preservation of every unrelated release byte. No release producer function or CLI was invoked. Toolchain: Node v24.19.0, pnpm 10.12.4; the supplied toolchain accepts a newer Node than the 22.20.0 minimum, and pnpm printed its engine warning while typecheck passed.

Full local rer verify, full suite, UI/browser proof and new tests were outside this metadata-only brief. The complete publication scan and landing gates remain the Mac fleet's custody; no COMPLETE scan is claimed from this cloud.

## Counts and clause custody

Before → after: version 0.5.14 → 0.5.14; previousVersion 0.5.12 → 0.5.13; migration entries 0 → 0. Two files, two insertions and two deletions. Added tests: 0; deleted tests: 0; weakened or skipped tests: 0. Clause counts remain done 26, partial 41, missing 34, total 101. Clause status, acceptance text, gap and evidence changes: none. No clause completion claim applies to this metadata repair.

Producer invocations 0; tags created 0; tag pushes 0; GitHub Release publications 0; deployments 0; main pushes 0. No PR was created because this brief uses the fleet lander and forbids self-submit. Future producer command correction to the existing edition id remains SD custody after landing.

## Evidence and cleanup

The product branch contains only RELEASE.json and sources.lock.json. The packet includes actual local receipts, validation logs, pre-edit Release/tag readbacks, candidate identity/messages, product patch and remote readback. It excludes credentials, environment dumps, held gate material and symlinks. Evidence publication is report transport only and confers no release, acceptance, product READY or landing status.

The exact-SHA CI result will be recorded below and in CI-RECEIPT.json. The product checkout is clean and remotely preserved. The owned clone and dependencies will be removed immediately after successful final evidence publication; final terminal custody records that cleanup.

## Final CI and custody

Verify run 43587169224 completed successfully on the exact candidate 4d1fc62d4d2b8bf90008ac87bbaa626bc1a5494b.
URL: https://github.com/just-every/run-oncall/actions/runs/43587169224
Observed completion: 2026-11-14T11:11:30.970230+00:00
Explicit task GitHub API calls: 7 of 10 (two public Release reads, one exact-SHA discovery, four polls). The REST polls were separated by at least 300 seconds. No workflow was dispatched or rerun.

All local checks and exact-SHA Verify are green. No blockers remain. The product branch is a landing candidate, not a landed or released product. The full-history publication scan, final landing and future release producer remain the fleet's responsibility. The producer command must use the existing edition id just-every/run-oncall when separately authorized after landing.

The clean product checkout and dependencies are retained only for this final evidence transfer, then will be deleted. The plan and complete actual non-secret results and receipts remain in this packet outside the clone.
