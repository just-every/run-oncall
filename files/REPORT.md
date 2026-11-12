# main-oncall-events-sample-1-c2

Repository: just-every/run-oncall
Product branch: cloud/main-oncall-events-sample-1-c2
Product head: 4a63fd678ef366d3552198f6f6f574b2fa272706
Parent/current-main base at publication: 4fed382945f688afdcceb15ae9df976135cdbb1e
Replayed prior candidate: c92e49165b54b84c6e9df099de317882233c0602
PR: none; this lane uses the fleet lander and exact named cloud branch.

## Plan and implementation

The complete plan is retained in PLAN.md. The fleet identity was configured before repository work. Launcher refresh, decrypted-bundle Git authentication, push guard, commit hooks and the supplied cloud toolchain were installed. A full-history blob-filtered clone was made for the declared repository only. The candidate started at current origin/main and used git merge --squash on the prior c1 branch. The only conflict was sources.lock.json; main's lock was restored and regenerated from the final tree. The three contract files were explicitly restored from main. A final fetch confirmed main was still the same base, so no replay or merge commit was necessary.

The replayed documentation and integration component files exactly match c1, while the squash retained main’s newer API and test changes. The prior implementation was preserved in exactly seven files: docs/incidents.md, sources.lock.json, src/api.ts, src/integrations/RequestExample.tsx, src/integrations/catalog.ts, src/integrations/native-name.ts and tests/product-browser.mjs. The product diff is 63 insertions and 16 deletions. The source lock was regenerated last with node scripts/edition-authoring/cli.mjs lock and its check passed. There is one ordinary commit above the publication base and zero merge commits in that candidate range. The existing history on main is retained.

The detail-page sample uses the displayed source name, a service-name dedup key and timestamp-based event/lifecycle identities. Display names normalize to the existing source ID before storage, preserving legacy retries. The service field retains the internal ID required by the API and explains its relationship to the named service beside a Services link. Existing ingress URLs remain stable. This replay does not add service-name admission or change that existing API requirement.

## Validation and proof

- Setup passed: cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive. No secret setup log is included in the packet.
- Production build passed: cloud_run npx -y @runeditrun/rer build; complete build.log retained.
- Typecheck passed: pnpm run typecheck; complete typecheck.log retained. The supplied toolchain selected Node 24.19.0 and pnpm 10.12.4; the package reports its exact Node 22.20.0 engine warning. This did not fail either check; branch CI uses the repository's own Node pin.
- Focused browser passed: ONCALL_PRODUCT_JOURNEY=events-source ONCALL_CHROMIUM_PATH=/usr/bin/chromium cloud_run node tests/product-browser.mjs, using the emitted Worker and real local D1. Complete events-source.log retained. The test asserts at 1440, copies the existing detail-page bearer and signed commands unchanged, executes both through HTTP, observes their alerts, proves legacy-ID retry deduplication and rejects mismatched source and service identities without accepted effects. Existing trigger/recovery and incident separation assertions remain.
- Screens were captured once at 1440 and 390 for the journey's source, send, recovery and alert views. All 14 original screenshots are included and their PNG dimensions were checked against the named viewport widths (browser-receipt.json). Both readable bearer/signed detail pages at both widths were visually reviewed; key fields are masked. No proof, screenshot or report file is committed to the product branch.
- node src/base/contract-docs.mjs check passed with zero errors and zero warnings. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are byte-identical to origin/main at publication; their hashes and checks are in local-receipt.json.
- git diff --check passed. The entire candidate range was inspected with the requested identity/trailer log before pushing: both author and committer are Run Edit Run fleet <fleet@runeditrun.com>, no trailers, no skip marker. The worktree was clean. Push guard succeeded on its first attempt, with no retry or rebase. Product provenance is in product-receipt.json and the complete product.patch.

## Counts and clause custody

Canonical contract table counts before → after: 101 → 101 clauses; done 23 → 23, partial 44 → 44, missing 34 → 34. Status changes: none. OC-022 remains done. OC-001's canonical done status is unchanged; this builder carries only the bounded original PARTIAL observation below, not a new DONE claim or demotion.

Focused Events source journey: 1 → 1, extending the existing journey. New test registrations: 0. The named top-level function list in tests/product-browser.mjs remains 8 → 8. No test, assertion or acceptance coverage was deleted, skipped or weakened. No test-budget.json exists in this checkout; this replay adds no registration against the default cap of 200.

CLAIM OC-001 PARTIAL points=none tests=tests/product-browser.mjs#eventsSourceBrowser

GAP OC-001: This round replays the readable source sample only and makes no complete-clause acceptance claim.

## CI and publication

Verify run 43127636159, exact product SHA 4a63fd678ef366d3552198f6f6f574b2fa272706:
https://github.com/just-every/run-oncall/actions/runs/43127636159

Final status: completed/success on the exact product SHA, run attempt 1. Four GitHub REST calls were used: discovery and three polls, all at least 300 seconds apart. No failed job, rerun, fix commit or extra product push was needed. The exact response is retained in ci-receipt.json and the complete watcher output in ci-watcher.log. GitHub REST discovery and polling use one watcher with at least 300 seconds between calls, with the actual command ledger in github-calls.jsonl. No workflow dispatch or duplicate Verify run was requested.

The Mac fleet's publication scan and guarded landing remain external gates; this cloud does not claim that scan ran. Selected text artifacts were checked for injected credential values, and only explicitly named regular non-secret report, receipt, log and proof files are eligible for evidence publication. Evidence uses only evidence/main-oncall-events-sample-1-c2 and is separate from product readiness or landing. The product branch was pushed once and main was never pushed or fast-forwarded.

Final blockers: none. The exact candidate is READY under the stated contract; landing and the fleet publication scan remain separate. Clone cleanup follows successful evidence transfer and final custody capture. The full packet remains outside the product clone.

READY branch=cloud/main-oncall-events-sample-1-c2 head=4a63fd678ef366d3552198f6f6f574b2fa272706
