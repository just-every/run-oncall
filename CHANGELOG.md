# 0.3.1 · 2026-10-18

Description only; no product change. The catalogue description is now "Coordinate incident response and on-call schedules alongside your existing pager.", the same sentence as main. The application, contract, migrations and configuration are identical to 0.3.0, so upgrading from 0.3.0 needs no migration, configuration or data step.

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
