# Export and restore

Your schedules, incidents, team and history live in your own installation. You can take all of it with you, or put it back, at any time.

## Export everything

```sh
rer export --output exports/installation.rer
```

The archive holds everything Oncall keeps: services, schedules, incidents with their timelines and reviews, alerts, routing rules, the team and the move-in journal. Sign-in sessions, passwords and private settings are never in it. Stop `dev` first. Keep the archive private: imported pager files you moved in from may contain people's names and email addresses.

## Restore into a new installation

Install Oncall in the new checkout first with `rer install`, then copy your private archive into its `exports` directory:

```sh
rer import --input exports/installation.rer --yes
```

Import checks the archive first and only restores into an empty installation, so it can never overwrite data by accident. Then run `rer setup --owner-email you@example.com` and `rer dev`. Open the private owner entry printed by dev and confirm the new installation owner. **Open your restored workspace** then asks you to map an archived administrator; it opens the chooser automatically. If you use email sign-in instead, real mail delivery must be configured first. Choose your active archived administrator and confirm the identity to link it to your installation owner. Passwords do not travel with the archive.

The chooser shows archived names and IDs so you can distinguish duplicate names. Archived member records do not contain email addresses; the chooser says **email not recorded**. The list is available only to the signed-in installation owner while the installation has no password accounts and no existing owner-to-member mapping. Mapping checks these conditions and the selected administrator's current active status again when you confirm. An installation with existing password accounts must keep using its existing workspace password access.

## The archive screen

Admins also have **Archive** in the app. **Portable workspace archive** downloads the workspace's coordination records as a file. **Validate and replace from archive** puts a downloaded file back: Oncall checks it completely first, you type `REPLACE` to confirm, and a file that fails the check leaves your current workspace exactly as it was.

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
