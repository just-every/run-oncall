<p align="center">
  <a href="https://run-oncall.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.webp">
      <source media="(prefers-color-scheme: light)" srcset=".github/assets/banner-light.webp">
      <img src=".github/assets/banner-light.webp" width="100%" alt="Oncall: Everyone knows who's on call. 100% free, open source alternative to PagerDuty and Opsgenie.">
    </picture>
  </a>
</p>

<p align="center"><a href="https://run-oncall.com">run-oncall.com</a> · <a href="https://justevery.com">Part of Just Every</a> · <a href="LICENSE">MIT licensed</a></p>

<p align="center">
  <a href="https://justevery.com/#vol-oncall"><img src=".github/assets/media/preview.gif" width="800" alt="Oncall: an override is typed and saved, and On call now switches from Priya Shah to Ana Ruiz"></a>
</p>
<p align="center"><a href="https://justevery.com/#vol-oncall"><b>Watch the full demo</b></a> · 54 seconds</p>

<p align="center">
  <img src=".github/assets/media/flow.webp" width="800" alt="On call now and next before the override, Priya Shah on primary, and after saving it, Ana Ruiz">
</p>

<p align="center">
  <img src=".github/assets/media/screen-1.webp" width="800" alt="Oncall's schedule editor for Checkout on-call: timezone, rotation anchors, primary and backup responders, and previewed coverage windows"><br>
  <sub>Rotations in your own time zone, with coverage previewed before you save.</sub>
</p>

<p align="center">
  <img src=".github/assets/media/screen-2.webp" width="800" alt="An acknowledged incident, Checkout latency above 2 s: the append-only evidence and decisions timeline, runbook checklist and follow-up owners"><br>
  <sub>A calm place to coordinate an incident, with an append-only record.</sub>
</p>

# Run it locally

Public source: [just-every/run-oncall](https://github.com/just-every/run-oncall), release 0.1.0.

Install the `rer` command once with `npx -y @runeditrun/rer cli install`. The runner selects Node 22.20.0 and pnpm 10.12.4 for this checkout; pnpm needs no separate installation. From this checkout:

```sh
git clone https://github.com/just-every/run-oncall.git oncall
cd oncall
rer install
rer setup
rer dev
```

Setup asks for your owner mailbox. For unattended setup use a private answers file (`--answers PATH --non-interactive`). `dev` prints a private `RER_OPEN` link that opens as the owner; `--as signed-out` or `--login` uses ordinary sign-in. Email links appear in the key-gated local outbox; no external email is sent. `/setup` confirms the first owner. Stop with Ctrl-C or `rer dev --stop`; stop preview with `rer preview --stop` before building or verifying.

```sh
rer build
rer preview
rer verify
rer export --output exports/installation.rer
rer import --input exports/installation.rer --yes
rer reset --yes
rer deploy --dry-run
rer describe
rer check
```

Export includes supported durable records and the import journal, excluding sessions and dev credentials. Import requires an empty destination and explicit confirmation. Configure a new owner, sign in, then explicitly map an archived administrator identity from the signed-out workspace; credentials never travel. Reset deletes local data and owner settings. A deploy dry run builds and validates locally without provider requests. Actual deployment refuses until a hosted release with an independent standby is approved. Paging remains OFF until a real-phone drill passes as well. Use `describe` for flags and `doctor` for missing local prerequisites.

Oncall keeps rotas, schedules, overrides, incident coordination and recorded alert intake beside your existing pager. The existing pager stays authoritative. No SMS, voice, push or paging email is sent. The delivery adapter refuses plainly.

Schedules use named IANA zones, calendar-day turns, explicit repeated-time rules and half-open UTC overrides. Inspect who is on call now and at the next hand-off, download a private seven-day ICS feed, and store primary/backup escalation delays as data. Coverage gaps remain visible.

The Move-in kit reviews supplied Opsgenie exports first, then PagerDuty. Preview writes nothing; confirmed imports stay paused and grant no access or delivery authority. A durable Base import-kit journal supports resume and guarded undo. Read [MOVE-IN.md](MOVE-IN.md) for documented export shapes and compatibility limits.

Held data upgrades in place through unchanged migrations 0001–0006 and additive migrations. Coordination now stores individual members, services, policies, events, alerts, incidents and audit entries in relational tables. Old password accounts remain usable; Base owner identity never silently takes over an existing workspace. For a held installation, continue using its password accounts until the owner explicitly links identity during a future identity migration. Do not reset to upgrade.

Read [CONTRACT.md](CONTRACT.md), [ACCEPTANCE.md](ACCEPTANCE.md), [OPERATIONS.md](OPERATIONS.md) and [RELEASE.md](RELEASE.md). The command is pinned as `@runeditrun/rer` 0.2.2. `base-copies.json` records each Base runtime/module copy and its own revision; `src/base` comes from Base 8981bc2c4d9e61feca5787c83b4ed44056659dd9. Source locks are generated with Base's edition-authoring command from this checkout. This repository is runnable source, without a composition step.

Update this checkout without resetting its data:

```sh
git pull --ff-only
rer deploy
```

If `rer deploy` reports that the pinned package or dependencies need installing, run `rer install` and then `rer deploy` again. You do not need to install pnpm separately. Oncall currently holds actual deployment before any provider request until the standby and release are approved; use `rer deploy --dry-run` to validate locally.
