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
