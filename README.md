# Run it locally

Public source: [just-every/run-oncall](https://github.com/just-every/run-oncall), release 0.1.0.

Use Node 22.20.0 and pnpm 10.12.4. From this checkout:

```sh
node scripts/rer.mjs install
node scripts/rer.mjs setup
node scripts/rer.mjs dev
```

Setup asks for your owner mailbox. For unattended setup use a private answers file (`--answers PATH --non-interactive`). `dev` prints a private `RER_OPEN` link that opens as the owner; `--as signed-out` or `--login` uses ordinary sign-in. Email links appear in the key-gated local outbox; no external email is sent. `/setup` confirms the first owner. Stop with Ctrl-C or `node scripts/rer.mjs dev --stop`; stop preview with `node scripts/rer.mjs preview --stop` before building or verifying.

```sh
node scripts/rer.mjs build
node scripts/rer.mjs preview
node scripts/rer.mjs verify
node scripts/rer.mjs export --output exports/installation.rer
node scripts/rer.mjs import --input exports/installation.rer --yes
node scripts/rer.mjs reset --yes
node scripts/rer.mjs deploy --dry-run
node scripts/rer.mjs describe
node scripts/rer.mjs check
```

Export includes supported durable records and the import journal, excluding sessions and dev credentials. Import requires an empty destination and explicit confirmation. Configure a new owner, sign in, then explicitly map an archived administrator identity from the signed-out workspace; credentials never travel. Reset deletes local data and owner settings. A deploy dry run builds and validates locally without provider requests. Actual deployment refuses until a hosted release with an independent standby is approved. Paging remains OFF until a real-phone drill passes as well. Use `describe` for flags and `doctor` for missing local prerequisites.

Oncall keeps rotas, schedules, overrides, incident coordination and recorded alert intake beside your existing pager. The existing pager stays authoritative. No SMS, voice, push or paging email is sent. The delivery adapter refuses plainly.

Schedules use named IANA zones, calendar-day turns, explicit repeated-time rules and half-open UTC overrides. Inspect who is on call now and at the next hand-off, download a private seven-day ICS feed, and store primary/backup escalation delays as data. Coverage gaps remain visible.

The Move-in kit reviews supplied Opsgenie exports first, then PagerDuty. Preview writes nothing; confirmed imports stay paused and grant no access or delivery authority. A durable Base import-kit journal supports resume and guarded undo. Read [MOVE-IN.md](MOVE-IN.md) for documented export shapes and compatibility limits.

Held data upgrades in place through unchanged migrations 0001–0006 and additive migrations. Coordination now stores individual members, services, policies, events, alerts, incidents and audit entries in relational tables. Old password accounts remain usable; Base owner identity never silently takes over an existing workspace. For a held installation, continue using its password accounts until the owner explicitly links identity during a future identity migration. Do not reset to upgrade.

Read [CONTRACT.md](CONTRACT.md), [ACCEPTANCE.md](ACCEPTANCE.md), [OPERATIONS.md](OPERATIONS.md) and [RELEASE.md](RELEASE.md). Base origin: 479094f0b26a639a1868fa521004581ec8dbcb63. scripts/base-cli and scripts/base-onboarding come from Base's `scripts/export-cli.mjs`; base-copies.json records every runtime copy under src/ and is refreshed with Base's edition-authoring `refresh-base`. This repository is runnable source, without a composition step.
