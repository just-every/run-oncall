# Run it locally

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

Export includes supported durable records and the import journal, excluding sessions and dev credentials. Import requires an empty destination and explicit confirmation. Reset deletes local data and owner settings. A deploy dry run builds and validates locally without provider requests. Actual deployment refuses until a hosted release with an independent standby is approved. Paging remains OFF until a real-phone drill passes as well. Use `describe` for flags and `doctor` for missing local prerequisites.

Read CONTRACT.md and ACCEPTANCE.md. This seed owns UI, API, storage, authentication and migration integration. Keep the visual language in BRAND.md and the real controls. Current-member authority is checked inside server handlers and import SQL transactions. No private Start transport is used; the Start document is a shell and private data uses protected HTTP APIs. New transports require unauthenticated, expired, revoked and valid-session proof.

Keep released migrations immutable. New migrations must prove held-data upgrades. Never special-case inputs, weaken tests or create application mocks/fallbacks. Tests guard user-visible flows through emitted Worker HTTP or browser doors; data import/restore and authority require malformed-input, revocation, concurrency and rollback proof. Replace obsolete tests explicitly and report them. No pin tests. Run the tests you touched and the typecheck, then `node scripts/rer.mjs verify` before proposing a change. Run one heavy job at a time, keep at least 15 GiB of disk free, and stop every process you start. Never print secrets.

No deploy, provider or account call, or paging is authorized by this repository; the owner decides each one. Record plain commands and results with the change. Hosted coordination needs standby and portable target proof before release; paging additionally needs real-phone and provider-failure drills. Never promote synthetic receipts to delivery evidence.
