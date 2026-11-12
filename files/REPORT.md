# Oncall 0.5.10 release metadata candidate

Repository: just-every/run-oncall
Branch: cloud/sd-oncall-release-0-5-10
Candidate: 05fd1923828dd77244c3d4a2bc1ed252e7efb121
Base: 37299328ad8c7baacfc3d0356aa49316650bb557
Previous published tag: v0.5.9 (59af2f80bb67eb3382828f5c736698491006254c)
UTC report started: 2026-11-12T12:27:27.569608+00:00

## Scope and plan execution

The complete plan is in PLAN.md. Fleet identity, bundle-only Git authentication, push guard and commit cleanup hooks were installed. The shallow filtered clone was deepened sufficiently to compare the actual v0.5.9 tag and main. At preflight, main carried version 0.5.9; no v0.5.10 tag, GitHub Release or cloud release branch was present. No live release peer was found in the available repository refs. Public v0.5.9 was published 2026-11-12T09:04:59Z.

Main 37299328ad8c7baacfc3d0356aa49316650bb557 was green: Verify 43215666179 and Run site 43215666308 completed/success on that exact SHA. Main also carried successful Verify 43212911864. The exact API receipt is main-ci.json. GitHub API calls 1-2 covered releases and main CI.

The product candidate changes only package.json, seed.json, CHANGELOG.md, RELEASE.json, RELEASE.md, README.md and sources.lock.json. The first six carry the version, public notes or existing version references; the source lock was regenerated last and checked. The pnpm checkout has no package-lock.json, so none was created. pnpm-lock.yaml and rer 0.2.108 remain byte-for-byte unchanged. RELEASE.json now identifies 0.5.9 as the previous version, lists zero new migrations and prepends a 0.5.9-to-0.5.10 backup/update/restore path while preserving the earlier upgrade instructions in full.

The release notes were derived from the 26-file diff since v0.5.9: clearer move-in review and copyable support details; a refusal naming adopted schedules that prevent undo; service-scoped, policy-controlled read-only agent triage; and paused agent authority with expired pending/in-flight approvals at restore publication. Prior readiness/checklist and transfer proof additions are not presented as new product features. Public notes contain no contract IDs, internal check claims or fabricated delivery guarantees. Paging remains OFF. This patch adds no migrations or dependencies.

## Before and after

- Version: 0.5.9 -> 0.5.10.
- rer: 0.2.108 -> 0.2.108.
- Product/test/homepage changes in this candidate: 0 -> 0.
- New migration files: 0.
- Contract counts at base and candidate: 26 done / 41 partial / 34 missing / 101 total, unchanged.
- Existing main changes since v0.5.9 include OC-052 partial -> done (the prior tag had 25 done / 42 partial / 34 missing). RELEASE.json records that inherited judgment. This candidate changes no clause status, Gap or Evidence; CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain untouched.
- No target clause claim lines apply to a metadata-only release candidate.

## Validation and product custody

Toolchain setup, edition source lock generation/check, first-party rer metadata check, typecheck, release/version consistency and scope assertions, and git diff --check all passed. Exact command/exit receipts are local-checks.json and source-lock-receipt.json, with metadata-check.txt and typecheck.txt preserving actual output. No local full suite, new tests or browser proof was requested or run for this metadata-only change. The toolchain selected Node 24.19.0 and pnpm 10.12.4 according to the supplied setup; pnpm warned that package engines specifies 22.20.0. Typecheck passed.

Main was fetched and rebased before the first candidate commit and push; main was unchanged. One real commit, without a CI-skip marker, was created with explicit fleet author and committer environment variables and the cleanup hook enabled. Every candidate commit and trailer, including side parents, was checked: both identities are Run Edit Run fleet <fleet@runeditrun.com>, with no trailers. candidate-identities.txt and candidate-messages.txt retain this inspection. The named product branch was pushed once successfully using cloud-push.py. product-push.txt is the actual sanitized receipt. Product checkout and index are clean.

Exact-SHA Verify 43217849539: https://github.com/just-every/run-oncall/actions/runs/43217849539 . Discovery found it in_progress; the single watcher polls the exact run through REST no faster than once per 300 seconds and within the ten-call budget. Final outcome is recorded below and in ci-watch-state.json / verify-poll receipts.

## Publication boundary

No PR was created: the supplied fleet contract uses the guarded Mac lander on this cloud branch, and repository instructions specify no additional PR requirement for this candidate. No main/default branch, tag, signing, GitHub Release, deployment or unsupported full-history publication scan was performed. The guarded Mac lander retains the publication scan and exact-head landing gates; producer/tag and signing/publication follow separately. This metadata candidate is not a claim that 0.5.10 has been released. The required GitHub Release readback/mechanical release check belongs to that later authorized publication operation.

Reports and actual non-secret receipts are kept in this packet and published only on evidence/sd-oncall-release-0-5-10, separately from product custody. Credentials, environment dumps, setup private state and held-out material are excluded. The product clone and dependencies will be deleted after successful CI/evidence preservation, as required; packet and transport receipts remain outside the clone.

## Final CI result and handoff

Exact candidate SHA 05fd1923828dd77244c3d4a2bc1ed252e7efb121: Verify 43217849539 status=completed conclusion=success; https://github.com/just-every/run-oncall/actions/runs/43217849539. GitHub API calls used: 7/10. No workflow was dispatched or rerun. The actual completed/success result meets the branch Verify requirement. No contract-generator exception was needed.

No product blockers were found. Main/tag/signing/publication remain with the fleet. The 0.5.10 metadata is prepared, not a publication receipt. The exact-SHA CI result, local command exits, clause counts and terminal product provenance are in CANDIDATE.json.

POST lanes/sd/INBOX.md: sd-oncall-release-0-5-10 metadata 0.5.9 -> 0.5.10; clause changes none (26 done/41 partial/34 missing unchanged); candidate 05fd1923828dd77244c3d4a2bc1ed252e7efb121; Verify 43217849539 completed/success; baseline Verify 43215666179 and Run site 43215666308 success; rer 0.2.108 unchanged; zero new migrations; product READY; guarded Mac publication/landing follows.

READY branch=cloud/sd-oncall-release-0-5-10 head=05fd1923828dd77244c3d4a2bc1ed252e7efb121
