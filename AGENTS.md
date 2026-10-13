# Run it locally

Use Node 22.20.0 and pnpm 10.12.4. From this checkout:

```sh
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

Export includes supported durable records and the import journal, excluding sessions and dev credentials. Import requires an empty destination and explicit confirmation. Reset deletes local data and owner settings. A deploy dry run builds and validates locally without provider requests. Actual deployment refuses until a hosted release with an independent standby is approved. Paging remains OFF until a real-phone drill passes as well. Use `describe` for flags and `doctor` for missing local prerequisites.

Read CONTRACT.md and ACCEPTANCE.md. This seed owns UI, API, storage, authentication and migration integration. Keep the visual language in BRAND.md and the real controls. Current-member authority is checked inside server handlers and import SQL transactions. No private Start transport is used; the Start document is a shell and private data uses protected HTTP APIs. New transports require unauthenticated, expired, revoked and valid-session proof.

Keep released migrations immutable. New migrations must prove held-data upgrades. Never special-case inputs, weaken tests or create application mocks/fallbacks. Tests guard user-visible flows through emitted Worker HTTP or browser doors; data import/restore and authority require malformed-input, revocation, concurrency and rollback proof. Replace obsolete tests explicitly and report them. No pin tests. Run the tests you touched and the typecheck, then `rer verify` before proposing a change. Run one heavy job at a time, keep at least 15 GiB of disk free, and stop every process you start. Never print secrets.

No deploy, provider or account call, or paging is authorized by this repository; the owner decides each one. Record plain commands and results with the change. Hosted coordination needs standby and portable target proof before release; paging additionally needs real-phone and provider-failure drills. Never promote synthetic receipts to delivery evidence.

## Upstream module documentation

Documentation under `src/base/` and `src/modules/` is carried with copied upstream source. Its test paths and commands describe the upstream module trees; those test directories are not shipped in this edition. For local verification, use this checkout's `package.json` scripts and files under the root `tests/` directory.
