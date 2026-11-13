# Oncall clock audit — 2026-11-13

Searched all root tests for Date.UTC(20...), new Date(calendar literals), Date.parse(calendar literals), numeric epoch starts, clock arguments, runtime.time/w.time/setTime and browser clock injection; followed each injected value back to its definition and inspected sign-in ordering.

## Fixed

- tests/oncall-agent-analytics.mjs, analyticsReads: initial 2026-11-12 noon now derives the current whole hour. Its analyticsFixture login at frozen +2 minutes issues a 12-hour password session; the following foreign responder acknowledgement was rejected by SQLite after 2026-11-13 00:02 UTC. One-hour coverage and exact 60-second MTTA assertions remain.
- tests/oncall-agent-triage.mjs, triageReads: the same frozen initial instant now derives the current whole hour. All exact scoped incident/alert counts, cursor, deadline, refusal and no-effect assertions remain.
- tests/oncall-agent-alerts.mjs, alertReads/admissions: the same frozen initial instant now derives the current whole hour. The two related observedAt/Alertmanager startsAt literals now use one captured fixture observation instant. Native repeated trigger/recovery observations still share that instant, matching the original fixture. All six-alert scope, retained observations and class/refusal assertions remain.

## Other fixed dates inspected and preserved

- tests/oncall-agent-live.mjs incidentDeadlines and tests/agent-door-browser.mjs deadline loop rewind only the Worker/context after native sessions have been issued at real time. The manual-authority password sign-in occurs before the deadline rewinds. Those sessions are not issued in the historical clock.
- tests/agent-door-browser.mjs weekStart/weekNow freeze only measured audit calls after real-time native bootstrap; their fixed Monday/week membership boundaries are deliberate. They never age a newly issued historical password session.
- tests/intake.mjs rateAt freezes email receipt admission after real-time setup and the viewer sign-ins; the subsequent provider scenario uses a separate fresh Worker. Historical receipt time does not expire those sessions.
- tests/product-browser-journey.mjs keyboardInstant and support-hours setTime values are historical calendar/UI scenarios; sessions are obtained before rewinding. productSchedule restores real time before member/session coordination; its future DST preview is deliberately calendar-specific.
- tests/activation.mjs calendarFrom rewinds only calendar queries after setup; it restores current time before subsequent work. Schedule coordination uses relative times and explicitly renews its session after advancing past a later shift.
- tests/response-report-fixture.mjs nightResponseScenario and tests/triage.mjs bounds use October 2030 platform clocks. Their session expiries are beyond the requested 2026-12-13 horizon. Preserve their exact night/week/DST purpose.
- Date.UTC/Date.parse values in checkpoint-cli, changes, activation, routing, import fixtures and held-record/transfer snapshots are explicit query windows, DST boundaries, immutable retained history, provider observation timestamps, or intentionally expired/future policies rather than a real-time session issuance clock.
- tests/oncall-agent-flow.mjs agedReplayRetention already derives a current whole-hour start and advances relative elapsed durations; no change needed.

No additional fixed clock that would expire within 30 days was identified. No production code, migration, contract, acceptance judgment, assertion or test registration is changed. Three initial fixed clocks become zero; two associated fixed observation timestamps become zero. The new session clocks remain within the current hour, leaving at least eleven hours of the unchanged twelve-hour password validity window at test start.

Final inventory: all 49 JavaScript test sources use .mjs and were searched. The remaining test files are 22 JSON fixtures, one Markdown file, two text files and one ICS fixture. A final search of all non-.mjs files found no Date.UTC/new Date constructor or platform clock setter.
