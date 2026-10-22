# Routed intake keys

A routed key lets an existing PagerDuty v1/v2, Opsgenie or Splunk On-Call sender use one credential for several services. Oncall records alerts and coordinates the response beside your existing pager. **Paging stays OFF.** Keep the existing pager authoritative.

## Create the key

Open **Routing & replay → Create a routed integration key** as an administrator. Choose a distinct ID, provider, integration owner and explicit allowed services. Generate and privately copy the credential into your sender before saving. Oncall cannot display it again. The key grants intake only, with no workspace read or human authority.

The provider and allowed scope stay fixed after creation. Create another key for a different scope. Rotate or revoke in the key’s management section; old credentials stop working on the next admission. An inactive restored key needs a replacement local credential before it can accept requests.

## Publish ordered rules

Rules run from top to bottom; the first match selects one service. Each rule combines conditions using **all** or **any**. Conditions support equals, contains, exists, RE2 regex match and non-match. Lookaround and backreferences are outside RE2’s linear-time regex syntax and are refused.

Use transformed fields such as `summary`, `source` and `severity`, or provider paths such as `payload.custom_details.team`, `payload.component`, Opsgenie `details.team` and Splunk `routingKey`. Evaluation uses retained, bounded structured context with credential fields removed. A truncated or redacted field cannot supply routing evidence that was not retained.

A fixed target must belong to the key’s allowed scope. A dynamic target reads a field as a service ID or exact service name, optionally extracting a regex capture group. Unknown or out-of-scope targets take the catch-all and retain a diagnostic; they never route outside the scope.

The catch-all either records the event in the unrouted queue or chooses one allowed service. Changes apply to later receipts. Every receipt retains the key, published version, evaluated rules, chosen service and diagnostics. Once a service is selected, its coordination policy runs second; the explanation retains that policy’s version separately.

**Preview routing changes** compares the draft with retained receipts, in their admission order, without changing records. It warns when a changed route could send a later recovery away from an open generation. **Publish routing rules** creates an attributed version. A stale base version is refused; reload the published rules and reconcile your draft.

## Work the unrouted queue

The key’s queue retains unmatched structured events without inventing a service or admitting an alert. An administrator can re-admit an event to an allowed service. This creates a new attributed receipt, preserves the original and uses an operation ID so a repeated request has one effect. It does not deliver a page.

Trigger, acknowledgment, note and recovery all pass through the same service-selection rules. The same deduplication key routed to two services has separate generations. Recovery acts only on the currently selected service; a no-effect recovery names other services with open generations as a diagnostic. Source acknowledgment is an integration claim, separate from a human incident acknowledgment. Source recovery never resolves a declared incident.

## Native Events API

Choose **Native Events API** and either **Bearer token** or **HMAC signature** in the existing routed-key form. Send to `/api/ingress/intake:KEY_ID`, with `source` set to `intake:KEY_ID`. Use the native [event fields and authentication instructions](incidents.md#send-an-alert-event). The required `service` and `environment` fields are sender hints on this routed door: the published rules select an allowed service, and its configured environment is applied before identity, policy and urgency. Conditions can read raw fields such as `details.destination` as well as normalized `summary`, `source` and `severity`.

The sender supplies a stable `eventId` and an explicit `generation`. Identical retries return the original receipt and routing selection, even after publication; changing normalized content or retained rule input under that event ID is refused with 409. Service, key and generation remain separate on each selected service. Recovery affects only a matching active generation on that service; otherwise the protected receipt records no effect and lists services where the key is open. A recovered generation is never reopened by a delayed trigger.

Authentication, rotation and revocation reuse native bearer-digest and installation-encrypted HMAC custody. Bearer authentication cannot substitute for a signed key. Successful replies contain only `duplicate`, `id`, `eventId`, `service`, `observedAt` and `acceptedAt`. An unrouted receipt has `service: null`; its ID identifies retained custody without admitting a native alert. Routing explanations are available only through protected workspace reads. A key grants no session or management access.

The native door retains its documented 64 KiB UTF-8 bound and current 413/400 refusals for oversized, malformed or incomplete input. Authenticated native incomplete-intake custody required by the contract is still unfinished; this is not an exception to that duty. Native and other HTTP intake keys currently have shared event/receipt and workspace storage guards, not a per-key timed request window. No per-key rate allowance, isolation or window-recovery guarantee is claimed.

## Archives and current limits

Native checkpoints and portable exports retain definitions, all published versions, routing context, explanations and re-admission attribution. Credentials stay installation-local. Restore marks sources inactive and performs no admission, replay or send.

Workspace administrator management supports native, incumbent-compatible and Alertmanager/Grafana/Datadog routed credentials. Team authority, SNS, incumbent key/rule import and move reports, versioned API and Terraform management, complete per-key rate limits and live provider acceptance remain incomplete. Native authenticated incomplete-intake handling also remains unfinished. Other provider-size and incomplete-intake delivery requirements remain tracked under OC-059. Existing workspace storage limits still apply and return an explicit refusal. No local test certifies paging or live sender acceptance.
