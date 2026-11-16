# Oncall 0.5.17 metadata preparation

Author: Run Edit Run fleet (sd builder), 2026-11-16T21:05:16Z.

## Plan

1. Read fresh main, the seed instructions and the supplied release rules; compare the published v0.5.16 tree with main.
2. Check immutable tag and GitHub Release collisions before choosing 0.5.17. Keep rer and every dependency unchanged.
3. Update only existing release metadata, preserve buyer backup and upgrade guidance and list the exact added migration inventory.
4. Refresh main before publication, regenerate the pinned source lock last, run its check and the metadata/type checks, and commit with fleet identity and active repository hooks.
5. Inspect every candidate commit identity and trailer, push only cloud/sd-oncall-release-0-5-17 through the fleet guard, and inspect exact-SHA Verify within the ten-call API budget.
6. Publish this report and actual receipts only to evidence/sd-oncall-release-0-5-17; leave tagging, GitHub Release publication, publication scanning and landing to the fleet.

## Source review

Main: 82081ae6fb7e19c78760269a0283579be0b840bb.
Published v0.5.16 commit: 7f250f7e66f1377f7b4b773effd1c72e8854c025.
Seven commits since v0.5.16; release notes describe the landed mail-off follow-ups, Backstage and dry-run guidance, readable routing/incident labels and next eligible rota coverage. Internal CI and test work is omitted from public notes.
No v0.5.17 tag was advertised. GitHub Releases read returned no v0.5.17 release; the previous release is https://github.com/just-every/run-oncall/releases/tag/v0.5.16 (published 2026-11-15T21:07:22Z). No tag or Release is created by this task.

## Before and after

Package, seed, RELEASE.json and RELEASE.md: 0.5.16 → 0.5.17.
previousVersion: 0.5.15 → 0.5.16.
Exact rer dependency: 0.2.118 → 0.2.118; package.json, pnpm-lock.yaml and installed package agree.
Added migrations: 0 → 0. All 68 migration files are retained unchanged; the v0.5.16..main migration diff is empty.
Paging: OFF → OFF. Identities and dependency pins are unchanged.
Contract: no clause text, Status, Gap or Evidence changes; no claims made. Clause status counts are unchanged: 26 done, 41 partial, 34 missing, total 101. Test registrations are unchanged by this round.

Buyer instructions retain local export, private hosted D1 backup, original deploying checkout/credentials, detached-tag update, empty-destination restore and restore limitations. The new upgrade paragraph starts at 0.5.16 and retains all earlier upgrade paragraphs verbatim.

## Validation and custody

The committed product is `3b9cba555f564a4d582b9909305bc8d35c9c8bf1` on `cloud/sd-oncall-release-0-5-17`, parent `82081ae6fb7e19c78760269a0283579be0b840bb`. One product commit changes exactly the six leased metadata/source-lock files. Both dependency lockfiles are untouched (package-lock.json is absent; pnpm-lock.yaml has no root release-version field).

PASS: metadata consistency; exact rer package/lock/installed pin; unchanged dependency manifest except version; changelog/public-note agreement; complete earlier upgrade text preservation; empty migration diff; 68 retained migrations; six-file scope; `git diff --check`; `pnpm run typecheck`; `node src/base/contract-docs.mjs check`; pinned `edition-authoring/cli.mjs lock` followed by `check` (also checked after the pre-push no-op rebase); committed-source inspection; every candidate author, committer and trailer; clean checkout.

`rer setup --owner-email fleet@runeditrun.com --non-interactive` initially failed because metadata edits restarted Vite during setup (500 Parent environment not initialized); the retry after edits completed passed. No secret setup output is in this packet.

Fresh-main fetch remained at 82081ae6fb7e19c78760269a0283579be0b840bb; pre-push rebase was a no-op. The first real commit was pushed once using the fleet guard, succeeding on attempt 1. No PR, tag, Release or landing operation was performed. Main/default branches were never pushed. Base refresh was not run and no Base repository was cloned.

Exact-SHA Verify: https://github.com/just-every/run-oncall/actions/runs/43957032360. Result: completed/success on the exact product SHA at 2026-11-16T21:23:55Z, run ID 43957032360. Five total GitHub API calls were used, including release discovery. One watcher read this run at least 300 seconds apart. There were no failed jobs to inspect. The cloud instructions defer the complete publication scan to the Mac fleet; this packet makes no completed-scan, landing or RELEASED claim. Fleet evidence is kept outside the product tree. No product or UI change is made, so browser proof is not applicable.


## Terminal result

READY branch=cloud/sd-oncall-release-0-5-17 head=3b9cba555f564a4d582b9909305bc8d35c9c8bf1

No unresolved blocker. Clause status changes: none; no CLAIM lines. No local full-suite or browser run was added for this metadata-only change; the exact-SHA branch Verify passed. The fleet still performs its independent publication and landing gates. This result does not claim a published release or landing.

The complete actual non-secret packet is selected explicitly for the report-only evidence ref. The product checkout remains clean and is removed only after successful evidence publication and ref verification.

Author: Run Edit Run fleet, 2026-11-16 (UTC).
