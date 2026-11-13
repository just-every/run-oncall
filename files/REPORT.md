# Oncall 0.5.11 release metadata — sd-oncall-release-0-5-11

Repository: just-every/run-oncall
Branch: cloud/sd-oncall-release-0-5-11
Candidate: e13e2e8004504869919918f433bd8c1a2a86dac1
Base: cc64205ca532de3ac8022838ecdd07cfa5bfae73
PR: none; this metadata candidate uses the guarded fleet lander, with no seed instruction requiring a PR.
Status: READY; Verify completed/success on the exact candidate SHA.

## Plan and scope

The complete executed plan is PLAN.md. Configured the fleet identity first, refreshed the supplied launcher, installed bundle-only Git authentication and the cloud push guard, and installed/reinstalled the Codex/OpenAI trailer cleanup hooks around dependency setup. Cloned only the declared write repository, shallow with blob filtering. Deepened that clone only to compare v0.5.10 with main; no other repository was cloned or changed.

Confirmed main remained the observed SHA and had completed/success Verify 43360520479 and Run site 43360520503 on that exact SHA. Latest published release was Oncall 0.5.10, published 2026-11-12T14:03:26Z at https://github.com/just-every/run-oncall/releases/tag/v0.5.10. Tag v0.5.11 and main's 0.5.11 version were absent before editing. Remote release branches and open PRs contained no competing 0.5.11 candidate. Fleet INBOX/STATE were neither read nor written.

Compared the actual tag tree with main rather than repeating commit titles. Some readable-source-sample commits are in the ancestry but add no net source changes relative to v0.5.10, so those are not advertised as new. The net product change is the agent analytics extension: response reports, scheduled load and alert noise under service grants, and a readiness view requiring workspace-wide grants. Notes preserve the limits: sensitive evidence remains policy-controlled; scheduled hours do not establish worked hours or interruptions; readiness does not prove pager coverage; usage/cost and team load are not included. Test-clock maintenance is omitted from public product notes.

Updated package.json, seed.json and RELEASE.json to 0.5.11, with previousVersion 0.5.10 and date 2026-11-13. Prepended a matching CHANGELOG section and upgrade instructions while preserving all older release notes and upgrade instructions. Updated only the existing current-version references in README.md and RELEASE.md. Regenerated sources.lock.json last with the documented tool. No package-lock.json exists in this checkout; the pnpm dependency lock has no package-version field and was left unchanged. No dependency or rer pin change: rer remains 0.2.108.

## Files and counts

Product changes: package.json, seed.json, CHANGELOG.md, RELEASE.json, README.md, RELEASE.md and sources.lock.json. Seven files; 23 insertions and 19 deletions. Product patch is product.patch. Only the six changed metadata hashes differ in the source lock.

Version: 0.5.10 -> 0.5.11.
Migrations added: 0. Existing migrations unchanged.
Tests added/modified/removed: 0/0/0. No local test suite, app setup, build or browser proof was needed or run for this metadata-only update.
Clauses before -> after: 26 DONE / 41 PARTIAL / 34 MISSING / 101 total -> 26 DONE / 41 PARTIAL / 34 MISSING / 101 total.
Core: 25 DONE / 35 PARTIAL / 24 MISSING; Agent surface: 1 DONE / 6 PARTIAL / 10 MISSING, unchanged.
Clause status changes: none. No CLAIM, DEFAULT or GAP promotion is made. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md stay byte-identical to the base.

## Validation and custody

- Frozen dependency install passed (pnpm 10.12.4). Local toolchain selected Node 24.19.0, above the repository's declared 22.20.0; pnpm printed its engine warning. CI uses the declared Node version.
- pnpm exec rer check: exit 0 (silent result), metadata-check.txt.
- pnpm run typecheck: exit 0, typecheck.txt.
- Metadata consistency inspection: passed; matching version/date/previousVersion/notes, preserved histories, unchanged pins and excluded scope, metadata-consistency.txt.
- node scripts/edition-authoring/cli.mjs lock, then check: exit 0, source-lock-write.json and source-lock-check.json.
- git diff --check: exit 0.
- Refetched main before committing; it remained cc64205ca532de3ac8022838ecdd07cfa5bfae73. Rebased the unpublished candidate onto origin/main before its first push; already up to date.
- Inspected every candidate author and committer, trailers and full messages (including side parents); fleet identity only, no trailers. The original pre-push hook repeats this validation on each guard push attempt. Candidate identities are in candidate-identities.txt.
- First real commit was pushed immediately through cloud-push.py. One successful attempt; no retry, force push or published-history rewrite. product-push.txt records actual custody.
- Exact candidate Verify: https://github.com/just-every/run-oncall/actions/runs/43362037584; results are recorded separately in the CI receipt.

Full-history publication scanning, guarded landing, signing, producer/tag and GitHub Release publication belong to the Mac fleet and later release operators. No scanner unsupported by this cloud was invoked. No main push, tag, signing, deployment or release publication was performed. This is metadata preparation, not a RELEASED claim; a tag alone would remain RELEASE-PENDING under the release rules.

Evidence is published separately to refs/heads/evidence/sd-oncall-release-0-5-11, with explicit non-secret packet selection. It does not change product readiness. Final CI result and dependency-cleanup receipt are attached before publication. The scratch clone is removed after successful product/evidence custody verification. No product or local-check blockers. Exact-SHA Verify passed.

## Terminal CI receipt

Observed at 2026-11-13T04:14:55.280138+00:00. Verify 43362037584: completed/success; head e13e2e8004504869919918f433bd8c1a2a86dac1. URL: https://github.com/just-every/run-oncall/actions/runs/43362037584. API calls used: 10/10, one watcher, at least 300 seconds between run discovery/status reads. No re-dispatch or rerun was requested.

Main baseline gates: Verify 43360520479 success, Run site 43360520503 success, both at cc64205ca532de3ac8022838ecdd07cfa5bfae73.

READY branch=cloud/sd-oncall-release-0-5-11 head=e13e2e8004504869919918f433bd8c1a2a86dac1
