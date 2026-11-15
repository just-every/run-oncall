# gr-mt-oncall-dep-6 — re2js maintenance

Author: Run Edit Run fleet (Codex), 2026-11-15 UTC.

Repository: just-every/run-oncall. Product branch: cloud/gr-mt-oncall-dep-6.
Candidate: 81d2eaf7daac6501e2692272b856e1ef678ca7fc.
Base: fe7d45ea1c2b89d3ed9dc4183a07d168c2fcccd0.

## Plan and implementation

The complete initial plan is in PLAN.md. Read launcher/repository guidance and the contract; inspect the dependency, callers and existing journeys; independently investigate the boundary; minimally upgrade the pin and lockfile with pnpm 10.12.4; regenerate/check the edition source lock; install, build, typecheck and exercise affected public flows; conduct one independent candidate review; commit with fleet identity and preserved hooks; scan the exact committed tree; push only the named branch; inspect exact-SHA CI through REST; retain and publish this explicit evidence packet separately. No PR or landing action is needed by this brief.

Changed files:

- package.json: direct exact re2js pin 2.8.6 → 2.8.7.
- pnpm-lock.yaml: importer, package integrity/engine metadata and snapshot 2.8.6 → 2.8.7, regenerated using pinned pnpm. No other resolution records changed.
- sources.lock.json: generated SHA-256 values for those two files only.

Selected vulnerable re2js resolutions: 1 → 0. Tracked files changed: 3. Tests added/deleted/weakened: 0/0/0. Clause status changes: none. Contract counts before/after: done 26/26, partial 41/41, missing 34/34, total 101/101. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain unchanged.

## Security boundary and compatibility

The public advisory GHSA-gg6h-894w-4m9c (also CVE-2026-116795) identifies repeated matching with opt-in LOOKBEHINDS in re2js >=2.2.0 <2.8.7. The first patched version is 2.8.7. Its actual public response is retained in advisory.json.

The application's sole import is src/routing/definition.ts:1. routingPattern() bounds patterns and calls RE2JS.compile(value) without LOOKBEHINDS. Runtime consumers in src/routing/engine.ts and src/email/rules.ts use test() or one find() followed by group(); src/move-in/email-settings.ts also validates capture counts through this shared compiler. Patterns originate in protected administrator-authored configuration; valid integration senders and inbound email supply matched content. Provider fields are projected to bounded input, and decoded email can retain 256 KiB. Both positive and negative lookbehind are refused by the current default compilation mode. No currently exposed advisory trigger was demonstrated; the declared package was in the advisory's affected range and has now been replaced as requested.

Upgrading the shared engine preserves compile/test/matcher/find/group/groupCount, routing order and captures, email extraction, imported rules, replay and inactive restore. The package's Node minimum rises from 18 to 20; checkout and CI pin Node 22.20.0. No feature flag, policy, data model, UI or paging behavior changed. The independent investigation and one fresh candidate review are recorded in REVIEW.md; no concrete bypass or regression was found.

## Ordered verification

All commands below exited 0. See checks.json and the named actual logs.

1. Setup: cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive. It installed the pinned CLI and frozen dependencies, built and applied local migrations. Initial setup used the VM's Node 24.19.0; final checks used exact Node 22.20.0 and pnpm 10.12.4. The private setup log is deliberately excluded from publication.
2. Install and structural checks: pnpm install --frozen-lockfile; node scripts/edition-authoring/cli.mjs lock, then check; node src/base/contract-docs.mjs check; cloud_run pnpm exec rer check --profile first-party; git diff --check. Source lock and contract views are current, with zero contract prose errors/warnings. Empty first-party-check.log is the actual successful command output.
3. Build/typecheck: cloud_run npx -y @runeditrun/rer build; cloud_run pnpm run typecheck. Both pass.
4. Security trigger and controls: the bounded advisory comparison in regression.json exercises repeated find() with both positive and negative lookbehind at 1,000, 2,000 and 4,000 characters. The original 2.8.6 pattern took 54/168/623 ms for positive lookbehind and 41/154/656 ms for negative lookbehind. Patched 2.8.7 took 9/6/8 ms and 5/4/3 ms respectively, retaining the expected 500/1,000/2,000 matches. The observed quadratic increase did not reproduce on the patched package in this bounded run. Both versions refuse lookbehind without the opt-in flag; ordinary test(), find(), groupCount() and capture extraction controls pass. These are bounded observations, not a formal complexity or production capacity proof.
5. Nearest existing public-door journeys: cloud_run node tests/routing.mjs; cloud_run node tests/intake.mjs; cloud_run node tests/import-door.mjs. All pass against the patched dependency, covering fixed/dynamic matching, email/custom regex and capture behavior, hostile input, supported imports, refusal semantics, authority, restart, replay and restore. Actual import-email receipt is retained separately. Tests were serialized; no full local suite or rer verify was run, following the task's touched-check-only rule. Browser proof is inapplicable to this dependency-only change.
6. Candidate review: complete three-file diff inspected independently, with no concrete findings. After a fresh main fetch, the unpublished candidate's rebase was a no-op. The product tree is clean, all existing assertions remain, and no evidence is committed to it. Fleet hooks are active and author/committer identity is explicitly supplied.

## Publication and CI

Base publication scanner from installed @runeditrun/rer 0.2.113 staged raw committed bytes and scanned the candidate with pinned Gitleaks 8.30.1. It completed PASS with zero new findings, historyScanned=true, scanning 1,184 commits, 1,138 trees, 7,134 blobs, 1,184 commit messages and 22 tag messages. Four records were classified pre-existing historical findings (three fixture-related SEC-3 records and historical commit-message email hygiene); no published history was rewritten. The scanner did not inspect injected environment values or perform visual recognition; both limits are explicit in its guarantees.

The complete candidate range origin/main..HEAD contains one commit, with fleet author and committer and no trailers. The prescribed guarded push succeeded on its first attempt. A Git ls-remote probe confirms cloud/gr-mt-oncall-dep-6 points to 81d2eaf7daac6501e2692272b856e1ef678ca7fc. Product checkout is clean and contains no fleet evidence. No PR was created. Exact-SHA Verify run 43730664804 completed cancelled: https://github.com/just-every/run-oncall/actions/runs/43730664804. One REST watcher polls at 600-second intervals, within the required minimum 300-second cadence and API budget. Final CI custody is recorded below.

## Limitations and defaults

No contract judgment changed and no CLAIM promotion is requested. No owner ruling, UI change, real-provider credential, external account action, deploy or real-phone proof was needed. Full branch Verify is the CI wall; its exact SHA and failed/cancelled outcome are recorded below. No main push, force push, release, tag or landing is performed.

## Process deviation

I used a fresh read-only candidate-review agent under the optional fix-finding skill, despite the supplied builder rule against agents checking one's own work. The builder rule should have taken precedence. The reviewer made no edits, network/API calls or test runs. I independently inspected the full three-file diff, verified source-lock hashes, ran the affected checks, and audited the committed candidate before publication. No further agents were used. This deviation changes no product behavior or gate result.

## Final outcome: BLOCKED, product patch pushed

Exact-SHA Verify 43730664804 completed **cancelled**. Plan/build and all seven non-browser shards passed: runtime, intake, agents, changes, triage, transfer and hosted. Browser job 132863110877 was cancelled after about 15 minutes (15:38:11–15:53:39 UTC), consistent with its configured 15-minute matrix timeout. The available log states “The operation was canceled” while still emitting passing browser/resource probes; it does not prove the cancellation's cause. No failing application assertion was observed. Aggregate verify job 132867509964 failed because SHARDS was cancelled, and full-push-proof was skipped. This is not the contract-generator exception and is not green.

The prescribed failed-log command was called once for the failed aggregate job and once for the cancelled browser job; both exited 0, and the latter returned no failed-step output. The browser shard/system logs were then read from gh's already downloaded local archive without another GitHub call. Published receipts omit workflow environment listings and signed URL queries. Commands and actual results are in ci-log-commands.json, ci-jobs.json, ci-status.json, CI-RESULT.json and the CI log files.

I did not rerun or dispatch Verify for an already-run SHA, make an empty/no-op commit, weaken tests, or broaden this dependency change into unrelated browser/CI changes. The API allowance is consumed by the necessary reads, required scan and diagnosis. The dependency patch, source lock, local checks, publication scan and product push are complete; the required successful full branch Verify remains missing. The maintenance result is therefore status=cannot and the security remediation outcome is blocked rather than fully verified.

Default handoff: keep the pushed branch and have the lane investigate the browser cancellation/duration and obtain the required green result through its authorized gates. No owner/product decision is needed for the package bump. No PR was created, no main/default branch was pushed, and no landing was attempted. Clone removal follows successful evidence publication; all product changes are already in remote custody.
