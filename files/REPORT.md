# main-oncall-events-sample-1-c1

Repository: just-every/run-oncall
Branch: cloud/main-oncall-events-sample-1-c1
Candidate: c92e49165b54b84c6e9df099de317882233c0602
Original published sample: 5c3fcdae807d6cbd08fbe5521f9ba89ca1a5222d
Merged main: 1e8f35e6ec553ed607b812dd6f957aae2b3acce9
PR: none; the fleet owns landing from the named branch.

## Plan and implementation

The complete plan is PLAN.md. Confirmed main contains clock-fix commit 051a993 and agedReplayRetention uses the current whole hour. Created the named branch at the original published sample, merged main without conflicts, retained all main tests and contract text, and regenerated/check-validated sources.lock.json last. No new feature or product behavior was added beyond the carried sample work.

The carried detail-page samples name their source, deduplication key, observation and event identity readably. Service scope keeps the required internal service identity, explained beside the sample. Source display names are aliases for the URL's established identity; legacy retries deduplicate under that identity. Documentation describes the alias.

Local Events proof found a hydration race in the existing test: it read a signed source’s ingress URL while the component still showed a relative URL. The small follow-up commit waits for the existing Copy ingress URL control to become enabled before reading. All URL, clipboard, executed command, idempotency and refusal assertions remain. No test was deleted, skipped, weakened or registered.

## Validation

- Fleet setup and unattended local setup succeeded. Production build and TypeScript typecheck passed.
- Generated contract check passed with zero errors/warnings; source lock generation and check passed.
- Existing tests/product-browser.mjs#eventsSourceBrowser passed at 1440 using /usr/bin/chromium with --no-sandbox. Both bearer and signed detail-page commands were copied unchanged and executed through HTTP. Their visible alerts, legacy-ID retry deduplication and mismatched source/service refusals passed. Trigger/recovery retained one alert and left the human incident open.
- Fourteen masked screenshots record the seven journey screens at 1440 and 390. Both changed readable source detail pages were visually inspected at both widths. Magenta bars are credential/password screenshot masks. See browser-receipt.json for file hashes.
- Existing tests/oncall-agent-flow.mjs passed, including agedReplayRetention and the newer Commander lost-response replay under both policies. Exact-SHA CI custody is recorded in ci-receipt.json.

## Counts and clause scope

Contract totals before/after: done 22 → 22; partial 45 → 45; missing 34 → 34 (101 total). Verification plan: 8 → 8 lanes and 16 → 16 command entries. Added test registrations: 0. These plan entry counts are not a claim to recount every logical test.

Clause statuses, Gap and Evidence are unchanged. OC-001 is already DONE on main; this round carries only its requested bounded PARTIAL claim and does not rejudge that published status. No CONTRACT.md, ACCEPTANCE.md or docs/CLAIMS.md change is committed.

CLAIM OC-001 PARTIAL points=none tests=tests/product-browser.mjs#eventsSourceBrowser
DEFAULT OC-001: Keep the service ID required by the API and explain it beside the readable sample; source names are input aliases only.
GAP OC-001: This sample-readability round supplies no new whole-clause acceptance judgment or production delivery proof; paging remains OFF.

## Publication and landing

All candidate authors and committers, including side parents, were audited as Run Edit Run fleet <fleet@runeditrun.com>; no co-author trailers remain. Injected bundle values were absent from the product diff. The full fleet publication scan is unavailable in cloud and remains the Mac lander’s required gate; this report does not replace it. Main, the original sample branch and the lander’s rebase branch were never pushed or rewritten.

Evidence is published separately to evidence/main-oncall-events-sample-1-c1 using the report-only entrypoint; product status and evidence custody are independent.

## Final custody and result

READY candidate c92e49165b54b84c6e9df099de317882233c0602 is pushed on cloud/main-oncall-events-sample-1-c1. Verify run 43104670031 completed SUCCESS on that exact SHA (attempt 1): https://github.com/just-every/run-oncall/actions/runs/43104670031. One watcher used four REST calls, each at least 301 seconds apart, including discovery. No failing CI jobs, workflow reruns or PR were needed. No implementation blocker remains. The Mac fleet still owns its publication scan, exact-main checks and landing; no landing or deployment is claimed.

Product push succeeded on attempt 1. The remote branch head was independently checked and matched the candidate. Source-lock final check exited 0. All started local browser and runtime processes finished; successful clone deletion follows evidence publication. Reports remain outside the product clone.
