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

Trigger, acknowledgement, note and recovery all pass through the same service-selection rules. The same deduplication key routed to two services has separate generations. Recovery acts only on the currently selected service; a no-effect recovery names other services with open generations as a diagnostic. Source acknowledgement is an integration claim, separate from a human incident acknowledgement. Source recovery never resolves a declared incident.

## Archives and current limits

Native checkpoints and portable exports retain definitions, all published versions, routing context, explanations and re-admission attribution. Credentials stay installation-local. Restore marks sources inactive and performs no admission, replay or send.

This release implements workspace administrator management on the incumbent-compatible endpoints. Team scope, native routed Events API credentials, provider-adapter routing, incumbent key/rule import, Terraform management and live provider acceptance remain incomplete. Provider-size and incomplete-intake delivery requirements remain separately tracked under OC-059. Existing workspace storage limits still apply and return an explicit refusal. No local test certifies paging or live sender acceptance.
