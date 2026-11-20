# Local verification receipt

Product head `2557e66e8980ab23f15bed77d63b2124229c56c5` on `b6f5671aa17547fb4a4c10e45e730c14f8fa80d0`. Node 22.20.0, pnpm 10.12.4.

| Command | Result |
| --- | --- |
| `pnpm add -D -E @runeditrun/rer@0.2.125` | Installed the exact pin and updated pnpm lockfile |
| `pnpm exec rer refresh-base --ref 965e8d4e105f6f4d281dacb3c099f6a958a886e7 --base /workspace/scratch/oncall-base` | Exit 0 |
| `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs verify-base --base /workspace/scratch/oncall-base` | Exit 0 |
| `node scripts/verify-oncall-build.mjs` | Exit 0 on candidate SHA. Ran first-party rer check, production build, then TypeScript check |
| `ONCALL_VERIFY_LANE=transfer ONCALL_VERIFY_PREBUILT=true pnpm exec rer verify --non-interactive` | Exit 0 on candidate SHA |
| `node src/base/contract-docs.mjs write` then `check` | Zero changed documents, zero prose errors or warnings, views current |
| `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock` then `check` | Exit 0 after the final Oncall call-site change |
| `git diff --check origin/main..HEAD` | Exit 0. Candidate has one commit, zero merge commits, fleet author and committer, zero trailers |

The first proof of the shared mail-preflight change failed with exit 1 where the existing installation test expected the hosted-only safety refusal exit 4. After the lifecycle adjustment, the same first-attempt and retry assertions passed.

## Transfer and built Worker result tails

```text
Fresh-clone tests/transfer.mjs: 2557e66e8980ab23f15bed77d63b2124229c56c5
PASS local mail selection: public setup refuses hosted-only none on first attempt and retry, with a field-specific correction
PASS compiled health: actual package version and checkout SHA without deployment bindings; coordination liveness preserved
PROBE OC-018 native restore: Settings archive replacement -> build -> preview private owner link in the same browser -> mapped workspace without administrator selection
OC-052 populated checkpoint: complete CLI round trip and inactive receiving state passed; activation owns refusal, rollback and concurrency
OC-052 portable restore: complete import history preserved and restored pending Business execution refused
OC-040 incident/member/integration portable erasure: later journal rejects the older installation archive; current import preserves anonymous member and absence of incident/key
PASS OC-050 transfer: full template snapshots with completed checklist attribution and merged/split provenance survive checkpoint, portable inactive restore, erasure and current archive import without replay or authority. Paging remains OFF.
Journey completed: tests/transfer.mjs (892.4s)
Oncall verification passed: transfer
Hydration check: 4 page(s), 23 load(s)
Agent door conformance: 9765/9765 points passed.
Statement size: 474 view and trigger statements checked; largest 5 FROM items, depth 22.
verify: complete (exit 0)
```

The managed transfer calls `rer export`, refuses a populated import, resets to an independently verified uninitialized schema, and calls `rer import --yes`. Assertions read retained service and incident history, paused paging work, permanent audit and import custody, owner mapping, and the erasure journal through the emitted Worker and CLI. The journey also exercises native Archive replacement and builds and serves the receiving preview.

Oncall declares 68 product SQL migrations under `migrations/core` and has no separate owner migration directory in its delivery declaration. The applicable product proof is ordered replay of the core ledger. The refresh brought in Base's owner-history and Worker replay code for editions that declare a second ledger.

## Activation and site build

`ONCALL_VERIFY_LANE=activation ONCALL_VERIFY_PREBUILT=true pnpm run verify:app` exited 0. The held-data migration fixture upgraded through the Wrangler CLI and checked that member, service and runbook bytes and workspace revision survived. The activation lane also exercised Worker restore, concurrency and rollback.

`pnpm exec rer build --site` exited 0.

```text
PASS populated migration CLI upgrade: main 0143 to candidate, held member/service/runbook bytes and workspace revision preserved
Journey completed: tests/activation.mjs (311.9s)
Oncall verification passed: activation
build: complete (exit 0)
```
