# Changes in responder context

Change events record deployments, releases, merged pull requests and other service changes. They never create alerts, incidents, paging jobs or notifications. Recent changes are available on Services, Alerts & events and incident details, without an investigator or AI service. The window includes the service and its direct dependencies, defaults to the 24 hours before the alert/incident trigger and can be set to 1–168 hours. Unrelated services are excluded. Service views use the current time. An event without a source timestamp is explicitly labeled with its receipt time. Reported authors and source links do not grant workspace or source-system access.

Administrators configure direct dependencies on Services. They are explicit service identities; self-dependencies, duplicates and missing services are refused. Dependencies are one hop, not an inferred transitive graph. Reload the dependency editor after a stale-write refusal. The current workspace-wide member model still applies; private teams and stakeholder access are not implemented.

## Connect a sender

On Services, use **Change integrations**, select one service and a provider, generate a private key and copy it into the sender's secret settings before saving. Native sources support bearer or timestamped HMAC authentication. GitHub uses its own raw-body signature. GitLab uses Standard Webhooks signing, not the older plaintext token. PagerDuty Change Events uses the key in `routing_key`. Saving an existing source rotates its key; service/provider/repository bindings are immutable so a new binding has a new source identity. Revoke ends admission immediately. Keys grant admission only, never sign-in, workspace reads or incident commands.

Verification keys are encrypted with AES-GCM under an installation-local key derived from SESSION_SECRET. Definitions never return keys. Native archives and portable exports include changes and safe source definitions, exclude verification material, and restore definitions inactive. Configure a new local key explicitly before accepting more changes. Key rotation during intake is checked again inside the storage transaction. There are no outgoing provider requests, arbitrary URL fetches or incident effects.

## Native and signed CI intake

Send to `/api/changes/ingress/SOURCE_ID`. A bearer source uses `Authorization: Bearer KEY`. A signed source uses `x-oncall-timestamp` (epoch seconds, within five minutes) and `x-oncall-signature` (hex HMAC-SHA256 of `timestamp + "." + exact request body`).

```json
{"eventId":"deploy-2048","summary":"Released checkout 2048","timestamp":"2026-10-17T12:00:00Z","author":"checkout-ci","custom_details":{"commit":"demand-pool-change"},"links":[{"href":"https://ci.example.test/build/2048"}]}
```

The source fixes the service; an optional conflicting `service` is refused. `eventId` is required and stable per source. Accepted receipts return 201, duplicates 200 and changed normalized content with the same identity 409. Responses disclose only the change ID, event identity, service, acceptance time and duplicate flag. CI jobs can calculate the signed form directly. Named Argo CD and Terraform Cloud sources use the templates below; live sender acceptance has not been run.

## PagerDuty Change Events

Use `POST /v2/change/enqueue` with `routing_key`, `payload.summary`, optional `payload.timestamp`, `payload.source`, `payload.custom_details` and top-level `links`. The body shape is the [documented Change Events schema](https://docs.pagerduty.com/developer/send-change-event). Success is 202 with `status`, `message` and a stable `dedup_key`; invalid requests use the compatible 400 shape, capacity refusal 429. The provider schema has no request event ID. Oncall uses canonical retained content, including any supplied timestamp, as the source-scoped retry identity. Identical timestamp-free changes coalesce; provide a timestamp to distinguish repeated deployments. This is an explicit Oncall rule, not a claim about PagerDuty deduplication. Imported incumbent keys are not activated by this integration.

## GitHub and GitLab

GitHub sources bind one numeric repository ID or full repository path, validate `X-Hub-Signature-256` over the exact body and require `X-GitHub-Delivery`. That header is not signed, so the retry identity is a SHA-256 of the signed body: the same body resent under any delivery ID is a duplicate. Enable `deployment`, `release` and `pull_request` events. Only published releases and closed, merged pull requests become changes. Deployment events record a deployment request, never invented deployment success. Pull-request author and merger remain separate. See [GitHub signatures](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) and [deployment semantics](https://docs.github.com/en/rest/deployments/deployments).

GitLab sources bind one project ID or full path and accept deployment hooks with `webhook-id`, `webhook-timestamp` and `webhook-signature`. The `whsec_` key is decoded as base64; SHA-256 HMAC signs `id.timestamp.exact-body`, and the receiver checks the timestamp and `v1,BASE64` signature. Delivery identity is the webhook ID, so deployment status changes remain separate events. See [GitLab signing and retry identities](https://docs.gitlab.com/user/project/integrations/webhooks/).

All source paths accept up to 2 MiB, except the PagerDuty-compatible path's 512 KiB bound. Summaries, details and links have explicit bounds; truncation shows the original byte count. Known credential fields are redacted recursively, the verification key is removed from retained text, and links containing it, URL credentials or known credential query fields are omitted. Raw request bodies are never stored, and links/images are never fetched. The installation retains at most 1,000 change records. Before a new record, oldest acceptance time first (ID breaks ties), only records outside every retained incident’s service/direct-dependency window of up to 168 hours are evicted. A count-only operational retention entry and the permanent pseudonymous admission audit commit atomically with eviction and admission. If all records are protected, admission returns 429; no attached context is silently deleted. Retry identity lasts for retained records; replay after eviction can be admitted again. Explicit object erasure uses the OC-040 admin door below. Service dependency edits can change which contexts are protected; no background deletion runs. These receivers have local public-door fixture acceptance; live sender account acceptance, native mobile/chat context, general erasure and private teams remain gaps.

`GET /api/changes/recent?service=ID&hours=24&at=ISO_TIMESTAMP` uses the same window as the panels and requires a current member session. Safe source configuration APIs require a current administrator session and same-origin requests. Native JSON archives and recovery checkpoints retain the same change identities, timestamps, attribution and bounded context.

## Argo CD sync template

Choose **Argo CD sync (signed template)**. This is an operator-defined [Argo CD Notifications webhook template](https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/), not an assertion that Argo emits this shape by default:

```json
{"eventId":"APPLICATION:OPERATION_FINISHED_AT:REVISION","application":"APPLICATION","revision":"REVISION","status":"Synced","summary":"APPLICATION sync completed","timestamp":"OPERATION_FINISHED_AT_WITH_ZONE","author":"REPORTED_INITIATOR","links":["https://ARGO_HOST/applications/APPLICATION"]}
```

Substitute the application name, operation completion time, revision, reported phase/status, initiator and application URL using your installed Argo template context and JSON escaping. Send `x-oncall-timestamp` and `x-oncall-signature` using the native `timestamp + "." + exact-body` HMAC-SHA256 form. A sender-side signing step is required; automatic HMAC computation by Argo Notifications is **unverified**, and this receiver does not claim Argo supplies these headers itself. The optional `service` field must equal the locally bound service. Stable event ID is your template’s responsibility; signature freshness is five minutes.

## Terraform Cloud run notifications

Choose **Terraform Cloud run notifications**. Configure the generic notification destination to this source’s receiver and put the private key in the notification token field. The receiver requires `X-TFE-Notification-Signature` as hexadecimal HMAC-SHA512 of the exact request body, in addition to the source being locally active. See [Terraform run notification payloads](https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/notifications#generic-notification-payload).

```json
{"payload_version":1,"notification_configuration_id":"nc-synthetic-oncall-1","run_id":"run-synthetic-oncall-1","run_url":"https://app.terraform.io/app/example/workspaces/payments/runs/run-synthetic-oncall-1","run_created_at":"2026-10-23T12:00:00Z","run_created_by":"synthetic-oncall-1","workspace_name":"payments","organization_name":"example","notifications":[{"message":"Run applied","trigger":"run:completed","run_status":"applied","run_updated_at":"2026-10-23T12:01:00Z"}]}
```

Field mapping assumption **unverified against a live sender**: `notifications[]` contains status transitions in sender order; its final item supplies `run_status` and `run_updated_at`, `workspace_name` supplies the summary prefix, `run_created_by` the reported author, and `run_url` the source link. The source binds one local service; an optional conflicting `service` is refused. A SHA-256 identity of run ID plus the ordered trigger/status/update-time tuples deduplicates retries; changed status transitions are distinct changes. Terraform’s raw-body signature has no delivery timestamp in this assumed protocol, so delayed signed notifications are retained rather than falsely claiming a delivery-freshness check. Replays of retained identities still produce one record. No live provider acceptance or outbound request was performed.


## Erase a retained change

In Services, open **Change data settings** under Change integrations. An administrator chooses one retained event and types `erase <change ID>`. This removes the event, clears its last-accepted pointer and invalidates local installation-transfer snapshots and chunks. Recent-change panels read the remaining records; no separate panel copy survives. Oncall does not store raw change requests or fetch linked content. Provider source configuration and credentials remain, as do unrelated events.

The protected HTTP door is `POST /api/changes/:id/erase` with `workspaceRevision` and `confirmation`. The revision and current administrator session are checked in the erasure transaction. A failure rolls back; no completion response is issued. The response reports local `state: complete`, per-table deleted/updated counts, and `standby: not-reconciled`. Counts cover the event, changed source pointer, erased identity associations and invalidated transfer tables. Fence/journal bookkeeping and anonymized audit entries contain no event content and are retained. This is local completion only, not cross-site success.

A value-free fence refuses subsequent provider retries for the erased source/event identity, even after restart or current archive restore. Erasure advances the native and installation restore checkpoint. A known later fence refuses an older archive whole; when moving to an empty installation supply the later erasure journal as documented in [Data custody](data.md#subject-erasure-fences). An installation without that later journal cannot know a later erasure. Native checkpoints and installation imports also reject an erased change row paired with copied current fence metadata; carrying the fence cannot authorize the erased row.

Retention remains explicit erasure plus the documented bounded change-capacity policy, with no automatic time-based expiry. Offline exports, operator-copied text and content already sent to providers cannot be recalled; request deletion from each holder/provider. Incident, native member/contact, full integration erasure and standby reconciliation remain incomplete under OC-040.
