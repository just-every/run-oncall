# Connect an existing alert sender

Oncall accepts PagerDuty Events v1/v2, Opsgenie Alert API and Splunk On-Call REST requests for incident coordination. **Keep your existing pager active. Oncall paging stays OFF.** Accepted input records an alert; it does not call, text, push, start escalation or notify an integration owner.

In **Alerts & events → Compatible alert intake**, create a service-bound integration, generate a private key and save it in the monitor's secret settings. Keys admit events only; they cannot read the workspace or acknowledge a human incident. Choose a distinct key for every integration. The provider and service binding cannot change after creation. An administrator can rotate or revoke the key with an immediate effect on subsequent admission; conflicting in-flight writes refuse without confirming acceptance.

## Receiver addresses

Use your installation's app origin with these paths:

| Sender | Path | Credential | Success |
| --- | --- | --- | --- |
| PagerDuty Events v2 | `/v2/enqueue` | `routing_key` in JSON | 202 with `status`, `message`, `dedup_key` |
| PagerDuty Events v1 | `/generic/2010-04-15/create_event.json` | `service_key` in JSON | 200 with `status`, `message`, `incident_key` |
| Opsgenie create | `/v2/alerts` | `Authorization: GenieKey KEY` | 202 with `requestId` |
| Opsgenie action | `/v2/alerts/ALIAS/close?identifierType=alias`, `/acknowledge?identifierType=alias`, `/notes?identifierType=alias` | Same header; URL-encode the alias | 202 with `requestId` |
| Opsgenie request status | `/v2/alerts/requests/REQUEST_ID` | Same header and integration | 200 with committed request outcome |
| Splunk On-Call | `/integrations/generic/20131114/alert/ENDPOINT_KEY/ROUTING_KEY` | Endpoint key in URL; routing key is a label, not authentication | 200 with `result`, `entity_id` |

PagerDuty v2 accepts `trigger`, `acknowledge` and `resolve`. A trigger supplies `payload.summary`, `payload.source` and severity; acknowledge/resolve need no payload. PagerDuty v1 uses `event_type`, `incident_key` and `description`. Images are retained only as safe HTTP(S) links and are never fetched.

Opsgenie create accepts `alias`, `message`, P1–P5 `priority`, `tags` and `details`. Notes supply `note`; close and acknowledge accept empty objects. Missing priority uses Opsgenie's P3 default; an unknown priority maps to critical/P1. P4/P5 map to warning/info. This is intake severity mapping; timed urgency and notification rules are not implemented.

Splunk accepts `CRITICAL`, `WARNING`, `INFO`, `ACKNOWLEDGEMENT` and `RECOVERY` with `entity_id`. INFO adds context to an open generation and never opens an alert. Only CRITICAL/WARNING open one. The endpoint credential may appear in sender/proxy URL logs; configure those systems to redact that URL segment.

For an Alertmanager `pagerduty_configs` receiver, change its `url` to the corresponding v1/v2 address and use this integration's key in `service_key` or `routing_key`. A Datadog webhook already producing a PagerDuty v2 body can change its URL and configured key. Products whose built-in destinations hard-code the incumbent host need their generic webhook configuration. Existing incumbent keys, complete account migration and routed keys are not imported by this receiver. Current configured keys must have 32–200 characters.

## Lifecycle and retained context

The integration, service/environment and deduplication key identify an outage. A trigger opens a generation if none is open; repeated triggers append observations to that same generation. Recovery closes the generation open when it is admitted. A later trigger, including an identical body, opens a new generation. Recovery with none open remains a **no-effect** receipt and cannot suppress a later trigger. Missing trigger keys receive a generated identity returned to the sender; each unkeyed trigger opens separately.

A source acknowledgement is attributed to the integration in its durable receipt. It never acknowledges, resolves or verifies recovery of a human incident. There is no escalation to stop in this coordination release. Source recovery also leaves a declared incident open for a responder's evidence-backed resolution.

These compatible protocols provide an outage key rather than a unique delivery identity. Admission order is authoritative: without a sender-provided cycle, a delayed recovery cannot be distinguished from a fresh recovery of the current generation. Native `/api/ingress/:source` retains its explicit event/generation semantics. Compatible keys currently have a 200-character bound and cannot begin or end with whitespace; they are refused rather than silently truncated or merged.

Every admission has a protected receipt with source, service, action, generation, outcome, reported time (or a missing-time indication), bounded context. Trigger and effective-recovery receipts link to native events with retained routing decisions. Context is at most 8 KiB, nested fields and lists are bounded, credential-like fields are redacted, and omitted/overlong fields carry a truncation indication. No raw body is retained. Links grant no access and are never fetched. The UI shows source acknowledgement, no-effect actions and recovered generations separately.

Requests up to 512 KiB are parsed. An over-limit request is currently refused; authenticated incomplete-intake alerts, routed keys, owner notification and paging under OC-059 are not built. Capacity refusals remain explicit. PagerDuty errors use incumbent envelopes; rate-limit/capacity refusals use 429 (v1: 403), and concurrent admission changes use 503 so the sender can retry. Never treat a refusal as accepted.

## Custody and acceptance

Native/checkpoint and portable archives retain integration definitions, lifecycle history and receipts. Verification hashes stay installation-local and are excluded. Restore removes keys and marks all integrations inactive; reconfigure each key before intake can resume. Restoring history never replays effects.

The public Worker journey exercises request/response formats, scope, concurrent admission, failure rollback, restart and inactive restore. Local receiver checks do not prove an external provider sent a real monitor notification. Provider accounts, live send/fire/recover acceptance, incumbent account-key imports, routed integrations and production paging remain unproven.

Protocol references: [PagerDuty v2](https://docs.pagerduty.com/developer/send-alert-event), [PagerDuty v1](https://docs.pagerduty.com/developer/send-v1-event), [Opsgenie Alert API](https://docs.opsgenie.com/do/docs/alert-api), [Splunk REST](https://help.splunk.com/en/splunk-cloud-platform/alert-and-respond/splunk-on-call/integrations-with-splunk-on-call/rest-endpoint-integration-for-splunk-on-call), [Alertmanager configuration](https://prometheus.io/docs/alerting/latest/configuration/).
