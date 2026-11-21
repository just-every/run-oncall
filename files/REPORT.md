# Oncall rer 0.2.126 adoption

Tag `sd-oncall-rer-pin-126-1`. Repository `just-every/run-oncall`. Product branch `cloud/sd-oncall-rer-pin-126-1`.

No contract clause claimed; this is a rer adoption.

## Plan and implementation

1. Start from Oncall main in a full-history, blobless checkout. Follow the previous rer adoption in `163cc173378040ebba2ab8c50e1f9d8d922559b7`. Pin rer exactly in `package.json` and regenerate `pnpm-lock.yaml` with pnpm 10.12.4.
2. Refresh the Base copy record and vendored files from the read-only Base checkout at `3637852064bf6ddadd15418518964d99d615cc46`. Compare the six changed portability files byte for byte to that checkout and verify the Base copy record.
3. Run the first-party check, production build and typecheck in the repository's declared order. Exercise the ready development and production preview paths, signed-in owner entry, populated CLI export and fresh local restore, and the migration history readback.
4. Regenerate and check the contract views, restore the versions from main, then regenerate and check the pinned edition source lock. Publish the checked product commit to its named branch and inspect Verify for that exact SHA.

The package pin moved from 0.2.125 to 0.2.126. All 249 Base copy entries now use the release source revision. The annotated upstream tag is `29dd50cb9bd28b68f2b8245eb77aac168af38adf`. The product diff contains the two package files, the copy record, six verbatim portability files and the source lock. Oncall has no npm lockfile.

| Contract tier | Before done / partial / missing | After done / partial / missing |
| --- | --- | --- |
| Core | 25 / 35 / 24 | 25 / 35 / 24 |
| Agent surface | 1 / 6 / 10 | 1 / 6 / 10 |
| Later | 0 / 0 / 0 | 0 / 0 / 0 |
| Full target | 26 / 41 / 34 | 26 / 41 / 34 |

Oncall declares its owner migrations in the core D1 migration directory. It declares zero separate owner extension directories. The local CLI import takes the checkout's state location. Wrangler's `--persist-to .wrangler/state` is the underlying migration and readback flag. The transfer journey uses that flag to inspect the empty receiving state and verifies retained records against the built Worker.

## Local verification

- Installed the exact package with `pnpm add --save-dev --save-exact @runeditrun/rer@0.2.126` and checked the frozen pnpm lockfile.
- `pnpm exec rer refresh-base --ref 3637852064bf6ddadd15418518964d99d615cc46 --base ../base` completed. The pinned edition authoring tool's `verify-base --base ../base` reported 249 verified entries, 18 declared adaptations, zero drift and zero unrecorded copies. The six changed vendored files matched upstream bytes.
- `cloud_run node scripts/verify-oncall-build.mjs` passed on Node 22.20.0 and pnpm 10.12.4. It ran `rer check --profile first-party`, the production Worker and client build, then `tsc --noEmit`. The production build emitted two dynamic-import warnings and completed. `rer check --json` returned `ok: true`.
- `node src/base/contract-docs.mjs write` wrote zero documents. The corresponding `check` reported current views and zero prose errors or warnings. The pinned edition authoring `lock` and `check` completed.
- `cloud_run node tests/transfer.mjs` exited 0 from a fresh clone of the candidate. It ran `rer setup`, `rer dev`, `rer build` and `rer preview`. Development and compiled preview reached readiness. The preview rejected anonymous state, then opened the linked owner through the managed entry link. The two submitted images capture the restored-owner preview at 1440 and 390 pixels.
- The same test ran `rer export --output exports/transfer-proof.rer --non-interactive`, `rer reset --yes`, inspected the empty D1 state with Wrangler's `--persist-to .wrangler/state`, then ran `rer import --input exports/transfer-proof.rer --yes --non-interactive`. Restore preserved the populated records, audit history and erasure fences, held pending work inactive and required explicit owner mapping. The emitted Worker served the restored application. The journey's command outcomes and result tails are included.
- `node tests/portability-cli.mjs` exited 0. The CLI preserved valid cookie bytes and refused malformed cookies before HTTP.
- The two focused upstream 0.2.126 port and pnpm probe tests passed. The port search moved past occupied ports with slow inspection. The pinned pnpm check recovered from a transient failure, bounded persistent failure, and scaled its deadline under simulated load. The upstream package owner-migration test reported one passing assertion suite for restoring Platform archives into an upgraded native checkout and refusing invalid owner history. The cloud wrapper returned exit 1 after TAP reported one pass and zero failures.

## Publication and custody

The candidate-range Gitleaks run found no leaks. The supplementary Base history scanner completed across 1,342 commits, including the candidate and all main ancestry. It returned FAIL on three historical test-fixture findings and one historical commit-message email finding. Every reported occurrence is reachable from the previously advertised main. The candidate had zero findings. The fleet's publication decision remains part of landing.

The product was pushed as one linear commit and read back at `f0b093cc21691556860dc622a8932ab098cb0e72`, with parent `59d5f6f953fce251546465881d0d32c3486904ba`. The product push created only the named branch.

The first cloud `rer verify` run stopped in the mobile keyboard conflict journey with `page.waitForRequest: Timeout 30000ms exceeded while waiting for event "request"` at `tests/product-browser-journey.mjs:2291:10`. The stages before that included the additive audit migration upgrade, preserving 121 application tables and 31 held rows. The full core browser journey on the 0.2.125 parent passed. The candidate passed the maintained focused accessibility journey on retry, including the same stale-note assertion at 390 pixels. The browser test and workspace focus handler were byte-identical across the two revisions.

GitHub Verify run 44841901212 completed successfully on the exact published product SHA. The CI receipt records its observed result. https://github.com/just-every/run-oncall/actions/runs/44841901212

A temporary stash used the clone's configured identity directly during the main update. All three temporary commits had the fleet author and committer and were dropped before publication. The product commit used the explicit fleet identity environment.

The packet records the local check outcomes and the successful exact-SHA Verify. Run Edit Run fleet builder, 2026-11-21 UTC.
