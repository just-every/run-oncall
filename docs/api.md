# API and outbound events

Oncall has a versioned, token-authenticated API for services, schedules, incidents, follow-ups, analytics and integration state, and it can send signed events to endpoints you choose. Both serve the response job beside your existing pager. They are not a general workflow engine, they page nobody and a delivered event is never a human acknowledgment. Paging stays OFF.

## Service-account tokens

An administrator creates a service account on Services, under **Service accounts**. Choose the services it may reach and its permissions:

| Permission | Allows |
| --- | --- |
| `read` | Read services, schedules, incidents, follow-ups, analytics and integration state in scope. Required by every token. |
| `incidents:write` | Declare, acknowledge, reassign and assign roles on incidents in scope. |
| `incidents:resolve` | Resolve incidents with automation-supplied recovery evidence. |
| `actions:write` | Create and complete follow-ups. |

The token is shown once, held only as a SHA-256 digest, never returned by a read, export, archive or log, and excluded from every archive. Rotating replaces it immediately; revoking stops it on the next request. Last use is shown in the list. A token carries no human role: it cannot manage members, services, policies, sources, tokens or endpoints, cannot accept a follow-up or review, and cannot use the browser API. To acknowledge, it names an active responder who takes responsibility. Resolution and follow-up evidence supplied by a token is recorded as an automation claim, not a human attestation.

Send `Authorization: Bearer ocsa_…`. A browser session cookie is ignored.

## Requests

Base path `/api/v1`. Every response carries `X-Oncall-Api-Version: 1`.

| Route | Purpose |
| --- | --- |
| `GET /me` | The token's own name, permissions and services. |
| `GET /services`, `/services/:id` | Services in scope. |
| `GET /schedules`, `/schedules/:id`, `/schedules/:id/oncall?at=` | Schedules and who is covering. Paging is OFF. |
| `GET /incidents?state=&service=` , `/incidents/:id` | Incidents; the detail has the timeline and an `ETag` of its revision. |
| `POST /incidents` | Declare: `service`, `severity`, `title`, `summary`, optional `alerts`. |
| `POST /incidents/:id/acknowledge` | `revision`, `responsible` (an active responder), `summary`. |
| `POST /incidents/:id/reassign` | `revision`, `member` (or `null`), `reason`. |
| `POST /incidents/:id/roles` | `revision`, `role` (`commander`, `scribe`, `communications`), `member`, `reason`. |
| `POST /incidents/:id/resolve` | `revision`, `evidence` (HTTP(S) link), `summary`. |
| `GET /actions?incident=&service=&done=&owner=` | Follow-ups. |
| `POST /incidents/:id/actions` | `revision`, `title`, `owner`, `due`, optional `priority`, `completionPolicy`. |
| `POST /incidents/:id/actions/:action/complete` | `revision`, `evidence`. |
| `GET /analytics/incidents?from=&to=&service=` | Counts, acknowledgment and resolution durations, follow-up totals. |
| `GET /integrations` | Redacted alert, change and monitoring sources and event endpoints in scope. |

**Scope.** A token sees and changes only its services. An ID, filter or reference outside that scope answers `404 not_found`, exactly as a missing record does, and counts and analytics never include it.

**Pagination.** List routes take `limit` (1–100, default 25) and `cursor`, and return `{"data":[…],"next":"…"|null}`. A cursor is bound to the filters that produced it.

**Concurrency.** Every change sends the `revision` last read. A stale one answers `409 stale_revision` with the current revision in `error.details.revision`.

**Idempotency.** Every `POST` needs an `Idempotency-Key` header of 8–100 characters. The same key and body replay the first answer (`Idempotent-Replay: true`) and change nothing again for 24 hours; the same key with different content answers `409 idempotency_conflict`.

**Rate limits.** 120 reads and 60 writes per minute per token. Answers carry `X-RateLimit-Limit`, `-Remaining` and `-Reset`; beyond the limit `429 rate_limited` with `Retry-After`. The counters are per token and held in storage.

**Errors.** `{"error":{"code":"…","message":"…"}}` with `invalid_request`, `invalid_cursor`, `idempotency_key_required`, `unauthorized`, `forbidden`, `not_found`, `stale_revision`, `conflict`, `invalid_state`, `idempotency_conflict`, `payload_too_large`, `rate_limited` or `unavailable`. A `503 unavailable` means nothing was confirmed.

Every accepted change commits its state, its permanent audit entry and its outbound events in one transaction, or none of them.

## Event endpoints

On Services, under **Event endpoints**, name an HTTPS endpoint, the events and the services whose events may leave this installation. Events: `incident.triggered`, `incident.acknowledged`, `incident.reassigned`, `incident.resolved`, `incident.role_assigned`, `incident.followup_created`, `incident.followup_completed`. Any door that changes an incident raises them: the web app, bulk actions and the API.

Only HTTPS to a public hostname on the default port is accepted: no credentials, query string, private, loopback, link-local or internal address, and redirects are never followed. A plain-HTTP loopback receiver is accepted only on a local installation. The address is checked again at every send. Oncall does not resolve names itself; Cloudflare Workers cannot connect to private networks.

Each event is one JSON body: specification version, `operationId`, `eventId`, type, time, service, incident identity (id, title, severity, state, revision), the actor, the single change and a notice. It carries no timeline, runbook, evidence text or contact. The body is frozen when the change commits and is identical on every attempt.

Headers: `X-Oncall-Timestamp` (epoch seconds), `X-Oncall-Signature` (hex HMAC-SHA256 of `timestamp + "." + exact body` with the endpoint's signing secret), `X-Oncall-Operation-Id` (also `Idempotency-Key`; deduplicate on it), `X-Oncall-Event-Id`, `X-Oncall-Event-Type`, `X-Oncall-Attempt` and `X-Oncall-Replay`. The signing secret is shown once and stored encrypted.

## Delivery

Each event and endpoint is one operation with a stable ID, the endpoint's named administrator as owner, a due time and at most five attempts (30 s, 2 min, 10 min, 1 h between). States: **queued** (due at its time), **sending**, **sent** (the receiver answered 2xx), **failed** (rejected, redirected or attempts used), **uncertain** (the request may have reached the receiver; the same operation ID is retried), **interrupted** (a lease expired before any request began), **refused** (authority failed at dispatch) and **held** (restored). An expired lease becomes interrupted or uncertain and is kept with a permanent audit outcome; it never disappears.

Authority is checked again at every send: the endpoint is approved and its secret held, its owner is still an administrator, it still covers the event, the incident is still available, and a token that caused the event is still active and in scope. Otherwise the operation is refused and kept.

An administrator can **replay** any finished or held operation with a reason, up to ten times. A replay re-sends the same frozen body with the same operation ID and changes nothing else: no incident, timeline or follow-up is touched.

Delivery starts after each committed change and when an administrator chooses **Deliver due events now**. There is no timer: while the installation receives no requests, retries wait. At most 100 unfinished operations are held per endpoint; beyond that the event is recorded as failed (`queue-full`) rather than dropped. The newest 300 finished operations are kept.

## Export, restore and erasure

Native archives, checkpoints and `rer export` carry service-account and endpoint definitions and the delivery history. They never carry tokens, signing secrets, idempotency answers or counters. A restore makes every account and endpoint inactive and every unfinished operation held: nothing sends until an administrator rotates the endpoint secret (approving it again) and replays. Erasing a revoked service account removes it, rewrites its references to an anonymous marker and deletes the link between it and its permanent audit labels; the labels and the kind, time and outcome of each operation remain.
