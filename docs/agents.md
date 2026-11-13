# Agents for incident coordination

The Oncall responder works beside your existing pager. Paging stays OFF. The agent door is a preview for recorded coordination; keep your existing incident and paging process authoritative.

Open Agents (`/agents`) to inspect decisions, pending approvals, reviews and Pause. An agent acts for its current sponsoring person. Company policy chooses autonomous work, review, approval or refusal for each applicable risk class. There is no preset permission to act. Missing or expired policy, unanswered classes, Pause, revoked consent and native access restrictions stop the next agent effect.

## Supported work

| Job | Native outcome |
| --- | --- |
| Read service, runbook, recent changes, incidents and coverage | Current authorized records, with outside text treated as untrusted data |
| Declare, update, acknowledge, resolve and add notes | An attributed coordination timeline; acknowledgment names an active responder and retains the machine actor |
| Create follow-ups and submit evidence | Human-review work stays open until an eligible person accepts it on the native screen |
| Create schedules, review exact changes and apply overrides | Native revisions, coverage review digests, now/next coverage and retained history; no page is sent |
| Dispatch an already authorized signed response event | The frozen minimal body goes to the approved recipient; authenticated acceptance and uncertainty remain distinct |
| Read and narrow native access | Current administrators can manage existing native membership and public teams, revoke clients/endpoints and use native privacy erasure under company policy |

The MCP endpoint is `/mcp`. Discovery and protected-resource metadata describe the current registry. Both supported protocol versions expose the same tools: `2026-07-28` and `2025-11-25`. Tools and scoped resource reads expose the coordination journey. This installation declares tools, resources, policy, pause, audit and idempotency. Specialist prompts, retained event listing and subscriptions remain undeclared and refuse with `capability_not_declared`. Native authorization, short-lived owner-bound tokens, approval and consent checks remain mandatory. Existing `/api/v1` clients use the same policy admission and retain their native service and action scopes, operation keys and ETags.

## Read alerts

Use `oncall.alerts.list` with the existing `incidents:read` permission. Optional `service`, `state` (`active` or `recovered`) and `urgency` (`high` or `low`) filters narrow the current service grants. Each page accepts `limit` from 1 to 100, defaulting to 50. Follow `data.nextCursor` with the same filters and credential; no cursor means the final page. Alerts are ordered by ID, and their observations by acceptance time then ID. A cursor whose anchor is no longer visible is refused.

Each alert includes its native identity, original severity and priority, current state and urgency, suppression, owner and retained observations. Policy and routing versions describe admission, even after the live rules change. Imported text is untrusted. Service-less unrouted alerts, foreign records, source payloads, truncated prefixes and routing member snapshots are excluded. Incomplete observations expose their flags without their retained bytes. Reads compute standard and, when retained personal or incident evidence is present, sensitive using the same rule as incident reads. Company policy may require approval before returning sensitive content. Reads retain decision audit and any policy-required approval or review; they send no outbound request and create no native coordination or paging effect.

## Read analytics

Use `oncall.analytics.read` with `analytics:read`. With no arguments it returns the existing per-service incident, open and unfinished follow-up counts. Set `view` to `response` for the native response report, scheduled load and alert noise. Optional `from`, `to` and `at` timestamps use the native report rules; `at` cannot be later than now. An optional `service` must be in the caller's current grants. Incidents, alerts and schedules are scoped before any totals or responder hours are computed. Service-less unrouted alerts are excluded. Scheduled hours do not establish worked hours or delivered interruptions.

Set `view` to `readiness`, with no other filters, to read release and deployment identity, the release matrix, workspace signals, the US installation checklist and the pager-coverage statement. This view is available only when current grants cover every workspace service; a narrower caller receives no report or counts. Unavailable measurements remain explicitly unavailable and the report retains `complete: false`. Neither a healthy report nor local configuration establishes paging readiness.

These reads compute standard and add sensitive only for retained personal or incident evidence under the existing incident-read rule. Company policy may require review or approval. They retain read-decision custody, create no native coordination or paging effect and send no outbound request. Usage and cost figures are not shipped; team load is not modelled.

## People and credentials

Business supplies signed owner and teammate person IDs. The installation owner uses Business people (`/agents/people`) to link an applied teammate ID to an existing local workspace account. Matching an email address is insufficient. Oncall creates no invitation or password from a Business roster. A local role promotion does not make someone a Business policy editor.

Service-account clients remain bound to the active administrator who created them, by native ID. Demoting or removing that administrator suspends the client. Rotating credentials invalidates saved client authority. A client cannot manage members, sessions, archives or exports.

[native-tool-inventory-start]: #
## Current tool inventory

This inventory is generated from the native registry with the current capability filter. Each row names the required scope and every possible class. Company policy still decides each call.

The fixture IDs below belong to `agent-surface.json`. `tests/agent-door.mjs` executes them through emitted Worker MCP under autonomous and held policies; `src/modules/agent-door/conformance/journey.mjs` checks the returned computed classes in `checkClasses`. A fixture reference describes coverage to run, not a passing receipt.


### Access

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.access.read` | `access:read` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`access-read`); `sensitive`: `tests/agent-door.mjs` (`access-read`) |
| `oncall.access.update` | `access:write` | `access` | `access`: `tests/agent-door.mjs` (`access-widen`, `access-narrow`) |

### Actions

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.actions.create` | `actions:write` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`follow-up`, `sensitive-action`, `second-action`); `sensitive`: `tests/agent-door.mjs` (`sensitive-action`) |
| `oncall.actions.list` | `actions:read` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`actions-list`); `sensitive`: `tests/agent-door.mjs` (`actions-list`) |
| `oncall.actions.read` | `actions:read` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`action-read`); `sensitive`: `tests/agent-door.mjs` (`action-read`) |
| `oncall.actions.receipt` | `actions:write` | `standard` | `standard`: `tests/agent-door.mjs` (`actions-receipt`) |
| `oncall.actions.submit` | `actions:write` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`submit`, `second-submit`); `sensitive`: `tests/agent-door.mjs` (`submit`, `second-submit`) |

### Alerts

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.alerts.list` | `incidents:read` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`alerts-list-standard`, `alerts-list-sensitive`); `sensitive`: `tests/agent-door.mjs` (`alerts-list-sensitive`) |

### Analytics

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.analytics.read` | `analytics:read` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`analytics`, `analytics-response`); `sensitive`: `tests/agent-door.mjs` (`analytics-response`) |

### Automation

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.automation.dispatch` | `automation:write` | `external` | `external`: `tests/agent-door.mjs` (`dispatch-retry`, `dispatch-accepted`) |
| `oncall.automation.read` | `integrations:read` | `standard` | `standard`: `tests/agent-door.mjs` (`automation-list`, `outbox`) |
| `oncall.automation.replay` | `automation:write` | `external` | `external`: `tests/agent-door.mjs` (`replay`) |

### Changes

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.changes.read` | `services:read` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`changes`); `sensitive`: `tests/agent-door.mjs` (`changes`) |

### Clients

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.clients.update` | `clients:write` | `access` | `access`: `tests/agent-door.mjs` (`revoke-client`) |

### Coordination

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.coordination.read` | `workspace:read` | `standard` | `standard`: `tests/agent-door.mjs` (`declare-state`, `second-declare-state`, `access-state`, `access-narrow-state`, `erase-state`, `erase-client-state`) |

### Endpoints

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.endpoints.update` | `endpoints:write` | `access` | `access`: `tests/agent-door.mjs` (`revoke-endpoint`) |

### Imports

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.imports.read` | `imports:read` | `standard` | `standard`: `tests/agent-door.mjs` (`imports`) |

### Incidents

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.incidents.acknowledge` | `incidents:write` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`acknowledge`, `sensitive-acknowledge`); `sensitive`: `tests/agent-door.mjs` (`sensitive-acknowledge`) |
| `oncall.incidents.declare` | `incidents:write` | `standard` | `standard`: `tests/agent-door.mjs` (`declare`, `second-declare`) |
| `oncall.incidents.list` | `incidents:read` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`incidents-list`); `sensitive`: `tests/agent-door.mjs` (`incidents-list`) |
| `oncall.incidents.read` | `incidents:read` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`incident-read`, `erase-read`); `sensitive`: `tests/agent-door.mjs` (`incident-read`, `erase-read`) |
| `oncall.incidents.receipt` | `incidents:write` | `standard` | `standard`: `tests/agent-door.mjs` (`incidents-receipt`) |
| `oncall.incidents.resolve` | `incidents:write` | `commitment`, `sensitive` | `commitment`: `tests/agent-door.mjs` (`resolve`); `sensitive`: `tests/agent-door.mjs` (`resolve`) |
| `oncall.incidents.update` | `incidents:write` | `standard`, `sensitive`, `live` | `standard`: `tests/agent-door.mjs` (`incident-snooze`, `incident-cancel-deadline`, `manual-page`, `recover`); `sensitive`: `tests/agent-door.mjs` (`recover`); `live`: `tests/agent-door.mjs` (`incident-snooze`, `incident-cancel-deadline`, `manual-page`) |

### Integrations

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.integrations.read` | `integrations:read` | `standard` | `standard`: `tests/agent-door.mjs` (`integrations`) |

### Notes

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.notes.add` | `incidents:write` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`note`, `sensitive-note`); `sensitive`: `tests/agent-door.mjs` (`sensitive-note`) |

### Privacy

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.privacy.erase` | `privacy:write` | `destructive`, `access`, `security`, `live` | `destructive`: `tests/agent-door.mjs` (`erase`, `erase-client`); `access`: `tests/agent-door.mjs` (`erase-client`); `security`: `tests/agent-door.mjs` (`erase-client`); `live`: `tests/agent-door.mjs` (`erase`) |

### Responders

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.responders.list` | `responders:read` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`responders-list`); `sensitive`: `tests/agent-door.mjs` (`responders-list`) |

### Reviews

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.reviews.read` | `incidents:read` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`review-material`); `sensitive`: `tests/agent-door.mjs` (`review-material`) |

### Schedules

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.schedules.coverage` | `schedules:read` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`coverage`); `sensitive`: `tests/agent-door.mjs` (`coverage`) |
| `oncall.schedules.create` | `schedules:write` | `standard`, `sensitive`, `live` | `standard`: `tests/agent-door.mjs` (`schedule-create`); `sensitive`: `tests/agent-door.mjs` (`schedule-create`); `live`: `tests/agent-door.mjs` (`schedule-create`) |
| `oncall.schedules.override` | `schedules:write` | `standard`, `sensitive`, `live` | `standard`: `tests/agent-door.mjs` (`schedule-override`); `sensitive`: `tests/agent-door.mjs` (`schedule-override`); `live`: `tests/agent-door.mjs` (`schedule-override`) |
| `oncall.schedules.read` | `schedules:read` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`schedule-read`); `sensitive`: `tests/agent-door.mjs` (`schedule-read`) |
| `oncall.schedules.receipt` | `schedules:write` | `standard` | `standard`: `tests/agent-door.mjs` (`schedules-receipt`) |
| `oncall.schedules.review` | `schedules:write` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`schedule-review`); `sensitive`: `tests/agent-door.mjs` (`schedule-review`) |
| `oncall.schedules.update` | `schedules:write` | `standard`, `sensitive`, `live` | `standard`: `tests/agent-door.mjs` (`schedule-update`); `sensitive`: `tests/agent-door.mjs` (`schedule-update`); `live`: `tests/agent-door.mjs` (`schedule-update`) |

### Services

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.services.list` | `services:read` | `standard` | `standard`: `tests/agent-door.mjs` (`service-list`) |
| `oncall.services.read` | `services:read` | `standard` | `standard`: `tests/agent-door.mjs` (`service-read`) |
| `oncall.services.receipt` | `services:write` | `standard` | `standard`: `tests/agent-door.mjs` (`services-receipt`) |
| `oncall.services.update` | `services:write` | `standard` | `standard`: `tests/agent-door.mjs` (`service-update`) |

### Teams

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.teams.update` | `teams:write` | `standard`, `access` | `standard`: `tests/agent-door.mjs` (`team-create`); `access`: `tests/agent-door.mjs` (`team-manager`) |

### Triage

| Tool | Scope | Possible risk classes | Computed class checks |
| --- | --- | --- | --- |
| `oncall.triage.list` | `incidents:read` | `standard`, `sensitive` | `standard`: `tests/agent-door.mjs` (`triage-list-standard`, `triage-list-sensitive`); `sensitive`: `tests/agent-door.mjs` (`triage-list-sensitive`) |

## Current resource templates

- `oncall://actions/{id}`
- `oncall://alerts/{id}`
- `oncall://automation/clients/{id}`
- `oncall://automation/endpoints/{id}`
- `oncall://automation/outbox/{id}`
- `oncall://changes/{id}`
- `oncall://erasures/{id}`
- `oncall://handoffs/{id}`
- `oncall://incidents/{id}`
- `oncall://incidents/{id}/review-material`
- `oncall://members/{id}`
- `oncall://reports/{period}`
- `oncall://schedules/{id}`
- `oncall://schedules/{id}/coverage`
- `oncall://services/{id}`
- `oncall://services/{id}/changes`
- `oncall://teams/{id}`

## Target capabilities

`oncall.events.list` is retained in the source manifest with scope `events:read` and possible classes `standard`, but is withheld from the current tool listing. Its target fixture is not current execution evidence.

The listed resource templates are exposed under current native scope and company policy. Customer, imported and email text is untrusted data; native erasure fences and delivery metadata carry no untrusted text. Monthly reports use completed UTC calendar months (YYYY-MM) and return not found for an empty scoped cohort. Events, prompts and subscriptions remain undeclared. Unshipped target tools and their class documentation remain contract work. This inventory does not claim complete discovery instructions, the full harness rejection matrix, every acceptance point under both policies, or stranger-agent completion.
[native-tool-inventory-end]: #

## Approvals and limits

Resolving a recovered incident is a `commitment`, including when company policy permits autonomous work. Its server-computed facts identify an internal decision with zero monetary value and currency `XXX` (no currency); the saved target and revision bind it to one incident. Retained recovery and personal evidence also carry `sensitive` with their record count. Both classes must pass company policy. Caller confirmation flags and instructions in incident text cannot downgrade either class. A held resolution leaves native coordination unchanged until the named person approves the exact saved revision. An identical completed retry returns the retained result without another resolution.

Approvals show the saved target, proposed change, native revision and exact summary. A changed revision or coverage digest requires a fresh review. The actual approver is recorded separately from the agent preparer. An agent confirmation is never a person's decision. Review offers Undo only when a real native reversal exists.

This checkout uses published rer 0.2.90. Completed schedule updates and overrides retain native receipt custody in the same transaction as the change. An exact retry rechecks current native authority and company policy before Base returns its saved approval receipt. A new key cannot reuse a consumed native revision or review digest. A subsequent schedule, membership, erasure or workspace change requires fresh review. Installation-bound replay receipts and private relay custody are excluded from portable exports; agent audit, call, review and event history is retained. Portable restore pauses the receiving agent door, clears admission leases and expires pending or in-flight approvals before publication. A signed-in owner must resume the door, and restored approvals cannot authorize execution. Local erasure clears retained schedule receipts.

Minimal response events contain operation, type, service, incident, revision, state and time. Endpoint credentials are never returned through tools or resources. Uncertain transport is not receiver receipt and is never automatically resent. Native quotas and outbox custody remain in force.

Provider-spend caps are not enforced by this preview. Standalone cap settings refuse; a signed Business document containing caps reports `not_enforced`. This installation has no money-moving tool. Action editing, invitations, private-team enforcement, remediation executors, SMS, voice, push paging and independent standby are not built. Password creation, secret rotation/reveal, human review acceptance, imports and installation operations retain their native person or dedicated doors.

Completed team-manager edits retain native effect custody in the same transaction as the team and its audit. An exact retry checks current scope, sponsor and agent authority, consent, Pause and client binding before Base returns its original approval receipt. Fresh writes still need the current native team revision and exact saved review. Changed arguments or a new key cannot reuse a consumed team revision; later workspace changes require fresh review. Completed access widening retains its original effect facts, and an exact approved erasure retry checks authority without reading the deleted target.

## Declaration and proof limits

The declared capabilities do not prove optional multi-sponsor, mail-edge, resource-refresh, timed, queued, dual-host or owner-native administration families. Built-in `oncall.events.list` remains described for a future events declaration and is withheld from this installation’s tool list. Native tools and their complete security assertions still run.

The contract generator preserves existing judgments. BASE-AGENT-003 retains unproved role-specific field parity and grant byte budgets. BASE-AGENT-010 (events and subscriptions), the optional parts of BASE-AGENT-001 and BASE-AGENT-013, and SURFACE-001 and SURFACE-003 remain unproved. Declaring resources does not promote a whole clause.

Native erasure computes destructive for one erased subject. It also computes access when member or API-client authority is removed, security when integration credentials or intake email addresses are deleted, and live when retained coverage, active intake or pending delivery is affected. A history-only incident with no pending work carries destructive alone. The facts contain the one-action measure, narrowing direction, credential setting and affected service IDs as applicable; record text and caller claims cannot choose classes.

Native erasure receipts contain only installation and workspace, approval, sponsor, agent, client and consent bindings, revision, argument and target digests, and the witnessed class facts. These facts commit with the erasure and contain no erased content or cached result. An exact completed retry uses those facts after current authority and company policy are checked; Base alone returns the original approval outcome. A member erasure that redacts its own saved approval instead returns Base's `subject_erased` tombstone: deletion commits once and the class facts survive locally, but class-aware completed replay of that approval is not supported. Older receipts upgraded without witnessed class facts refuse with `erasure_classification_unavailable`, without repeating deletion or fabricating historical facts. Receipts never export; another native subject erasure clears the previous receipts, and workspace changes invalidate their revision binding. Missing scopes, revoked consent, Pause and sponsor demotion still refuse. External deletion is not claimed and standby remains not reconciled.

Team replay receipts (`oc_agent_team_receipts`) contain only binding IDs, revisions and digests, including the IDs whose manager authority increased. They hold no team names, argument bodies or cached results. They remain installation-bound, never enter portable exports, and native subject erasure inventories and clears them in its transaction.
