# Private recovery checkpoints

Run the local app with `rer dev`. Checkpoints contain authored coordination,
schedules, escalation history and (by default) reviewed handoffs. They exclude
passwords, sessions and intake credentials. Keep checkpoint files private.
This is a paired product checkpoint, separate from `rer export`/`rer import`,
which moves an installation and its supported import journal.

Sign in through the local app as a current administrator. Using your browser's
cookie inspector, save the local session cookie in a private file outside the
repository. Create the file with mode 0600 before inserting the cookie using a
local editor; never put its value in a command, environment variable, chat or log.
For held password installations the file contains `oncall_session=…`. For Base
sign-in it contains `operator_session_local_PORT=…`, using the actual local port
(`operator_session_local_80` is used for the default HTTP port). A Base-backed restore
adds `oncall_session=…` and retains the Base cookie; keep both. The file accepts
these cookies separated by `; `, without attributes such as Path or HttpOnly.

With the real origin and private paths substituted:

```sh
node scripts/checkpoint.mjs --origin http://127.0.0.1:3000 --session-file /private/path/session export /private/path/checkpoint.json
node scripts/checkpoint.mjs --origin http://127.0.0.1:3000 --session-file /private/path/session restore /private/path/checkpoint.json --replace
```

Export requires a new destination and writes mode 0600. It reads all datasets
and their revisions in one server storage snapshot. `export NEW_FILE --version 1`
exports the supported two-dataset legacy envelope; version 2 also contains
reviewed handoffs. Export never includes credentials.

Restore is destructive replacement, explicitly requested by `--replace`. The
server validates the complete envelope, references and capacity before atomic
publication. Pending imported jobs pause, existing receipts and callbacks stay
historical, and approved handoffs receive recovery holds. Version 1 retains
existing handoff records and holds their active approvals. Paging remains OFF;
no send, resume, provider, account or delivery action occurs.

The server requires current administrator authority at publication. A populated
target preserves the current administrator identity and held password. An empty
target can explicitly map its current identity/password to an active archive
administrator with `restore FILE --replace --admin-mapping MEMBER_ID`. Mapping
never bypasses server validation. Prior Oncall sessions are revoked on success;
the CLI saves the winning replacement cookie into the same private session file.
Invalid input, permission refusal, capacity failure, SQL failure and losing
concurrent writes do not replace its cookie or the committed datasets.

The CLI accepts only HTTP loopback origins without credentials, paths, queries
or fragments and never follows redirects. Session files must be regular,
owned by the invoking user, mode 0600, without symlinks or hard links. It locks
the session path for the operation; overlapping invocations using the same path
fail before a request. It prepares and syncs a new private session file before
restore, then syncs and atomically renames the rotated cookie on success.

If the process or connection ends during restore, the outcome can be uncertain:
inspect the installation or sign in again before another replacement. If the
server succeeded but local persistence failed, inspect the mode-0600 hidden
`.SESSION_FILENAME.UUID.pending` file beside the session file; a complete
rotated cookie there may recover access. Do not print it. If it is incomplete,
sign in again and replace the session file privately. An interrupted process can
leave `SESSION_FILE.lock`; remove only that empty directory after confirming no
CLI process is using this session file. A server refusal leaves the original
session file unchanged. The CLI reports status only, never cookies or passwords.
