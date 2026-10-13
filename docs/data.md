# Export and restore

Your schedules, incidents, team and history live in your own installation. You can take all of it with you, or put it back, at any time.

## Export everything

```sh
node scripts/rer.mjs export --output exports/installation.rer
```

The archive holds everything Oncall keeps: services, schedules, incidents with their timelines and reviews, alerts, routing rules, the team and the move-in journal. Sign-in sessions, passwords and private settings are never in it. Stop `dev` first. Keep the archive private: imported pager files you moved in from may contain people's names and email addresses.

## Restore into a new installation

```sh
node scripts/rer.mjs import --input exports/installation.rer --yes
```

Import checks the archive first and only restores into an empty installation, so it can never overwrite data by accident. Then run setup to choose the owner, sign in, and use **Map an archived administrator after restore** on the workspace password sign-in page to link your email to the administrator in the archive. Passwords do not travel with the archive.

## The archive screen

Admins also have **Archive** in the app. **Portable workspace archive** downloads the workspace's coordination records as a file. **Validate and replace from archive** puts a downloaded file back: Oncall checks it completely first, you type `REPLACE` to confirm, and a file that fails the check leaves your current workspace exactly as it was.

## Start over

```sh
node scripts/rer.mjs reset --yes
```

Reset deletes this installation's data, its owner and its private settings, and keeps the source code and your exports. Export first if you may want anything back.
