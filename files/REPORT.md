# Incident handoff review and export

Repository: just-every/run-oncall
Branch: cloud/main-oncall-handoff-review-ui-1

## Result

The incident page's existing Incident actions > Handoff draft panel uses the retained handoff HTTP actions. Active responders and administrators can prepare explicitly authored copy for an internal or customer audience, inspect it, review the exact saved copy and download the existing reviewed JSON packet. The saved copy shows its preparer, reviewer, timestamps and self-review attribution. A saved-handoff selector permits inspection of prior records. Viewer sessions see saved copy without prepare, review or export controls. Current-role/session failures give a plain reason.

Source drift removes review/export eligibility. If drift happens before the panel refreshes, the existing export HTTP conflict is surfaced and current eligibility is loaded. Prepare again retains the old record and creates a superseding copy against the current source, requiring another explicit review. Restore holds and withdrawal are explained. Every state retains the unsent boundary; no send or publish control was added. HTTP handlers, storage, payload schema and export format are unchanged.

Connection loss retains the prepare/review action identity for an explicit retry. An unconfirmed action does not permit starting another preparation or review, and replay does not create duplicate records or history.

## Plan and execution

The full original plan is in PLAN.md. Fleet launcher refresh, Git bundle helper, author/committer identity and repository-preserving commit hook were installed. Only the declared product repository was cloned. The original read-only panel was reproduced through a real emitted Worker browser session before edits; reproduction.log and before-1440.png retain that finding. No private real-user session was used.

12ui was installed and its existing-interface improve command was attempted. Hosted design generation required a separate account sign-in and was unavailable in this task. The implementation retains Oncall's established Hanken Grotesk, paper/ink tokens, incident dialog, fields, controls and close tooltip. Actual screenshots were inspected at desktop and phone widths. No design/account approval was needed for the product work.

The existing member-coordination browser registration was extended; no registration or verification script was added. Assertions run at 1440. The changed prepare/prepared/reviewed/viewer/stale panel states are captured at both 1440 and 390, with the incident screen also captured in the existing journey. Browser evidence is external to the product tree.

## Validation

- Maintained setup: npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive (through cloud_run), passed.
- Production build: npx -y @runeditrun/rer build (through cloud_run), passed; build.log.
- Touched browser journey: ONCALL_MEMBER_JOURNEY=incident-saves ONCALL_CHROMIUM_PATH=/usr/bin/chromium node tests/member-coordination-browser.mjs (through cloud_run), final result recorded in receipt.json and browser-test.log. Covers the existing autosave/review checks plus incidentHandoff: responder preparation, exact saved payload, lost prepare and review response replays, attributed review/time, exact downloaded JSON equality, viewer inspect-only access, current-role mutation refusal, actual stale-export HTTP 409, superseding current-source preparation and admin review. The existing accessibility check covers the handoff sheet.
- Typecheck, contract generator/check and final source lock/check: final results in receipt.json and corresponding logs.
- Exact-SHA branch Verify: final status and run ID in receipt.json and ci.json. No other SHA supplies this result.
- Fleet identity/trailer scan: candidate-identities.log. The product branch contains only product UI, its existing browser test extension and any required source-lock change. No contract or generated-view change, reports, receipts or screenshots are committed there.
- Base publication scan and landing remain the fleet Mac's independent gates; this cloud cannot run that scan.

## Before/after counts and clause custody

- Actionable handoff workflow stages on the incident screen: 0 -> 3 (prepare, review, export).
- Seed verification manifest registrations: 16 -> 16; existing member-coordination browser registration: 1 -> 1. No test-budget.json exists and no cap raise is requested.
- Contract full target counts: 24 done / 43 partial / 34 missing / 101 total, unchanged.
- Contract Status/Gap/Evidence cells and generated ACCEPTANCE.md/docs/CLAIMS.md: unchanged.
- OC-017 remains published/done in the existing source; this builder makes only the additional partial UI proof claim below. OC-051 remains target/partial. No DONE claim or status promotion.

CLAIM OC-017 PARTIAL points=1 tests=tests/member-coordination-browser.mjs#incidentHandoff
CLAIM OC-051 PARTIAL points=none tests=tests/member-coordination-browser.mjs#incidentHandoff
DEFAULT OC-017: Use the existing retained handoff API, internal visibility and unsent JSON export; viewers receive inspection-only UI.
GAP OC-017: This UI journey adds the prepare/review/inspect/export and source-drift surface; withdrawal, restore, storage bounds and concurrent-write proof remain in the existing HTTP tests and were not expanded in this round.
DEFAULT OC-051: No sending, provider connection, publication, new communication fields or reminders are added.
GAP OC-051: Real Lamp/Statuspage publication, delivery records, synchronization, reminders and publication-boundary proof remain outside this round.

## Publication

Product head, successful push receipt and exact-SHA Verify custody are recorded in receipt.json. Evidence files are separately published only on evidence/main-oncall-handoff-review-ui-1. Evidence transfer is not product acceptance, READY or landing. No PR is required by this repository's instructions; none was created. No main/default branch push or published-history rewrite was performed.

## Terminal result

Product head: `53f66988f27781f0d9a1851257f921db2f4e5205` on `cloud/main-oncall-handoff-review-ui-1`. Guarded product push succeeded on its first attempt; remote-head.txt confirms the advertised branch head. Exact-SHA Verify run [43140164557](https://github.com/just-every/run-oncall/actions/runs/43140164557) completed successfully. Five GitHub API calls were used (one discovery and four polls, over 300 seconds apart); no failing job, rerun, alternate-SHA claim or generator exception was needed. No product blockers remain.

The final touched browser journey and typecheck passed, contract generation wrote zero files and its check passed, and the staged source lock was regenerated last and checked successfully. The working tree is clean. Owned browsers and test Workers are closed, including the Worker left by one failed test attempt; its temporary synthetic scratch was removed. The product clone is deleted after the report-only evidence publication succeeds. Actual packet files remain under the fleet work directory.
