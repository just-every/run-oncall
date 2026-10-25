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

Native JSON parsing and retained incomplete evidence remain bounded to 64 KiB. After successful authentication, an oversized, unparseable or incomplete request retains the first 64 KiB of exact wire bytes (base64 encoded), a full-body hash/byte count, high-urgency incomplete custody and a recorded owner notice, and returns `202` with `truncation: true`. No prefix is interpreted as routing fields: it follows the published catch-all, including record-unrouted. Invalid, revoked and wrong-audience credentials create no intake record. Each prefix is held in its own custody table outside the 1 MB authored-record profile, together with the receipt, event, alert and audit rows it generates, so intake custody is bounded by the 10,000-receipt capacity and can never refuse a human write. Credentials echoed into retained content are refused. Ordinary successful structured receipts retain the six fields above; incomplete responses identify their receipt and truncation explicitly. The 10,000-receipt count is a local limit; it becomes a hosted capacity only under OC-073.

## Per-key allowances

Each native service key and native, compatible or monitoring routed/service integration key owns one allowance by record ID, independently of its secret. Rotating the credential neither resets nor doubles usage. Revocation stops admission. Defaults are **600 authenticated intake/receipt-status requests** and **120 newly admitted events** over the preceding rolling minute, chosen as Oncall product defaults. Rejected payloads and duplicate requests count as requests. A retry of an existing receipt counts no new event. Further trigger observations grouped into an existing service/key/generation count no new event; a new generation, unrouted receipt, recovery/action receipt or new incomplete receipt counts once. Each distinct alert in a provider batch counts independently unless already grouped; batches commit atomically. Draft replay and human management are not credential-authenticated intake and do not spend the key's allowance.

A temporary throttle returns **429** and `Retry-After` in seconds, rounded up from the actual sample expiry; it does not reset on a timer. The sender retains the refused request for retry. A batch that cannot ever fit its configured event allowance is refused with an instruction to split it or raise the allowance; its `rateLimit` object supplies `code: "batch_exceeds_allowance"`, `batchCount`, `allowance` and `instruction`, with no fabricated recovery time. Throttling changes no alert, grouped count, receipt or lifecycle. A once-per-rolling-minute internal owner notice names the key and count, visible in the routing settings and audit. Paging and external owner delivery remain OFF.

A current administrator can change a key's allowance in the existing routing settings, or `POST /api/intake/allowances` with `{id,requests,events,revision}`. The ID is `intake:KEY_ID` for compatible/monitoring/routed keys or `source:SOURCE_ID` for ordinary native keys; revision is the current workspace revision. Supported values are 1–6,000 requests and 1–1,200 new events. Policy changes use current admin authority and refuse stale revisions. A 200-new-alert batch therefore needs an owner-configured event allowance of at least 200 and enough remaining usage; the maintained 200-alert custody journey uses a higher allowance. Policy and historical notices survive archives; credentials and transient usage do not. Restore grants no intake authority.

Email retains its separate **60 new receipts per minute per address**. The installation's **10,000 receipts/events** and workspace storage capacity remain separate bounds; a rate allowance never raises storage capacity. The 10,000-receipt count is a local limit; it becomes a hosted capacity only under OC-073.

## Archives and current limits

Native checkpoints and portable exports retain definitions, all published versions, routing context, explanations and re-admission attribution. Credentials stay installation-local. Restore marks sources inactive and performs no admission, replay or send.

Workspace administrator management supports native, incumbent-compatible and Alertmanager/Grafana/Datadog routed credentials. Team authority, SNS, incumbent key/rule import and move reports, versioned API and Terraform management and live provider acceptance remain incomplete. Other provider-size and incomplete-intake delivery requirements remain tracked under OC-059. Existing workspace storage limits still apply and return an explicit refusal. No local test certifies paging or live sender acceptance.


## Admission-time maintenance

The existing service policy door accepts a finite `suppressionWindow` on a `suppress` policy. Publish through `POST /api/command` with `type: "policy"`, service, severity, action, an active responder `owner`, a reason of at most 300 characters, `baseVersion` (zero for a new selector), and `suppressionWindow: {start, end}`. Both boundaries are canonical UTC timestamps, with start before end. Editing or removing a window requires the current selector version. Publication and its permanent pseudonymous audit commit atomically.

At admission, start is inclusive and end exclusive. During maintenance the signal remains visible and assigned to that queue owner; severity is unchanged. Before start and after expiry the same rule routes to its responder. The explanation names the rule version, boundaries, reason and whether maintenance is active, not started or expired. A later observation of an existing alert updates its suppression and ownership under that window; earlier events retain their original decision and policy snapshot. Native, compatible, Datadog and Prometheus intake share this service decision after routed-key selection. No timer fires on a boundary: a later admission or read-only replay evaluates the current instant. Paging remains OFF, with recorded obligations only.

Routed-key preview now compares both routing and service-policy stages, including the proposed service owner and suppression explanation. It uses the retained event reference (or a `receipt:` reference when no service event was admitted), the draft routing base version and current service-policy version. Incomplete intake is not approximated as a normal service event. Comparisons are ordered by admission time and receipt ID. Successful service replay at `POST /api/replay` orders accepted events by acceptance time, other events by source observation time, and breaks ties by source/event ID. Both replay doors perform zero durable writes, including the permanent audit.

Cross-source correlation/grouping windows, dependency orchestration, flapping controls, generalized transformations and durable coordination workflows with their OC-041 crash/lease outcomes remain incomplete under OC-043. This maintenance/replay subset does not establish those capabilities.

## Event-time correlation and flapping

An administrator opens **Services → Signal grouping settings** for the service's all-severity coordination rule. Severity-specific rules still take precedence. Publish from the displayed base version; a stale draft is refused. Ordinary coordination edits preserve grouping, and an explicit disabled grouping setting removes it for later admissions.

Choose `key`, `title` or `labels.<name>` and a window of 1–86,400 seconds. Provider labels come from already-retained bounded context: Alertmanager/Grafana labels, Datadog `key:value` tags, PagerDuty custom details and native routed-key label fields. Plain native sources support their documented key and title. Missing, ambiguous or over-bound label values remain visible and ungrouped. Group metadata holds references and explanations, not another copy of label values.

OC-072 chooses the service first. Correlation then uses source event timestamps, with the original event's timestamp included and the window's end excluded. It selects the oldest eligible original by event time, then admission time and identity. An observation before all eligible originals or outside the window starts a separate visible group. Late arrivals never rewrite earlier decisions. Optional direct-dependency association stays inside the environment and records the declared association's workspace revision. Every source/service/environment/generation remains independent: recovery affects only its own alert, originals remain available, and correlation does not lower severity.

The explanation identifies the original event, its service-rule version, the current service-rule version, the group and the reason for joining. Routed receipts also retain the preceding routing-rule version. Maintenance and OC-057 urgency continue to use admission time. Only an explicitly published, explained urgency rule can lower a new admission; an already-open high-urgency alert is not silently lowered by a later low decision. Ordered replay uses a private copy and compares historical/proposed grouping and urgency with no storage, permanent-audit, incident or provider effects.

A flapping count of 0 disables holding. A count of 2–100 holds a retrigger after the preceding generations in the source/key window have recovered. Concurrent unrecovered generations are not classified as flapping. Held active generations appear as one visible source signal with the reason and retained generation evidence. This is a local suppression state, with paging OFF and no sender or timer. Disabling the rule releases the next admitted observation; it never rewrites the prior hold. General durable orchestration workflows and their OC-041 crash/lease outcomes remain unbuilt.

Erasing an original integration clears surviving group references visibly, preserves independent signals and retains an existing local hold for review. Native, checkpoint and portable archives keep the explanations; their erasure journals still fence older copies. Independent standby reconciliation remains OC-028 and OC-040's Gap.

## Recorded coordination workflows

Selected alert-only reassignments can be saved as a resumable workflow in the incident list's bulk controls. The plan freezes the ordered alert identities, revisions, intended assignee and reason in the existing triage custody. Each invocation processes at most two items; each item's mutation, result and permanent audit commit together. The incident list's **Recorded coordination workflows** shows pending, complete and refused counts. Only the still-authorized author can explicitly resume. A closed browser or Worker restart does not run pending work. No timer or sender runs; paging stays OFF.

The HTTP start is `POST /api/triage/bulk` with `durable: true`, `action: "reassign"`, selected alert items and the existing confirmed count. Resume with `POST /api/triage/workflows/:id/resume` and `approve: true`. Committed steps are never repeated. A stale or unavailable item retains its refusal; a storage/audit failure leaves its step pending with an interrupted response and permanent failure/uncertainty outcome. Erasing an involved source or recipient removes the copied plan. Restore retains the plan as history and requires a fresh explicit resume under current authority. This bounded reassignment slice does not implement generalized transformations, timers, arbitrary multi-action workflows or provider execution.
