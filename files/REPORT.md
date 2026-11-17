# gr-mt-oncall-issue-1

Author: Run Edit Run fleet, 17 November 2026.

Result: **no-change**. The reported direct artifact-packaging failure is already resolved on current `origin/main`, `4988fbbe5e310410f02d3cfbd4ffc323bc967a6f`. The local branch is `cloud/gr-mt-oncall-issue-1` at that same SHA. No product commit, product push or PR was necessary. This report does not claim a newly repaired product or a new READY candidate.

## Plan and outcome

1. Configure fleet identity, refresh the launcher, install the decrypted-bundle Git helper and guards, and clone only the declared Oncall repository with full commit/tree history. Completed.
2. Read launcher AGENTS.md, repository AGENTS.md/CLAUDE.md, CONTRACT.md/ACCEPTANCE.md and the inline builder rules. No TESTING.md exists. Trace the committed packaging policy, source Wrangler inputs, Worker output and artifact implementation before choosing a change. Completed.
3. Install/setup through the provided cloud subreaper, build the real Worker and run the seed's direct artifact command. It already passed on current main. Pin Node exactly to 22.20.0 (pnpm 10.12.4), rebuild and repeat the proof. Completed successfully.
4. Exercise an explicitly labelled negative control by removing only public MAIL_FROM from the emitted Wrangler configuration. This reproduces the exact error from the report. Restore the emitted file byte-for-byte, rerun the same direct artifact command and compare its entire deployment specification with the native generated plan. Completed: expected failure then success.
5. Run the typecheck, verify clean tracked files and the remote default SHA, inspect exact-SHA existing CI and return an actual no-change result and report-only evidence packet. Completed; evidence transport has its separate terminal EVIDENCE receipt.

## Input trace

- `scripts/delivery/base/packaging.json` declares MAIL_FROM exactly once in `artifact.specInputs.publicVariableNames` and excludes it from both required and optional secret-name lists. A public-name allowlist permits a build variable; it does not itself materialize that variable.
- `wrangler.jsonc` commits `vars.MAIL_FROM` as an empty string. That means unconfigured, with no sender selected. `deploy.json` can map the operator's MAIL_FROM input to the same runtime binding; its historical `secrets` array is also used for environment mappings, while the delivery policy owns public/secret classification.
- `vite.config.ts` uses Cloudflare's Vite plugin; the production build preserves the source declaration in `dist/server/wrangler.json`, where MAIL_FROM remains a public empty string.
- `scripts/build-delivery-artifact.mjs` reads the committed policy, calls `produceSeedArtifact` in `scripts/delivery/base/package.mjs`, and reaches `produceArtifact` and `deploymentSpec` in `artifact.mjs` and `spec.mjs`.
- `deploymentSpec` copies actual built `vars` allowed by the policy. `validateMailSpec` in `mail.mjs` requires MAIL_FROM in the resulting public variables and refuses classifying it as a secret. No generator or mail-policy relaxation is needed.
- On current main, the resulting schema-2 artifact has 70 modules and 69 assets. Its complete deployment specification equals `management/integration/deployment-spec.json`, including public mail inputs, secret classification, migrations, surfaces, readiness and provider effects.

Relevant existing history: `041b7147523f114ee6b611c95e66afce9c37acf2` added public Wrangler MAIL_FROM; `9d0f1a8eccca05a40e669b986fd15373601118e9` added sender consistency checks and the public-sender validation; `5023938cf057fbfc600dcbb1d47964bbb9ca400b` retained empty MAIL_FROM while moving provider selection to runtime; `948c71dcba229b46df2ac4596d0be62ea873122c` aligned public MAIL_ACCOUNT_ID and optional credentials in policy and artifact proof. These are existing ancestors of the tested default head, not commits created by this task.

## Before/after proof

This is a controlled omitted-input reproduction, **not a failure on current main or a claim that this run repaired it**:

- With only `dist/server/wrangler.json`'s MAIL_FROM entry removed, `node scripts/build-delivery-artifact.mjs` exits 1 with `Managed mail requires one public MAIL_FROM sender, not a secret MAIL_FROM`.
- Restore the exact built configuration from current main and run the identical command: exit 0, public MAIL_FROM retained as an empty string, schema-2 artifact emitted, entire deployment specification equal to the native plan.
- Pinned `rer build` and `pnpm run typecheck`: exit 0. The probe restores the emitted configuration and removes its own artifact output even on failure. Tracked worktree remains clean.

The initial VM Node 24 build/typecheck also passed. Final proof supersedes those results with the repository's exact Node 22.20.0 / pnpm 10.12.4 versions. Raw setup output is deliberately excluded because setup can print private owner-entry details; no credentials, environment dumps or generated private local settings are in this packet.

## CI, counts and custody

One API request discovered existing workflows for the exact tested SHA:

- Verify `44113252309`: completed/success, https://github.com/just-every/run-oncall/actions/runs/44113252309
- Later Verify `44127289212`: completed/cancelled, https://github.com/just-every/run-oncall/actions/runs/44127289212
- Run site `44127289058`: completed/success. Run demo `44127289251`: skipped. Push on main `44127288611`: completed/success.

These are existing default-head runs, not CI from a new cloud branch push. No failing assertion log was requested, no CI run was dispatched or retried, and no product readiness or landing claim is made.

Product files changed: 0 -> 0. New product commits: 0. Tests added/deleted/changed: 0/0/0. No UI changes or browser proof required. Acceptance totals remain 26 done / 41 partial / 34 missing, 101 total. No clause status, Gap or Evidence cell changed; no clause promotion is requested. No source-lock or generated-document update was necessary.

No product publication scan was run because there is no new product tree to publish and no product push. The security boolean in result.json records the unchanged product and absence of secret-bearing changes; it is not a COMPLETE/PASS publication-scan claim. Evidence is explicitly selected and published only to the separate report-only evidence ref. The clone remains at the investigated main SHA for custody; result.json is outside it at `work/maint/gr-mt-oncall-issue-1/result.json`.

Blockers: none for the verified no-change result. Default: leave MAIL_FROM unconfigured and require the installation operator to supply its public sender; no sender, provider or owner decision is invented. All started setup/build processes exited; no server/browser was left running.

Packet: REPORT.md; result.json; packaging-receipt.json; command-receipt.json; ci-runs.json; probe.mjs; probe.log; typecheck.log. Author: Run Edit Run fleet, 17 November 2026.
