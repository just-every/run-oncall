# gr-mt-oncall-dep-3 plan

1. Configure the fleet identity, refresh the authorized launcher, install Git credential and commit hooks, then clone only just-every/run-oncall with full history and create cloud/gr-mt-oncall-dep-3 from origin/main.
2. Read launcher and seed instructions, contract and generated acceptance views. Use Node 22.20.0 and pnpm 10.12.4. Confirm the affected direct dependency and lockfile.
3. Bump only Vite from 8.2.2 to 8.2.4. Regenerate pnpm-lock.yaml from the prior lockfile so unrelated package versions stay fixed. Regenerate and check sources.lock.json last. Leave contract text, statuses, acceptance views, tests and UI untouched.
4. Run a frozen install, unattended local setup, typecheck and production build. Exercise the built Worker through public HTTP smoke doors. Run no full local suite; exact-SHA Verify owns the full wall.
5. Fetch main and reconcile unpublished commits with fleet identity and hooks. Scan the exact candidate in a clean worktree using Base's maintained publication scanner and pinned Gitleaks; require complete PASS with zero findings before product publication.
6. Inspect all candidate author/committer identities and trailers. Push only cloud/gr-mt-oncall-dep-3 through cloud-push.py. Discover and poll exact-SHA Verify through REST within the GitHub budget, no more than one call per run per 300 seconds. Fix scoped failures if needed without rewriting published history.
7. Save actual non-secret report and receipts outside the product repository. Publish the explicitly selected packet only to evidence/gr-mt-oncall-dep-3 through cloud_evidence.py. Return product provenance, CI IDs and lane POST line; leave landing to the fleet.

No target contract clause changes or UI changes are requested. No new tests or clause claims are needed for this dependency maintenance task.
