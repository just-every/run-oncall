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

The source fixes the service; an optional conflicting `service` is refused. `eventId` is required and stable per source. Accepted receipts return 201, duplicates 200 and changed normalized content with the same identity 409. Responses disclose only the change ID, event identity, service, acceptance time and duplicate flag. CI jobs can calculate the signed form directly. Argo CD and Terraform Cloud specific signing/templates have not been accepted against their live senders; they are not claimed as built-in adapters.

## PagerDuty Change Events

Use `POST /v2/change/enqueue` with `routing_key`, `payload.summary`, optional `payload.timestamp`, `payload.source`, `payload.custom_details` and top-level `links`. The body shape is the [documented Change Events schema](https://docs.pagerduty.com/developer/send-change-event). Success is 202 with `status`, `message` and a stable `dedup_key`; invalid requests use the compatible 400 shape, capacity refusal 429. The provider schema has no request event ID. Oncall uses canonical retained content, including any supplied timestamp, as the source-scoped retry identity. Identical timestamp-free changes coalesce; provide a timestamp to distinguish repeated deployments. This is an explicit Oncall rule, not a claim about PagerDuty deduplication. Imported incumbent keys are not activated by this integration.

## GitHub and GitLab

GitHub sources bind one numeric repository ID or full repository path, validate `X-Hub-Signature-256` over the exact body and retain `X-GitHub-Delivery` as the retry identity. Enable `deployment`, `release` and `pull_request` events. Only published releases and closed, merged pull requests become changes. Deployment events record a deployment request, never invented deployment success. Pull-request author and merger remain separate. See [GitHub signatures](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) and [deployment semantics](https://docs.github.com/en/rest/deployments/deployments).

GitLab sources bind one project ID or full path and accept deployment hooks with `webhook-id`, `webhook-timestamp` and `webhook-signature`. The `whsec_` key is decoded as base64; SHA-256 HMAC signs `id.timestamp.exact-body`, and the receiver checks the timestamp and `v1,BASE64` signature. Delivery identity is the webhook ID, so deployment status changes remain separate events. See [GitLab signing and retry identities](https://docs.gitlab.com/user/project/integrations/webhooks/).

All source paths accept up to 2 MiB, except the PagerDuty-compatible path's 512 KiB bound. Summaries, details and links have explicit bounds; truncation shows the original byte count. Known credential fields are redacted recursively, the verification key is removed from retained text, and links containing it, URL credentials or known credential query fields are omitted. Raw request bodies are never stored, and links/images are never fetched. Changes remain until an explicit archive replacement or future retention/erasure flow. These receivers have local public-door fixture acceptance; live sender account acceptance, native mobile/chat context, general erasure and private teams remain gaps.

`GET /api/changes/recent?service=ID&hours=24&at=ISO_TIMESTAMP` uses the same window as the panels and requires a current member session. Safe source configuration APIs require a current administrator session and same-origin requests. Native JSON archives and recovery checkpoints retain the same change identities, timestamps, attribution and bounded context.
