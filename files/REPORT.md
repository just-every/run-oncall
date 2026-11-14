# gr-mt-oncall-dep-3 results

Repository: just-every/run-oncall
Product branch: cloud/gr-mt-oncall-dep-3
Product SHA: 0684e81306080c794a65db39cdfab9e7e63ad23f

Vite is upgraded from 8.2.2 to the first patched release, 8.2.4. The package declaration and pnpm lockfile were updated together with pnpm 10.12.4. Regenerating against the original lockfile retained every other package version, including Rolldown and PostCSS. The generated source lock records the two changed input hashes. Only package.json, pnpm-lock.yaml and sources.lock.json are committed.

The upgrade addresses the brief's three launch-editor advisories (GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm, GHSA-698v-4r3x-3vcv), reported in six Dependabot items (24 through 19). Distinct vulnerable Vite versions: 1 before, 0 after. Direct dependency version changes: 1. Unrelated version changes: 0. Provider-side alert closure was not queried or claimed.

The full plan is in PLAN.md. Local commands and actual results are in checks-receipt.json; dependency and contract counts are in dependency-receipt.json. Frozen installation, unattended setup, typecheck, production build, contract generation check and source-lock check passed with Node 22.20.0. The Vite public HTTP smoke passed. The emitted application Worker homepage, health and sign-in smoke also passed. Its first attempt stalled at the Miniflare loopback bridge with the cloud proxy environment; after stopping only its owned Node/workerd processes, the same public-door probe passed with external proxy variables unset. Both attempts are retained in the receipt. Exact-SHA CI remains required. The scratch Vite probe's initial assumed HTTP status was corrected to the upstream missing-file refusal behavior; no repository test changed.

Base's maintained publication scanner was fetched read-only through gh api, with no clone or writes to Base. Its pinned Gitleaks 8.30.1 archive checksum was verified. The scan ran on a clean detached worktree of the candidate, with remote main fetched explicitly as the published baseline. It completed PASS with an empty findings array; four pre-existing baseline findings remain separately recorded in the complete raw report. It scanned 1,140 commits, 1,094 trees, 6,893 blobs and 20 tag messages, hydrating all missing history objects. See publication-scan.json and publication-receipt.json for exact source/tree and implementation identity. No credentials or private setup output are selected for evidence transport.

All candidate author/committer identities were inspected, with no trailers. The guarded product push succeeded on the first attempt. The branch has no skip-CI marker. No main push, deployment, release, PR or landing was performed. A separate evidence ref will carry this packet without changing the product branch.

Contract clause status changes: none. Counts remain 26 DONE, 41 PARTIAL, 34 MISSING (101 total); no clause claims are made. Test registrations added/removed: 0/0. UI and generated acceptance views are unchanged. Default: leave unrelated dependency and product work for their existing lanes. The full branch Verify is pending; no READY claim is made until exact-SHA completion.

Public log copies replace absolute checkout/home prefixes with `<checkout>`/`<home>`; report-redactions.json lists affected files. No result or diagnostic was removed. Original non-secret logs are retained locally outside the public packet.
