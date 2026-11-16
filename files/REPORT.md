# Oncall stranger-35 trips

Author: Run Edit Run fleet (Codex), 2026-11-16.

Repository: just-every/run-oncall. Branch: cloud/main-oncall-stranger35-trips-1.
Baseline main: f366ecb24cd0934930ce1dc69e44c164e0b8c108.
Published preservation save: 8f799c2a2a41fd14ad1794e72010a9cf4ed0b84f ([skip ci]).

## Plan

The full original execution plan is PLAN.md. Reproduce all five trips through emitted Worker and browser doors, fix their causes without migrations, extend existing journeys, verify only touched flows and typecheck locally, integrate main, regenerate the source lock last, inspect all commit identities/trailers and publish the named product branch. Observe exact-SHA Verify and publish this separate report-only evidence packet. No hosted deploy or paging operation is in scope.

## Actual baseline and changes

1. **Dry-run docs:** /docs/commands rendered two claims that dry-run reads target secrets with Cloudflare credentials. Both RUN-LOCALLY.md descriptions now explain local plan/build validation without credentials, Cloudflare requests or remote changes. Target secrets, permissions, remote readiness and mail are not checked; --env-file does not turn on remote checks. README and Getting started already stated this and were preserved.
2. **Backstage help:** Settings / Team / Import from Backstage had zero guide links and only four labels/actions. It now explains GET /api/catalog/entities, the array or items-array JSON response, and matching to existing services and active teams, with a direct link to the existing Team guide. That guide now owns the previous dependency-review instructions, adds acquisition/format/matching guidance and a usable catalog example. The Changes guide links there. No service, team or person is invented by import.
3. **Routing owner:** A real native routed request returned 429 with Retry-After 60 while the visible notice printed Morgan Ellis's generated member UUID. The routing notice now resolves the stored owner reference to the current member name (or a readable unavailable-member fallback). Retained audit identities are unchanged; no migration or audit rewrite.
4. **Split picker:** An actual Alertmanager alert titled Receipt processing queue older than 15 minutes was admitted, declared, merged and listed by its internal computed alertmanager hash without its title. The picker now uses the existing alert-display title resolver, keeping service and environment visible and the provider key internal. The selected alert still moves to its new incident with lineage preserved.
5. **Coverage:** At Monday 2026-11-16 01:19 UTC, ordered London / New York / Los Angeles weekday 09:00-17:00 layers had no current primary coverage. Both primary Now and Next said nobody, yet the summary claimed 05:00 as a coverage window; the empty backup claimed midnight. The existing timeline/effective coverage resolver and immediate-boundary API are preserved. A separate upcoming lookup walks those same boundaries until a role actually has an eligible holder. The summary names London responder at 09:00 UTC; the empty backup and an empty rota have no promised coverage. All messages retain the rota's named zone.

The upcoming lookup is bounded to 366 elapsed days, schedule validity and the supported years. When a potential assignment is not found within that range, the summary explicitly says no coverage through the inspected date; it does not claim perpetual absence. Empty/ineligible member sets return no scheduled coverage without a boundary walk.

## Local verification

- Noninteractive fleet-owner setup, production build and typecheck pass.
- Existing events-source journey passes: real routed 429 / Retry-After, Morgan Ellis rendered, no UUID, retained audit unchanged; assertions at 1440 and proof at 1440/390.
- Existing roles / incident workflow journey passes: real Alertmanager admission, declaration, merge, readable split choice with service and environment, hidden fingerprint and selected alert transfer; existing authority and history assertions retained; picker proof at 1440/390.
- Existing readable-times / coverage journey passes: fixed-clock 05:00 gap versus actual 09:00 London coverage, empty backup and rota, half-open start, reviewed PTO and override targets, unchanged paging state on reads. Existing swaps, member PTO, stale refusal, named clocks, keyboard and readiness checks also pass. Assertions at 1440; summary proof at 1440/390.
- The full member-coordination journey passes, including the Backstage panel link, guide example preview against existing service/team records, dependency conflict choice, Apply, lost-response Retry, reload and retained provenance. The existing mail-off public CLI dry-run runs with provider credentials removed and exits 0, with no remote changes; incomplete mail inputs refuse as expected. The remaining existing member, sign-in and API client legs pass.

Verification caught and repaired the missing named zone in the new empty-coverage message. Only the extended fixture was corrected to update through the public Review/Apply doors and preserve immutable PTO. Existing assertions were kept. The existing mail-off precheck required the managed Playwright Chromium package in this VM; it was installed without changing product code or assertions.

## Counts and contract custody

Five baseline trips reproduced. Public journey plan entries: 20 before and 20 after; zero added registrations. Contract judgments and generated views are untouched: 26 done, 41 partial, 34 missing, 101 total before and after. No Status, Gap or Evidence cell changes and no DONE claim. These bounded maintenance regressions do not prove a complete previously incomplete acceptance point, so no CLAIM line is asserted.

The Mac lander owns the full publication scan, generated view updates if needed and landing. Product branch custody, exact-SHA Verify and evidence transfer are separate and are recorded below.

## Candidate custody

Final product head: 82081ae6fb7e19c78760269a0283579be0b840bb. Product push succeeded via cloud-push.py; the checkout is clean. Main was fetched again immediately before the final candidate and was unchanged at f366ecb24cd0934930ce1dc69e44c164e0b8c108. Published history was not rewritten. Both commits use Run Edit Run fleet author and committer identities, with no co-author trailers. The final head has no skip marker. The source lock was generated last and its check passed. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are unchanged. No PR is required by this seed’s landing instructions; none was created.

Exact-SHA Verify: run 43799584849, https://github.com/just-every/run-oncall/actions/runs/43799584849. It completed with success on exactly 82081ae6fb7e19c78760269a0283579be0b840bb. Four API calls were used, with one watcher at a time; actual polling times and the rounding correction are retained in the CI receipts. No failed-job logs or workflow rerun were needed.

The corrected command-reference paragraphs were also read from HTTP 200 /docs/commands (docs-receipt.json); its 1440/390 proof is included. The changed command reference, import panel, import guide, routing notice, split picker and coverage summary were visually inspected at both widths. The report packet was checked for credential-shaped strings, private owner-entry links, private keys and symlinks: zero findings.

Polling timing audit: the first snapshot intervals were 300.419 and 299.999 seconds. Whole-second timestamp rounding could shorten an interval slightly. Only the started watcher and its wait child were stopped; one watcher resumed at call 4 with a 302-second margin. No extra GitHub lookup was made for the audit. Actual timing and call custody are retained in ci-timing-note.json and ci-receipt.json.

## Final result

All five trips are fixed: five reproduced before, zero remaining after the passing touched journeys and exact-SHA Verify. Main was not pushed or fast-forwarded. The remote product branch was read back through Git and matches 82081ae6fb7e19c78760269a0283579be0b840bb. No migration was needed. There are no remaining blockers for this five-trip scope. Hosted deployment, Business, paging, independent standby and wider contract acceptance were outside the brief; no new claim is made for them.

Local checks: production build, typecheck, contract-docs check, source-lock check, events-source browser journey, incident roles/workflow browser journey, readable-times/coverage browser journey and full member-coordination browser journey all passed. The member journey includes the real public credential-free deploy dry-run. The public command-reference receipt and 1440/390 screenshots are included. No full local rer verify was run; the green exact-SHA branch Verify supplies the full wall.

Final branch: cloud/main-oncall-stranger35-trips-1. Final head: 82081ae6fb7e19c78760269a0283579be0b840bb. Verify run: 43799584849, completed/success. PR: none created; the seed’s fleet landing process consumes this branch. Contract statuses and generated views are unchanged; no clause status changes and no CLAIM/DONE promotion. Public journey plan entries remain 20 → 20, with zero new registrations; contract counts remain 26 done / 41 partial / 34 missing / 101 total.

This packet is selected explicitly for the report-only evidence/main-oncall-stranger35-trips-1 ref. Evidence publication does not publish a product candidate or waive the Mac lander’s full publication scan and landing gates. The terminal EVIDENCE line identifies the report transfer; the terminal READY line identifies product custody separately. The pushed clone is removed after both remote refs are verified; the packet remains under the fleet work directory.
