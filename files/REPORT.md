# Oncall v0.5.12 release metadata candidate

Observed 2026-11-13T14:03:36Z. Repository: just-every/run-oncall. Product custody: READY.

Branch: cloud/sd-oncall-release-0-5-12
Candidate SHA: 1ab915f6efdfe3398c8d7645fe56e46e123299b6
Base main: 37fd6d2446588971e8c611b826461d01eb192a0d
PR: none; this seed uses the fleet guarded landing path. No self-submission was performed.
Verify: 43435925256 — completed / success
Verify URL: https://github.com/just-every/run-oncall/actions/runs/43435925256

## Plan and execution

The complete plan is in PLAN.md. Its executed sequence was: configure fleet identity and launcher/helper setup; shallow-filtered scratch clone; read seed and inline release rules; independently confirm main and release custody; compare actual released and main source trees; prepare version-only metadata; frozen dependency installation; affected metadata check and typecheck; fetch and rebase unpublished work onto fresh main; regenerate sources.lock.json last and check it; review the exact diff, commit identities and trailers; commit and push the named product branch through the guard; observe exact-SHA Verify; publish this separate report-only packet; remove the pushed scratch clone and dependencies after evidence publication.

## Before editing

Main remained 37fd6d2446588971e8c611b826461d01eb192a0d. Exact-main Verify 43400004963 and Run site 43400005000 were completed/success; main-ci-before.json records the independent REST readback. Latest published non-draft GitHub Release was Oncall 0.5.11, published 2026-11-13T06:43:55Z at https://github.com/just-every/run-oncall/releases/tag/v0.5.11. Annotated tag v0.5.11 is 20c636ce167fb7439b55c1cd13d380ebfbd35b40 and peels to source commit 457a0a194a0dc97f653cdc12224cae27b6f1a79f; released-source.json records both. The v0.5.12 tag and named candidate branch were absent from Git ls-remote before work, and releases-before.json contained no v0.5.12 Release. No duplicate release writer was observed. Only the declared product repository was cloned.

## Metadata changes

Version: 0.5.11 → 0.5.12. Source pin read from package.json: @runeditrun/rer 0.2.108 → 0.2.108. packageManager remains pnpm@10.12.4.

Exact changed paths:

- CHANGELOG.md
- README.md
- RELEASE.json
- RELEASE.md
- package.json
- seed.json
- sources.lock.json

package-lock.json does not exist in this checkout and was not created. pnpm-lock.yaml is unchanged because no dependency specification changed. seed.json and RELEASE.md carry existing release-version references. The README's existing release sentence names v0.5.12 as a candidate so it does not claim the unpublished tag is already the latest public release. Upgrade instructions add a private backup path, local/hosted upgrade and restore guidance, and explicit responder permission provisioning; earlier instructions are retained. RELEASE.json and CHANGELOG.md contain exactly matching notes. sources.lock.json was regenerated last by the documented vendored command; only the six metadata input hashes changed.

Public release notes:

Bulk incident actions now keep successful selections current for the next action, let you choose a selected incident as the merge target, and retain results after a merge clears the selection. Follow-up evidence links stay clickable, and administrators can edit the stakeholder audience of an existing business service. API clients and agents with Responders Read permission can look up active responders and administrators by name and ID before assigning responsibility; this remains subject to agent policy and grants no member-management authority. Saved guided agent policies reopen with their answers filled in; policies with settings those choices cannot preserve use the advanced document editor. Sender setup, audit history and Readiness show readable names, with request identifiers available under details. Test-event refusals explain how to retry or correct a key allowance, and PagerDuty-compatible tests can reuse the alert key for recovery without closing a declared incident. On-call timelines show a sideways-scroll hint whenever dates overflow. The pinned rer remains 0.2.108; this update adds no migration. Back up first, keep applied migrations unchanged and keep the existing pager active: paging stays OFF.

## Validation and counts

- Frozen dependency installation: PASS.
- Pinned rer check --profile first-party: PASS, exit 0.
- Typecheck: PASS, exit 0.
- Vendored edition-authoring lock and check: PASS, exit 0.
- Committed-source release inspector from pinned rer: PASS, clean committed tree and matching package/seed/release versions.
- Matching CHANGELOG/RELEASE notes, unchanged rer pin and no-migration consistency checks: PASS.
- Whitespace/diff scope review: PASS; seven permitted metadata/source-lock paths, 18 insertions and 14 deletions.
- Every candidate commit, including side parents: allowed fleet author and committer; no trailers. Product push: first attempt success, one product head published.

Local tools were Node v24.19.0 and pnpm 10.12.4, selected by the provided toolchain script. pnpm warned that package engines names 22.20.0; typecheck passed. No local full suite, build, new tests or browser journeys ran for this metadata-only lease. Exact-SHA branch Verify is the independent full check. No product source, tests, migrations, contract, generated view or homepage was edited. No contract generator write was necessary because CONTRACT.md is unchanged.

Before → after contract summary: done 26 → 26; partial 41 → 41; missing 34 → 34; total 101 → 101. Published clauses: 19 done, 3 partial, 0 missing, unchanged. Target/push-further clauses: 7 done, 38 partial, 34 missing, unchanged. Test changes: 0 added, 0 removed, 0 modified; existing registrations were not recounted for this version-only round. Clause status changes: none. No CLAIM status promotion is made.

## Custody, limitations and follow-up

Exact candidate Verify 43435925256: completed / success, on 1ab915f6efdfe3398c8d7645fe56e46e123299b6. Main observations are not substituted for candidate CI. No PR, tag, signing, GitHub Release publication, deployment, workflow dispatch/re-run, main push or landing submission was performed. Evidence publication is a separate report-only ref and never signals product acceptance or release publication.

The fleet's guarded local lander still owns the full-history publication scan, integration and landing. This cloud assignment explicitly defers that scan; no cloud publication-scan success is claimed. The later producer/signing/publication round must authorize and create the immutable release, preserve its envelope, publish the matching non-draft GitHub Release and run check-gh-release.sh successfully before saying RELEASED. Paging remains OFF. Live incumbent exports, provider delivery, independent standby, real-phone drills and cutover proof remain follow-up debts and do not hold this metadata preparation. Git's push notice reported 42 pre-existing default-branch dependency advisories (16 high, 22 moderate, 4 low); dependency changes are outside this lease.

Blockers: none observed for this candidate. Verify has passed on this exact head.

## Actual evidence

receipt.json is the structured terminal product receipt. PLAN.md, product.patch, changed-paths.txt, candidate-commit.txt, candidate-identities.txt, committed-source-check.json, metadata-check.log, typecheck.log, dependency-install.log, source-lock-write.json, source-lock-check.json, product-push.log, releases-before.json, main-ci-before.json, candidate-ci-discovery.json, candidate-ci-observed-at.txt release-note-evidence.md, main-changes-since-v0.5.11.txt, released-source.json and any candidate-ci-latest.json are actual non-secret artifacts from this run. They are selected explicitly for evidence publication. No credential files, environment dumps, held-out gate material or symlinks are included.
