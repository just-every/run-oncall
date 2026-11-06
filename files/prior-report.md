# Oncall runtime Verify shard rebalance

Tag: sd-oncall-runtime-cishape-20261106-1
Repository: just-every/run-oncall
Branch: cloud/sd-oncall-runtime-cishape-20261106-1
Role: builder. Product scope: CI shape only.

## Plan

1. Initialize fleet identity, decrypted-bundle Git helper, commit hooks and repository-pinned toolchain. Clone fresh main with --depth 1 --filter=blob:none; inspect current AGENTS.md, contract/view documents, workflows, selection helpers and named historical runtime timing.
2. Reuse the existing dynamic matrix and build-once artifact flow. Partition existing commands across at most eight push jobs. Keep every test, assertion, public door, default/flows/browser discovery, aggregate check, release/nightly rule, runner/browser policy, concurrency rule and event allowance.
3. Capture before/after selections by executing the real harness with a one-off subprocess recorder; prove identical registration multisets, no duplicate selected commands and unchanged test bytes. Check actual shard dispatch, prebuilt selection, unknown-lane refusal and light-reader treatment. Run syntax, YAML, workflow permissions, typecheck, first-party rer check and source-lock checks. Do not run a baseline or full local rer verify.
4. Fetch/rebase main before first publication. Regenerate and check the source lock last. Commit with fleet identity and hooks. Inspect all candidate identities/trailers, run the maintained exact-candidate publication path, push only the named product branch via the fleet guard. Preserve published history on later updates.
5. Discover exact-SHA Verify by REST within the ten-call budget. Report status and timings only when observed. Do not rerun/dispatch historical runs. Save actual non-secret results and receipts separately; publish an explicitly selected report-only evidence packet.

## Change

Only scripts/verify-shards.json and its generated sources.lock.json entry changed. There are no application, UI, clause, status, acceptance, release, version, provider or registration changes.

The runtime lane previously invoked runtime/core (including hosted linked pages), changes, triage and activation serially. It now retains runtime/core alone. Separate changes and triage lanes carry changes and triage+activation respectively. The intake lane retains runtime/machines, intake and routing; its import-door command moves to a dedicated imports lane. The original browser, hosted and transfer lanes are unchanged.

| Push shard | Existing selections after partition | Chromium |
| --- | --- | --- |
| runtime | tests/runtime.mjs, part=core; includes coordination and hosted links | no |
| intake | tests/runtime.mjs, part=machines; tests/intake.mjs; tests/routing.mjs | no |
| browser | tests/member-coordination-browser.mjs; tests/product-browser.mjs | yes |
| hosted | existing pnpm exec rer verify --non-interactive public/deployed coverage | yes |
| transfer | tests/transfer.mjs | yes |
| changes | tests/changes.mjs | no |
| triage | tests/triage.mjs; tests/activation.mjs | no |
| imports | tests/import-door.mjs | no |

All timeouts remain 15 minutes. No worker increase or timeout increase was used.

## Source ownership

Verify is an acknowledged seed adaptation of runeditrun/base export/verify.yml at 8b925fa5ffaa577df9f2e4ebab6ede8af5155baa, according to base-copies.json. Its SHA-256 is f53668b527704b4e9f9e0823e6d073ea4350a9055a9b665d9d92554828c77c82, which differs from the recorded pristine Base hash. It already accepts the seed-owned dynamic matrix. The workflow, Base template, shared CI/evidence helpers and source-authority metadata remain byte-identical. No Base change is required for this partition.

## Coverage and checks

Push jobs: 5 -> 8. Application registrations: 11 -> 11, across 10 distinct entrypoint files, with zero duplicates or omissions. Hosted rer verify remains once in addition to those registrations. All 61 files under tests/ are byte-identical, preserving every assertion and recursively imported public-door journey. Default, --flows and --browser selection multisets are unchanged. Existing ONCALL_RUNTIME_PART=core and machines each remain selected once; core alone includes the hosted production-output/linked-page assertions, while machines excludes them. No new runtime selector or test registration was added.

coverage-proof.json and before/after-discovery.json contain the actual one-off harness selection captures. These probes record scheduling and do not claim to execute the application assertions; the exact-SHA GitHub wall supplies that execution evidence. The real shard dispatcher was also exercised under the recorder: each lane is invoked once with ONCALL_VERIFY_PREBUILT=true, and the existing hosted command is unchanged. Unknown lane selection refuses; shard-map changes cannot qualify for a light reader pass.

Syntax checks passed for the harness and selection helpers. Both workflow YAML documents parsed with the maintained vendored YAML parser. The existing workflow-permission and shared-artifact-name check passed. actionlint is unavailable in the VM. pnpm run typecheck passed. npx -y @runeditrun/rer check --profile first-party --json passed. The repository-documented lock and check commands passed. Generated contract documents check passed without editing any contract or view file. Setup used the required non-interactive fleet owner, and its temporary app stopped. The toolchain selected Node v24.19.0 and pnpm 10.12.4; CI continues to use its unchanged .node-version pin.

## Historical evidence and limits

The brief supplies final f204 11414a0c run 42169317163 attempt 2: runtime cancelled at 15m16s total, with 13m06s in Run this shard; attempt 1 was the same. This task did not rerun/dispatch either attempt or modify f204 custody/holds.

The single named successful-main jobs-metadata read records run 42170494933, runtime job 127737691006: 05:50:04Z through 06:02:16Z = 12m12s. Build was 2m17s; browser 9m04s, intake 11m58s, hosted 4m39s and transfer 11m03s. Workflow jobs ran from 05:47:35Z through 06:02:26Z, a 14m51s span including planning/build. Those baseline totals include dependency/setup/post steps. The one permitted runtime archive read returned exit 0 with zero bytes, so no per-journey historical timing is inferred and no repeated archive download was attempted.

The <=10 minute full-wall and <=1.5x mean shard goals require candidate GitHub timing. This partition is coverage-exact but no measured candidate timing is claimed before that result exists. Unchanged browser/transfer work was already significant in the named historical run. Any remaining critical path must be judged from candidate timings, not hidden by a larger timeout.

## Clauses and custody

Clause/status/count changes: none. The 101 judgment rows remain 17 done, 50 partial and 34 missing. CONTRACT.md, ACCEPTANCE.md, docs/CLAIMS.md, BASE-AGENT-012 and every other clause's full Status/Gap/Evidence/provenance remain unchanged, together with source/review/provider/release holds and FIX lifetimes. This work makes no product FIX claim and does not readmit f204.

The product branch is separate from report-only evidence publication. No PR is created: this checkout documents branch/exact-SHA verification for the fleet lander, and the brief forbids PR duplication. The fleet owns its publication scan, final exact-SHA gate, landing and exact-main Run site. No main/default branch, tag or release is pushed here.

## Publication preparation

The scanner's initial prerequisites were absent: installed pinned Gitleaks 8.30.1 from the upstream release, with its published archive checksum verified; fetched full source history after the initial shallow clone was correctly refused as incomplete. A first scan of the setup checkout included generated local installation files and correctly flagged those working files; the candidate Git tree contains none of them. That invocation also used an invalid destination argument shape. The final scan uses a fresh detached worktree at the exact candidate SHA and the validator's canonical logical project plus HTTPS repository arguments. This keeps generated private installation state outside the public candidate inspection without changing source, scanners or policy. Full diagnostic envelopes are retained separately and contain no matched secret values. The fleet still performs its own terminal COMPLETE-history publication/landing checks.

The final exact-candidate publication scan completed PASS with zero findings in 229.78 seconds. It inspected the clean candidate with the maintained pinned 0.2.96 implementation and Gitleaks 8.30.1; the four historical pre-existing diagnostic envelopes remained classified as pre-existing. The source inspection worktree and product SHA/tree were verified identical. No finding was waived or product source altered for publication.

The all-test source census contains 5,514 direct static assert / assert.* call sites before and after, including 734 in tests/runtime.mjs. These are static source sites, not runtime loop-expanded counts; helper wrappers are not expanded. Their byte-identical source plus identical once-selected registrations proves the scheduling preservation without weakening any assertion.

## Terminal handoff policy

The product push succeeded on attempt 1, and git ls-remote independently advertised d2535e40fefe03697aaa62c8ef9cd917cc250bc1 at refs/heads/cloud/sd-oncall-runtime-cishape-20261106-1. The product worktree stayed clean. No further product commits or pushes were required. No source or publication blocker remains from the local touched checks. The final readiness decision still belongs to exact-SHA Verify, including honest runtime/job/full-wall timing; a running or undiscovered candidate is returned as PUSHED, never READY. No claim of the <=10m / <=1.5x timing targets is made while that evidence is pending.

Evidence is published separately at refs/heads/evidence/sd-oncall-runtime-cishape-20261106-1, with the complete explicitly selected reports/receipts and source/coverage probes. The transport manifest binds the product branch/head and file hashes. Credentials, environment dumps, local private installation state, held-out material and symlinks are excluded from selection. The report-only ref is not product readiness, acceptance or landing authority.

## Observed candidate CI and return

Exact-SHA Verify run 42187978821 is in_progress with conclusion null at the permitted follow-up discovery; its head_sha is d2535e40fefe03697aaa62c8ef9cd917cc250bc1. URL: https://github.com/just-every/run-oncall/actions/runs/42187978821. The immediately-after-push discovery had no run yet; the second was delayed 300 seconds, with a single watcher and no historical reruns or dispatches. Per the cloud return instruction this is PUSHED custody, not READY. Candidate runtime/shard/full-wall timing and target attainment are pending. There is no observed red check or local blocker; none is inferred from another SHA.

Terminal product provenance: branch cloud/sd-oncall-runtime-cishape-20261106-1; head d2535e40fefe03697aaa62c8ef9cd917cc250bc1; PR none. Historical reference run 42170494933 and candidate run 42187978821 are distinct. Fleet custody must assess the latter before landing or readmitting f204.
