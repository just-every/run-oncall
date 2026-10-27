# 0.5.1 · 2026-10-27

Bulk triage keeps its selection current after a save. This is the first published release of the 0.5 line: 0.5.0 was tagged but never released, so everything listed under 0.5.0 in CHANGELOG.md ships for the first time in 0.5.1. Paging stays OFF.

Product screenshot: [`.github/assets/release/oncall-0.5.0-incident-1440.png`](.github/assets/release/oncall-0.5.0-incident-1440.png).

**Fixed**

- Bulk triage no longer refuses a selection made just after a saved change such as a bulk snooze. Selection and bulk actions now stay disabled until the incident list has refreshed, so a new selection carries current revisions. An edit that genuinely conflicts with a newer change is still refused.

**Checked for this release**

The release requires the same checks as 0.5.0, run again on this release's exact source: a complete publication scan, source and Base checks, typecheck and application build; populated 0.4.2 upgrades through the native and Platform migration runners; a retained 0.4.2 Platform-ledger archive restored into an empty installation; Managed source materialization and catalogue admission; the README install and backup/restore journey; and the core owner/member loop, including a bulk snooze followed at once by a bulk merge, locally and on a hosted installation using a real emailed sign-in, at 1440 and 390 wide. Exact-SHA branch, full-tier main and tag Verify runs and Run site must pass before publication. Paging requests are refused.

**Not in this release and known issues**

The **Not in this release** and **Known issues** lists under 0.5.0 still apply unchanged.

**Back up first**

- Local: `rer export --output exports/before-0.5.1.rer`. Restore only into an empty destination with `rer import --input exports/before-0.5.1.rer --yes`.
- Hosted: `npx wrangler d1 export DATABASE --remote --output exports/DATABASE.sql` with the deploying `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`, where `DATABASE` is the D1 name in `.rer/deploy/ENVIRONMENT.json`. Keep the file private.

**Update**

- Local: stop `rer dev` (Ctrl-C), `git pull --ff-only`, then `rer dev`. Hosted: from the checkout that deployed, `git pull --ff-only` then `rer deploy --environment ENVIRONMENT` with the same credentials. From a checkout of the `v0.5.0` tag, run `git fetch --tags && git checkout v0.5.1` instead of `git pull --ff-only`.
- From 0.4.2 the update applies the 15 additive migrations listed under 0.5.0 (0129-0137, 0140-0145); from the `v0.5.0` tag it applies none. Keep all 49 applied migrations unchanged and do not reset a populated installation. The rer pin stays `@runeditrun/rer` 0.2.71. Paging stays OFF.

# 0.5.0 · 2026-10-27

Incident coordination beside your existing pager, with a managed build for Assisted and Managed installations, inbound integration email, permanent audit and more schedule and response coordination. Paging stays OFF.

Product screenshot: [`.github/assets/release/oncall-0.5.0-incident-1440.png`](.github/assets/release/oncall-0.5.0-incident-1440.png).

**What you get**

- Managed installations carry Base's dispatch-only managed workflow and the project artifact producer. The workflow calls the pinned trusted build and emits `rer-worker-artifact.json`.
- Added opt-in Cloudflare Email Routing intake, private revocable per-service addresses, four versioned email modes, ordered RE2 trigger/recovery rules, saved-mail draft replay, owner activity and quarantine.
- Email generations retain one paging-OFF obligation, explicit source recovery and atomic secret-free permanent audit. Portable restore keeps email history inactive without keys; erasure fences older source copies. Additive migration 0131 preserves released data.
- Workspace sections and incidents have stable addresses. Live updates preserve in-progress forms, and failed saves keep the relevant form and its refusal visible.
- Permanent operational audit commits accepted state and its audit entry together, retains pseudonymous facts through subject erasure, and provides an administrator export without secrets.
- Administrator-scoped API keys and minimal signed outbound response events use declared services and permissions, revocation fences and retained delivery receipts. Machine actions stay attributed to the service account. The policy now also permits explicit service-scoped clients at `/api/v1` and administrator-approved minimal signed response events. A machine acknowledgment names an active responder and remains a service-account act, never a human acknowledgment; human-review and protected archive/export doors stay human-only.
- Response policies distinguish alert-only work from incidents and retain explicit source recovery. Notices and reminders are recorded non-automatic obligations while paging is OFF.
- Schedule coordination is partial: web swap requests name a substitute and bounded interval, require that person's decision and the configured administrator approval, and keep revision-checked overrides. Calendar subscription records and reminder due times exist; automatic notification and reminder delivery do not.
- Internal business status and explicit member audiences are partial: status and subscription records exist; delivery, team/channel subscribers and private-team visibility remain gaps. Public-team records and explicit service ownership ship; team privacy and manager scope remain incomplete.
- A populated v0.4.2 archive can restore into the new schema without rewriting its archived intake receipts; legacy native-prefix custody is derived when the current key is read.
- The rer pin stays `@runeditrun/rer` 0.2.71. This release adds 15 migrations (0129-0137, 0140-0145), preserving the prior 34.

**Checked for this release**

The release requires a complete publication scan, source and Base checks, typecheck and application build; populated 0.4.2 upgrades through the native and Platform migration runners; a retained 0.4.2 Platform-ledger archive restored into an empty installation; Managed source materialization and catalogue admission; the README install and backup/restore journey; and the core owner/member loop locally and on a hosted installation using a real emailed sign-in, at 1440 and 390 wide. Exact-SHA branch, full-tier main and tag Verify runs and Run site must pass before publication. Paging requests are refused.

**Not in this release**

- Paging. Oncall does not call, text, push or escalate. A page request is refused with "Paging is OFF", and the escalation policy is stored as data only. Keep your existing pager. An alert is owned by the coordination owner named in **Routing & replay**, not looked up from the schedule, so update the routing rule when the rota changes hands. Release 2 paging and its independent standby are not built.
- Automatic schedule notices and reminder delivery; mobile swaps; private teams and team-manager privacy rules; stakeholder status pages; Slack/Microsoft Teams; phone bridges; native mobile apps; AWS CloudWatch/SNS; live incumbent API pull and reconciliation.

**Known issues**

- The provider receivers have been checked with local and PagerDuty-shaped requests only. A provider's own test/send button and a real firing and recovering rule are not part of this release's core-loop checks.
- The existing UI review records small text on incident, schedule and review screens, schedule controls with incomplete tooltips, and small phone-width inputs. Simultaneous background-read notices can overlap, and the Grafana signing read notice can persist until another workspace revision.
- Accessibility conformance is not established. Keyboard and phone-width journeys are maintained, but no screen-reader journeys have been run and no conformance report has been written.
- The homepage's "alternative to PagerDuty and Opsgenie" is ahead of the code on paging (see above).
- The current rer pin is below the later catalogue recipe's 0.2.79 minimum; the existing Base refresh hold keeps it at 0.2.71. The accepted brand mark also remains unchanged.

**Back up first**

- Local: `rer export --output exports/before-0.5.0.rer`. Restore only into an empty destination with `rer import --input exports/before-0.5.0.rer --yes`.
- Hosted: `npx wrangler d1 export DATABASE --remote --output exports/DATABASE.sql` with the deploying `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`, where `DATABASE` is the D1 name in `.rer/deploy/ENVIRONMENT.json`. Keep the file private.

**Update**

- Local: stop `rer dev` (Ctrl-C), `git pull --ff-only`, then `rer dev`. Hosted: from the checkout that deployed, `git pull --ff-only` then `rer deploy --environment ENVIRONMENT` with the same credentials. The update applies 15 additive migrations (0129-0137, 0140-0145); keep all 49 applied migrations unchanged and do not reset a populated installation. Restore only into an empty destination. Paging stays OFF.

# 0.4.2 · 2026-10-20

The move-in kit now runs Base's shared import door exactly as Base ships it. Updates `@runeditrun/rer` and every vendored Base module to 0.2.71. Paging stays OFF.

Product screenshot: [`.github/assets/release/oncall-0.4.0-incident-1440.png`](.github/assets/release/oncall-0.4.0-incident-1440.png). The screens have not changed since 0.4.0.

**What you get**

- Move-in kit: the screen imports through Base's import door byte for byte, with no Oncall changes. Oncall's earlier `door/planning.ts` adaptation is now Base's own behavior: after **Undo this import** the same file can be imported again, and after an erasure has withdrawn a live import's file the next preview starts a new baseline. Oncall still owns its parsers, mapping, review list and named refusals; the look, copy and steps are unchanged.
- The import door can keep an archive of a tool's final export (migration 0128). Erasing a person withdraws the archive's bytes together with the uploads, chunks and plan snapshots that hold them. Headers, plans, approvals and history captions stay.
- Backup and restore use Base's 0.2.71 portability. Restore judges a migration's data statements by the table each one writes, and splits trigger bodies where SQLite itself ends them. A backup made by 0.4.1 restores into this release with every product row kept, both on a local install and on an installation whose database carries Platform's migration ledger.
- Base modules: included operators keep their last sign-in time when sessions are scrubbed. The scheduled-policy documentation comes with the operator sign-in module.
- Pin `@runeditrun/rer` 0.2.71.

**Checked for this release** (20 October 2026, on the released code): locally at 1440 and 390 wide, and on a hosted Cloudflare deployment signed in by a real emailed link. We created members, a service with a runbook and a Europe/London primary/backup rotation with a cover interval, and saved the escalation policy for that rotation. We routed the service to the person on call and sent a PagerDuty-shaped alert through a service-bound compatible source; the alert arrived owned by that person. We declared an incident from it, and the on-call person signed in with their own password and acknowledged, recovered and resolved it. The sender's recovery closed the alert, and the schedule showed who takes over at the next hand-over. A 0.4.1 installation that held this data upgraded to 0.4.2 with every row kept. An archive made by 0.4.1 on a database carrying Platform's migration ledger restored into 0.4.2 with every row matching.

**Not in this release**

- Paging. Oncall does not call, text, push or escalate. A page request is refused with "Paging is OFF", and the escalation policy is stored as data only. Keep your existing pager. An alert is owned by the coordination owner named in **Routing & replay**, not looked up from the schedule, so update the routing rule when the rota changes hands. Release 2 paging and its independent standby are not built.
- Swap requests, private teams, stakeholder status pages, Slack/Microsoft Teams, phone bridges, native mobile apps, AWS CloudWatch/SNS and inbound email intake (as in 0.4.0).

**Known issues**

- The provider receivers have been checked with local and PagerDuty-shaped requests only. A provider's own test/send button and a real firing and recovering rule are not yet part of the release checks.
- Accessibility conformance is not established. Keyboard and phone-width journeys are maintained, but no screen-reader journeys have been run and no conformance report has been written.
- The homepage's "alternative to PagerDuty and Opsgenie" is ahead of the code on paging (see above).

**Back up first**

- Local: `rer export --output exports/before-0.4.2.rer`. Restore only into an empty destination with `rer import --input exports/before-0.4.2.rer --yes`.
- Hosted: `npx wrangler d1 export DATABASE --remote --output exports/DATABASE.sql` with the deploying `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`, where `DATABASE` is the D1 name in `.rer/deploy/ENVIRONMENT.json`. Keep the file private.

**Update**

- Local: stop `rer dev` (Ctrl-C), `git pull --ff-only`, then `rer dev`. Hosted: from the checkout that deployed, `git pull --ff-only` then `rer deploy --environment ENVIRONMENT` with the same credentials. Do not reset to upgrade.

**Migrations** (additive; keep all 34 applied migrations unchanged)

- `0128_import_door_archive.sql`: the import door's archives of a tool's final export and their chunks. The tables start empty and no existing row changes.

# 0.4.1 · 2026-10-19

A backup made by the previous version now restores. Updates rer and the vendored Base copies to 0.2.68, including retained-archive placement on Platform-installed databases and the correction that treats trigger creation as schema-only. Every applied migration remains unchanged. Main also carries migration 0127, which protects signed-source keys with installation-local custody, plus the completed recovery and health flows. The move-in screen keeps its field-specific credential refusal and discards the refused upload with the upgraded shared import door. Restore only into a fresh empty installation. Paging stays OFF.

Product screenshot: [`.github/assets/release/oncall-0.4.0-incident-1440.png`](.github/assets/release/oncall-0.4.0-incident-1440.png).

# 0.4.0 · 2026-10-19

Incident coordination beside your existing pager, now with alert intake from the tools you already run, response roles, urgency, change context and reviews. Paging stays OFF. Screenshot: [`.github/assets/release/oncall-0.4.0-incident-1440.png`](.github/assets/release/oncall-0.4.0-incident-1440.png).

**What you get**

- Incidents: search, filter, sort and saved views; select a page or every matching incident and change them together. Each incident names its assignee, commander, scribe and communications lead, with priority, urgency and severity changes kept with a reason.
- Connect an existing alert sender: PagerDuty Events v1/v2, Opsgenie Alert API and Splunk On-Call REST requests are accepted under **Alerts & events → Compatible alert intake**, each with its own service-bound private key that you can rotate or revoke. Repeats and recoveries keep one alert per lifecycle, and every request gets a durable receipt.
- Monitoring receivers for Prometheus Alertmanager, Grafana unified alerting and Datadog webhooks, bound to one service or to a routed key.
- Routed integration keys: one sender credential for several services, with ordered routing rules that you publish and can compare against past events in **Routing & replay** before they apply. Each admitted event keeps the rule and explanation that routed it.
- Urgency and support hours per service: constant, by severity, or by weekly support windows in a named time zone with your own holiday dates. Each event keeps its urgency decision; responders can change an alert's urgency with a reason.
- Change context: deployments, releases and merged pull requests from GitHub, GitLab, PagerDuty Change Events or a signed native sender appear as **Recent changes** on services, alerts and incidents, including direct dependencies you set on each service. Changes never create alerts or incidents.
- Reviews: response reports by UTC declaration period and service (acknowledgement, resolution and recovery timings with unknown and open cases kept visible, plus CSV), generated review material, and a human-accepted review with follow-up evidence.
- Move-in kit: the screen imports through Base's import door, the same upload → plan → reviewed fingerprint → apply → reconcile → undo path Business uses, under one allow-list (Opsgenie, PagerDuty). Look, copy and steps are unchanged; the old `/api/move-in/preview` and `/apply` routes are removed. Imports made before keep their journal, resume and undo. The journal lists your imports (“approved by”) beside Business imports (“approved via Business by”).
- Move-in kit: a file previewed while the source already holds an import is reviewed as that import's catch-up, and an unconfirmed preview gives way to the next one. A failed Business import offers no resume and the old journal route refuses to resume a door import.
- Erasing a person also reaches someone held only in an uploaded file or an unapproved plan.
- Adapted Base copy: `src/modules/import-kit/src/door/planning.ts` plans a file afresh after its earlier import was undone, so the same file can be imported again, and after an erasure withdrew a live import's file the next preview starts a new baseline instead of failing. Migration 0126 is additive.
- Start in one line: `npx -y @runeditrun/rer dev just-every/run-oncall`. The run site serves this release's contract at `/contract`.
- Hosted sign-in mail can go through RER's mail relay when Oncall runs on RER Managed; your own SendGrid setup is unchanged.
- Pin `@runeditrun/rer` 0.2.63.

**Checked for this release** (19 October 2026, on the released code): locally at 1440 and 390 wide, and on a hosted Cloudflare deployment signed in by a real emailed link, we created members and a service with a runbook, built a Europe/London primary/backup rotation that hands over Mondays at 09:00 on both sides of the 25 October clock change, added a cover interval, read now/next and the private calendar feed, declared an incident and took it through runbook, notes, acknowledgement, recovery evidence and resolution, and brought an Opsgenie schedule export through preview, paused import and adoption. A 0.3.0 installation with that data upgraded to this release with every record kept. A hosted installation was backed up, removed, deployed again and restored with every record kept, and the owner signed in by email afterwards.

**Not in this release**

- Paging. Oncall does not call, text, push or escalate; keep your existing pager. The homepage's "alternative to PagerDuty and Opsgenie" is ahead of the code on this point: Oncall replaces their schedules and incident coordination, not their paging. Release 2 paging and its independent standby are not built.
- Swap requests. The homepage's **Swaps** card is an administrator-entered cover interval (override) today; members requesting and accepting swaps, shift reminders and subscribable calendar URLs are not built. The calendar feed is a download that needs your signed-in session.
- Private teams, stakeholder status pages, Slack/Microsoft Teams, phone bridges, native mobile apps, AWS CloudWatch/SNS and inbound email intake.

**Known issues**

- The provider receivers have been checked with local requests only; a provider's own test/send button and a real firing and recovering rule are not yet part of the release checks.
- Accessibility conformance is not established: keyboard and phone-width journeys are maintained, but no screen-reader journeys or conformance report have been completed.

**Back up first**

- Local: `rer export --output exports/before-0.4.0.rer`. Restore only into an empty destination with `rer import --input exports/before-0.4.0.rer --yes`.
- Hosted: `rer export` does not reach the hosted database. Export it with Wrangler, with `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` set: `npx wrangler d1 export DATABASE --remote --output exports/DATABASE.sql`, where `DATABASE` is the D1 name in `.rer/deploy/ENVIRONMENT.json`. Keep the file private; restore it only into a fresh, empty installation and check the owner, schedules and incidents before relying on it.

**Update**

- Local: stop `rer dev` (Ctrl-C), `git pull --ff-only`, then `rer dev`. Hosted: from the checkout that deployed, `git pull --ff-only` then `rer deploy --environment ENVIRONMENT` with the same credentials. Do not reset to upgrade.

**Migrations** (additive; keep every applied migration unchanged)

- `0117_owner_claim.sql`: a ledger of the one-time hosted owner claim.
- `0118_incident_triage.sql`: optional coordination records for incident triage; existing incidents and their order are untouched.
- `0119_change_events.sql`: change events and change sources, with their encrypted verification keys kept local.
- `0120_compatible_intake.sql`: compatible intake integrations and their receipts, with key digests kept local.
- `0121_business_import_door.sql`: the optional import door's settings; installing it never enables it.
- `0122_import_custody_replace.sql`: import custody revisions advance when rows are replaced.
- `0123_import_erasure_progress.sql`: resumable erasure progress.
- `0124_import_door_apply_failures.sql`: a failed import door apply ends failed and its file can be planned again.
- `0125_import_door_scopes.sql`: each import door namespace belongs to one destination.
- `0126_move_in_previews.sql`: the move-in screen's unconfirmed previews (plan ids only, no source content).

# 0.3.0 · 2026-10-16

Release 1 hosted incident coordination beside your existing pager. Paging stays OFF. Screenshot: [`.github/assets/release/oncall-0.3.0-incident-1440.png`](.github/assets/release/oncall-0.3.0-incident-1440.png).

- Host coordination for your team with `rer deploy`, beside the existing pager, with paging OFF and no standby prerequisite. Deploy claims the owner automatically and retires the setup token. Hosted owner sign-in uses emailed links through a configured remote mail provider, and `rer signin` mints a one-time owner link. Admin-created members sign in at `/signin/local` with their workspace name and password, hosted and local. First-admin password bootstrap stays loopback-only. Remove a deployment with the same Cloudflare credentials using `rer deploy --remove --yes` and check the empty readback. Release 2 paging and independent standby are not built.
- Install and run → Host for your team gives the Cloudflare and SendGrid menu paths, token permissions, sender verification and an owner-only `0600` credentials file. Archive explains how to move a local archive to a fresh hosted environment.
- Sign-in mail is never captured. The local development outbox, its sign-in link and its stored messages are removed; migration 0113 drops the old table. Local owner entry stays the private `RER_OPEN` link from `rer dev`. The sign-in form fills in `login_hint`.
- Move-in kit: download `oncall-export.mjs` for Opsgenie or PagerDuty (Node 22, a read-only key, GET requests only). The provider selector and the adoption and restored-administrator choices are labelled. The selected import row stays selected while adoption opens. After a schedule is made live, **Undo this import** says the import can no longer be undone and the paused source stays as evidence.
- Move-in kit: after **Undo this import** finishes, the same file can be previewed and imported again as a new journal entry; a confirmation that races an undo says what to do next. The journal lists each import's provider, schedules, file and export date, and an Opsgenie HTTP 422 from the exporter explains a malformed key.
- Alerts: alert cards show severity, and an incident declared from an alert keeps it. An alert already linked to an incident links to it instead of offering a second declaration, and the API refuses a duplicate with 409. The monitoring ingress example generates a fresh event ID and explains HTTP 409. Monitoring ingress explains private key entry step by step and offers a no-terminal form. The unsent pager, chat and status handoff is plain text.
- The held workspace cookie is now `oncall_session_<port>`, so other apps or Oncall installs on the same loopback host never sign a person in or out. People signed in by password on 0.2.0 sign in once more after updating. Session files for the checkpoint and handoff scripts name the cookie `oncall_session_<port>=…`.
- Test credentials are marked explicitly synthetic so hosted source admission accepts the fixtures.
- Migrations 0113–0116 are additive: retire local mail storage, import preparation steps, import stream sources and one-time owner sign-in links. Keep every applied migration unchanged.
- Pin `@runeditrun/rer` 0.2.27.

# 0.2.0 · 2026-10-15

- Start locally with `rer dev` and confirm the owner on Finish setup; `rer demo` offers a throwaway local trial.
- Make imported schedules live in Schedules with an explicit administrator mapping. An immediate (0-minute) Opsgenie first escalation step maps to 1 minute with the difference stated.
- Sign in by owner email, retire stale installation cookies on explicit sign-in, and explicitly map an archived administrator after restoring an installation.
- See now/next and the named time zone at the top of Schedules.
- Get the verification-browser prerequisite and install command from `rer doctor`.
- Upgrade from 0.1.0 by stopping its old runner before pulling, installing `rer`, then running `git pull --ff-only` and `rer dev`. Data, owner and password accounts are kept; no new migrations are added. Do not reset to upgrade.
- Show “1 active incident” in the workspace header and pluralize other counts correctly.
- Hosted Oncall remains on hold. Paging is OFF; keep the existing pager authoritative.

# 0.1.0

- Move-in: erasing a person now also tombstones and scrubs any retained record whose own source names their exact address anywhere (a schedule description, a contact-method address, notes or any other text), so no value of theirs stays in the import journal while a record naming only a longer address that contains theirs is kept and the rest of that import still undoes.
- Move-in: erasing a person named in a schedule only through an override (PagerDuty or Opsgenie), a layer member or an incumbent comparison now tombstones and scrubs that schedule's retained plan entry too, so no value of theirs stays in the import journal and the rest of that import still undoes instead of answering NATIVE_EDIT_CONFLICT.
- Move-in: erasing a person matches them by exact email or member id, never by substring, so a person whose address contains theirs keeps their slots, coverage and undo. A PagerDuty layer still active when previewed is refused by name instead of becoming history; a refused schedule keeps every reason, with an override's refusal beside it; an override list without a schedule id belongs to the bundle's only schedule or is refused by name with every schedule it could change; a disabled Opsgenie schedule and an override for a user not in the export are refused by name; refusals for case-only duplicate emails, a second import of the same people and an undo over a native edit name those people in a sentence and keep the code in its own `code` field.
