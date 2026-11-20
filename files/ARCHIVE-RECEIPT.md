# Local installation archive receipt

The source was a completed synthetic workspace created through the compiled Worker. The receiving canonical D1 state directory was absent before import. The CLI selected the canonical `.wrangler/state` path and called Wrangler with `--persist-to`. Both ledger readbacks used Wrangler with that path explicitly.

```text
Checkout 2557e66e8980ab23f15bed77d63b2124229c56c5
PASS built Worker created an administrator and a service through public HTTP
> pnpm exec wrangler d1 execute DB --local --persist-to .wrangler/state (source ledger and service)
> pnpm exec rer export --output <scratch>/oncall-adoption.rer --non-interactive
PASS canonical destination initially absent
> pnpm exec rer import --input <scratch>/oncall-adoption.rer --yes --non-interactive
Applied 68 migrations. Full output: <local-migration-log>
> pnpm exec wrangler d1 execute DB --local --persist-to .wrangler/state (restored ledger and service)
PASS fresh import replayed all 68 Oncall core migrations in their archived order
PASS archived synthetic service retained and 113 durable tables represented
```

Source and restored ledgers matched all 68 migration filenames in the same order. The exported manifest independently recorded the same order and 113 tables. The restored service name matched the source through the real D1 readback.

A preliminary source had completed CLI setup only and held no native administrator. Its export succeeded and its import stopped at publication with `The portability module refused or failed the archive operation (native_error: Error).` Candidate and main share the same archive policy and the same active-administrator validator. The validator reports `Archive needs an active administrator` for an administrator-free archive. The populated round trip and the unchanged maintained transfer journey both passed.

The same setup-only fixture was exported and re-imported independently on Oncall main at `b6f5671aa17547fb4a4c10e45e730c14f8fa80d0` with its locked rer 0.2.118. Main also replayed all 68 migrations and returned the same `native_error: Error` and exit 1. This is existing behavior for an archive made before native administrator setup.
