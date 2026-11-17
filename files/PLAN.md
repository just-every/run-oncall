# Oncall 0.5.18 release metadata plan

Author: Run Edit Run fleet
Date: 2026-11-17
Repository: just-every/run-oncall
Branch: cloud/sd-oncall-release-0-5-18

1. Configure the fleet identity, decrypted-bundle Git authentication and clone-local forwarding hooks.
2. Read the launcher, seed instructions and inline release rules. Clone main shallow and blobless, fetch enough history for the actual v0.5.17..main comparison, and check remote tag and GitHub Release collisions.
3. Inventory the changed source, migrations, package pin and contract status. Describe only user-visible changes in public release notes. Distinguish retained behaviours from newly changed product behaviour.
4. Bump existing package, seed and release references to 0.5.18 with previousVersion 0.5.17. Prepend current backup/upgrade instructions while retaining all earlier instructions. Preserve paging OFF, identifiers, the exact rer pin, migration bytes, product code, docs and contract judgments.
5. Install the checkout's pinned dependencies through cloud_run rer setup. Run metadata consistency/inventory checks, source-lock generation and check, and typecheck. Generate the source lock last.
6. Fetch fresh main and rebase before the first product push if required; resolve only within the lease. Inspect all candidate identities, messages and trailers. Commit with explicit fleet author/committer and forwarding hooks, and push the named branch through the cloud push guard.
7. Observe exact-SHA Verify via REST within the ten-call budget at intervals of at least 300 seconds per run. Do not dispatch, tag, publish a Release or submit for landing.
8. Save complete non-secret reports and actual receipts outside the product checkout. Publish selected report files to the separate evidence ref, then delete the successfully pushed product clone. Relay the sd inbox entry in the final response.

Cloud publication scan: unavailable in this environment by the task's explicit adaptation; the fleet's independent lander must run its publication scan before landing.
