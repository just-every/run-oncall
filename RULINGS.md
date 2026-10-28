# Oncall rulings

Each ruling that shapes a clause, moved verbatim from CONTRACT.md before the 28 October 2026 contract cleanup. The clauses state the outcome; these entries record why. Line references are to CONTRACT.md at `519266e5ccbbf33fcab82c4107fa8f80c282a204`.

### RL-1 — Release 1 is hosted coordination beside the existing pager

- **Date:** 16 October 2026
- **Ruled by:** the owner (owner direction of 16 October 2026; the approved scope is the 16 October 2026 Oncall entry in LIST.json)
- **Governs:** OC-012, OC-018, OC-026, OC-027, OC-028, OC-054, OC-064, OC-066 and the Boundaries

> The approved 16 October scope governs these clauses. Release 1 remains hosted coordination beside the existing pager, with production paging OFF.
>
> — CONTRACT.md line 7

> Release 1 is hosted incident coordination alongside the team's existing pager. Paging stays OFF, the existing pager stays authoritative, and coordination does not require an independent standby. Hosting does not synchronize the pager's configuration, deliver pages, announce role moves externally or prove delivery. Teams keep their existing pager routes and responder notification settings in place.
>
> — CONTRACT.md line 136, "Release scope — owner direction, 16 October 2026"

> Release 2 paging and its independent standby are not built. Its requirements include dual alert intake, configuration pull, independent store/secrets/identity and external role-move announcements; durable absolute deadlines and term-scoped sent markers; one-use acknowledgment at both sites; two channels on two providers per responder; carrier registration; and real-phone and provider-failure drills. Measured takeover-to-page time belongs in this contract only after those drills. None is inferred from coordination deployment or local proof.
>
> — CONTRACT.md line 138

### RL-2 — Scoped machine coordination and approved signed response events

- **Date:** 21 October 2026
- **Ruled by:** ct, through the OC-053 fleet brief (a deliberate requirement change)
- **Governs:** OC-003, OC-006, OC-042, OC-053

> The OC-003 and OC-006 policies below authorize scoped machine coordination and explicitly approved signed response events under OC-053, while preserving human-session authority and paging OFF.
>
> — CONTRACT.md line 9

> **OC-003 / OC-006 policy (21 October 2026, deliberate requirement change; authorized by the OC-053 fleet brief):** The former session-only incident-change requirement now also admits explicit, service-scoped machine capabilities through `/api/v1`. Formerly, routing decisions, snapshots and alert identities were readable only through session-protected doors. A token with the matching read permission now reads its granted services' records, including the incident alert IDs those records carry through the services, schedules, incidents, actions, analytics and integrations families; intake routing-decision records and frozen intake snapshots remain session-only. It has no archive, export or audit door. A `services:write` token may update granted service definitions, which is an administrator action for humans, but cannot create services or widen its grant. The former prohibition on external incident publication now permits only administrator-approved minimal signed response events through the OC-053 outbox. Existing human role checks, human-review acceptance, protected archive/export, minimum intake receipts and paging OFF remain required. Token authority is never inferred to be a human response. A machine acknowledgment must name an active responder, who becomes the incident's commander and assignee. The timeline and audit record it as the service account's act naming that member, never as that member's own acknowledgment. A token cannot accept human-review follow-ups. Completion it supplies under the evidence policy is an automation claim, not a human attestation. Delivery is receiver acceptance, not acknowledgment by a person.
>
> — CONTRACT.md line 144

> **Security consequences:** Machine keys grant only named API permissions and services; they cannot create sessions or manage members. A key or endpoint acts only while the administrator who created it remains an active administrator. Demotion or removal suspends it from the next request and at dispatch, and its authority never transfers. Endpoint approval declares exact recipients and minimal data fields; installation-local digest/AES-GCM custody, dispatch-time authorization, credential-revision fences, bounded attempts, signed receipts and protected replay apply. Revocation cannot retract bytes already sent; ambiguous outcomes remain uncertain. Restore transfers history without tokens, signing keys, approvals or automatic sends. Erasure severs matching automation labels and local capabilities without rewriting permanent pseudonymous audit facts. Each event body is exactly `operationId`, `type`, `service`, `incident`, `revision`, `state` and `at`, frozen at the domain commit. It carries no names, summaries, notes, evidence URLs or contacts. It is signed with HMAC-SHA256 hex over `timestamp + "." + body`, using a per-endpoint key that is never returned, logged, exported or written to audit. Only an authenticated receiver receipt records `sent`, and an unsigned success is `uncertain`. Recipients are literal globally routable IPv4 HTTPS addresses on port 443, with no hostname, DNS lookup, userinfo, query or fragment. Redirects are never followed. An operation gets at most five attempts. Service-account keys, held as SHA-256 digests, never enter audit or logs. Creating, rotating, revoking and replaying are administrator-only and each commits with its OC-041 audit entry.
>
> — CONTRACT.md line 145

> **Evidence and gaps:** `tests/runtime.mjs` extends the emitted HTTP journey with `tests/automation.mjs`; `tests/transfer.mjs` and `tests/checkpoint-cli.mjs` exercise populated inactive transfer and erasure; `tests/automation-browser.mjs` exercises the existing settings pattern at 1440 and 390. `tests/automation.mjs` (creator demotion/removal) exercises next-request read/write refusal, separate origin/endpoint/receiver dispatch custody, no transfer to another administrator and refusal after restart; its machine acknowledgment asserts commander/assignee and service-account timeline/audit attribution. These policies record meaning changes, not independent status promotions. Not proved: live receiver/TLS interoperability, hosted scheduling latency, provider delivery, human response or paging readiness. Hostname/IPv6 recipients and a general automation engine are not supplied. Issued releases, CHANGELOG and RELEASE.json remain unchanged; the next release must record both clause amendments.
>
> — CONTRACT.md line 146

### RL-3 — Ruled carves of OC-024, OC-025, OC-038, OC-050 and OC-065, and their receiving duties

- **Date:** 23 October 2026 (OC-050 at 06:50Z)
- **Ruled by:** ct
- **Governs:** OC-023, OC-024, OC-025, OC-026, OC-027, OC-028, OC-029, OC-038, OC-040, OC-050, OC-065, OC-066, OC-067, OC-074, OC-076, OC-077

> **Ruled carve Gap (23 October 2026):** Google/Outlook PTO import may use dated one-time owner-role evidence; it has not been run. Mixed acceptance sentence beginning “During the New York-to-London handoff” stays here because it combines live paging and coverage-preview duties. Verified route counts and degraded coverage are receiving duties in OC-026/066; no DONE claim follows the carve.
>
> — CONTRACT.md line 164 (OC-024)

> **Ruled carve Gap (23 October 2026):** Automatic change-notice delivery and retained delivery failures move to OC-026. The mixed sentence “Personal on/off-call reminders obey each responder’s channel/time rules; overdue swap requests remain visible.” stays here: reminder delivery belongs to OC-027, while overdue swap visibility remains OC-025. The mixed acceptance sentence stays verbatim. Google/Outlook viewing may use dated one-time owner-role evidence; not run. PARTIAL.
>
> — CONTRACT.md line 170 (OC-025)

> **OC-024 receiving duty and acceptance (ct, 23 October 2026):** Every shift in the effective coverage view and the change preview shows its responder's verified high-urgency route count under OC-026 and OC-066, and a shift whose responder lacks two independent routes in their country is flagged as degraded coverage before it starts, never discovered when a page fails.
>
> — CONTRACT.md line 182 (OC-026)

> **OC-025 receiving duty and acceptance (ct, 23 October 2026):** Schedule/override changes automatically notify affected responders and service owners and retain delivery failures.
>
> — CONTRACT.md line 184 (OC-026)

> **OC-038 receiving Gap (ct, 23 October 2026):** Live cutover and parallel routing remain unbuilt receiving duties. The mixed DST-comparison/cutover sentence remains verbatim in OC-038; each receiver retains its own subject’s duty, status and Gap.
>
> — CONTRACT.md lines 186, 198, 208 and 216 (OC-026, OC-027, OC-028, OC-029)

> **Ruled carve Gap (23 October 2026):** Live cutover and parallel routing are receiving duties in OC-026–029. Live-API pull and account reconciliation are tracked in new OC-074. The first scope sentence and the representative export/account acceptance sentence stay verbatim because both mix file and live-account duties. The sentence beginning “Compare source/target coverage through DST” and the acceptance sentence beginning “Resolve named mapping differences” also stay verbatim because they mix file-migration comparison with live cutover and parallel routing. Live-account shapes remain unproved; PARTIAL.
>
> — CONTRACT.md line 267 (OC-038)

> **Ruled carve Gap (23 October 2026):** The recent-changes sentence mixes web, mobile and Slack/Teams duties and stays verbatim. The custody sentence mixes team privacy, retention, erasure and archives and stays verbatim. The unauthorized-user acceptance sentence stays here. Mobile panel belongs to OC-029, Slack/Teams summaries to OC-067, private-team scope to OC-023 and object erasure to OC-040; those mixed sentences cannot move under the ruling. PARTIAL; the carve alone grants nothing.
>
> — CONTRACT.md line 442 (OC-065)

> **OC-024 receiving duty and acceptance (ct, 23 October 2026):** Every shift in the effective coverage view and the change preview shows its responder's verified high-urgency route count under OC-026 and OC-066, and a shift whose responder lacks two independent routes in their country is flagged as degraded coverage before it starts, never discovered when a page fails.
>
> — CONTRACT.md line 462 (OC-066)

> ct’s 23 October 06:50Z carve own-subject rider keeps both mixed Acceptance sentences here: “Trigger a service template, request backup responders and assign/transfer commander/scribe/communications roles through web/chat.” and “Merge related incidents, split an unrelated alert, miss an update deadline with the browser closed and inspect reminders, aliases and attributed timelines; reject unauthorized role and state mutations.” Their unbuilt backup-request/chat and browser-closed timer/reminder duties remain this Gap; no whole sentence is moved outside its receiving subject.
>
> — OC-050 Status Gap, CONTRACT.md line 617

### RL-4 — Source-recovery delivery belongs to OC-026, closed-browser timing and reminders to OC-027

- **Date:** 23 October 2026 05:55Z
- **Ruled by:** ct
- **Governs:** OC-026, OC-027, OC-056, OC-075, OC-078

> **OC-056 receiving acceptance (ct, 23 October 2026 05:55Z):** When the source recovers that generation, before or after acknowledgment, Oncall does all of the following in one commit: stops the obligation, cancels every attempt not yet handed to a provider, records the outcome "stopped by source recovery" with the recovery receipt, and resolves the alert with no human summary. Attempts already handed to a provider keep their recorded outcomes. Per service, policy chooses to send a "recovered" notice to everyone already notified, or to stop silently. Before paging ships, OC-056 repeats the OC-070 email recovery path with actual attempt cancellation and recovered notices; the current email receipt is only the labelled non-automatic paging-OFF stopped state. Repeat under the "notify recovered" policy and observe exactly one recovery notice to each person already notified. Before paging ships, repeat OC-070 recovery with actual paging cancellation and recovered notices; the implemented email receipt currently records only the labelled non-automatic stopped-by-source-recovery state.
>
> — CONTRACT.md line 180 (OC-026)

> **OC-056 receiving acceptance (ct, 23 October 2026 05:55Z):** Trigger an alert-only page and recover it before the first escalation deadline with the browser closed. Observe that no further notification goes out, that a stopped-by-recovery outcome is recorded, and that no incident is left needing manual resolution. Recover a declared incident's alerts and observe that paging stops, the incident stays open and awaiting resolution, the reminder fires, and resolution is refused without an OC-004 summary.
>
> — CONTRACT.md line 196 (OC-027)

> — ct 23 October 05:55Z carve applied verbatim to OC-026 (actual attempt cancellation/recovered delivery) and OC-027 (browser-closed timing/reminder firing), which retain their own statuses and gaps. OC-043 owns flapping controls. Paging stays OFF; recorded notices and reminders are explicitly non-automatic.
>
> — OC-056 Status Gap, CONTRACT.md line 623

### RL-5 — Receiving gaps and statuses for mixed OC-025, OC-038, OC-058, OC-060, OC-061, OC-068 and OC-074 sentences

- **Date:** 24 October 2026 02:18Z
- **Ruled by:** ct
- **Governs:** OC-023, OC-025, OC-026, OC-027, OC-029, OC-038, OC-039, OC-042, OC-058, OC-060, OC-061, OC-064, OC-067, OC-068, OC-071, OC-074, OC-079, OC-081, OC-082

> Gap (ct ruling 24 October 02:18Z): Receiving Gap from OC-061: team subscribers and private-team visibility remain unbuilt. Original OC-061 sentences retained verbatim: “Internal users subscribe themselves to business services or teams, or admins and communications owners subscribe them.” “Subscribers can be users, teams, Slack/Teams channels and email lists, and each chooses email, push (OC-029) or chat delivery.” “A private team's business service is invisible to stakeholders outside its scope.” Receiving Gap from OC-068: per-team create-page/request-responder permissions remain unbuilt. Original OC-068 sentences retained verbatim: “The create-page and request-responders permissions are set per role and team.” “By default, responders and admins can page services in their teams, and a workspace setting lets a named team, such as Support, page any service.” Receiving Gap from OC-025: manager rules and team privacy remain unbuilt. Original OC-025 mixed sentence retained verbatim: “Responders request and accept schedule swaps from web or mobile with explicit substitute acceptance and manager rules; no accepted swap may leave coverage ambiguous.” Receiving Gap from OC-060: managers/team privacy remains unbuilt. Original OC-060 sentences retained verbatim: “Team privacy (OC-023) hides foreign items from every door.” “Confirm that a foreign team's incidents are neither listed nor selectable.”
>
> — OC-023 Status Gap, CONTRACT.md line 590

> **Gap (ct ruling 24 October 02:18Z):** Receiving Gap from OC-061: team subscribers and private-team visibility remain unbuilt. Original OC-061 sentences retained verbatim: “Internal users subscribe themselves to business services or teams, or admins and communications owners subscribe them.” “Subscribers can be users, teams, Slack/Teams channels and email lists, and each chooses email, push (OC-029) or chat delivery.” “A private team's business service is invisible to stakeholders outside its scope.” Receiving Gap from OC-068: per-team create-page/request-responder permissions remain unbuilt. Original OC-068 sentences retained verbatim: “The create-page and request-responders permissions are set per role and team.” “By default, responders and admins can page services in their teams, and a workspace setting lets a named team, such as Support, page any service.” Receiving Gap from OC-025: manager rules and team privacy remain unbuilt. Original OC-025 mixed sentence retained verbatim: “Responders request and accept schedule swaps from web or mobile with explicit substitute acceptance and manager rules; no accepted swap may leave coverage ambiguous.” Receiving Gap from OC-060: managers/team privacy remains unbuilt. Original OC-060 sentences retained verbatim: “Team privacy (OC-023) hides foreign items from every door.” “Confirm that a foreign team's incidents are neither listed nor selectable.”
>
> — CONTRACT.md line 156 (OC-023)

> **Gap (ct ruling 24 October 02:18Z):** PARTIAL. Named receiving Gaps: mobile swaps → OC-029; manager rules and team privacy → OC-023. Mixed requirement and acceptance sentences stay verbatim at OC-025; automatic notice/reminder delivery remains owed under the existing OC-026/OC-027 custody. No delivery is claimed.
>
> — CONTRACT.md line 172 (OC-025)

> **Gap (ct ruling 24 October 02:18Z):** Receiving Gap from OC-068: phone-within-bar and creator-naming notification remain unproved; paging OFF. Original OC-068 sentences retained verbatim: “The engineer is phoned within the OC-064 intake-to-first-attempt bar, and the notification names the creator.” “That obligation has the same OC-064 timing bars, stop conditions (except source recovery, since there is no source), audit and standby continuity (OC-028) as an alert-born page.”
>
> — CONTRACT.md line 188 (OC-026)

> **Gap (ct ruling 24 October 02:18Z):** Receiving Gap from OC-068: automatic assignment repeat/escalation remains unbuilt. Original OC-068 sentences retained verbatim: “A user-targeted page follows the service's **user-assignment rule**: either repeat to that user under the OC-027 repeat setting, or escalate to a chosen escalation policy from level one after 1–1,440 minutes unacknowledged.” “The default is the service's own policy after 10 minutes.” “Not acknowledging escalates per that user-assignment rule, and the outcome is recorded.”
>
> — CONTRACT.md line 200 (OC-027)

> **Gap (ct ruling 24 October 02:18Z):** Receiving Gap from OC-061: mobile status/subscription access and push delivery remain unbuilt. Original OC-061 sentences retained verbatim: “Subscribers can be users, teams, Slack/Teams channels and email lists, and each chooses email, push (OC-029) or chat delivery.” “The stakeholder is notified only through the approved update, by their chosen channel, and is denied the incident timeline, alerts and runbook over web, mobile, API and export doors.” Receiving Gap from OC-068: mobile manual pages remain unbuilt. Original OC-068 sentences retained verbatim: “Anyone with the create-page permission can page from web, mobile app (OC-029), Slack/Teams (OC-067) and the API (OC-053).” “Create a policy-targeted page from the mobile app and through the API with a repeated idempotency key, and observe one incident paging that policy instead of the service's.” Receiving Gap from OC-025: mobile swaps remain unbuilt. Original OC-025 mixed sentence retained verbatim: “Responders request and accept schedule swaps from web or mobile with explicit substitute acceptance and manager rules; no accepted swap may leave coverage ambiguous.” Receiving Gap from OC-060: mobile queries and bulk coordination remain unbuilt. Original OC-060 mixed sentences retained verbatim: “Filters are shareable by URL, users can save them, and the same queries are available on the mobile apps (OC-029) and the API (OC-053), with cursor pagination.” “During a 50-incident storm, filter by team, service, urgency and status, view "assigned to me" on web and mobile, and acknowledge all 50 in one action.”
>
> — CONTRACT.md line 218 (OC-029)

> **Gap (ct ruling 24 October 02:18Z):** OC-038 and OC-074 are co-holders of live incumbent API pull and account reconciliation; saved-response file adapters remain OC-038. The original export/account requirement and acceptance sentences remain verbatim at OC-038; nothing is dropped. OC-074 remains MISSING, and OC-038 remains PARTIAL.
>
> — CONTRACT.md line 269 (OC-038)

> **Gap (ct ruling 24 October 02:18Z):** Receiving Gap from OC-061: SSO/SCIM stakeholder assignment remains unbuilt. Original OC-061 sentence retained verbatim: “A **stakeholder** role, assignable to SSO/SCIM users (OC-039) and separate from viewer/responder/admin, sees only the internal status view and the approved updates for business services it may see.”
>
> — CONTRACT.md line 275 (OC-039)

> **Gap (ct ruling 24 October 02:18Z):** Receiving Gap from OC-061: subscriber delivery stays under OC-042 custody with the held SendGrid sender, pending delivery proof. Original OC-061 sentences retained verbatim: “Subscribers can be users, teams, Slack/Teams channels and email lists, and each chooses email, push (OC-029) or chat delivery.” “Approved internal updates (OC-051) and optional templated "impact started/ended" notices reach subscribers of the impacted business services, and raw alert text is never sent.”
>
> — CONTRACT.md line 301 (OC-042)

> **Gap (ct ruling 24 October 02:18Z):** PARTIAL, NOT DONE; nothing carved this round and no receiving clause gains custody. Re-page-at-deadline, the OC-064 lateness bar, standby restart/takeover, Slack/Teams and mobile remain owed by the original OC-058 requirement and acceptance sentences, which stay verbatim here. Recorded obligations prove no delivery, measured lateness or standby continuity; paging OFF.
>
> — CONTRACT.md line 394 (OC-058)

> **Gap (ct ruling 24 October 02:18Z):** PARTIAL. Named receiving Gaps: mobile queries and bulk coordination → OC-029; managers/team privacy → OC-023; bundled-call/SMS acknowledge-all and resolve-all → OC-071. Mixed requirement and acceptance sentences stay verbatim at OC-060. Every per-item authority/revision and summary/evidence obligation remains owed; paging OFF.
>
> — CONTRACT.md line 406 (OC-060)

> **Gap (ct ruling 24 October 02:18Z):** PARTIAL, records only. Subscriber delivery remains under OC-042 custody with the held SendGrid sender; no delivery is claimed. Named receiving Gaps: SSO/SCIM assignment → OC-039; team subscribers and private-team visibility → OC-023; Slack/Teams channel subscribers and chat → OC-067; mobile and push → OC-029. Email-list subscriber records are exercised here; delivery remains under OC-042 with the held SendGrid sender. Each receiver quotes the original mixed sentence verbatim; no inherited obligation disappears through a reference.
>
> — CONTRACT.md line 416 (OC-061)

> **Gap (ct ruling 24 October 02:18Z):** Receiving Gap from OC-068: phone-within-bar and creator-naming notification remain unproved; paging OFF. Original OC-068 sentences retained verbatim: “The engineer is phoned within the OC-064 intake-to-first-attempt bar, and the notification names the creator.” “That obligation has the same OC-064 timing bars, stop conditions (except source recovery, since there is no source), audit and standby continuity (OC-028) as an alert-born page.”
>
> — CONTRACT.md line 434 (OC-064)

> **Gap (ct ruling 24 October 02:18Z):** Receiving Gap from OC-061: Slack/Teams channel subscribers and chat delivery remain unbuilt. Original OC-061 sentence retained verbatim: “Subscribers can be users, teams, Slack/Teams channels and email lists, and each chooses email, push (OC-029) or chat delivery.” Receiving Gap from OC-068: Slack/Teams manual pages and responder requests remain unbuilt. Original OC-068 sentences retained verbatim: “Anyone with the create-page permission can page from web, mobile app (OC-029), Slack/Teams (OC-067) and the API (OC-053).” “Request a second responder from Slack, observe a separate page and acknowledgment, and decline a third request and see the requester notified.”
>
> — CONTRACT.md line 470 (OC-067)

> **Gap (ct ruling 24 October 02:18Z):** PARTIAL, paging OFF; recorded obligations only. Named receiving Gaps: phone-within-bar and creator-naming notification → OC-026/OC-064; mobile → OC-029; Slack/Teams → OC-067; per-team create-page/request-responder permission → OC-023; automatic user-assignment repeat/escalation → OC-027. Original mixed requirement and acceptance sentences remain verbatim here and are quoted verbatim at their receiving Gaps; standby continuity remains owed under OC-028.
>
> — CONTRACT.md line 478 (OC-068)

> **Gap (ct ruling 24 October 02:18Z):** Receiving Gap from OC-060: bundled-call/SMS acknowledge-all and resolve-all remain unbuilt. Original OC-060 sentences retained verbatim: “Acknowledge all and resolve all from an OC-071 bundled call or SMS reply use these same bulk rules.” “Acknowledge a bundled SMS's items by its acknowledge-all code and observe the same per-item results and shared operation ID.”
>
> — CONTRACT.md line 497 (OC-071)

> **Gap (ct ruling 24 October 02:18Z):** OC-074 remains MISSING and co-holds live incumbent API pull and account reconciliation with OC-038; saved-response file adapters stay OC-038. No live-account proof or status promotion is claimed.
>
> — CONTRACT.md line 548 (OC-074)

### RL-6 — Receipt capacity stays a local limit until a hosted run, and over-allowance batches are refused whole

- **Date:** 22 October 2026
- **Ruled by:** ct
- **Governs:** OC-059, OC-073, OC-084

> Events, alerts, receipts and audit are loaded in pages or lazily, so request time and memory do not grow with the number of held receipts. The stated receipt capacity is a hosted claim only after a hosted run stays inside the Cloudflare Workers 128 MB memory limit; until then the count is a local limit. The 413 limits on the JSON archive and checkpoint and the streaming portable export and import stand. (CT, 22 October 2026.)
>
> — CONTRACT.md line 505 (OC-073)

> Inherently over-allowance atomic batches are refused whole with a machine-readable count/allowance and split/raise instruction, without a fabricated Retry-After (CT, 22 October).
>
> — OC-072 Status Gap, CONTRACT.md line 639

### RL-7 — Monitoring adapters need a dated real-provider journey

- **Date:** 19 October 2026
- **Ruled by:** ct
- **Governs:** OC-030

> Per ct (19 October 2026), DONE needs the real-provider journey (each provider's own test/send door, then fire and recover a real rule, and an Alertmanager on a routed key) recorded as dated one-time evidence at a named SHA; it has not been run.
>
> — OC-030 Status Gap, CONTRACT.md line 597
