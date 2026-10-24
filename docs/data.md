# Export and restore

Your schedules, incidents, team and history live in your own installation. You can take all of it with you, or put it back, at any time.

## Export everything

```sh
rer export --output exports/installation.rer
```

The archive holds everything Oncall keeps: services, schedules, incidents with their timelines and reviews, alerts, routing rules, the team and the move-in journal. Sign-in sessions, passwords and private settings are never in it. Stop `dev` first. Keep the archive private: imported pager files you moved in from may contain people's names and email addresses.

Shift coordination is included: swap requests and decisions, approval settings, recorded change obligations, reminder preferences and subscription records. Raw calendar URLs are never stored or exported. Native, paired-checkpoint and installation recovery retain these records inactive and clear subscription hashes. Restored swaps cannot be accepted and restored feed records grant no access. Subject erasure removes their owned and indirect person references atomically. Alert-only coordination history, revisions and replay-safe bulk results stay in the existing alert/triage categories.

## Permanent operational audit

The permanent audit is a separate durable category in installation transfer. It contains safe operation metadata and permanent random labels, with no credentials, raw hashes, credential labels or payload content. Its identity associations can be erased without rewriting the append-only entries. Incident timelines and imported operational history remain separate and retain their own custody rules. Administrators can read the dedicated protected `GET /api/audit/export`; see [Permanent operational audit](audit.md) for authority and erasure limits.

## Restore into a new installation

Fetch Oncall into the new checkout first with `npx -y @runeditrun/rer install just-every/run-oncall`, then `cd run-oncall` and copy your private archive into its `exports` directory:

```sh
rer import --input exports/installation.rer --yes
```

Import checks the archive first and only restores into an empty installation, so it can never overwrite data by accident. Then run `rer setup --owner-email you@example.com` and `rer dev`. Open the private owner entry printed by dev and confirm the new installation owner. **Open your restored workspace** then asks you to map an archived administrator; it opens the chooser automatically. If you use email sign-in instead, real mail delivery must be configured first. Choose your active archived administrator and confirm the identity to link it to your installation owner. Passwords do not travel with the archive.

The chooser shows archived names and IDs so you can distinguish duplicate names. Archived member records do not contain email addresses; the chooser says **email not recorded**. The list is available only to the signed-in installation owner while the installation has no password accounts and no existing owner-to-member mapping. Mapping checks these conditions and the selected administrator's current active status again when you confirm. An installation with existing password accounts must keep using its existing workspace password access.

## The archive screen

Admins also have **Archive** in the app. **Portable workspace archive** downloads the workspace's coordination records as a file. **Validate and replace from archive** puts a downloaded file back: Oncall checks it completely first, you type `REPLACE` to confirm, and a file that fails the check leaves your current workspace exactly as it was.

### Transfer local coordination records to hosting

The app's JSON archive can move coordination records between installations. It excludes schedules, overrides, authentication secrets and sessions. The `.rer` installation archive is for local `rer import` only.

1. On the local app, open **Archive → Export original archive** and keep the downloaded JSON private.
2. Export any records you need from the current hosted workspace. An archive from another installation cannot replace a workspace that already has services, incidents, events or additional members: administrator mapping needs an empty target.
3. From your hosting checkout, use a new unused environment name: `rer deploy --environment move-in --env-file "$HOME/.config/oncall/production.env"`. [Install and run](install.md#host-for-your-team) explains how to prepare the owner and private credentials file. Choose another name if `move-in` exists already. Your existing hosted environment stays available.
4. Open the new address, sign in as its owner and finish setup. Before creating services or members, open **Archive**, choose the local JSON, explicitly map your sign-in to an archived administrator, type `REPLACE` and press **Replace workspace with this archive**.
5. After **Restored**, reset other members' passwords and recreate monitoring source keys. Recreate schedules under **Schedules**, or bring provider schedules through **Move-in kit**. Check **Incidents** and **Team** before using the new address.

Restoring this hosted workspace's own archive works without mapping when the current active administrator is in it. A refused replacement leaves existing records unchanged. Deployment itself never uploads local records.

## Subject erasure fences

Native archives, both recovery checkpoint versions and the private checkpoint CLI carry the durable portability erasure digests and epochs. Once an installation knows a subject erasure, it refuses an older source whole with an erasure-fence error. Nothing is replaced, no label returns and no session rotates. A checkpoint made after erasure can restore; replacement preserves the fence. Legacy sources without fence metadata are refused wherever a later fence is known. No erased name or address appears in the fence or its refusal.

Installation export/import carries the same fence records and the portability journal. When moving to an empty installation, supply the later archive with `rer import --input exports/older.rer --journal exports/current.rer --yes` to enforce a later erasure against the older source. An empty installation cannot know an erasure it has never received. Vendor move-in and saved vendor bundles carry vendor records, not native automation definitions.

## Start over

Stop both local servers before resetting:

```sh
rer dev --stop
rer preview --stop
rer reset --yes
```

Reset deletes this installation's data, its owner and its private settings, and keeps the source code and your exports. Export first if you may want anything back.

To restore in this same checkout, keep the exported file in `exports`, reset, then import it:

```sh
rer import --input exports/installation.rer --yes
rer setup --owner-email you@example.com
rer dev
```

Confirm the new owner and map an archived administrator as described above. An import that says `target_not_empty` has kept the existing installation; it has not replaced any records. Do not reset to upgrade Oncall.
