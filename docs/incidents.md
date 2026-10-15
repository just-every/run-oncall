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

**Alerts & events** collects signals from your own monitoring. An admin adds a source under **Local ingress** with a source key and the services it may report on. That key can only send signals: it cannot read anything in Oncall.

Signals are kept as they arrive, and repeats of the same alert are grouped. An alert never declares an incident on its own: a responder decides, with **Declare incident from alert**.

## Send an alert event

This release accepts intake only on the local loopback app. Under **Alerts & events → Local ingress**, an admin chooses a **Source ID**, a private **Source key** (32–200 characters), an authentication mode and an **Allowed service**, then presses **Save scoped source**. Saving the same source again rotates its credential. Source credentials are excluded from archives and cannot read workspace data or act as a person.

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

For a source configured as **Bearer token**, set `ONCALL_ORIGIN` to the app's printed origin, `ONCALL_SERVICE_ID` to that UUID and `ONCALL_SOURCE_KEY` to the private credential in your shell. With a source named `monitoring` authorized for that service in `production`:

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

A new event returns **201**; an identical retry of the same `source` + `eventId` returns the original receipt with **200** and `duplicate: true`. Changed normalized content under that identity returns **409**. Successful receipts contain only `duplicate`, `id`, `eventId`, `service`, `observedAt` and `acceptedAt`; they prove storage, not paging or delivery. Invalid fields or a mismatched environment return **400**, invalid credentials **401**, an unauthorized service **403**, an oversized body **413**, and the local 10,000-event capacity limit **429**. Do not retry a changed event under an already used ID.

## Routing and replay

**Routing & replay** holds the rules that say who owns a signal: for a service and severity, route it to an owner, or suppress it with a reason. A rule for a specific severity wins over one for all severities, and every change is a new version. Suppression never deletes the signal.

**Historical vs proposed replay** compares how past signals were routed with how today's rules would route them. It only reads: nothing is created or sent. The **Event JSON array** accepts up to 200 objects with the signal keys above; it starts with recent accepted events. Results show the historical and proposed action, responder name, reason and policy version for each event. Historical names come from the saved snapshot.
