# Oncall v0.5.15 release metadata candidate

Author: Run Edit Run fleet. Stamp: 2026-11-15T10:18:13Z.

Product repository: just-every/run-oncall. Product branch: cloud/sd-oncall-release-0-5-15.
Product head: 44ca722b6a5dde173b5253df7b5e0eab762df459. Base main: d8357c8e671651b9e2f2021eaf32d705a3360fd0.
PR: none; this seed's supplied builder/landing contract uses the named branch.
Product pushed once through the fleet guard; first attempt succeeded. No tags, GitHub Release, signing, deploy, main push or self-submission was performed. This is metadata preparation, with no RELEASED claim.

## Plan and results

1. Set the fleet Git identity before other shell work. Read and refresh the installed launcher, install bundle-backed Git authentication and the push guard, and clone only the declared repository shallow with blob filtering. Install the fleet commit-message hook, preserving repository hooks, and repeat its installation after dependency setup.
2. Read the inline RULES.md and release rules plus seed AGENTS.md, contract summary and actual metadata. Fresh main matched the brief's green d8357c8e671651b9e2f2021eaf32d705a3360fd0. The signed brief cites exact-main Verify 43692814329 and Run site 43699715117 as SUCCESS, independently read by sd at 2026-11-15T09:34:42Z; these inherited observations were not rechecked in this task.
3. Read the live Releases listing and open PRs and inspect remote refs. Latest non-draft published Release was v0.5.14; v0.5.15 and its product branch were absent. There was no open release PR or competing v0.5.15 ref. The v0.5.14 commit is 4d1fc62d4d2b8bf90008ac87bbaa626bc1a5494b. Deepen only the declared clone to establish ancestry and inspect the complete diff: main is 33 commits ahead. A pre-existing draft 0.5.0 Release was left unchanged.
4. Inspect the actual v0.5.14..main diff, including documentation, product implementations, dependency changes and migration 0164. Prepare only release metadata for work already on main. No feature branch content was incorporated. Preserve the rer dependency at 0.2.113.
5. Update exactly CHANGELOG.md, README.md, RELEASE.json, RELEASE.md, package.json, seed.json, sources.lock.json. Existing version references advance from 0.5.14 to 0.5.15. package-lock.json does not exist in this checkout; pnpm-lock.yaml has no product version field and remains byte-identical. README.md and RELEASE.md receive only the existing version-reference replacement. The previous 328996 changelog bytes and the complete prior upgrade-instruction chain are preserved verbatim.
6. Install frozen dependencies using the supplied toolchain/cloud_run. Run the affected read-only metadata check and typecheck; no new tests and no full local suite. Validate version consistency, unchanged package fields, historical records, exact migration-list correspondence and unchanged applied migrations. Check generated contract documents. Regenerate sources.lock.json LAST with node scripts/edition-authoring/cli.mjs lock, and check with both vendored and installed edition-authoring CLIs. The lock changes only the six edited metadata hashes.
7. Fetch fresh main and rebase before the first push; main was unchanged and rebase reported up to date. Inspect all candidate author, committer, full messages and trailers; the single candidate is Run Edit Run fleet <fleet@runeditrun.com> for both identities, with no trailers or CI skip markers. Commit with explicit identity environment and active hooks. Push the named product branch exactly once through cloud-push.py. Product checkout was clean afterward.
8. Discover and watch exact-SHA Verify 43700831884 through REST, with one watcher and at least 300 seconds between calls for that run. Final CI observation will be recorded below and in actual JSON receipts. Preserve and publish only explicitly selected non-secret packet files on evidence/sd-oncall-release-0-5-15. Delete the successfully pushed disposable clone and dependencies after publication.

## Public release notes

Administrators can use Show key on integration and routed-key pages to copy an existing credential again; each reveal is audited, and older digest-only keys need one explicit rotation before readback is available. People and administrators can save recorded contact methods and notification rules from Settings → Team. On services with a saved paging policy, accepted alerts can select the current on-call primary when no explicit assignee exists and retain the planned recipients, delays and outcomes. These are records only: no email, SMS, phone or push is sent, and restored notification settings and runs remain inactive. PagerDuty move-in can retain a shared rota and supported escalation policy across explicitly selected services without making per-service copies; unsupported targets stay paused for review. Rota pages can browse previous and future two-week windows of the saved rota, including retained overrides; they do not reconstruct earlier rota edits or prove who responded. Agents’ monthly response reports now include scoped scheduled load and alert-noise details, and incident-role clearing has documented retry and revision guidance. The dependency refresh updates undici and zod. This patch keeps rer pinned to 0.2.113 and adds migration 0164, which adds optional encrypted-key custody columns while preserving existing credential digests and signing custody. Back up before upgrading, keep applied migrations unchanged and keep the existing pager authoritative: paging stays OFF.

## Migration and upgrade details

The actual tag-to-main diff adds only migrations/core/0164_alert_key_reveal.sql. It adds nullable key_custody columns to sources and oc_intake_credentials; existing credential digests and signing custody are retained. Apply it after 0163_business_retired.sql in filename order after a verified private backup. Existing digest-only credentials cannot be reconstructed; a current administrator explicitly rotates a key when readback is needed, coordinating replacement with the sender because rotation invalidates the old key. No existing migration byte was edited.

RELEASE.json gives local rer export backup, hosted D1 backup using the original deploying credentials, original-checkout updates, published-tag instructions, local rer dev and hosted rer deploy commands, no populated reset, and restore only into an empty destination. It retains the erasure refusal, restored-owner mapping, paused-agent/expired-approval limits and inactive recorded-notification state. These are instructions only; this task performed no installation, provider or production operation.

The signed assignment states the source faults2 round received the stated Opus outcome PASS WITH FOLLOW-UPS3 and migration 0164 prior-data preservation proof. This metadata round inherits that source gate and does not self-gate or invent unspecified follow-up details.

## Local checks

- Frozen pnpm install: exit 0.
- pnpm exec rer check: exit 0.
- pnpm run typecheck: exit 0.
- One-time metadata consistency/immutability review: PASS.
- node src/base/contract-docs.mjs check: exit 0.
- node scripts/edition-authoring/cli.mjs lock: exit 0; run last after all product edits.
- node scripts/edition-authoring/cli.mjs check: exit 0.
- node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check: exit 0.
- git diff --check, leased-path review, credential-shaped-value diff check and complete candidate identity/trailer inspection: PASS.

The supplied toolchain retained the newer VM Node 24.19.0 and pnpm 10.12.4; pnpm warned that the checkout requests exactly Node 22.20.0. Typecheck passed. CI selects the checkout's Node pin. No UI changed, so no browser proof was needed. No full local verify, release producer, publication scan, publication signing or publication check-gh-release was run; the Mac guarded lander owns the required full-history publication scan and landing gates.

## Before/after counts and clause statuses

- Product version: 0.5.14 → 0.5.15. rer pin: 0.2.113 → 0.2.113.
- Metadata/lock paths changed: 7. Source lock hashes updated: 6.
- Migration files: published v0.5.14 has 67; main and candidate have 68. This round edits zero migration files. RELEASE.json migrations list: 0 → 1, accurately describing the tag-to-main addition.
- Core: 25 done / 35 partial / 24 missing of 84, unchanged.
- Agent surface: 1 done / 6 partial / 10 missing of 17, unchanged.
- Full target: 26 done / 41 partial / 34 missing of 101, unchanged.
- Clause status, gap, evidence and acceptance-point changes: none. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain byte-identical to main. No CLAIM line is applicable to this version-only lease.
- New tests: 0; deleted/modified tests: 0. Existing test inventory unchanged.

## Follow-up debts and limits

The source round's PASS WITH FOLLOW-UPS3 outcome and its unspecified follow-up debts remain with its owner; the assignment does not enumerate them. Source gates, stranger/installer journeys and rer 0.2.118 qualification are outside this metadata lease; no pending feature gate was borrowed or awaited. GitHub's product push reported the default branch has 19 dependency alerts (5 high, 12 moderate, 2 low); that repository notice was not independently triaged in this round. Existing contract gaps remain. Paging stays OFF and the existing pager remains authoritative; no real delivery, company/provider installation or operation is claimed.

The fleet owns publication scan, exact-SHA landing checks, landing, producer/signing and any authorized immutable tag and GitHub Release. A future tag alone remains RELEASE-PENDING. RELEASED requires verified non-draft GitHub Release readback and the release-rules mechanical check, neither of which is part of this metadata preparation.

## Exact-SHA CI and terminal custody

Exact-SHA [Verify 43700831884](https://github.com/just-every/run-oncall/actions/runs/43700831884) completed with conclusion cancelled, observed through REST at 2026-11-15T10:07:20Z. The head remains 44ca722b6a5dde173b5253df7b5e0eab762df459. Initial discovery and three polls were in progress; the fourth poll was completed/cancelled. No CI was dispatched or rerun. The task explicitly prohibits both operations. A cancelled run is not successful Verify evidence and does not support READY. Terminal job results were read at 2026-11-15T10:12:21Z. Plan, build and seven shards (transfer, hosted, runtime, changes, agents, intake and triage) succeeded. Browser job 132772141308 is cancelled, although its Run this shard and artifact upload steps report success and every listed step reports success or skipped. Its elapsed time is 907 seconds and its configured job budget is 15 minutes; the API alone does not establish why it was cancelled. The full-push-proof was skipped and final aggregation job 132775827605 failed its required-coverage step. The required failed aggregation log was read once with gh run view 43700831884 --repo just-every/run-oncall --job 132775827605 --log-failed at 2026-11-15T10:17:28Z, exit 0. It confirms the full-coverage aggregation refused the cancelled shards result and exited 1. No application assertion failure is inferred from the cancelled job. The public log omits the step environment listing; API receipts retain the relevant outcomes without an environment dump. The task used nine GitHub calls total, with no blocked archive download or retry. No product change or empty commit will be manufactured to trigger another run.

The metadata work is complete and pushed, and local checks passed. Terminal blocker: exact-SHA Verify completed cancelled and this task prohibits dispatching/rerunning it. The lane must obtain an authorized successful exact-SHA Verify before landing. Product custody is BLOCKED rather than READY; report-only evidence publication does not change that conclusion. Actual local receipts and public preflight observations are selected explicitly; no credentials, environment dumps, symlinks or private gate material are included.

Final product custody: BLOCKED branch=cloud/sd-oncall-release-0-5-15 head=44ca722b6a5dde173b5253df7b5e0eab762df459; Verify 43700831884 cancelled, browser job 132772141308 cancelled and aggregate job 132775827605 failed. Required successful exact-SHA Verify is unavailable; task forbids dispatch/rerun and its lease excludes CI changes. No READY claim. The pushed product and report packet are preserved. Clone cleanup follows successful evidence publication.
