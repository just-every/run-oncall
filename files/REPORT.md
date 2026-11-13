# Oncall v0.5.13 release metadata preparation

Report recorded 2026-11-13T18:26:00Z. Repository: just-every/run-oncall. Product branch: cloud/sd-oncall-release-0-5-13. Pushed head: 8adae6c836f2fabda29e8a091b052450410c8ca5. Product remote readback matches the full candidate SHA. No PR was created: this brief uses the fleet's guarded branch lander.

## Plan and scope

The complete plan is in PLAN.md. Read the supplied builder/release rules, launcher AGENTS.md, seed AGENTS.md and contract documents. Configured fleet identity, active coauthor-cleanup hook, bundle-only credential helper, push guard and the cloud toolchain outside the product tree. Cloned the declared repository shallow with blob filtering, and deepened only to inspect the prior release's actual changes.

Observed main 551efe44531c876c101ec928b5a93f857976e132, exact-SHA Verify 43476288068 completed/success and Run site 43476288093 completed/success. Latest public release was non-draft Oncall 0.5.12 at https://github.com/just-every/run-oncall/releases/tag/v0.5.12, published 2026-11-13T15:39:37Z. Tag-prefix lookup returned no v0.5.13; the recent releases lookup including drafts returned no v0.5.13, and Git ls-remote found no competing release branch matching this version. The actual main delta consists of 4fa65b7023d8443bdea2e1aed9e46ca4a2467b56 (portable contract anchor) and 551efe44531c876c101ec928b5a93f857976e132 (rer 0.2.113 adoption). Preflight observations are retained in preflight-receipt.json and release-ownership-check.json.

## Changes

Version 0.5.12 -> 0.5.13 in package.json, seed.json, RELEASE.json and existing current-version prose in README.md and RELEASE.md. Added the dated 0.5.13 CHANGELOG.md section, matching RELEASE.json publicReleaseNotes exactly. Corrected RELEASE.json previousVersion from its inherited 0.5.10 to the actual previous public release 0.5.12; prepended backup/update/restore instructions for that transition and preserved every historical instruction verbatim. Recorded the adopted agent policy event metadata addition. Regenerated sources.lock.json last with the documented vendored command; only the six edited metadata files' digests changed.

The exact changed paths are package.json, seed.json, CHANGELOG.md, RELEASE.json, README.md, RELEASE.md and sources.lock.json. package-lock.json does not exist and was not introduced. pnpm-lock.yaml and the actual package.json rer pin 0.2.113 are unchanged. There are no product, test, migration, contract, generated-view, homepage or workflow edits. Public notes describe the adopted local launch guidance, export progress, earlier stale-archive refusal and policy event metadata; they contain no contract IDs or unproved paging guarantees. The portable contract anchor is recorded here as source provenance, not a new feature claim.

## Validation and custody

Passed frozen dependency installation, pnpm run typecheck, pnpm exec rer check --profile first-party, metadata/version/changelog/upgrade/scope agreement reader, documented source lock generation and check, installed rer package source lock check (the CI reader), unchanged contract-view check, installed release inspectSource on the clean committed HEAD, and git diff --check. Raw check output and validation-receipt.json are included. Local full-suite/build/browser execution was not run because the version-only lease requires metadata checks and typecheck only. The cloud toolchain selected Node v24.19.0 and pnpm 10.12.4 under the supplied shim; pnpm warned about the exact Node 22.20.0 engine pin. Typecheck and checks passed; CI uses the repository's pinned Node.

Fetched main and ran the required rebase before the first publication; main had not drifted and no replay or conflict occurred. Regenerated and checked the source lock after that rebase and confirmed the checkout remained clean. The sole candidate commit has fleet author and committer and no trailers. Checked every origin/main..HEAD candidate, including side parents, plus its complete message. Published the first real commit through cloud-push.py in one successful attempt, without tags, main changes, signing, publication, deployment, CI dispatch/retry or self-submission. The full publication/history scan belongs to the fleet Mac lander and was not run in this cloud task.

## Counts and clause status

Before and after: Core 25 done / 35 partial / 24 missing (84); Agent surface 1 done / 6 partial / 10 missing (17); total 26 done / 41 partial / 34 missing (101). No clause status, gap, evidence or acceptance text changed. Test files 77 -> 77; tests added/removed/changed 0/0/0. Migration files 67 -> 67; new migrations 0. Source-locked files 1669 -> 1669. Seven metadata/document/lock paths changed. counts.json retains the observations.

## CI and follow-up

The first exact-SHA workflow discovery at 2026-11-13T18:24:20Z returned zero runs; this is pending discovery, not green. A single bounded REST watcher uses at least 300 seconds between calls, within the ten-call GitHub budget. The final read at 2026-11-13T18:39:25Z observed Verify 43482317147 completed/success on exact candidate 8adae6c836f2fabda29e8a091b052450410c8ca5: https://github.com/just-every/run-oncall/actions/runs/43482317147. Eight GitHub API calls were used, with one watcher and no dispatch or rerun. ci-call-6.json, ci-call-7.json, ci-call-8.json and ci-receipt.json retain the actual observations.

This is a release metadata candidate only. The fleet still owns guarded landing, full-history publication scanning, release production and immutable tagging/signing. Later publication must preserve the actual source pin and verify non-draft GitHub Release readback plus check-gh-release.sh exit 0 before any RELEASED claim. No new release/tag was created here. Existing feature, stranger, installer and live-provider proof debts are not prerequisites for this path-seed metadata round. Paging remains OFF and the existing pager stays active. GitHub's push response separately reported 42 default-branch dependency alerts (16 high, 22 moderate, 4 low); that pre-existing observation was not investigated or changed under this lease.

All required candidate checks passed; there are no blockers. Evidence transport is separate from product custody and will contain only explicitly selected regular non-secret files from this packet.

## Terminal product custody

Finalized 2026-11-13T18:40:00Z. READY branch=cloud/sd-oncall-release-0-5-13 head=8adae6c836f2fabda29e8a091b052450410c8ca5. Product branch was pushed once, and exact-SHA Verify is green. The evidence branch is report transport only, independent of product readiness or later publication. The product clone and dependencies will be removed after evidence publication/readback. The durable packet remains outside the clone.
