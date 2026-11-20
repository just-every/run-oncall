# Oncall rer 0.2.125 adoption

Tag `sd-oncall-rer-pin-125-1` and product branch `cloud/sd-oncall-rer-pin-125-1`.

## Plan

1. Review the exact rer devDependency, pnpm lockfile, Base copy record, and the prior pin change on Oncall main. Resolve the released Base tag to its immutable commit using a full-history blobless clone.
2. Install rer 0.2.125 at an exact pin. Refresh Oncall's Base copies from that local Git checkout. Preserve Oncall adaptations and verify recorded Base bytes.
3. Run the seed's first-party check, production Worker build, and typecheck in CI order. Exercise the existing managed transfer and migration journeys, and read the migration ledger after a CLI restore into an empty local state.
4. Run the contract generator and check, restore the checked-in generated views from main, and regenerate and check the source lock last. Keep one linear candidate on fresh main and check its commit identity before the guarded push.
5. Observe branch Verify for the exact candidate SHA and publish the report and verification receipts to the evidence branch.

## Changes

- `92c4f5d` last moved the exact pin to rer 0.2.118. This adoption updates the same package declaration and pnpm lockfile fields to 0.2.125. The checkout uses pnpm and has no tracked npm lockfile.
- Base release tag object `ed28be13eb6fc1155d2b889410d044271966c2fa` peels to `965e8d4e105f6f4d281dacb3c099f6a958a886e7`. The previous Base copy record predominantly referenced `c2efb501cbc148c2aee4d5e1107ebdba81469006`.
- The refresh updated 249 copy entries and delivered 11 new shared files. Reviewed and acknowledged existing Oncall edits in Verify, the agent-door pages and types, delivery specification, deployment health, catch-up planning, mail dependency files, and portability CLI options. The historical edition-authoring archive reader still supplies the API reader binding its retained caller expects. That file stays byte-identical to Oncall main and is now recorded as an adaptation.
- Kept the applied agent-door migration and Oncall's adapted agent-door guide. The newer Base agent schema represents additive changes already carried by Oncall's own migration series. The refresh recorded no edition migration. Existing React pins satisfy the local build and typecheck.
- rer 0.2.125's shared local mail preflight intercepted Oncall's hosted-only mail-off refusal. Moved the existing safety refusal to the Oncall lifecycle entry so first setup and retry keep their refusal exit code and field-specific correction. Existing test assertions were retained.
- Rebasing incorporated main's updated P1 test evidence and regenerated contract view. Oncall's adoption contributes zero clause status changes and zero test registration changes.

No contract clause claimed; this is a rer adoption.

| Tier | Done before and after | Partial before and after | Missing before and after | Total |
| --- | ---: | ---: | ---: | ---: |
| Core | 25 | 35 | 24 | 84 |
| Agent surface | 1 | 6 | 10 | 17 |
| Later | 0 | 0 | 0 | 0 |
| Full target | 26 | 41 | 34 | 101 |

## Verification

The candidate is `2557e66e8980ab23f15bed77d63b2124229c56c5`, a single commit on `b6f5671aa17547fb4a4c10e45e730c14f8fa80d0`. The guarded product push succeeded on its first attempt. A Git ref readback matched the candidate exactly.

The recorded Base copies, first-party checks, production Worker build, typecheck, transfer lane through pinned `rer verify`, activation lane, static site build, contract generation and source lock checks passed. The managed journey tested the CLI archive with real product history and the emitted Worker restore door. An independent populated archive restored the synthetic service and all 68 ordered core migrations into an empty state. Its manifest listed 113 durable tables. A setup-only fixture without an active native administrator reproduced the same refusal on both rer pins.

See `LOCAL-CHECKS.md` and `ARCHIVE-RECEIPT.md` for the commands and actual result tails.

## Published candidate and CI

Verify run **44772095111** completed successfully for the candidate SHA. The REST discovery and follow-up used five calls. See [Verify run 44772095111](https://github.com/just-every/run-oncall/actions/runs/44772095111) and `CI-RECEIPT.json`.

Report finalized 2026-11-20 16:39:47 UTC.
