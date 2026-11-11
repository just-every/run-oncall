# BASE-AGENT-010 frozen scope and proof map

The incumbent is the clause's agent change feed: retained cursor reads, subscription notification and signed webhooks. This round implements only the planned events listing channel. No native UI timing, subscription or webhook result is inferred.

| Row | Outcome | Public proof | Result |
| --- | --- | --- | --- |
| R1 | Retained events have stable distinct IDs, types, record URIs, actors and times | ./tests/oncall-agent-events.mjs retainedEvents, lines 32 to 44; real declarations and MCP listing | Focused PASS under both policies |
| R2 | One cursor replayed twice returns the same retained IDs in retained order | Same journey, lines 45 to 50 | Focused PASS under both policies |
| R3 | Removing the reading person's current native authority prevents disclosure of the record, with readable events remaining | Same journey, lines 95 to 103; ordinary native member command, same bearer, populated private incidents and an own approval control | Focused PASS under both policies; current native authority removal affects all native service reads |
| R4 | Missing native read scope discloses no record event | Same journey, lines 86 to 89 | Focused PASS under both policies |
| R5 | Pending and decided approvals retain their classes and originating decision reference | Same journey, lines 52 to 63 and 78 to 84; person signs in and approves the exact saved summary | Focused PASS under both policies |
| R6 | Review flags originate in the signed-in review feed and retain classes and originating decision reference | Same journey, lines 64 to 69 and 78 to 84 | Focused PASS under both policies |
| R7 | Unrelated people cannot read private approval or review events | Same journey, lines 90 to 94; independent mapped responder | Focused PASS under both policies |
| R8 | Policy adoption carries its class and decision | ./policy-event-probe.mjs, real signed policy adoption then MCP listing | FAIL: both class metadata and a decision reference are absent; Base dependency |
| R9 | Reads have audit attribution, no native or paging effects and zero outbound requests | Same journey, lines 18 to 29 and 104; ./tests/agent-door-runtime.mjs eventReadSnapshot | Focused PASS under both policies |
| R10 | Complete Base harness effects, event shape, cursor and decision-event matrix executes with events declared | Existing rer verification harness; current events journey retained | Required verification receipt records actual result |

Acceptance 1 (native UI change within ten seconds), acceptance 2 (same webhook ID), acceptance 5 (failed webhook replay), the subscription and webhook portion of acceptance 4, all native change coverage, and the inherited agent egress and paging holds remain outside this events-list slice. Acceptance 6 is explicitly incomplete because R8 fails. No whole-clause promotion is requested.
