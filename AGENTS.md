# Run it locally

Install the `rer` command once:

```sh
curl -fsSL https://runeditrun.com/install.sh | sh
```

Or use `npm install -g @runeditrun/rer`. You need Git and Node 22 or later, on macOS, Linux or Windows with WSL2; `rer` provides the checkout's pinned Node and pnpm tooling.

From this checkout:

```sh
rer dev
```

`rer dev` installs everything, creates a local development owner and prints a private `RER_OPEN` link that opens as that owner. On first launch, `/setup` confirms the read-only owner details; later launches open the app directly. For a real mailbox, run `rer install` then `rer setup --owner-email you@example.com` before the first `rer dev`. Unattended setup uses a private answers file (`rer setup --answers PATH --non-interactive`); see [Install and run](docs/install.md#explicit-and-unattended-setup). Setup's temporary app stops before the command exits; run `rer dev` to keep serving the app.

`rer dev --as signed-out` selects the signed-out persona. The compatibility flag `rer dev --login` still opens automatic owner entry. Ordinary `/signin` email sign-in sends only through a configured remote mail provider with real credentials; no sender is configured by default. The app does not capture mail or print sign-in tokens. Stop with Ctrl-C or `rer dev --stop`; stop preview with `rer preview --stop` before building or verifying.

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

Export includes supported durable records and the import journal, excluding sessions and dev credentials. Import requires an empty destination and explicit confirmation. Reset deletes local data and owner settings. A deploy dry run builds and validates locally, then reads target secret bindings with Cloudflare credentials; it makes no provider writes. Release 1 supports hosted incident coordination alongside your existing pager. Paging stays OFF; an independent standby is not required for coordination. Release 2 paging and its independent standby are not built. See [Install and run](docs/install.md#host-for-your-team) for `rer deploy`, required mail configuration and removal. Use `describe` for flags and `doctor` for missing local prerequisites.

Read CONTRACT.md and ACCEPTANCE.md. This seed owns UI, API, storage, authentication and migration integration. Keep the visual language in BRAND.md and the real controls. Current-member authority is checked inside server handlers and import SQL transactions. On local and hosted apps, the configured owner uses native email links, while admin-created team members sign in at `/signin/local` with an installation-local workspace name and password. Oncall sends no invitations. Only anonymous first-admin bootstrap at `/api/setup` remains loopback-only. No private Start transport is used; the Start document is a shell and private data uses protected HTTP APIs. New transports require unauthenticated, expired, revoked and valid-session proof.

Keep released migrations immutable. New migrations must prove held-data upgrades. Never special-case inputs, weaken tests or create application mocks/fallbacks. Tests guard user-visible flows through emitted Worker HTTP or browser doors; data import/restore and authority require malformed-input, revocation, concurrency and rollback proof. Replace obsolete tests explicitly and report them. No pin tests. Run the tests you touched and the typecheck, then `rer verify` before proposing a change. Run one heavy job at a time, keep at least 15 GiB of disk free, and stop every process you start. Never print secrets.

Owner direction dated 16 October 2026 lifts the hosted Hold for release 1 coordination beside the existing pager. Coordination deployment has no standby prerequisite. An actual account operation still needs authorization for the account and operation; use the operator's Cloudflare credentials and record commands and results without secrets. Hosted sign-in requires configured remote mail, and `rer deploy` claims the owner automatically and retires the setup token. Removal uses the same Cloudflare credentials and `rer deploy --remove --yes`, with empty provider readback. Release 2 paging and independent standby are not built; no paging is authorized. Never promote synthetic receipts to delivery evidence.

## Contract documents

CONTRACT.md is the only acceptance text and status source, written to the RER contract standard. ACCEPTANCE.md, docs/CLAIMS.md and the Status summary rows are generated from it; never edit them by hand. After any CONTRACT.md change, run the generator, then `node src/base/contract-docs.mjs check`, and regenerate the source lock last. Landers regenerate after a rebase:

Lander-Regenerate: node src/base/contract-docs.mjs write

This checkout carries no edition-authoring copy, so the source lock is regenerated with Base's edition-authoring tool at the version `sources.lock.json` records (1.1.0), run from this checkout root: `node <Base checkout>/edition-authoring/cli.mjs lock`, then the same tool's `check`.

## Upstream module documentation

Documentation under `src/base/` and `src/modules/` is carried with copied upstream source. Its test paths and commands describe the upstream module trees; those test directories are not shipped in this edition. For local verification, use this checkout's `package.json` scripts and files under the root `tests/` directory.
