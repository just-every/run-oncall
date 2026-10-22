# Response API and signed outbound events

An administrator configures service-account clients and approved recipients under **Alerts & events → Response API and outbound events**. Paging remains OFF. These APIs coordinate response beside your existing pager; they do not execute runbooks, production actions, AI requests or Terraform plans.

## Client lifecycle and authority

Generate a random key with at least 32 characters, copy it into your client's private secret store, then save the client with selected services and permissions. Creation and rotation accept the key once; no read, archive, audit or log returns it. Storage holds only its SHA-256 digest. Last use is visible. Rotation refuses the currently configured key; supply a different random key. Revocation takes effect on subsequent requests and dispatch checks; rotation invalidates the old key and holds queued work under its former credential revision. The creating administrator must remain an active administrator. Demotion or removal suspends the key and endpoint on the next request and at dispatch; custody never transfers to another administrator. No token creates a human session or gives member-management, archive, review-acceptance or paging authority.

Use `Authorization: Bearer <private-key>` on `/api/v1/…`. Cookie-only requests are refused. Session-protected management remains under `/api/automation`; it requires same-origin requests and a current administrator. Tokens do not enter those doors.

Each permission is explicit: `services:read`, `services:write`, `schedules:read`, `schedules:write`, `incidents:read`, `incidents:write`, `actions:read`, `actions:write`, `analytics:read`, `integrations:read`. Service grants name existing service IDs. A client can update granted services; an administrator creates services and expands grants by provisioning a new client. Direct IDs, filters, pagination, linked alerts and dependencies cannot widen a grant. Client and endpoint metadata is administrator-only.

## Version 1 HTTP reference

`GET /api/v1/{services,schedules,incidents,actions,analytics,integrations}` returns `{data, nextCursor}`. Lists accept `limit` (1–100; default 25), `cursor` and `service`. Cursors are signed, bound to the client, permission revision, family and filter, and expire if the authorized records change. There is no global or hidden-service count. `GET /api/v1/<family>/<id>` returns an authorized record with an `ETag`; unknown and foreign IDs both return 404. Analytics contains incident/open/follow-up counts per granted service, not pager delivery or human-response measurements. Integration state contains secret-free native, compatible/monitoring, change and email definitions within the grant.

`POST /api/v1/{services,schedules,incidents,actions}` requires an opaque `Idempotency-Key` of at most 100 letters, digits, underscores or hyphens. Identical retries return the original operation receipt with 200; new mutations return 201. A changed body under the same key conflicts. Receipts retain operation ID, client, service, resource, entity, revision and time; request and key digests cannot execute work. A replay never repeats the mutation. Each installation retains at most 1,000 API mutation receipts for its lifetime. There is no pruning, rolling window or automatic recovery from this limit. Once full, new machine mutations return 429 without changing incident state; an authorized identical idempotent retry still returns its original receipt. Human sessions never consume these receipts and are never subject to this machine-write limit.

| Family | Accepted mutation |
| --- | --- |
| services | `type: "service"`, existing `id`, current `etag` without quote characters, `name`, immutable `environment`, responder `owner`, `runbook` array, `pager` URL or empty string, optional in-scope `dependencies`. |
| schedules | Existing schedule schema: `id`, `name`, granted `service`, `revision` (0 creates), `timezone`, `validFrom`, nullable `validUntil`, `primary`, `backup`, `overrides`. Calendar-day and explicit ambiguity rules remain those in [Schedules](schedules.md). |
| incidents | `type: "declare"`, `service`, `title`, `summary`, `severity` and optional same-service `alerts`; or `type: "transition"`, `incident`, current `revision`, `state`, `summary`, and recovery `evidence` URL where required. A machine acknowledgment also requires an explicit active responder `member`. `reassign` takes `member` and `reason`; `assign-role` also takes `role`. |
| actions | `type: "action"`, `incident`, current incident `revision`, `title`, active responder `owner`, UTC calendar `due`, optional `priority`, `completionPolicy` and `escalationRecipient`. `complete` accepts an `action` and evidence URL only under the evidence policy. Human-review acceptance remains session-only. |

For example, send this body to `POST /api/v1/incidents` with the authorization and idempotency headers:

```json
{"type":"declare","service":"your-service-id","title":"Checkout unavailable","severity":"warning","summary":"Investigating the checkout failure"}
```

Use the returned `entity` to read the incident. To acknowledge, send its current revision, `type: "transition"`, `state: "acknowledged"`, a summary and the explicitly selected responsible member. The timeline attributes the action to the service-account ID. This is a machine coordination action, never proof that the person responded. Recovery still requires an evidence URL and resolution a summary; service-account attribution does not turn evidence into independent verification.

Errors use `{error: {code, message}}`: 400 `invalid_request`, 401 `invalid_token`, 403 `insufficient_scope`, 404 `not_found`, 409 `conflict`, 413 `request_too_large`, 429 `rate_or_capacity_limit`, 503 `storage_unavailable`. Each client has 60 requests per minute, with `Retry-After` on exhaustion. JSON bodies are bounded to 64 KiB. State, idempotency receipt, enqueue and permanent audit commit in one storage transaction; a storage failure confirms no success. After a lost response, retry the same key.

## Recipient approval and signing

An administrator chooses the exact HTTPS recipient, its receiving client and service subset, and explicitly approves the minimal data categories. Recipients currently require globally routable IPv4 literals on port 443 and a path of letters, digits, slash, underscore or hyphen. Hostnames, IPv6, private/reserved addresses, userinfo, query capabilities and redirects are refused. Hostnames are refused without a DNS lookup; no DNS lookup or live DNS-rebinding defense is claimed. The receiver must present a valid TLS certificate for its public address. No production receiver is bundled or claimed as tested.

A separate random shared signing key is sealed with installation-local AES-GCM custody. The receiving client must retain `incidents:read` and access to that service. The originating client, receiver, endpoint and named administrators are checked again at dispatch, including credential revisions. Rotate/revoke can stop queued work. Bytes already sent cannot be recalled; a revocation during the send leaves an uncertain result. All credential material is omitted from exports.

Trigger, acknowledgment, reassignment, resolution, role and follow-up events carry only `operationId`, `type`, `service`, `incident`, `revision`, `state`, and `at`. Payload bytes are frozen with the original domain commit; no names, summaries, notes, evidence URLs, telephone numbers or human identity are sent.

Request headers are `X-Oncall-Operation`, `X-Oncall-Timestamp` (Unix seconds) and `X-Oncall-Signature` (lowercase HMAC-SHA256 hex of `timestamp + "." + exactBody`). Verify the signature and a five-minute timestamp window before acting. Persist the operation ID and receiver action atomically, and deduplicate that ID permanently within your event retention policy.

The receiver returns a receipt to prove authenticated acceptance:

- HTTP 2xx, `X-Oncall-Result: accepted`, and `X-Oncall-Receipt` equal to HMAC-SHA256 hex of `operationId + "." + requestTimestamp + ".accepted"` records **sent**. This is receiver acceptance, never human acknowledgment.
- HTTP 429 or 503 with a similarly signed `retry` result certifies that no receiver action committed and records **failed**, with a future due time. Only send this result if retry is safe.
- Redirects and HTTP 401/403/404/410 record **terminal**. Redirects are never followed.
- Timeout, disconnect, unsigned success and ambiguous responses record **uncertain**. They are never automatically retried.

## Durable delivery and recovery

At most 1,000 unfinished operations (`queued`, `sending`, `failed`) occupy delivery slots. Completed and stopped history does not count. When all slots are occupied, a human command still commits exactly once with its audit fact and one durable `terminal` outcome per approved recipient, reason `capacity-not-scheduled`, zero attempts, the original operation ID, owner, due time and frozen payload. This outcome means no send was scheduled, not receiver acceptance. It consumes no delivery slot and never sends automatically. Existing work is neither evicted nor duplicated. An administrator can authorize replay after a slot becomes available; replay at full capacity returns 429 and leaves the retained outcome unchanged, except a retryable failed operation can reuse the slot it already occupies.

History is never pruned. It is stored separately from the 1 MB authored-workspace profile so delivery history cannot exhaust that profile. Archive validation retains field/history bounds and all reference and credential checks, and bounds outcomes to one per endpoint and incident timeline entry rather than 1,000 lifetime rows. Native restore retains its 2 MB request limit; checkpoint restore retains its existing larger envelope and the CLI 7 MiB input limit. Use streaming `rer export` / `rer import` for larger retained histories. Storage failure still rolls back the incident, event outcomes and permanent audit fact atomically.

Hosted scheduling checks due work each minute, processing at most ten operations sequentially. A delivery has a 30-second durable lease and a 10-second network deadline. Signed retry refusals back off exponentially, with five total attempts per operation. Expired leases become uncertain because a receiver may already have committed. Local installations can use the protected **Dispatch next due event** action; closing the browser cannot remove queued history. The scheduler handles only this outbox and never starts paging.

Inspect named owner, due time, attempts and the complete outcome history before **Authorize replay**. Reauthorize changed clients/recipients first. Replay retains the same operation ID and frozen payload and does not repeat the incident mutation. A five-attempt terminal operation cannot be replayed; investigate the receiver and coordinate explicitly.

Native archives, checkpoints and portable CLI exports retain definitions, machine attribution, operations and exact delivery history. Tokens, signing ciphertext and receiving authority do not transfer. Restored clients/endpoints are inactive; queued/failed work becomes interrupted, sending work uncertain, and every operation is held. Fresh deliberate key provisioning, recipient approval and protected replay are required before any restored event can send. Erasing an imported person removes matching automation labels and credentials in the same erasure transaction; older native archives and checkpoints are refused whole under the durable subject erasure fence, with no state or session change. Current checkpoints still restore and preserve that fence. Installation archives carry the same digest custody and portability journal; a fresh destination needs the later journal to know a later erasure. Permanent pseudonymous audit facts stay immutable.

Maintained tests use real emitted Worker HTTP and local D1 storage with a receiver fake only at the network edge. They establish protocol and local durability, not live provider delivery, hosted scheduling latency, real TLS receiver compatibility, a human response or paging readiness.
