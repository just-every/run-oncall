# Readiness beside your existing pager

Open **Settings → Readiness** as a current workspace member. The read-only
`GET /api/readiness` also returns this report. Signed-out, expired and revoked
sessions have no access; stakeholders cannot read it. Refresh reads a new
observation. It sends nothing, starts no timer and changes no configuration.

Paging stays **OFF**. Web or storage health cannot establish pager coverage.
Keep your existing pager authoritative. No localhost test, demo or provider
sandbox substitutes for live acceptance. OC-054 remains PARTIAL.

## Release matrix

The report identifies the package release and the actual deployment source SHA,
artifact fingerprint and deployment version from the same bindings as `/health`.
An unbound identity is shown as unknown, never replaced with a guessed revision.
The matrix uses a closed set of states:

- **Working here:** maintained local coordination behavior beside the existing pager.
- **Off:** native paging is deliberately disabled.
- **Not built:** no working implementation of that capability is provided.
- **Unproven live:** local adapter behavior or a required operation lacks external acceptance.

Every row names its maintained journey or says there is no evidence. There are
no current external live-acceptance records for the matrix adapters. The separate
installation checklist retains dated prior field evidence without promoting it. Configured and active-with-credentials
counts and the last retained accepted event are observations, not live proof.
Inactive definitions and revoked credentials are not counted as active. Unknown
source observations never appear as zero. Historical receipts can outlive a
source; change/provider rows describe currently retained definitions.

The matrix covers coordination, native paging, standby, every listed intake
adapter, every change-source adapter, chat, SSO, iOS and Android. It also keeps
canary/watch, drills, reference-load measurements, support and buyer cutover
unproven. Sustained and burst intake, escalation delay, provider failover,
recovery and archive capacity have no measured p50, p95, p99 or maximum against
OC-064. Those missing measurements block cutover. An actual buyer must pass its
real-service and real-device checklist before retiring the incumbent.

## US installation and dependency checklist

Reviewed **12 November 2026** for this release. Start here before arranging a US
installation. **Settings → Readiness** and protected `GET /api/readiness`
show the same dated checklist, installed deployment identity and current release
matrix. The checklist is read-only: it writes nothing, sends nothing, starts no
timer and has no completion checkbox. It grants no provider, deployment,
publication or cutover authority.

Each item retains its owning clauses, constituent matrix states and applicable
[contract field proof](https://github.com/just-every/run-oncall/blob/main/CONTRACT.md#field-proof-register)
state and date. **Working here**, **off**, **not built** and **unproven live**
describe the release capability; a passed field row means **passed on its date**,
never that this installation is ready. A **not run** row supplies no proof.
Every account or live step below remains **not done for this installation**.
The 911 row is guidance only. Configuration counts, a local receipt or an
unbound deployment identity cannot complete a prerequisite.

| US dependency | Owning clauses | Release state and field proof | Installer requirement still outstanding |
| --- | --- | --- | --- |
| Hosting account and deployment identity | OC-018 | Coordination working here; R-1 passed on 2026-10-19, dated prior evidence | Authorize this Cloudflare account and deployment operation; verify its source SHA, artifact fingerprint, version, owner access and removal. Prior evidence is not the current deployment. |
| Remote mail for hosted sign-in | OC-018 | Unproven live; R-1 passed on 2026-10-19, dated prior evidence | Configure a remote mail provider, credentials and verified sender; test a real sign-in email. Local owner entry proves no mail delivery. R-2 passed on 2026-10-21 for inbound intake only, not sign-in or paging. |
| Registered US voice and SMS | OC-026, OC-066 | Paging off; R-5 not run | Register A2P 10DLC brand and campaign, sending numbers and caller identity; establish consent, opt-out handling and carrier tests. No sending authority is granted. |
| APNs and FCM entitlements | OC-029 | iOS and Android not built; R-7 not run | Provision APNs and FCM, iOS Critical Alerts entitlement and Android full-screen and Do Not Disturb permissions; prove device acceptance. |
| Native apps and store distribution | OC-029 | Not built; R-7 not run | Build native apps and distribute through the App Store and Google Play. Web and local proof is not native distribution. |
| Zoom or Microsoft Teams bridges | OC-035 | Not built; R-12 and R-6 not run | Authorize a real tenant, build the bridge integration and prove inbound call routing. |
| Slack and Microsoft Teams apps | OC-034, OC-067 | Both not built; R-12 not run | Install and authorize scoped apps and prove real chat actions. |
| Independent standby, takeover and real-phone drills | OC-028, OC-047, OC-054 | Standby not built; drills unproven live; R-8 not run | Establish independent account and identity authority, takeover and failback, and human-confirmed phone drills. Paging cutover requires them; coordination beside an existing pager does not require standby. |
| Live handset delivery | OC-026, OC-029, OC-035, OC-064, OC-066, OC-071, OC-080, OC-082 | Unproven live; R-6 not run | Prove registered real-handset voice with DTMF, SMS replies and links, push and email, provider-disable drills and inbound calls. Local receipts and sandboxes do not prove human receipt. |
| OC-064 reference load | OC-064, OC-054 | Unproven live; related R-6 not run | Measure sustained and burst intake, escalation, failover, recovery and archive capacity, with p50, p95, p99 and maximum against OC-064. R-6 alone is not reference-load proof. |
| Applicable regulated-data agreements and validated controls | OC-044 | Unproven live; no field-proof row recorded | Establish applicable agreements and validated controls before any regulated-data claim. Use redacted descriptions and separately authorized references. |
| 911 boundary | OC-044 | Guidance working here; no field-proof row applies | Oncall is not a 911 dispatch service. For a US emergency call 911 directly; do not wait for Oncall. |

Paging stays **OFF** and your existing pager stays authoritative. This checklist
closes no real usage, budget-warning, alternate-route, measured-availability or
live cutover obligation. R-1 and R-2 remain dated prior evidence, while not-run
rows remain unproved. See [limitations](limits.md) and [installation](install.md)
for emergency and regulated-data guidance and the authorized coordination setup.

## Independent observations

Each signal reads its own durable sources and returns **ok**, **degraded**,
**failing** or **unavailable**, with values, observation time and the age of its
relevant retained record. No record means unknown age. These reads still share
the installation and storage; they are not an independent availability monitor.

- **Intake:** latest admitted native, compatible or email receipt; refused/failed intake audit in the last hour; rolling-minute requests, event debits, keys at their allowance and recently throttled keys. Not all anonymous refusals are attributable or retained. Quiet intake cannot prove the sender is working.
- **Timers:** pending deadlines already due and unfired, plus the oldest queued response-event item. The minute task is defined, but there is no heartbeat record. No external missed-deadline watch, end-to-end canary or distinct test recipient is built.
- **Main/standby authority:** the installation's workspace revision and single local authority. No standby, authority lease or split-site fencing is provided.
- **Configuration freshness:** last retained accepted schedule, service and policy change from retained configuration audit and permanent audit, with separate ages and current counts. Missing history is unknown. There is no freshness threshold or configuration synchronization guarantee.
- **Delivery backlog:** unfinished queued/sending/failed response-event deliveries against the existing 1,000-slot capacity. Failed, uncertain, interrupted and terminal outcomes are reported separately. This is not a paging queue. Reading it never dispatches work.
- **Failed obligations:** recorded no-sender obligations and unanswered records, overdue unfired deadlines, fired deadlines without a target, failed workflow steps, interrupted work and uncertain outcomes or expired running leases. An acknowledgment is coordination, not evidence that a phone received a page. Alert ages use retained admission times when available; otherwise they stay unknown.

A missing or unreadable source makes its signal unavailable without replacing
other signals with a healthy default. Incomplete reports return HTTP 503 while
retaining the readable signals and an unproven pager-coverage statement. A fully
read report can contain failing signals: HTTP 200 means the observations were
read, not that cutover or paging is ready. Authentication/storage failures that
prevent checking current membership refuse the report entirely. `/health`
retains its storage/deployment identity contract and `paging: not-provided`.

## Backup and restore today

Follow [Export and restore](data.md) for archive custody, erasure fences, empty
destinations, owner mapping and inactive restored records. Stop the local
server you started before export, using its terminal's Ctrl-C. Keep archives
private and outside the checkout when replacing or removing it.

```sh
rer export --output exports/installation.rer
rer import --input exports/installation.rer --yes
```

Import validates first and requires an empty local destination; it does not
replace a populated installation. Install the checkout in that destination,
copy the private archive, import, then run `rer setup --owner-email you@example.com`
and `rer dev`. Confirm the owner and map the archived administrator as described
in the data procedure. Passwords and sessions do not travel. Restored integration
credentials and pending work do not become active delivery authority. An empty
installation cannot know an erasure fence it has never received; provide the
later archive as the documented import journal when required.

The separate [private paired checkpoint procedure](https://github.com/just-every/run-oncall/blob/main/docs/checkpoints.md)
uses `rer run --script scripts/checkpoint.mjs --origin http://127.0.0.1:3000 --session-file SESSION_FILE export CHECKPOINT_FILE`
and the corresponding `restore CHECKPOINT_FILE --replace`. Its
current-administrator session file must be private, mode 0600. Replacement is
explicit and destructive. Follow that procedure's validation, rotated-cookie
and uncertain-outcome handling. Checkpoints are not installation archives.
Hosted D1 and local records are separate: these commands do not promise a
hosted backup/restore or an independent standby. No backup recovery time or
capacity bar has been measured here.

## Support and escalation

The repository defines no product support channel, escalation contact, support
hours or response commitment. That row remains unproven. If coordination is
unavailable, use the existing pager and your team's existing incident
communication process, as described in the operating instructions. This report
does not replace that process or provide an external alarm.
