# What you can do

The target is a complete US-first on-call and incident-response product: real independent phone/SMS/push paging, durable escalation, correct coverage, native mobile response, monitoring/chat/phone integrations, recovery and post-incident follow-through, plus scoped agents. CONTRACT.md defines the destination, not a claim that it ships today.

Current release 1 supports local/hosted coordination beside an existing pager: members/services, copied runbooks, incidents, alerts/replay, owned actions/reviews, named-zone primary/backup rotations/overrides, private ICS, reviewed Opsgenie/PagerDuty file move-in and atomic checkpoints/handoffs. Production paging remains OFF and the existing pager authoritative. Independent standby is not required for coordination; release 2 paging, mobile and standby remain unbuilt. Demo simulations never prove delivery.

## Maintained verification flows

The numbered flows are acceptance requirements through the product’s public doors. Status is assessed from source and maintained exercising tests at main `661e39e334c5ffcc263df5218bdd519e0e2aec09`, starting from the supplied audit at `61a02005ab5731c374e8db8af8fd451ae257e314` and re-reading changed paths. **done** is limited to the named implemented flow, **partial** means a subset, **missing** means no implementing flow. Each build round records the exact tested commit and actual result separately. Listing a future journey does not mean a new test exists or that it passed. No live mail/phone/provider/hosted account, native-device or standby result is inferred from local tests.

`rer verify` is the maintained full local entrypoint. Contract-document changes use the existing `rer check --profile first-party` validation; do not weaken checks, change IDs or treat a status/copy assertion as feature acceptance. Existing test files below are entrypoints, not promises that they cover every future requirement.

1. **OC-001 — Event identity and alerts. Status: partial.** POST signed and bearer events through /api/ingress/:source; repeat a normalized identity, conflict changed content, send recovery before trigger and after a newer generation, and inspect protected state. Verify grouping across multiple sources without merging service/environment boundaries.

   Existing implementation / exercising flow: `src/api.ts`; `src/family/response-operations/domain.ts`; `tests/runtime.mjs`. Identity/generation and linked alerts are exercised; comprehensive grouping acceptance is not established.

2. **OC-002 — Routing replay. Status: done.** Admit a severity-routed event, change policy, POST /api/replay and compare the immutable admission explanation with the proposed decision in submitted order; compare state before/after for zero writes.

   Existing implementation / exercising flow: `src/api.ts`; `src/family/response-operations/domain.ts`; `tests/runtime.mjs`.

3. **OC-003 — Roles and authority. Status: done.** Use anonymous, expired, revoked, viewer, responder and admin sessions on reads, commands, sources and archives; revoke or downgrade while a real HTTP mutation is incomplete and prove no publication. Verify minimal intake receipts disclose no private routing data.

   Existing implementation / exercising flow: `src/api.ts`; `src/auth.server.ts`; `tests/runtime.mjs`; `tests/runtime-authority.mjs`. Workspace-wide roles are implemented; team isolation and federation are separate targets in OC-023/039.

4. **OC-004 — Incident state transitions. Status: done.** Declare from admitted alerts, acknowledge, reject stale concurrent changes, clear the source alert, refuse resolution without evidence and summary, then resolve and inspect the attributed timeline over HTTP.

   Existing implementation / exercising flow: `src/family/response-operations/domain.ts`; `tests/runtime.mjs`. Recovery attestation is a human claim, not independently measured customer recovery.

5. **OC-005 — Copied runbooks. Status: done.** Declare an incident, edit its service runbook and confirm the copied incident steps remain unchanged; create an owned due-dated action, require completion evidence and retain unfinished work and review after resolution.

   Existing implementation / exercising flow: `src/family/response-operations/domain.ts`; `tests/runtime.mjs`. Alert-level runbook access and follow-up policies are targets in OC-023/036.

6. **OC-006 — No outbound incident effects. Status: done.** Use coordination and handoff preparation/export on a normal installation; prove no paging receipt, production action, AI call or external publication occurs. Confirm draft exports remain unreviewed and source links confer no access.

   Existing implementation / exercising flow: `src/delivery.ts`; `src/handoff-api.ts`; `src/mail.server.mjs`; `tests/runtime.mjs`; `tests/activation.mjs`. This is the current-release safety boundary, not the final product boundary.

7. **OC-007 — Native archive. Status: done.** Export through /api/archive; restore valid held records and reject malformed references/storage failures without losing prior data. Inspect event, incident, runbook, action, timeline and attribution identity and confirm authentication material is absent.

   Existing implementation / exercising flow: `src/api.ts`; `src/family/response-operations/domain.ts`; `tests/runtime.mjs`. The full future paging archive is OC-052.

8. **OC-008 — User-authored records kept. Status: done.** Submit over-limit and malformed intake, hostile structured text and runbook links; verify bounded refusal, literal display with no script execution/fetch, and preservation of authored history after restart/export.

   Existing implementation / exercising flow: `src/api.ts`; `src/family/response-operations/domain.ts`; `tests/runtime.mjs`; `tests/activation-browser.mjs`. No automatic incident age/count deletion is implemented; complete retention controls are OC-040.

9. **OC-009 — Accessible interface. Status: partial.** At 1440 and 390, use keyboard-only declaration, acknowledgement, notes, schedules, overrides and preview; inspect focus/labels, status announcements, literal hostile HTML and a real stale-write failure with no saved claim. Check contrast, screen-reader operation and every new target surface before its release.

   Existing implementation / exercising flow: `src/forms.tsx`; `src/app/AlertsPanel.tsx`; `tests/keyboard-coordination.mjs`; `tests/activation-browser.mjs`. Maintained keyboard/responsive journeys exist; full accessibility conformance is not established.

10. **OC-010 — Health and honest commands. Status: partial.** Run check/describe and /health with storage available and unavailable; compare deployed identity to the actual build. Record local, hosted, provider and human-drill outcomes separately and test durable failure diagnostics for each new execution class.

   Existing implementation / exercising flow: `src/api.ts`; `scripts/installer/seed.mjs`; `tests/hosted.mjs`; `tests/transfer.mjs`. Storage health and command journeys exist; independent pager health/capacity and live-provider proof do not.

11. **OC-011 — Calendar-day rotations. Status: done.** Save primary/backup schedules and query HTTP preview across spring/fall DST, ambiguous/nonexistent minutes, override edges and overlap refusal; retain inactive/viewer/missing slots as gaps and detect duplicate primary/backup responders.

   Existing implementation / exercising flow: `src/family/response-operations/schedules.ts`; `src/paging-api.ts`; `tests/activation.mjs`.

12. **OC-012 — Paging off. Status: done.** On a normal installation POST each delivery/job/tick/callback/resume door and confirm paging-OFF refusal with no receipt. Treat demo simulations as simulations. Native cutover additionally requires OC-026–029 and OC-038 real-phone/provider-failure acceptance.

   Existing implementation / exercising flow: `src/delivery.ts`; `src/paging-api.ts`; `src/schedule-api.ts`; `tests/activation.mjs`; `tests/demo.mjs`. No production paging authorization is created by this contract change.

13. **OC-013 — Held history stays historical. Status: done.** Restore held synthetic jobs/receipts/callbacks, observe pending work paused, acknowledge or cancel with attribution, reject resume, and verify incident recovery remains unchanged.

   Existing implementation / exercising flow: `src/family/response-operations/escalation.ts`; `src/paging-api.ts`; `tests/paging-history.mjs`; `tests/activation.mjs`.

14. **OC-014 — Side-effect-free previews. Status: done.** Read now/next and schedule/routing previews, compare durable state and receipt counts, and confirm no timers or provider actions were created and historical synthetic data stays labelled.

   Existing implementation / exercising flow: `src/schedule-api.ts`; `src/paging-api.ts`; `tests/activation.mjs`.

15. **OC-015 — Strict module archives. Status: done.** Round-trip the strict module archive through protected HTTP; reject unknown fields, broken references and injected SQL failure atomically, retain callbacks and pause pending historical jobs.

   Existing implementation / exercising flow: `src/family/response-operations/paging-archive.ts`; `src/paging-api.ts`; `tests/paging-history.mjs`; `tests/activation.mjs`.

16. **OC-016 — Recovery checkpoint. Status: done.** Use /api/recovery/checkpoint and the private CLI to capture and restore both revisions; exercise malformed/capacity/storage failures and competing writes, identity mapping, orphan history and session revocation without revoking the winning restore session.

   Existing implementation / exercising flow: `src/api.ts`; `src/family/response-operations/recovery.ts`; `scripts/checkpoint.mjs`; `tests/activation.mjs`; `tests/checkpoint-cli.mjs`.

17. **OC-017 — Reviewed handoffs. Status: done.** Prepare, review, inspect and export exact handoff copy over protected HTTP; change source/revision, withdraw, restore v1/v2 and race writes. Verify eligibility/holds, stable action identities, append-only attribution and all storage bounds with no send authority.

   Existing implementation / exercising flow: `src/handoff-api.ts`; `src/family/response-operations/handoffs.ts`; `tests/activation.mjs`. Connected communication is a separate target in OC-034/051.

18. **OC-018 — Maintained root commands. Status: partial.** Exercise documented setup/dev/build/preview/reset/archive/deploy dry-run, owner entry and member password sign-in. Hosted acceptance must actually deploy, retire setup authority, use a real emailed owner link, coordinate with a member after reload, and remove recorded resources with empty provider readback.

   Existing implementation / exercising flow: `scripts/installer/seed.mjs`; `src/auth.server.ts`; `tests/transfer.mjs`; `tests/signin-browser.mjs`; `tests/activation-browser.mjs`. Local lifecycle, unavailable-mail refusal and hosted serving are exercised; these tests do not prove account deployment or inbox receipt.

19. **OC-019 — Additive upgrade. Status: done.** Seed the held one-row SQL data, migrate, sign in with the held password and compare all entities, nested histories and original ordering through HTTP; repeat migration/restart without silent reassignment to Base identity.

   Existing implementation / exercising flow: `src/workspace-store.ts`; `migrations/core/0106_relational_workspace.sql`; `tests/runtime.mjs`; `tests/runtime-held-workspace.mjs`.

20. **OC-020 — Now/next and calendar feed. Status: done.** Read now/next and authenticated ICS for seven-day default and bounded explicit windows; verify primary/backup UTC boundaries, overrides and gaps, deny unauthenticated access and confirm admission starts no paging.

   Existing implementation / exercising flow: `src/calendar.ts`; `src/schedule-api.ts`; `tests/activation.mjs`; `tests/activation-browser.mjs`. Private ICS downloads support Google Calendar/Outlook import; persistent subscription credentials are OC-025.

21. **OC-021 — Move-in preview. Status: done.** Follow provider export instructions, preview saved Opsgenie and PagerDuty list/detail bundles with zero writes, inspect exact rejected/unmapped rules and fingerprints, apply paused and explicitly map people/services before adopting native coverage.

   Existing implementation / exercising flow: `src/move-in/api.ts`; `src/move-in/source.ts`; `src/move-in/adoption.ts`; `tests/activation.mjs`; `tests/move-in-adoption.mjs`; `tests/provider-export-browser.mjs`. Reviewed file migration is implemented; full incumbent cutover and other vendors are OC-038.

22. **OC-022 — Resume and undo. Status: done.** Apply, interrupt/restart, resume and undo both vendor imports over HTTP; revoke authority at publication, inject SQL failure, replay unchanged/changed identities and preserve native edits as named undo conflicts.

   Existing implementation / exercising flow: `src/move-in/api.ts`; `src/move-in/operation.ts`; `src/move-in/journal.ts`; `tests/activation.mjs`; `tests/move-in-adoption.mjs`.

23. **OC-023 — Services, teams and ownership. Status: partial.** Create two teams and a dependent service through the UI/API, read the alert runbook, import a Backstage ownership change, deny a foreign-team user through direct/export/chat doors, and resolve an ownership conflict without losing incident history.

   Existing implementation / exercising flow: `src/family/response-operations/domain.ts`; `src/api.ts`; `tests/runtime.mjs`. Services, service runbooks and workspace roles ship; team scoping, dependencies, alert runbooks and Backstage do not.

24. **OC-024 — Follow-the-sun, PTO and holiday coverage. Status: partial.** Build New York/Los Angeles/London handoffs, add a US holiday and approved PTO in Google and Outlook, inspect a DST weekend and uncovered interval, then apply a reviewed layer change and compare actual paging targets to the preview.

   Existing implementation / exercising flow: `src/family/response-operations/schedules.ts`; `src/schedule-api.ts`; `tests/activation.mjs`. Named-zone primary/backup rotations and overrides exist; follow-the-sun composition, holiday and PTO integration are missing.

25. **OC-025 — Swaps, reminders and calendar subscriptions. Status: partial.** Request, accept and race two swaps, reject an unauthorized substitute, revoke a calendar subscription, view the effective rotation in Google/Outlook, and observe automatic change/reminder delivery plus a visible failed-notification outcome.

   Existing implementation / exercising flow: `src/calendar.ts`; `src/schedule-api.ts`; `tests/activation.mjs`. Authenticated ICS downloads and manual overrides exist; swaps, reminders and persistent revocable subscriptions are missing.

26. **OC-026 — Native US phone, SMS, push and email paging. Status: missing.** On registered US carrier phones, trigger a real alert and verify voice/DTMF, SMS replies/links, push and incident email. Disable Twilio then the second provider and the push path separately; prove an independent route reaches the responder. Reject forged/duplicate callbacks, expose uncertainty and opt-out, and record actual receipts and human acknowledgement rather than test-provider success.

   Existing evidence: no implementing flow; this is required target acceptance. Only the paging refusal exists; no live providers, responder rules or carrier drill.

27. **OC-027 — Durable escalation until acknowledged. Status: partial.** Trigger through the Events API, close the browser, cross a handoff and observe primary, secondary, repeat and round-robin pages. Restart workers at a deadline; race reassignment, acknowledgement, duplicate callbacks and acknowledgement expiry. Inspect one consistent obligation history, stopped jobs and the final failure path.

   Existing implementation / exercising flow: `src/paging-api.ts`; `src/family/response-operations/escalation.ts`; `src/delivery.ts`; `tests/activation.mjs`. Inspectable policies and historical acknowledge/cancel exist; active timers, reassignment, repeat and round-robin execution are absent.

28. **OC-028 — Independent standby and tested takeover. Status: missing.** During live phone drills remove the main site’s network, storage, identity and account access in turn, split the sites, duplicate intake and acknowledge at either site. Measure loss-to-takeover and takeover-to-human-page times, verify fencing, role announcements and recovery/failback, and prove no acknowledged incident resumes. Publish measured results and operating instructions before cutover.

   Existing evidence: no implementing flow; this is required target acceptance. One Cloudflare coordination deployment is not independent pager continuity.

29. **OC-029 — Native iOS and Android responder apps. Status: missing.** On physical supported iPhone and Android devices, trigger with the screen locked and DND enabled after permission enrollment; observe urgent notification and one-tap server acknowledgement. Deny permissions, revoke a device and disconnect data; verify phone escalation, pending offline state, current schedule and an accepted swap without duplicate authority.

   Existing evidence: no implementing flow; this is required target acceptance. Responsive web is implemented, but no native apps, entitlements or live critical-push acceptance exist.

30. **OC-030 — Datadog, Prometheus and Grafana intake. Status: missing.** Use each provider’s supported test/send door then fire and recover a real rule; repeat/reorder a grouped webhook, reject forged auth and malformed payloads, and inspect one correct incident generation and public-door rejection diagnostics.

   Existing evidence: no implementing flow; this is required target acceptance. Generic scoped intake exists; none of these provider adapters is implemented.

31. **OC-031 — AWS CloudWatch and SNS intake. Status: missing.** Subscribe a real authorized SNS topic, transition a CloudWatch alarm through ALARM/OK/INSUFFICIENT_DATA, duplicate/reorder notifications, rotate access, and refuse forged signatures, foreign topics and hostile confirmation URLs without network or state side effects.

   Existing evidence: no implementing flow; this is required target acceptance. No AWS adapter or subscription validation is implemented.

32. **OC-032 — Error and uptime integrations with sibling products. Status: missing.** Trigger and recover via a real Sentry rule, Spool error group and Uptime monitor; replay each event, send a stale recovery and access a restricted context link. Verify correct grouping, source permission checks and a still-open incident until evidence-backed human resolution.

   Existing evidence: no implementing flow; this is required target acceptance. Only the generic event schema is implemented; no Sentry/Spool/Uptime connector acceptance exists.

33. **OC-033 — Generic email and Events API. Status: partial.** Send signed and bearer API events plus a real inbound provider email; duplicate message IDs, revoke credentials, exceed limits, spoof senders and submit malformed MIME. Inspect accepted receipts, bounded quarantine/rejection diagnostics and no unauthorized read or incident mutation.

   Existing implementation / exercising flow: `src/api.ts`; `tests/runtime.mjs`. Scoped signed/bearer Events API is exercised; inbound email is absent.

34. **OC-034 — Slack and Microsoft Teams response. Status: missing.** In each real workspace/tenant declare an incident, observe the automatic channel and role assignment, acknowledge through a command/action and see the same web state. Replay a request, remove a grant/member, attempt cross-tenant access and break channel creation; verify denial, one state change and continued phone escalation.

   Existing evidence: no implementing flow; this is required target acceptance. Internal handoff drafts do not implement either collaboration app.

35. **OC-035 — Incident bridges and live call routing. Status: missing.** Call the real US number across a handoff, answer and acknowledge, miss a call and reach secondary, fail each carrier and transfer a live call. Create Zoom and Teams bridges from incident actions, deny an unauthorized join/detail read, and inspect call/timeline/outcome records without exposing recordings to viewers without a grant.

   Existing evidence: no implementing flow; this is required target acceptance. No telephony routing or conferencing connector exists.

36. **OC-036 — Post-incident review and completion policy. Status: partial.** Resolve with open critical work, generate review material, accept a correction and create a Jira, Linear, GitHub and GitLab follow-up. Advance due time with the browser shut, reopen a remote issue and revoke its connector; verify reminders, escalation, synchronization/conflicts and evidence-required completion without erasing history.

   Existing implementation / exercising flow: `src/family/response-operations/domain.ts`; `tests/runtime.mjs`. Attributed timelines, human review and owned evidenced follow-ups ship; priority policies, reminders and ticket connectors are missing.

37. **OC-037 — Response analytics and fair on-call load. Status: missing.** Run a known sequence of resolved, open, never-acknowledged, late, repeated and imported incidents across DST and after-hours shifts; compare dashboard/CSV/API figures with source timelines and coverage hours, inspect an interruption-fairness imbalance and refuse foreign-team exports.

   Existing evidence: no implementing flow; this is required target acceptance. No response/load analytics or report export exists.

38. **OC-038 — Complete incumbent migration and controlled cutover. Status: partial.** For each named incumbent migrate a representative export/account through preview, apply, restart, reconcile and undo, including custom policies, overrides and an open incident. Resolve named mapping differences, compare coverage across a US DST change, rehearse parallel alert routing and rollback, then perform an authorized real-phone cutover under OC-026–029. Opsgenie migration has a dated readiness checklist for its announced 5 April 2027 shutdown; current provider/export availability must be checked at execution.

   Existing implementation / exercising flow: `src/move-in/api.ts`; `src/move-in/adoption.ts`; `tests/activation.mjs`; `tests/move-in-adoption.mjs`. Reviewed Opsgenie/PagerDuty schedule file move-in ships; JSM/VictorOps adapters, complete account reconciliation and live cutover do not.

39. **OC-039 — Enterprise access and responder lifecycle. Status: partial.** Invite a responder, sign in through Okta and Entra, require step-up to edit paging credentials, deprovision via SCIM while a write is in flight, and exercise documented emergency access during IdP loss. Verify immediate denial across web/mobile/chat/standby and a visible coverage gap.

   Existing implementation / exercising flow: `src/auth.server.ts`; `src/api.ts`; `tests/runtime-authority.mjs`; `tests/signin-browser.mjs`. Native owner email links and admin-created local member passwords exist; invitations, federated identity, MFA and SCIM are not adopted product flows.

40. **OC-040 — Retention, erasure and custody. Status: partial.** Erase an imported person including filenames, plans and indirect schedule references, then erase native contact/incident/connector data and inspect all local/standby/export copies and receipts. Restore with a later erasure journal, inject a failure and race a send; prove rollback or a visible incomplete state, explicit schedule gaps and no success before all owned custody is handled.

   Existing implementation / exercising flow: `src/move-in/erasure.ts`; `src/portability-policy.mjs`; `tests/activation.mjs`. Exact imported-person erasure and custody/fence proof exist; general entity retention/erasure and standby reconciliation are incomplete.

41. **OC-041 — Durable operational audit. Status: partial.** Change roles/schedules, admit an event, send and acknowledge, crash each worker class at its send boundary, erase its subject and export audit through a protected door. Compare state and audit atomically, retain uncertain outcomes and prove secrets/personal content are absent from the surviving anonymized records.

   Existing implementation / exercising flow: `src/family/response-operations/domain.ts`; `src/family/response-operations/handoffs.ts`; `tests/runtime.mjs`; `tests/activation.mjs`. Attributed incident/handoff and coordination audit exist; complete secret-free administrative audit and all execution outcomes are not established.

42. **OC-042 — Credential custody and declared external flows. Status: partial.** Configure and rotate each connector over a protected setup door, inspect authorized network traffic at its network edge and all persisted/exported representations, submit hostile URLs/redirects and revoked credentials, and prove only the chosen endpoint receives the minimum permitted content and secrets never travel in an archive or model request.

   Existing implementation / exercising flow: `src/api.ts`; `src/auth.server.ts`; `src/mail.server.mjs`; `src/portability-policy.mjs`; `tests/runtime.mjs`. Current scoped intake, sign-in mail and authority exclusions exist; new provider encryption, network limits and model data controls are unimplemented.

43. **OC-043 — Explainable grouping and event orchestration. Status: partial.** Send correlated and unrelated Datadog/Prometheus/error events across services, replay after changing policy, apply/expire maintenance and suppression with a browser closed, and restart during orchestration. Inspect retained originals and explanations, one intended action per identity and a visible unmatched/failure queue.

   Existing implementation / exercising flow: `src/family/response-operations/domain.ts`; `src/api.ts`; `tests/runtime.mjs`. Exact-key grouping, severity suppression and replay exist; cross-source correlation, timed suppression and live orchestration are absent.

44. **OC-044 — US operating boundaries and transparent cost. Status: partial.** Complete a US installation/dependency checklist, inspect a USD usage report and budget warning during a real paging obligation, hit an explicit capacity/provider quota refusal and observe the alternate/escalation outcome, then follow Lamp/Spool/Uptime links with independent access controls. Verify emergency guidance and advertised availability/regulated claims against the actual release evidence.

   Existing implementation / exercising flow: `src/delivery.ts`; `src/family/response-operations/domain.ts`; `tests/runtime.mjs`. Current release hold, structured bounds and explicit local capacity refusal exist; provider usage/budget and target integration acceptance do not.

45. **OC-045 — Investigate before the responder opens the alert. Status: partial.** Trigger an incident with a recent deploy and Spool error, leave the browser closed and open it to an already-started evidence-backed investigation. Supply contradictory/stale logs and hostile embedded instructions, revoke one source mid-run and compare citation/permission boundaries and durable incomplete/failure outcomes with no production writes.

   Existing implementation / exercising flow: `src/family/response-operations/domain.ts`; `tests/runtime.mjs`. Incident/alert/runbook context exists as in the audit; no investigator, telemetry or deploy connector is implemented.

46. **OC-046 — Keep ownership and runbooks current from changes. Status: partial.** Change service ownership and a deploy/runbook reference in real connected sources, observe a proposed diff and review task, reject one and approve another after coverage preview. Change the source during approval and verify renewed review; inspect an older incident to prove its runbook and attribution did not change.

   Existing implementation / exercising flow: `src/family/response-operations/domain.ts`; `tests/runtime.mjs`. Services, copied runbooks and human follow-ups exist; change watching/proposals are missing.

47. **OC-047 — Continuously rehearse coverage and standby readiness. Status: partial.** Revoke a contact, break a provider and stale the standby configuration; observe scheduled detection and a due drill request without a manual prompt. Run an authorized main-site outage drill with real phones, decline another, and compare displayed readiness with measured receipt/takeover outcomes and visible unresolved obligations.

   Existing implementation / exercising flow: `src/schedule-api.ts`; `src/delivery.ts`; `tests/activation.mjs`. Now/next reveals static gaps and production sends refuse; continuous readiness and scheduled live drills are missing.

48. **OC-048 — Bounded remediation with independent recovery evidence. Status: missing.** Investigate a reversible production fault, inspect and approve one bounded plan, attempt changed/expired/revoked approval, cancel mid-execution and restart after an uncertain result. Observe executor authority, bounded action/rollback and independent failing then passing recovery evidence before a responder resolves through OC-004.

   Existing evidence: no implementing flow; this is required target acceptance. No remediation planner, production executor or independent recovery integration exists.

49. **OC-049 — Close the loop on recurrence. Status: partial.** Complete an evidenced follow-up, trigger a related recurrence after a deploy and observe a linked review and owned task without a prompt. Mark a ticket closed without evidence, leave another overdue, dispute the recurrence and verify human correction, continued escalation and unchanged original history.

   Existing implementation / exercising flow: `src/family/response-operations/domain.ts`; `tests/runtime.mjs`. Owned evidenced follow-ups and retained reviews exist; recurrence comparison and follow-through agents are missing.

50. **OC-050 — Incident command, severity and response workflows. Status: partial.** Trigger a service template, request backup responders and assign/transfer commander/scribe/communications roles through web/chat. Merge related incidents, split an unrelated alert, miss an update deadline with the browser closed and inspect reminders, aliases and attributed timelines; reject unauthorized role and state mutations.

   Existing implementation / exercising flow: `src/family/response-operations/domain.ts`; `src/api.ts`; `tests/runtime.mjs`. Explicit incident declaration, commander acknowledgement and attributed changes exist; multiple response roles, merge/split and workflow automation are missing.

51. **OC-051 — Reviewed Lamp and Statuspage communication. Status: partial.** Prepare a customer update, change its source before approval and refuse stale delivery; approve current copy and publish through real Lamp and Statuspage APIs. Replay, revoke credentials, withdraw and lose a response at the publication boundary; inspect exact copy, external readback and durable uncertainty with no false published state.

   Existing implementation / exercising flow: `src/handoff-api.ts`; `src/family/response-operations/handoffs.ts`; `src/family/response-operations/integrations.ts`; `tests/activation.mjs`. Reviewed minimum handoffs and Lamp-compatible export exist; connected submission, status synchronization and reminders are missing.

52. **OC-052 — Complete portable target archive and Base replacements. Status: partial.** Export a populated target installation via protected HTTP and rer CLI, compare every durable category, restore inactive on a fresh authorized installation, reconfigure local secrets and prove no send/action replay. Supply malformed/over-limit/erased/unknown records and inject storage/concurrency faults; preserve the full prior state. Deny optional author/AI network access and use native incident coordination, then verify literal input and absence of an undeclared public embed/upload door.

   Existing implementation / exercising flow: `src/api.ts`; `src/family/response-operations/recovery.ts`; `src/portability-policy.mjs`; `scripts/installer/archive-policy.mjs`; `tests/activation.mjs`; `tests/transfer.mjs`. Coordination/scheduling/handoff archives and authentication exclusions ship; complete future-product portability and baseline replacement acceptance remain unimplemented.

53. **OC-053 — Public API, outbound events and reliable automation. Status: partial.** Create/acknowledge/reassign/resolve via a scoped API client, page through real records, hit limits and conflict stale edits. Observe signed outbound events, revoke a token/endpoint, fail and restart delivery, deduplicate a replay and inspect due/terminal/uncertain outcomes without double-changing incident state.

   Existing implementation / exercising flow: `src/api.ts`; `src/paging-api.ts`; `tests/runtime.mjs`. Protected internal HTTP APIs and concurrency checks exist; versioned service-account APIs and outbound outbox/webhooks are absent.

54. **OC-054 — Operational readiness and switching acceptance. Status: partial.** Operate the release with a realistic US team and alert load; stop each intake/timer/identity/storage/provider path, observe independent missed-deadline alarms and recover from backup. Inspect measured latencies/capacity and unanswered obligations, execute the buyer’s real-device cutover checklist and show unsupported/unproven rows accurately.

   Existing implementation / exercising flow: `src/api.ts`; `src/delivery.ts`; `tests/runtime.mjs`; `tests/activation.mjs`. Storage health, local flows and honest paging refusal exist; end-to-end production readiness, independent watches and measured paging availability do not.

## Cross-cutting acceptance and release constraints

`tests/activation-browser.mjs` runs setup/dev identity and real keyboard-only incident declaration, notes, acknowledgement, schedule/override/preview at 1440 and 390 from committed HEAD in a fresh clone. It captures visible focus, checks literal hostile HTML and causes a real HTTP stale-revision rejection from a second session: failure is announced, no saved claim appears and server state remains unchanged. Pointer move-in/replay and overflow checks remain. Screenshots are copied outside the checkout to `../evidence/browser` or `ONCALL_BROWSER_EVIDENCE`; acceptance requires inspecting the screenshots. Apply the same public-door keyboard, permission, failure and responsive checks to every added web surface; native physical-device acceptance is OC-029. No homepage/UI change is authorized by this contract round.

For each automated obligation, verify it survives browser closure/restart, keeps an owner and due time, stops only at the specified condition and retains failed/uncertain outcomes. Network/provider fakes can prove protocol handling but cannot prove real delivery, carrier registration, mobile DND behavior, independent takeover or a human response. Those clauses require the live journeys above, performed with explicit account/drill authorization and minimum retained evidence without secrets.

OC-018 uses the published rer version pinned by package.json and effects declared in OPERATIONS.json. Local dev/preview bind loopback. A deploy dry-run and hosted-output test do not prove account readiness. Release 1 hosted acceptance requires actual `rer deploy`, matching /health source/version, automatic owner claim/setup-token retirement, real remote-mail owner sign-in and member password sign-in at /signin/local, protected coordination and data persistence after reload. Confirm paging still refuses. Removal uses the same authorized Cloudflare credentials and `rer deploy --remove --yes`, then empty readback for recorded resources. Record actual results separately.

Public landing requires Base’s publication scan on the exact tree before each push with zero findings, then the public repository’s Oncall verification CI green on the exact head. The lane merges after independent buyer review; this contract PR must not merge itself. Publication scan and CI do not establish hosted or pager readiness.

Obsolete synthetic-dispatch tests and the drill UI were removed in the existing release because sending is not an accepted current flow. Their removal is historical, not a change in this contract round. Held history, archive, import and authority guarantees remain mandatory; future paging requires real delivery and standby proof rather than reinstating synthetic acceptance.

## Clause status totals

**18 done**, **26 partial**, **10 missing**; 54 clauses. Every OC-001–054 clause has a journey above; the final CONTRACT.md table is the implementation evidence index.
