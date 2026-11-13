# Commands and provenance

All commands below run from the named checkout, sourcing `/tmp/rer-cloud-toolchain.sh` for each fresh shell. All browser commands use `cloud_run` and `ONCALL_CHROMIUM_PATH=/usr/bin/chromium`; evidence output is outside every product repository.

- Setup: `cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive` (candidate checkout).
- Build for each recorded ref/merged worktree, and candidate: `cloud_run npx -y @runeditrun/rer build`.
- Existing focused journey for main, f235 merged source, f236 merged source and candidate: `ONCALL_PRODUCT_JOURNEY=rota-timeline ONCALL_CHROMIUM_PATH=/usr/bin/chromium ONCALL_BROWSER_EVIDENCE=<packet output> cloud_run node tests/product-browser.mjs`.
- Before boundary: `ONCALL_BROWSER_EVIDENCE=<packet geometry output> cloud_run node <packet>/timeline-probe-before.mjs` (original identical diagnostic was first named timeline-probe.mjs before being saved as timeline-probe-before.mjs).
- After boundary and keyboard reachability: `ONCALL_BROWSER_EVIDENCE=<packet>/geometry-after cloud_run node <packet>/timeline-probe.mjs`.
- Typecheck: `pnpm run typecheck`.
- Contract check: `node src/base/contract-docs.mjs check`.
- Last source generation: `node scripts/edition-authoring/cli.mjs lock`.
- Source check: `node scripts/edition-authoring/cli.mjs check`.
- First-party check: `cloud_run pnpm exec rer check --profile first-party`.
- Every product push: required `git log origin/main..HEAD` identity/trailer audit and full commit-message audit, then `python3 $HOME/rer-consolidation/.tools/cloud-push.py origin cloud/sd-oncall-timeline-hint-1`.
- Exact-SHA CI: credential-loaded `gh api repos/just-every/run-oncall/actions/runs?head_sha=<full SHA>&per_page=100`, then the individual run REST endpoint with 300 seconds minimum between requests for that run. One watcher, no rerun/dispatch, ten-call total budget.
- Report-only publication: supplied `cloud_evidence.py publish` entrypoint with each actual file explicitly selected. Product head/index/branch remain unchanged.

The f235 diagnostic merge was uncommitted and resolved only the generated source lock using the merged sources; f236's diagnostic merge was uncommitted and clean. Neither diagnostic merge was pushed or integrated into the candidate. Main incorporation on the cloud branch was a fast-forward to its current base before the repair commit; no default branch was written.
