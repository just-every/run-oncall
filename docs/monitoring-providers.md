# Monitoring provider receivers

Oncall receives authenticated Prometheus Alertmanager, Grafana unified alerting and Datadog webhook notifications. Each source binds to one service or to a routed key. **Paging stays OFF:** these receivers store coordination evidence beside your existing pager.

## Configure a receiver

As an administrator, open **Alerts & events → Monitoring provider receivers**. Create a source with a provider, service and private key. Copy the key into your provider before saving; the key cannot be read back. Send to `https://YOUR_ONCALL_HOST/api/monitoring/SOURCE_ID` with `Authorization: Bearer YOUR_PRIVATE_KEY` and JSON content type. The provider and service binding remain fixed; an existing source ID rotates its key. Revoke ends admission on the next request. Archives exclude credentials and restore sources inactive.

For several services, create a routed integration key under **Routing & replay**, choose the monitoring provider and allowed services, then publish rules. Alertmanager and Grafana rules can read each alert’s `labels.*` and `annotations.*`, plus `commonLabels.*` and `groupLabels.*`. Datadog rules can read `tags.team` from `team:payments` tags. Rule selection precedes per-service identity and coordination policy; a record-unrouted catch-all retains unmatched evidence for review.

The local **Send a named receiver check** submits a real request to this receiver. Its response proves local admission with that credential. External sender acceptance requires the provider’s own test/send door and an actual firing and recovery rule; it is not inferred from this check.

## Prometheus Alertmanager

Use a `webhook_configs` receiver with `send_resolved: true`, `max_alerts: 0` and bearer authorization in `http_config`. Keep the default version 4 webhook JSON. Oncall splits `alerts[]` into one event per alert, using each alert’s own `status`, `fingerprint` and `startsAt`. It retains bounded labels, annotations, diagnostic links and envelope provenance. A firing alert’s estimated `endsAt` does not prove recovery.

Fingerprint identifies the alert; source start time identifies its generation. Retry and group reordering reuse the same receipt. Changed annotations or values create another observation of the same generation. Recovery before trigger leaves a recovered tombstone, and a delayed recovery for an old start time never closes a newer outage. Source recovery never resolves a human incident.

Use `amtool alert add` or the real monitoring rule to exercise the notification pipeline, then verify firing and resolved receipts in Oncall. [Alertmanager configuration](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config) and [notification field semantics](https://prometheus.io/docs/alerting/latest/notifications/) describe the provider protocol.

## Grafana unified alerting

Create a Webhook contact point with the receiver URL and bearer Authorization. Use its default version 1 JSON, **Max Alerts = 0**, and leave **Disable resolved message** off. Alert identity includes `orgId`, fingerprint and source start time. Each alert’s own status controls trigger/recovery; a mixed group can include resolved members while its envelope remains firing. Values and dashboard/panel/silence links are bounded, stored as text and never fetched.

Use **Test → Send test notification**, then fire and recover a real alert rule. This release accepts bearer authentication; optional Grafana HMAC authentication is not implemented. See [Grafana’s webhook schema and authentication](https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/webhook-notifier/).

## Datadog webhooks

Configure a webhook with the receiver URL, JSON content type and the bearer Authorization header. Use an explicit JSON template mapping these fields to Datadog’s documented variables:

| JSON field | Datadog variable |
| --- | --- |
| `id` | `$ID` |
| `alert_id` | `$ALERT_ID` |
| `alert_cycle_key` | `$ALERT_CYCLE_KEY` |
| `alert_scope` | `$ALERT_SCOPE` (empty for an ungrouped monitor) |
| `alert_transition` | `$ALERT_TRANSITION` |
| `date` | `$DATE` (Unix milliseconds) |
| `alert_type`, `alert_priority` | `$ALERT_TYPE`, `$ALERT_PRIORITY` |
| `tags` | `$TAGS` as comma-separated text |
| `title`, `body`, `link` | `$EVENT_TITLE`, `$TEXT_ONLY_MSG`, `$LINK` |

Use the provider’s JSON escaping/template controls for string values. A notification is one event; Datadog sends individual notifications for its monitor groups. Monitor plus scope identifies the alert, and the cycle key identifies its generation. Only the explicit `Recovered` transition recovers it. No-data and unknown transitions remain critical triggers; missing identity fields produce an incomplete-intake diagnostic rather than an invented cycle. Use **Test Notifications**, then fire and recover the real monitor. See [Datadog webhook variables and delivery behavior](https://docs.datadoghq.com/integrations/webhooks/).

## Incomplete input and custody

Monitoring receivers read up to **2 MiB** of structured JSON; incumbent-compatible endpoints read **512 KiB**. The transport is drained and SHA-256 hashed while only the bounded prefix is retained in memory. A 300 KiB group of 200 alerts is exercised locally with an owner-configured allowance large enough for all 200 new events. Storage capacity still applies to the complete installation; a request that would exceed it is explicitly refused without a partial commit.

Authenticated oversized, malformed or upstream-truncated input retains complete readable alert members and a critical **Incomplete intake** record. Its evidence includes total bytes, SHA-256, a bounded readable-identity list, unread bytes and the number of omitted alerts, or **unknown** when it cannot be measured. A routed key sends the incomplete record to its catch-all, or retains it unrouted. The integration owner receives a durable internal audit notice. The response is `202` with a truncation flag. No raw body is saved, and long context has visible truncation/original-byte markers. Unauthenticated input creates no alert and leaves a bounded rejection diagnostic.

The incomplete record is coordination evidence. **No page or external owner notification is sent while paging is OFF.** Native Events API input retains a 64 KiB parse/evidence bound; authenticated incomplete input keeps an exact base64 prefix and returns 202. HTTP service and routed keys default to 600 authenticated requests and 120 new events per rolling minute, with independent key-record accounting and actual-expiry Retry-After; see [allowances](routed-intake.md#per-key-allowances). Email keeps its separate 60-new-receipt allowance. Live provider sends, production paging, team privacy and reference-load capacity remain unproven or incomplete. Native and portable archives retain provider metadata, generations, routing and incomplete evidence, with all receiving credentials excluded.
