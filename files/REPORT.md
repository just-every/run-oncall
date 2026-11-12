# Oncall timeline plain language

Task: main-oncall-timeline-plain-1
Repository: just-every/run-oncall
Branch: cloud/main-oncall-timeline-plain-1
Baseline main: 90f391b56d492b998e0e55509e076eaf588cbea4
Saved product commit: 880c3b559b1bb5e51df6570442813ed7e810d89b
Final product head and exact-SHA CI outcome: recorded in FINAL-RECEIPT.json and ci-status.json after publication.

## Result and scope

The timeline formats generated source recovery records in plain language: recovery stopped the alert obligations, human evidence and a summary are still required, a lead reminder was recorded, and automatic reminders and recovery notices are unavailable. Generated automatic declaration entries explain that the service response policy applied without printing its rule identity.

Source attribution resolves the configured name of routed/compatible intake sources and email addresses. Native Events API sources use the same existing name decoder as the integration screen, removing the generated identifier suffix. Unknown named integrations use “Unavailable source”. Raw identifiers are not displayed as timeline names; no unnecessary new control was added.

The phone timestamp rule permits wrapping within the timeline content column at widths up to 899px. The desktop timestamp rule is unchanged. Date, time, IANA zone and UTC offset remain present; no font was reduced and no line was ellipsized.

The customer-string audit also translated email integration import refusals, unverified PagerDuty contacts, active-incident import refusals, four unsupported-import categories and their detailed differences, and two Readiness messages. See string-audit.md for each before/after message. Archive provenance constants, original stored timelines, authored notes/reasons, contract documents and MCP conformance metadata retain their existing meaning.

No timer, sender, new timeline record kind, stored-state migration, contract status, Gap or Evidence edit was made. OC-027 remains partial; OC-075 remains missing. No DONE claim is made.

## Reproduction and proof

Before implementation, a fresh installation was created through the public setup HTTP door. A named native routed source admitted a trigger, the browser declared an incident from Alerts, and a recovery was sent through its public Events API. Opening the timeline showed OC-027 and the source identifier. At 390 in Australia/Brisbane both timestamp lines reached x=389 while the timeline card ended at x=357, despite document scrollWidth remaining 390. before.json and the two before-timeline screenshots record this, including the 1440 control.

The extended existing eventsSourceBrowser journey creates an Events API source through Settings, sends its sample trigger, declares from the alert through the browser, acknowledges, returns to the source and sends recovery. Desktop assertions reject internal-code patterns and the stored source identity as a name; require the owner-given source name and non-automatic reminder; and compare retained timeline records before and after display. At 390 a DOM Range checks every rendered timestamp line against its card, with a separate element scroll-width check and document overflow check. The three declaration, acknowledgment and recovery timestamps all fit. Changed timeline screens were captured at 1440 and 390 and visually inspected.

The existing responsePolicyBrowser journey additionally checks automatic declaration and routed-source recovery history for clause codes and internal rule identities. The existing Readiness browser journey rejects clause codes while keeping its public API/UI state comparison, refresh, overflow, hydration and axe checks. Its focused selector now stops after that journey instead of accidentally importing the unrelated agent browser suite; the initially triggered extra suite also passed. Existing import assertions now check meaningful refusals, retained object identity, no effects and no internal code patterns, replacing fixed clause-code wording requirements. All other import lifecycle, authority, rollback, restore, erasure and reconciliation assertions remain.

The source browser uses a separate synthetic-session context in Australia/Brisbane. An initial attempt to override the already-configured Playwright timezone through another CDP session failed before the journey; the context change resolved it. An initial import rerun used sourceId instead of the preview item's id in a new assertion; that test-only mistake was corrected. Those initial logs are retained honestly alongside the final run logs.

## Before and after

- Generated recovery clause-code occurrences in the reproduced timeline: 1 → 0.
- Source identity shown as a timeline name: 1 → 0.
- Phone timestamps escaping the baseline card: 2 of 2 → 0 of 3 in the extended candidate journey.
- Customer-facing clause-code message categories translated: 10; automatic-declaration rule-ID display removed: 1.
- Verification lane command registrations: 16 → 16; no test registration added and no cap raise requested. Existing journeys were extended.
- Contract summary counts: Done 24 → 24; Partial 43 → 43; Missing 34 → 34; total 101 → 101. All clause statuses are unchanged.

## Validation and publication

See FINAL-RECEIPT.json for the actual final command outcomes, product SHA and CI IDs. Actual local logs, the generated lock-check result, contract check output, timeline-receipt.json, and exact-SHA CI observations accompany this report. Full local verify was not run: the brief reserves the full wall for exact-SHA branch Verify.

The first real source commit was saved to the named cloud branch with skip-ci. Before the candidate, current main was fetched and merged (already included); published history was never rebased or force-pushed. The source lock was regenerated last and checked. Neither generated acceptance view was committed. Candidate author, committer, complete messages and trailers were inspected. Product and report-only refs are separate. The fleet Mac retains its required publication scan and landing gates; this cloud makes no landing or production-release claim.

CLAIM OC-009 PARTIAL points=none tests=tests/product-browser.mjs#eventsSourceBrowser; tests/product-browser.mjs#readinessBrowser
CLAIM OC-056 PARTIAL points=none tests=tests/product-browser.mjs#responsePolicyBrowser
DEFAULT OC-009: Preserve the existing visual design and desktop timestamp presentation; wrap complete local date/time/zone on phones.
GAP OC-009: This focused polish proves no complete new acceptance point or assistive-technology conformance claim.
GAP OC-056: Native recorded-state recovery proof does not prove the clause's email acceptance point, automatic reminder firing or delivery.
GAP OC-027: Durable escalation and automatic reminders remain outside this round.
GAP OC-075: Actual attempt cancellation and recovered-notice delivery remain unbuilt and outside this round.
