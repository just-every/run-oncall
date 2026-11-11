# main-oncall-run-docs-1

Repository: just-every/run-oncall
Branch: cloud/main-oncall-run-docs-1
Candidate: e4066e802e5c04f26f3b5e750fb9755aba3b473f
Main integrated before publication: 669b0c8 (full identity in product-receipt.json).
PR: none; this seed uses the fleet landing path. No default-branch push or landing was attempted.

## Plan and results

1. Read launcher AGENTS.md, seed AGENTS.md and the inline RULES.md. Refreshed fleet keys; installed the decrypted-bundle Git helper, cloud push guard and commit-message hooks. Used fleet author and committer identity, with no coauthor trailer.
2. Reproduced through public rer commands before editing. Setup with the required fleet owner exited 0. With no env file and Cloudflare/mail credentials unset, production deploy --dry-run exited 0 after building and printed that it made no Cloudflare requests and did not check target secrets or remote readiness. With this task's foreground dev server active, the identical deploy command exited 4 and named its active local operation. Only this probe's process group was stopped by PID; no rer dev --stop or broad process-killing command was executed. Private owner-entry output remains excluded from the packet.
3. Updated README.md and docs/getting-started.md to explain local-only dry-run behavior, successful exit without credentials, unchecked remote state, and the real credentialed deployment needed for those checks. They explicitly say --env-file does not make a dry run contact Cloudflare. Both show stopping dev/preview before deploy and explain exit 4. README Run it locally now links https://run-oncall.com/run (observed HTTP 200).
4. Traced the doubled SendGrid input to the pinned rer package's formatting, not a duplicate seed declaration. Left the valid MAIL_API_KEY ← SENDGRID_API_KEY declaration unchanged. SOURCE-TRACE.md records the exact modules and mechanism.
5. Ran typecheck and the source-lock/contract-document checks successfully. No test files changed, and no wording tests were added. Built the actual run site (26 pages, 52 files) successfully. Inspected its changed Getting started deployment section at 1440 and 390, plus a local Markdown rendering of the changed README sections at both widths. The README rendering is not a claim about GitHub's hosted UI. Desktop overflow checks passed; both widths keep document width within the viewport. Mobile README code blocks retain horizontal scrolling.
6. Fetched main and rebased the unpublished edits before the first commit, retaining the newer time-display work and its tests. Regenerated the source lock last with node scripts/edition-authoring/cli.mjs lock, and ran its check. CONTRACT.md and both generated acceptance views are unchanged. Made one real commit without a CI skip marker. Audited every candidate commit, including side parents: fleet author/committer, no trailers. The guarded branch push succeeded on its first attempt.
7. Verify was discovered on this exact SHA using REST. Its final result is recorded in the CI receipt when available. The report-only packet is published separately from product custody; evidence publication does not claim acceptance or landing.

## Changed sections

CHANGED-SECTIONS.md contains the complete changed README local/hosting sections and the Getting started deploy section. product.diff contains the exact candidate diff, including the regenerated two lock hashes. Product scope is three files, 28 inserted and 9 deleted lines.

## Checks and limits

- Public dry-run before edit: exit 0; see dry-run-before.log.
- Public dry-run with dev active: exit 4; see dry-run-dev-active.log and lock-probe-receipt.json.
- Public dry-run again on exact candidate: exit 0; see dry-run-candidate.log.
- pnpm run typecheck: exit 0; see typecheck.log. Shell Node was 24.19.0; rer commands selected the checkout's pinned Node 22.20.0.
- node scripts/edition-authoring/cli.mjs check: exit 0; see source-lock-check.json.
- node src/base/contract-docs.mjs check: exit 0; see contract-docs-check.log.
- npx -y @runeditrun/rer build --site through cloud_run: exit 0; see site-build.log.
- Browser proof: browser-receipt.json and four screenshots, system /usr/bin/chromium with --no-sandbox; layout assertions only at 1440.
- No new/removed/modified tests. Existing runner inventory remains 16 invocations from 12 entrypoint files; this is not a newly counted total of individual assertions. No test budget changes.
- No local full-suite or rer verify run; branch Verify is the required full wall.
- No live provider deployment or mail delivery was performed or claimed; that is outside this docs task.
- The fleet's publication scan runs on its own machine by task protocol and is not claimed here.

## Clause accounting

Contract statuses before → after: done 22 → 22; partial 45 → 45; missing 34 → 34. No clause status, Gap or Evidence cell changed.

CLAIM OC-018 PARTIAL points=none tests=none
GAP OC-018: No complete new acceptance point is claimed by this docs-only run. Existing maintained build/deploy-dry-run test gap and the rest of the clause remain as recorded on main.
DEFAULT OC-018: Dry-run is the pinned command's local-only plan, even with an env file; target checks require the real deploy command with its stated remote effects.

No product blocker identified locally. The remaining upstream duplicated hint is allowed by the brief and is reported for follow-up. CI and evidence custody are recorded separately.
