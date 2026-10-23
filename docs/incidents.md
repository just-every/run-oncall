# Incidents and alerts

When something breaks, Oncall gives the people on call one shared place to coordinate: the incident, its runbook, every decision on its timeline and the follow-ups afterwards.

## Services first

Under **Services**, an admin adds each system your team owns with **Service name**, **Environment**, **Service owner** and its **Runbook steps (one per line)**. You can also keep a link to the service in your existing pager.

## Declare an incident

On **Incidents**, press **Declare incident** and give it an **Incident title**, the **Service**, a **Severity** (critical, warning or info) and the **Customer impact and current evidence**. Viewers can read incidents but not declare them.

The service's runbook is copied into the incident when you declare it. Editing the service later never rewrites the instructions an incident started with.

## Work the incident

- **Runbook checklist**: tick each step as it is done.
- **Evidence and decisions**: the timeline. Every change and every **Add timeline note** is kept in order with who made it. Nothing is edited or deleted afterwards.
- **Current response**: **Record transition** moves the incident on. Declared becomes acknowledged (the person acknowledging becomes incident commander), then mitigating or recovered, then resolved. Recovered needs a recovery evidence link, and resolved needs the incident to have recovered first.
- **Follow-up owners**: give each improvement action an owner and a due date. Completing one needs an evidence link.

If two people change the same incident at once, the second change is refused with a clear message instead of overwriting the first. Reload, then try again.

## Reviews

When an incident is resolved, **Reviews** keeps its postincident review (impact, contributing factors, response lessons and what to verify next) beside its open follow-ups.

## Alerts and events

**Alerts & events** collects signals from your own monitoring. An admin adds a source under **Monitoring ingress** with a source key and the services it may report on. That key can only send signals: it cannot read anything in Oncall.

Signals are kept as they arrive, and repeats of the same alert are grouped. An alert never declares an incident on its own: a responder decides, with **Declare incident from alert**.

## Send an alert event

This release accepts scoped alert intake on the local app or your hosted HTTPS app. Intake records signals for coordination and never pages anyone. Under **Alerts & events → Monitoring ingress**, an admin chooses a **Source ID**, a private **Source key** (32–200 characters), an authentication mode and an **Allowed service**, then presses **Save scoped source**. Saving the same source again rotates its credential. Source credentials are excluded from archives and cannot read workspace data or act as a person.

Send `POST /api/ingress/SOURCE` with a JSON object, at most 65,536 bytes (64 KiB). Replace `SOURCE` with the URL-encoded Source ID. The exact body keys are:

| JSON key | Required value |
| --- | --- |
| `source` | Source ID, repeated in the body and equal to the URL's source; nonblank string, max 100 characters. |
| `eventId` | Unique event identity within this source; nonblank string, max 200 characters. Use a new ID for each observation, including recovery. |
| `service` | The allowed service's internal UUID, max 100 characters; a display name such as `Checkout` will not work. |
| `environment` | Exact environment recorded on that service, such as `production`; nonblank string, max 100 characters. |
| `key` | Deduplication key for the alert, scoped to source/service/environment; nonblank string, max 200 characters. The field is exactly `key`. |
| `generation` | Lifecycle identity, shared by a trigger and its recovery; nonblank string, max 100 characters. Use a new generation when the alert fires again after recovery. |
| `intent` | Exactly `trigger` or `recover`. |
| `severity` | Exactly `critical`, `warning` or `info`, including on recovery events. |
| `title` | Nonblank string, max 300 characters, including on recovery events. |
| `observedAt` | Valid timestamp; use ISO 8601 UTC, for example `2026-10-15T07:00:00.000Z`. Stored in canonical UTC form. |
| `evidence` | Optional HTTP(S) URL, max 2,000 characters; omit it or use `""` when there is no link. |

Text values are trimmed; their limits apply before trimming. Unknown fields are discarded, so include all context you need in these supported fields.

To get the service UUID, open **Services** and copy the ID shown below the service's name and owner. You can also open `/api/state` in that signed-in browser and find its `id` in `services`. The **Allowed service** selector uses that ID automatically; an external sender must supply it explicitly.

For a source configured as **Bearer token**, set `ONCALL_ORIGIN` to your hosted HTTPS app origin or the local app's printed origin, `ONCALL_SERVICE_ID` to that UUID and `ONCALL_SOURCE_KEY` to the private credential in your shell. With a source named `monitoring` authorized for that service in `production`:

```sh
curl --fail-with-body "${ONCALL_ORIGIN}/api/ingress/monitoring" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${ONCALL_SOURCE_KEY}" \
  --data-binary @- <<JSON
{
  "source": "monitoring",
  "eventId": "checkout-latency-001-trigger",
  "service": "${ONCALL_SERVICE_ID}",
  "environment": "production",
  "key": "checkout-latency",
  "generation": "checkout-latency-001",
  "intent": "trigger",
  "severity": "warning",
  "title": "Checkout latency above 2 seconds",
  "observedAt": "2026-10-15T07:00:00.000Z",
  "evidence": ""
}
JSON
```

Use the actual observation time for your own signal. To recover it, send the same `source`, `service`, `environment`, `key` and `generation` with `intent: "recover"`, a new `eventId` and the recovery observation time. Recovery closes only that lifecycle and never resolves an incident. Recovery arriving before its trigger keeps that generation recovered; reopening requires a new generation.

For **HMAC signature** mode, replace the bearer header with `x-oncall-timestamp` (decimal Unix seconds within five minutes of the server's clock) and `x-oncall-signature` (lowercase hexadecimal HMAC-SHA256 using the source key over `timestamp + "." + exact request body`). Sign the same UTF-8 bytes you send, including any whitespace or trailing newline. A bearer token does not authenticate a source configured for HMAC.

A new event returns **201**; an identical retry of the same `source` + `eventId` returns the original receipt with **200** and `duplicate: true`. Changed normalized content under that identity returns **409**. Successful receipts contain only `duplicate`, `id`, `eventId`, `service`, `observedAt` and `acceptedAt`; they prove storage, not paging or delivery. Invalid fields or a mismatched environment return **400**, invalid credentials **401**, an unauthorized service **403**, an oversized body **413**, and the 10,000-event capacity limit **429**. Do not retry a changed event under an already used ID. The 10,000-receipt count is a local limit; it becomes a hosted capacity only under OC-073.

## Routing and replay

**Routing & replay** holds the rules that say who owns a signal: for a service and severity, route it to an owner, or suppress it with a reason. A rule for a specific severity wins over one for all severities, and every change is a new version. Suppression never deletes the signal.

**Historical vs proposed replay** compares how past signals were routed with how today's rules would route them. It only reads: nothing is created or sent. The **Event JSON array** accepts up to 200 objects with the signal keys above; it starts with recent accepted events. Results show the historical and proposed action, responder name, reason and policy version for each event. Historical names come from the saved snapshot.

## Triage a response queue

Incidents supports search across the title, declaration summary, notes, service and linked alert deduplication keys. Expand **Filter and sort incidents** for lifecycle, severity, urgency, priority, service, assignee and created/updated time ranges. The start is inclusive and the end is exclusive; browser time inputs use your local zone. **Assigned to me** refers to the response assignee, independently of the commander. Older incidents use their commander until an explicit assignment is made. Unset urgency is shown as high for critical incidents and low otherwise; changing severity preserves the current urgency. These coordination labels do not activate paging.

Filters live in the URL and survive reload, sharing and browser back/forward. Save up to 20 personal views. `GET /api/triage` accepts `q`, `status`, `severity`, `urgency`, `priority`, `service`, `assignee`, `mine=true`, `createdAfter`, `createdBefore`, `updatedAfter`, `updatedBefore` and `sort=created|updated|urgency|priority`. API timestamps include a timezone. `limit` is 1–100 and `nextCursor` continues a stable workspace snapshot; a concurrent change refuses the cursor with 409 so the caller can reload. These APIs require a current member session and follow the current workspace-wide access model. Team-private triage and alert-only bulk actions are not implemented.

Select up to 500 incidents individually, or select all matching after the displayed count (at most 1,000). Bulk acknowledge, reassign, priority, urgency and resolution return a result for every incident. A stale revision or refused state does not roll back other items. Resolution requires a summary and recovery evidence URL on every selected declared incident; this is an attributed human attestation. Open follow-ups remain. Snooze, merge and mobile/chat bulk flows are not implemented.

`POST /api/triage/bulk` accepts an `operationId`, `action`, `items: [{id, revision}]`, and `reason`; resolution also requires `evidence`, reassignment uses `member` (or null), and the label actions use `priority` or `urgency`. Each item commits independently with current authority and the selected revision. The server processes a small bounded portion per request and returns cumulative `results`, `remaining` and `interrupted`; while `remaining` is positive and `interrupted` is false, continue with the exact same request and operation ID. The web interface does this as one action. An interrupted operation stays visible and resumes only when explicitly submitted again. This keeps each invocation within [D1’s query limits](https://developers.cloudflare.com/d1/platform/limits/). Keep and replay the same operation ID and exact content after an interrupted request: previously committed results are returned without another change. Reusing the identity with different content conflicts. For `allMatching: true`, include the query, `confirmedCount`, `workspaceRevision` and the complete matching item/revision list. The current count and snapshot must still match on first admission. Storage remains bounded by the installation's documented workspace profile; capacity failures are explicit per-item outcomes.

The response ownership section assigns/transfers commander, scribe, communications and assignee to active responders, or leaves a role explicitly unassigned. These incident responsibilities never grant administrator or responder permissions. Every role/priority/urgency/severity change requires a reason and an incident revision. The timeline retains previous/new ownership, actor and bulk operation ID. Native archive/checkpoint and portable export include saved views, bulk outcomes and these response fields; restoring them does not start paging. The additive migration leaves held incident JSON and historical ordering unchanged.

## Email alerts and source recovery

**Alerts & events → Integration email** creates a service-scoped address with a versioned mode and trigger/resolve rules. [Set up Cloudflare Email Routing and email modes](compatible-intake.md#integration-email). Email intake is off until `INBOUND_EMAIL_DOMAIN` is configured. The private address is intake authority; the From address grants no account authority.

Repeated subject-mode failures append to one derived generation and one recorded obligation. A custom `FAILED: (\S+)` trigger and `OK: (\S+)` resolve can both capture group 1: `FAILED: nightly-db` and `OK: nightly-db` act on the same key; `nightly-web` stays separate. Activity explains each mode, rule version, extracted key and outcome. Recovery says **stopped by source recovery** with its email receipt. Paging is OFF, so this is a labelled non-automatic state. A declared incident remains open for the responder's recovery evidence and resolution summary.

For native Events API HMAC requests, save your JSON as `event.json`, export the scoped source key privately as `ONCALL_SOURCE_KEY`, and sign the exact bytes sent:

```sh
ONCALL_TIMESTAMP=$(date +%s)
ONCALL_SIGNATURE=$(node --input-type=module -e 'import {readFileSync} from "node:fs"; import {createHmac} from "node:crypto"; process.stdout.write(createHmac("sha256",process.env.ONCALL_SOURCE_KEY).update(process.argv[1]+".").update(readFileSync("event.json")).digest("hex"))' "$ONCALL_TIMESTAMP")
curl --fail-with-body "${ONCALL_ORIGIN}/api/ingress/monitoring" \
  -H 'Content-Type: application/json' \
  -H "x-oncall-timestamp: ${ONCALL_TIMESTAMP}" \
  -H "x-oncall-signature: ${ONCALL_SIGNATURE}" \
  --data-binary @event.json
```

The timestamp must be within five minutes. Rotate or revoke the source under Monitoring ingress; a rotated-out signature or bearer key stops working immediately. The stable `source` + `eventId` retry identity and explicit native `generation` differ from email's Message-ID retry identity and derived generations. Native JSON parsing and retained incomplete evidence are bounded to 64 KiB; authenticated oversized or unparseable input returns 202 with `truncation: true` and a high-urgency incomplete receipt. The prefix is stored as base64 bytes and never trusted as a structured event. A sole-service key uses that service; a multi-service key records unrouted custody and an administrator notice. Native routed keys use their published catch-all. Each HTTP service or routed key defaults to 600 authenticated requests and 120 newly admitted events per rolling minute. Rotation preserves usage; duplicate requests still count, while an existing event retry and further observations grouped into an existing generation use no new-event slot. Throttling precedes any grouped custody change. See [key allowance accounting](routed-intake.md#per-key-allowances). The 10,000-event/receipt and workspace capacities are separate storage bounds. Email keeps its own 60-new-receipt allowance. A receipt confirms stored coordination state, never provider delivery or paging. The 10,000-receipt count is a local limit; it becomes a hosted capacity only under OC-073.

A service’s versioned response policy defaults to alert-only and silent recovery. Administrators can select automatic incident declaration by urgency, severity or the matched service orchestration policy. Each generation keeps its response decision. Native, compatible, monitoring and email recovery stop that generation’s recorded obligation with the recovery receipt, without a human summary. Paging is OFF: the record states that no attempt was handed to a provider and there is nothing to cancel. A recovered-notice policy records a non-automatic obligation labelled “no sender until OC-026”; it does not invent notified recipients. A declared incident stays open when all linked alerts recover, marked “all alerts recovered — awaiting resolution”, with a non-automatic commander reminder labelled “no timer until OC-027”. Its human resolution still requires summary and evidence. An unrouted incomplete alert can be declared manually only after a human explicitly selects a service within the key’s scope. These policies, receipts and reminders remain historical through inactive archive and checkpoint recovery; they restore no credentials or resumed sends.

Incident workflows retain the target ID when related incidents merge; source IDs become aliases, and their original roles, runbooks, checklists and timelines remain visible with who merged, when and why. Open follow-ups keep their original source custody and remain editable from the target’s retained-source panel, without duplicating a remediation obligation. Splitting selected alert groups creates a separate incident in the same response state and records both sides of the decision. Service response templates version severity/impact wording, incident types and commander checklists; each declaration keeps its exact version, and every checklist change records its commander. Revision and role checks apply to every write. These records travel through inactive native, checkpoint and portable recovery; they do not send pages or fire reminders.
The Internal status panel models a business service with an owning-team label, supporting technical services and an active responder/admin as communications owner. Server writes derive operational, degraded or major-outage status from open supporting incidents and, when enabled, high-urgency alerts, including direct technical dependencies. The communications owner or an admin may set a separate, reasoned override or clear it. Explicitly subscribed users receive a recorded impact obligation containing only the business-service name and derived status, with no raw alert text; its chosen channel is a setting, and it has no sender or automatic delivery. No approved internal-update source exists yet. These records remain internal, never publish to Lamp, and restore inactive with stopped notice records and no restored authority. Team/channel/email-list subscriptions, private teams, mobile and actual email/push/chat delivery remain gaps.

Manual pages in the incident form record the creator, urgency, optional priority and description, and named responders or an existing escalation policy. Each intended target is a non-automatic obligation with no sender. The service's versioned user-assignment setting defaults to escalation to its own policy after ten minutes; repeat and escalation are recorded settings only. A missing policy remains an operator-visible gap. Responders and admins can request users or policies on an open incident; each request is accepted or declined independently, without acknowledging the primary incident. Declines record a requester notice, and resolution or the requester's cancellation ends pending work. Viewers and stakeholders cannot create pages or requests. Mobile, chat, team permissions, automatic escalation, provider delivery and standby remain unavailable; paging stays OFF.

Manual-page refresh receipts retain only an incident ID and return its current authorized state. These local receipts do not transfer in an archive or checkpoint; the incident retains its operation identity. Restored active manual obligations and pending responder requests are held without sender authority, while completed outcomes remain unchanged.
