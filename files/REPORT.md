# Oncall documentation and week-summary alignment

Task: main-oncall-docs-week-1. Repository: just-every/run-oncall. Product branch: cloud/main-oncall-docs-week-1. Base observed: 8adae6c836f2fabda29e8a091b052450410c8ca5 (v0.5.13).

## Plan and implementation

The complete plan is in PLAN.md: initialize fleet identity, hooks and tooling; reproduce through the public app; update linked documentation and align the summary; extend the existing schedule journey; verify locally; synchronize main and regenerate the lock; commit and publish the named product branch; observe exact-SHA Verify and return this packet separately.

Six documentation pages changed: schedules, incidents, compatible-intake, monitoring-providers, changes and overview. They now name On call, the four-step New rota editor, the rota-page Cover a shift review/apply flow, and Settings → Integrations provider creation. The schedules guide also follows today's repeated-hour, calendar-feed, swap and reminder controls. The intake guides explain generated source IDs and one-time keys, creation before provider configuration, provider references, and explicit rotation/revocation. Protocol endpoints and receiver logic were not changed. README's domain-level description remains accurate; historical contract evidence and generated views remain untouched.

The linked-doc sweep covered 21 current app/README pages. Obsolete navigation references went from 13 to 0. See doc-sweep-receipt.json for the complete page inventory and matches.

The only runtime change derives On call's gap list from the already resolved This week timeline bands. Both now cover [observation minus one elapsed day, observation plus six elapsed days). Earlier gaps are included; gaps crossing the displayed end are clipped there; later gaps are excluded. Coverage resolution, rota storage, timezone handling, receivers and paging were not changed.

## Reproduction and decision

On a local emitted Worker with real D1 and Chromium, a Brisbane rota starting 14 November at 09:00 displayed uncovered hours beginning 13 November. Before the change, two earlier role gaps were missing from the summary. After a reviewed cover, the summary contained one interval, while the timeline contained three uncovered intervals; the fix lists all three with the exact timeline endpoints. See before-walkthrough.json and after-walkthrough.json.

Entering 00:00–08:00 for the cover was refused as outside validity. Entering 11:00–18:00 for the Brisbane rota saved 01:00–08:00 UTC. Current main resolves those controls in the rota's displayed zone, rather than unconditionally in the device zone. An independent check used a Brisbane device and a London rota: entered 11:00 saved 11:00 UTC. The guide documents the actual current-main behavior and tells the reader to use the zone printed in the dialog. See timezone-receipt.json. No timezone implementation change was needed.

The chosen range is the complete displayed schedule range. The named incumbent used for the choice is PagerDuty: its weekly schedule/effective-coverage presentation is the closest contract model, and a gap list alongside that view should explain that same displayed interval. This is a design choice against the contract's coverage model, not a live PagerDuty tenant acceptance claim. An upcoming-only label would leave the adjacent week view harder to reconcile.

## Public-door documentation walkthrough

The local schedules walkthrough used On call → New rota → Service and name → Who is on, in order → Hand-over (Australia/Brisbane, 14 November, 09:00) → Check → Create rota. It opened Cover a shift, reproduced the refused UTC-clock entry, reviewed the local interval, checked the assignments-and-gaps confirmation and applied it. Protected HTTP readback verified the saved UTC interval. The independent London/Brisbane check verified the printed-zone rule. The existing productSchedule journey additionally follows ordering, live Preview coverage, optional end validation, Create rota, cover review/dismiss/confirm, Edit rota, clock-change review, Apply reviewed change and Calendar feed → Open private ICS feed. Its desktop and phone coverage remains intact.

Integration walkthrough results, source configuration steps and followed provider-reference routes are recorded in integration-doc-receipt.json. These are local configuration/navigation checks; no external monitoring sender, email delivery, vendor tenant or account operation is claimed. Generated authority is deliberately absent from the packet. Source pages and docs are captured at 1440 and 390; confirmation credentials are never captured. The changed On call overview and cover controls are also captured at both widths.

## Verification and scope

The existing tests/product-browser-journey.mjs#productSchedule was extended, with no added registration or documentation test. New assertions run at 1440: a first-day uncovered interval is listed; an ending gap is clipped to the timeline end; a gap beyond that end is excluded; API summary and timeline gaps agree; rendered summary timestamps match their exact intervals. Existing 390 smoke and timeline assertions remain. No assertion was removed, skipped or weakened.

Local build, typecheck, focused rota-timeline product browser journey, source-lock check, contract-doc check and whitespace check passed. See checks-receipt.json, schedule-test.log, typecheck.log and source-lock-check.json. Full local verify was intentionally left to exact-SHA branch Verify per this brief. The full fleet publication scan is the Mac lander's required gate; this VM checked the changed lines for credential-shaped additions and found none. No claim of a complete publication scan is made here.

Clause status changes: none. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are unchanged. Before/after counts remain 26 done, 41 partial, 34 missing, 101 total. This round extends one existing journey and adds zero test registrations; no test-budget.json exists in this checkout. No acceptance point is claimed complete by this bounded docs/summary round.

CLAIM OC-020 PARTIAL points=none tests=tests/product-browser-journey.mjs#productSchedule
DEFAULT OC-020: The gap summary covers the same full seven-elapsed-day interval as the displayed timeline, including earlier hours.
GAP OC-020: This round proves the week-summary subset; it makes no new complete-point, provider-delivery, paging or live incumbent claim and retains main's clause judgment.

## Product and evidence custody

Final product SHA and exact-SHA Verify status are recorded in product-receipt.json and ci-receipt.json. Identity and trailers are inspected for every candidate commit, including side parents, before publication. The product contains only requested documentation, the summary fix, its existing journey extension and regenerated source lock. Reports and screenshots travel only on evidence/main-oncall-docs-week-1. Evidence transport never signals product landing or acceptance. The fleet retains ownership of publication scanning and landing on main.

Implementation journey tested on the tree published as d2e63dcafad4f91d65e64ebd9bb97438b75497cb. Final candidate d54fb7958cedddbce40483dd3d557db183842112 adds only the corrected “Next two weeks” guide heading and regenerated lock hash. Its final build and lock check passed; exact-SHA Verify is required separately. The first-head watcher was stopped after one discovery; final-head API accounting continues from call 2.

Additional schedule walkthrough passed on the final candidate: Different backup order, Add backup person, reorder/remove, custom daily interval, optional end, repeated-hour Later, swap approval autosave, reminder autosave, private calendar creation/read/hide/revocation, and a future Request a swap followed by cancellation. See rota-doc-controls-receipt.json. Revoked feeds return 404 after the revoke commits. An already-assigned backup correctly refused a swap with 409 because substitution would introduce a coverage gap; an unassigned active substitute succeeded. No private calendar URL or generated key was retained. Final schedule guide screenshots were refreshed after the timeline-heading correction.
