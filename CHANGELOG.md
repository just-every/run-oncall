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
