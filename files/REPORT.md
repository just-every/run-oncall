# Oncall D4–D9 reapplication

Author: Run Edit Run fleet (sd), 2026-11-18 UTC.

## Plan

1. Confirm prior heads alerts-2 be2d69c6021f5318eb2256584a5aaa060aba6a37 and alerts-1 467a003cbfba15bb1f8e297d734e90d27faf6bd1; start a linear cloud/sd-oncall-design-alerts-3 branch at fresh main.
2. Capture the current owner journeys at 1440 and 390 using synthetic data and the emitted Worker.
3. Reapply the alerts-2 round's product, focused tests and incident documentation. Preserve main's newer notification-run UI and browser assertions; regenerate rather than replay the old source lock. Claim no contract clause.
4. Verify facts against handlers and public-door runs: held-key test sending, fresh test identity, explicit add/close, live rota, take ownership, optional recovery link, note-based resolution, default linked closure and attributed reopen to the last open state.
5. Run typecheck, touched browser/HTTP journeys and source-lock check. Capture changed screens at 1440 and 390; keep all non-secret reports and receipts outside the product tree.
6. Fetch main before publication; preserve linear ancestry and all newer assertions. Inspect every candidate commit's identity and trailers; use the fleet product push guard. Discover and poll exact-SHA Verify using REST within the ten-call budget and 300-second cadence.
7. Publish explicitly selected reports/receipts/screenshots only to evidence/sd-oncall-design-alerts-3. Return exact product custody and CI/evidence provenance, then delete the clone after successful publication.

## Starting state

Main: d88d44c4 (full SHA recorded in terminal provenance). Prior heads matched exactly. The previous round is one ordinary commit on alerts-2; the current replay preserves its net work without its old ancestry. No release metadata or dependency pins will change. No Base refresh or Base clone is used. The cloud cannot run the fleet's final publication scan; the Mac landing gate retains it.

## Contract

No contract clause claimed; these are owner-journey design fixes (DIRECT 87).

## Before/after and behavior evidence

The baseline emitted build reproduced six problems at 1440, with each screen captured at 1440 and 390. Alerts had zero test buttons, Email remained an offered link without a receiving domain, a source reload defaulted to Recover and required the key, alert coverage had no live rota line, recovery required a URL, linked alerts remained active after resolution, and resolved incidents had zero Reopen buttons. See before-receipt.json and before-*.png.

The replay retains the previously verified D4–D9 implementation. The focused events-source journey passed, including copied native bearer/signed and compatible sender commands executed as pasted, fresh alert identities after reload, explicit add/recover, authentication and allowance refusals with unchanged durable state. The owner-alert journey passed all six items, inline missing-note refusal, optional recovery URL, default linked closure, explicit opt-out, direct Close, list/nav refresh, both Reopen doors, restoration of declared/acknowledged states, attribution, retained earlier recovery evidence, valid client/archive history and anonymous/viewer/revoked refusal. Its three test alerts and no outbound requests are recorded in owner-alerts-receipt.json. Tests assert at 1440; screenshots show 1440 and 390.

D6 adopts the UX-authorized one-click Take it option. Primary and backup names come from /api/on-call, including shared-service rotas. No automatic incident assignment was added. The current member can take the alert and incident, and both ownership changes persist.

Main's alertNotificationRunBrowser passes unchanged: frozen recipients and due-time order, no matching rule, current backup, acknowledgement, actual backup step, source closure, no recorded run, protected read, zero outbound requests and paging OFF. Its existing UI and every assertion survive the replay.

Truth checks: the test route uses session authority, looks up the selected service, retrieves integration keys inside the Worker and invokes actual intake. New tests generate fresh identities; add/close select an existing alert. The response policy is applied by admission. Coverage is read from the product rota; Take it writes through command handlers. Resolve validates a summary, accepts an optional URL, records recovered time and optionally closes linked alerts. Reopen reads the retained lifecycle and writes the current actor and reason to the timeline. Outbound-ledger assertions establish the no-paging statements for these journeys. Terminal recipes include the actual private key only in the explicit clipboard copy and remain under Details. Secret inputs are masked in the packet screenshots. All customer fixtures are synthetic.

Legacy recovery wording outside the replay remains intact; the changed forms accept optional links. No additional clause, release metadata, dependency pin or upstream source refresh is included.

## Test changes and scope

The source journey's obsolete repeated-key/key-paste expectations were replaced with fresh-default test sends and explicit add/recovery through the new session door. Bad-key refusals remain asserted through the actual provider/native intake doors, and allowance refusals still retain unchanged alerts/events. Recovery tests now reject malformed optional URLs rather than rejecting an omitted URL; required-summary refusal and unchanged-state checks remain. No journey registration was deleted or skipped. The workflow plan has 21 registered command entries before and after; the existing product browser journey contains the new helper. Contract totals remain 26 done, 41 partial, 34 missing (101 total), with no status changes.

Conflict resolution keeps main's current AlertPage signature and onCall prop, AlertNotificationRun panel, workspace-links focused journey, alert-run focused journey, and default alert-run invocation. D4–D9 assertions sit beside those entries. The original alerts-1 comparison has 57 differing files, all within the files changed by newer main since 09f2821d713460dcd33d0878dc3a7825daccfc5a. Relative to alerts-2, only subsequent main's files differ (plus the regenerated lock); no other product changes were added. See ancestry-precheck.json.

## Product candidate and validation

Branch: cloud/sd-oncall-design-alerts-3

Head: 993c8a9e3bbcf93b2a4cb4b979deb6fbf1109211

Fresh main before push: d88d44c4e8dedd1bf69682d3d2abcf4116dad3c4. The required rebase was a no-op. There is one ordinary candidate commit and no merge commits. Fleet author and committer identities passed for every candidate commit, with no trailers. Product push succeeded on its first attempt through cloud-push.py. No PR was opened; this repository's branch Verify is the pre-main entry point.

Passed: typecheck; production build; focused events-source plus owner-alert browser journey; unchanged main alert-run browser journey; response-policy browser journey; runtime core; triage storm; contract-docs check (0 errors/warnings); regenerated source lock and its check. Source lock was generated last. Initial local checks used the same product sources before commit; checks-receipt.json distinguishes that local proof from exact-SHA CI. Final browser captures were refreshed from a new committed-candidate build. Browser contexts and test Workers close in their own finally blocks.

Verify run: 44225715622, https://github.com/just-every/run-oncall/actions/runs/44225715622, exact candidate SHA. Discovery used one REST call; a single watcher polls at intervals greater than 300 seconds. Final CI state is recorded below and in ci-state.json.

The cloud cannot perform the fleet's publication scan, acceptance or landing. Those remain the fleet's independent gates. Evidence transport is report-only and does not change product custody.

Final committed-candidate build and focused events-source/owner-alert browser journey passed at 2026-11-18T02:49:57.992359+00:00; captures and generated receipts now come from 993c8a9e3bbcf93b2a4cb4b979deb6fbf1109211. Desktop axe has zero serious/critical findings; widths 1440 and 390 are captured. The product checkout remains unchanged.

## Final outcome

As of 2026-11-18T03:02:30.254398+00:00, exact-SHA Verify 44225715622 completed/success for 993c8a9e3bbcf93b2a4cb4b979deb6fbf1109211. The watcher used four GitHub API calls total, with each poll more than 300 seconds apart. No failure-log calls were needed. This is an ordinary green result; no generated-contract exception was used.

All D4–D9 owner journeys pass. There are no product blockers. Six baseline owner-journey problems are addressed; workflow command registrations remain 21 → 21; contract status counts remain 26 done / 41 partial / 34 missing. No clause status changed or was claimed. No PR, tag, release change, force push, main push or self-submission was made. The candidate is one linear commit on current main, with the current notification-run behavior and assertions retained.

Follow-up outside this replay: legacy recovery prose in incident service context still mentions evidence; the changed forms accept an optional link. It was left intact to preserve the requested prior-round diff and unrelated legacy prose.

The complete explicitly selected packet has 87 regular files (including this report, actual generated receipts, CI responses and masked screenshots). It is published only to refs/heads/evidence/sd-oncall-design-alerts-3, independently of the product branch. The disposable clone is removed after successful evidence publication and remote readback; this packet remains under $HOME/rer-consolidation/work/sd-oncall-design-alerts-3/packet/. Fleet publication scan, acceptance and landing remain the fleet's responsibility.

No contract clause claimed; these are owner-journey design fixes (DIRECT 87).

READY branch=cloud/sd-oncall-design-alerts-3 head=993c8a9e3bbcf93b2a4cb4b979deb6fbf1109211
