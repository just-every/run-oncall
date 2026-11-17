# Oncall 0.5.18 release metadata result

Author: Run Edit Run fleet
Date: 2026-11-17T07:16:55.596673+00:00

Repository: just-every/run-oncall
Branch: cloud/sd-oncall-release-0-5-18
Product head: 8dd2a0acf06b30fbc810c8a2a7e0fe8c01dd85ef
Parent and fresh main: fd4d3556a9eca484bf85651b5733086e102139b0
Previous release tag commit: 3b9cba555f564a4d582b9909305bc8d35c9c8bf1
PR: none created; the push returned a PR creation link only.
Product push: succeeded on the first guard attempt, with one product commit and one product push.
Exact-SHA Verify: run 44037138164, completed successfully on the exact product head.
CI URL: https://github.com/just-every/run-oncall/actions/runs/44037138164

## Plan and scope

The complete plan is in PLAN.md. The implementation followed that plan: inspect fresh main and the actual previous-release range; rule out a version collision; inventory migrations and unchanged guarantees; change the existing release metadata; install dependencies through the supplied toolchain; validate metadata, typecheck and contract documents; regenerate and check the source lock last; recheck fresh main and candidate identity; commit and push the named branch; inspect exact-SHA CI; publish non-secret evidence separately; clean up the clone after successful publication.

The product commit changes only CHANGELOG.md, RELEASE.json, RELEASE.md, package.json, seed.json and the regenerated sources.lock.json. There is no package-lock.json in this checkout. The dependency pnpm-lock.yaml required no change. Existing package, edition, deployment and product identities are preserved. No Base refresh was run. No tag, GitHub Release, PR, landing submission or main push was created.

Version changes: 0.5.17 -> 0.5.18, previousVersion 0.5.17, UTC release date 2026-11-17. No v0.5.18 tag or Release existed at the collision check; releases-before.json and remote-refs.txt record the observations. All earlier changelog text and buyer upgrade instructions are retained verbatim. The new instructions cover private local/hosted backup, stopping and upgrading the original checkout, detached release tags, hosted redeploy, deliberately changing mail selection, owner access with mail off, restore into an empty destination, erasure refusal, paused restored agents, expired approvals and keeping the existing pager authoritative.

## Actual release-range findings

The real v0.5.17..main range contains 11 commits, including an existing merge in main. The release candidate adds one ordinary commit directly above fresh main and introduces no merge.

The visible changes are the stranger trip fixes: recover or discard a waiting import review after reload; expose an existing-import conflict before confirmation and identify its earlier provider/file where retained; warn that a live imported schedule cannot be undone; explicitly confirm keeping another rota for a service that already has one; show a true next different coverage holder and merge continuous timeline bars; confirm a requested swap and explain PTO conflicts; show schedule-change authors correctly; restrict responder request response controls to eligible responders; avoid repeating setup after restored-owner confirmation; label demo pages as simulations with no delivery; and clarify import, incident, team and readiness guidance. The public notes are in release-notes.md and the product CHANGELOG section.

The additional native coverage-window, assignee-clear, follow-up and client parity rounds do not change those product implementations in this range. Their observed existing behaviours remain: exact override-boundary coverage, an Unassigned assignee retaining the separate incident lead, read-only viewer follow-up access, submission distinct from human acceptance, and conflicts when an approved follow-up submission's evidence has changed. Those observations are not advertised as new behaviour. The public notes omit test-only work.

## Before/after counts and clause status

- Migration inventory: 68 -> 68. Added, removed or modified migration files: 0. metadata-receipt.json lists every migration and SHA-256.
- Exact @runeditrun/rer pin: 0.2.118 -> 0.2.118.
- Core clauses: 25 done, 35 partial, 24 missing, total 84 -> unchanged.
- Agent surface clauses: 1 done, 6 partial, 10 missing, total 17 -> unchanged.
- Full target: 26 done, 41 partial, 34 missing, total 101 -> unchanged.
- Clause status changes: none. No clause is claimed by this round; no CLAIM line is emitted.
- Contract Status/Gap/Evidence, CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md: unchanged.
- Test registrations and product code changed by this round: none.
- Paging: OFF -> OFF.

## Local validation and custody

local-checks-receipt.json names the actual commands, results and log hashes. Setup completed successfully, applying all 68 local migrations and configuring the local owner; its temporary app stopped on exit. The private installer output is excluded from evidence because it can contain owner-entry links. Only its non-secret command and outcome are recorded.

The metadata consistency checks passed, including the three agreeing versions, previousVersion, unchanged rer pin and identities, empty migration delta, exact preservation of prior upgrade instructions and changelog, unchanged dependency lock and untouched contracts. Typecheck passed. Contract prose/documents check passed with 0 errors and 0 warnings. The installed pinned edition-authoring lock command ran last, updating only the five edited metadata files' hashes; its check passed. rer check and git diff --check passed. No full local Verify was run, following the touched-check rule; branch Verify supplies the full suite. No UI changed in this metadata round, so no additional browser proof is required.

The supplied toolchain used Node 24.19.0 and pnpm 10.12.4; the installed rer package is exactly 0.2.118. The helper retains a newer available Node rather than downgrading it; CI uses the repository's Node pin.

After the commit, main was fetched again and rebase reported already up to date, creating no rewritten commit. All origin/main..HEAD identities, messages and trailers were checked immediately before the push: one candidate with fleet author and committer, no co-author trailers, no skip marker and no candidate merge parents. identity-audit.txt and product-provenance.json record this. The cloud push guard succeeded at attempt 1, and a credential-free ls-remote confirmed the exact pushed product SHA while main stayed unchanged.

The fleet publication scan cannot run in this cloud, as the cloud adaptation explicitly states. It remains an independent fleet landing requirement. This report supplies no publication-scan, release, delivery, hosted-account or acceptance claim.

## CI and evidence

CI result: completed/success on 8dd2a0acf06b30fbc810c8a2a7e0fe8c01dd85ef, run 44037138164. ci-discovery.json, ci-poll-1.json, ci-poll-2.json, ci-poll-3.json and ci-receipt.json preserve the actual observations. The one REST watcher used four calls (discovery plus three polls) with intervals of at least 300 seconds. The Release collision lookup used one other call, for five of the ten allowed calls total. No dispatch, rerun or failure-log download was needed.

Evidence goes only to refs/heads/evidence/sd-oncall-release-0-5-18 through the supplied cloud_evidence.py entrypoint. The explicitly selected packet contains this report, the full plan, actual non-secret local/CI receipts, logs and range/provenance observations. No credentials, private installer output, environment dump, held-out gate data or symlink is selected. Evidence transport is separate from product READY and acceptance.

Blockers: none. Product custody: READY for independent fleet landing gates; not tagged, released or landed.
Cleanup: the pushed product clone and its dependencies will be removed immediately after successful evidence publication; the final custody message records the result.
