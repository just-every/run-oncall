# sd-oncall-c-f335 · Oncall service runbook audit parity

- Product branch cloud/sd-oncall-c-f335, head a8eea7a6220c533b41b5de76fd64d42a97b8a81f.
- Main base 9e7d7cdc9a4b1fa53cbcd01ba4d0047b18cf523d, with Verify 44953278792 and Run site 44953278752 completed successfully on that base.
- The first product save was pushed as ab2f53fa7927e28e9bb24e7a78a0f27410d389a5.
- Exact-candidate Verify run 44960884544, event push, status completed, conclusion success. https://github.com/just-every/run-oncall/actions/runs/44960884544
- Contract counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING across 101 clauses. BASE-AGENT-002 stays MISSING.

## Scope and plan

The selected replan-95 row covers one part of BASE-AGENT-002 acceptance 5. The plan was to match the Settings service command’s permanent audit type at the MCP native write boundary, push the product save, extend the existing emitted Worker and browser journeys with paired runbook-only edits, and check both company policies before proposing the candidate. The held f184 notes review and retry work remains outside this row.

The product diff changes only the audit kind passed by the existing tool to the native audit boundary. The versioned REST override in src/agent-door/native.ts, the native command, the action’s authorization and class logic, the resource link and the service.changed event remain in their existing paths. Existing stored audit rows require no migration. The test diff extends existing journeys under the same Verify plan.

## Acceptance and remaining gaps

| Acceptance | Result | Evidence |
| --- | --- | --- |
| 1 | Open | Complete Core job discovery and CLI coverage are outside the selected slice. The local first-party check ran. |
| 2 | Open | Complete tool result schema validation is outside the selected slice. |
| 3 | Open | Complete read, destructive and external tool annotation validation is outside the selected slice. |
| 4 | Open | General stable refusal parity between the UI and the tools is outside the selected slice. |
| 5 | Runbook-only service parity observed | The existing Settings autosave and MCP tool saved equivalent granted public service records with identical literal steps in both policies. Each save advanced the workspace once and added one permanent accepted command.service event. The human actor and command source and the distinct MCP agent and sponsor were attributed. Both copied incident runbooks and previous permanent write history survived. The held MCP save added one open standard review, and the separate held resource read kept its own review. The agent journal kept the separate service.changed notification. Both saved settings were reloaded at 1440 and 390 pixels. Paging stayed OFF with no Worker or browser egress from the probe. Other acceptance 5 variants remain open. |
| 6 | Open | Embedded-agent audit parity is outside the selected slice. |

Existing declaration, acknowledgment, mitigation, reassignment, resolution, Scribe, erasure, replay, person-only review and follow-up paths retain their assertions. The selected test covers only ordinary public services, with no provider, paging activation, device or cross-seed obligation treated as passed. The versioned REST journey checks that a service edit still adds its accepted automation.services event after the existing automation.request bookkeeping. The first local assertion matched the bookkeeping revision. The revised assertion checks both permanent events in order, and the machines rerun passed.

## DONE riders and self-check

1. **Open for the full clause.** The runbook outcome is exercised by standardServiceRunbookUpdate in tests/oncall-agent-service-replay.mjs:121 and serviceRunbookBrowser in tests/agent-door-browser.mjs:1179. The remaining acceptance outcomes are listed above.
2. **Pass for the selected slice.** The public doors create populated services and pre-existing copied runbooks. The native audit assertion in tests/oncall-agent-service-replay.mjs:6 compares write deltas and attribution. The fixture checks both protected records and copied steps. The earlier exact and conflicting service-name retries still exercise the refusal as well as the successful path.
3. **Recorded in the verification metadata below.** The push plan includes both the agents and agent-browser journeys. The runtime machines journey covers the REST override in tests/runtime.mjs:1784.
4. **Pass for this local proof.** The browser run used the candidate build and an explicit screenshot destination. The final amendment normalized the unused default screenshot path and refreshed the lock. The receipt records the final product SHA and command exits.
5. **Inspected.** SURFACE-001 already cites BASE-AGENT-002. This change adds no inherited obligation.
6. **Pass for builder mechanics.** The documented generator and check passed. The contract judgment stays MISSING and the judgment provenance stays with the lander.
7. **Pass.** No acceptance text, rider, map or Status table change.
8. **Pass for preservation.** The native guards remain in place. The existing emitted agent runtime covers revoked credentials, erased subjects, scoped authority and replay alongside the runbook probe.
9. **Inspected.** The observed boundary was local Worker and browser egress with paging OFF. Provider, standby and device holds remain open.
10. **Pass.** The fixtures use the existing autonomous and held policies. No new authority, consent, custody or spending rule is introduced.
11. **Pending the guarded lander.** The candidate is on its product branch. Candidate main equality, main-only Run site and the full-history publication scan require the lander's evidence.

The browser asserts at 1440 pixels and captures reloaded settings at 1440 and 390. The runbook field met the 13-pixel minimum, the edited section uses labelled fields, and no icon-only controls were introduced. No prior assertion was removed or narrowed. The selected packet contains only synthetic browser proof and written check results.

## Verification receipts

The emitted build, agent runtime, machine runtime, agent browser, typecheck and first-party check exited 0. The emitted browser used Chromium with the normal Worker and a synthetic local owner session. The eight Settings captures and their checksums are recorded in checks.json. The selected Settings probe and the carried service resource proof are included verbatim there.

The generator wrote zero documents. Its check passed before restoring the generated views from main. The pinned edition-authoring lock was regenerated last and its check passed. The product changes no migration.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

PROBE BASE-AGENT-002 5 service runbook: Settings auto-save and MCP oncall.services.update on equivalent public service records under autonomous and held policies → same saved literal steps and service fields, each with one command.service event and one workspace increment. The copied incident runbooks survived. Only the held MCP write opened a standard review. Settings reloads at 1440 and 390 preserved state and audit custody. Paging OFF and zero Worker and browser outbound requests.

CLAIM BASE-AGENT-002 PARTIAL points=5 tests=tests/oncall-agent-service-replay.mjs#standardServiceRunbookUpdate; tests/agent-door-browser.mjs#serviceRunbookBrowser; tests/product-browser-journey.mjs#savedServiceRunbookBrowser

GAP BASE-AGENT-002: Complete Core tool and CLI coverage, tool schemas and annotations, stable refusal parity, remaining UI and tool pairs including the held notes review and retry slice, and embedded-agent audit.
