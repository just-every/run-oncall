# Local receipt

- Product head `22dfa7c115773cd59de20d1662183119b15638bb`.
- Main parent `76e7ed5eb83d6cf3dba8b591a10cf63028eb4f4a`.
- Fleet clone setup, pinned dependencies, local setup and all 68 migrations passed.
- `node src/base/contract-docs.mjs write` wrote 0 documents. `node src/base/contract-docs.mjs check` reported current with 0 errors and 0 warnings.
- `node scripts/verify-oncall-build.mjs` exited 0 and emitted `build-sha.json`. Its sequence was `pnpm exec rer check --profile first-party`, `pnpm run build`, `pnpm run typecheck`. The rer production builder selected project Node 22.20.0. The standalone preparation shell used Node 24.19.0 for its typecheck. The full rer verify attempt used project Node 22.20.0.
- Pinned release `inspectSource(process.cwd(), 'HEAD')` passed. Versions agreed at 0.5.18 and the committed `RELEASE.json` and `CONTRACT.md` matched main byte for byte.
- Pinned edition-authoring `lock` and `check` exited 0 just before the push and produced no changes to the committed tree.
- `git diff --check origin/main..HEAD` passed. `git log --merges origin/main..HEAD` returned no commits. Candidate author and committer both read `Run Edit Run fleet <fleet@runeditrun.com>`. The candidate had no trailers.
- Product push succeeded on the first attempt. The named remote ref readback matched the local full SHA.

## Focused test output

- PASS browser missed acknowledgment: UI saves one minute, native intake declares and links, scheduled Worker stores the missed time and on-call responder, incident/alert/On call/Reviews agree at 1440, screenshots at 1440 and 390, no delivery.
- PASS missedAcknowledgmentFlow: initial expiry survives restart and audit rollback, repeated/concurrent cron records once, deadline coverage survives delayed processing, late acknowledgment retains the miss, on-time acknowledgment/recovery/off stop it, uncovered target is explicit, archive accepted, paging OFF

## Broader local verification

- The initial `pnpm exec rer verify --non-interactive` ran on Node 22.20.0. First-party check, build, typecheck, native export, portability CLI, core and machine runtime, bulk and storm triage, intake, routing and the core product browser journey passed before the managed-transfer fixture clone exited 128.
- A reproduction showed Git ignoring `--local` for a shallow source and the upload-pack subprocess refusing to lazy-fetch a promised object. Fetching the 1,158 missing objects reachable from the candidate repaired the fixture checkout. A second reproduction checked out the exact product SHA. Product files and history were unaffected.
- The exact-SHA rebuild and typecheck after hydration passed under the pinned Node 22.20.0. The machine runtime also printed the missed-acknowledgment PASS line during the broader suite.
- The recovered transfer lane passed through `rer verify` at 00:15:27 UTC, including the isolated exact-SHA fixture checkout and the hosted-output and hydration checks.
- The changes, triage, imports and agents lanes passed against the exact verification build after the transfer lane.
- The first member-browser attempt refused the VM's Chromium cache symlink in the package's executable-file check. A regular cache launcher invoking the system Chromium with `--no-sandbox` passed the operations preflight. The member-browser and browser-settings lanes then passed. The product source was identical across these attempts.
- The agent-browser lane passed. The initial successful lanes, recovered transfer and hosted checks, and remaining resumed lanes cover the full local verification sequence on the candidate. The local recoveries required no product change.
