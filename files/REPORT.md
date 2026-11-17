# Hono upgrade pushed; exact-SHA Verify blocked by cancellation

Author: Run Edit Run fleet, 2026-11-17.

Repository: just-every/run-oncall. Branch: cloud/gr-mt-oncall-dep-2.
Head: 3ebaba83e76354d249a2db4ee298f7dd936729ea. PR: none. Product push: successful on the first guarded attempt.
Readiness: BLOCKED. Verify run 44097793573 completed cancelled; its agents shard was cancelled and its final verify gate failed. No READY claim is made.

## Plan and completed product work

The full plan is in PLAN.md. Execution initialized fleet identity/authentication and commit hooks, cloned the declared product with full history, read launcher/product instructions and the contract, confirmed Hono 4.13.7, updated the direct dependency with pnpm 10.12.4, regenerated and checked the source lock, committed, ran the touched checks, inspected every outgoing identity and trailer, scanned the exact committed source, pushed the named branch, and waited for exact-SHA Verify. Reports and receipts remain outside the product tree and are selected explicitly for report-only evidence publication. No other repository was cloned or written; Base paths were discovered through one read-only API tree request, and the installed pinned rer package supplied the scanner.

package.json pins Hono 4.13.11 instead of 4.13.7. pnpm-lock.yaml was regenerated with the pinned package manager and changes only the Hono importer, integrity and dependency snapshot. sources.lock.json was regenerated with the installed @runeditrun/rer 0.2.118 edition-authoring command and changes only those two file hashes. No unrelated dependency, application, UI or workflow edits were made. The plain commit has fleet author and committer and no trailers.

Before/after listed vulnerable resolutions: 1 → 0 against the brief's GHSA-5r4p-p66f-jhc7 range. Dependabot alerts 17 and 18 supplied the brief; their remote state was not changed or claimed read back.

## Local validation

All checks exited 0: setup with the required unattended owner flags; pinned pnpm frozen install; installed edition-authoring lock and check; production build; TypeScript check; ONCALL_RUNTIME_PART=core node tests/runtime.mjs. checks.json records exact commands. Build/typecheck/journey checks used Node 22.20.0 and pnpm 10.12.4; initial setup used rer's managed tooling. The core coordination leg completed in 108.2 seconds, and the script also checked 18 linked pages/files through a hosted-mode Worker. It covered setup/session/roles/CSRF, bearer/HMAC ingress, concurrent revisions, incident transitions and attribution, read-only replay, archive rollback, revocation, restart/migration and storage-failure recovery. No live provider deployment or newly executed field proof is claimed. Build warnings concerned dynamic imports.

The tracked worktree is clean. CONTRACT.md and generated ACCEPTANCE.md/docs/CLAIMS.md were unchanged. Clause status changes: none; no acceptance promotion is claimed. Before and after: 26 done, 41 partial, 34 missing, 101 total. The verification plan retains 20 lane entries in 12 lanes. Tests added/removed/weakened: 0/0/0. Browser proof is not applicable to this dependency-only change.

## Publication

Base's sourcePublicationScan from pinned rer 0.2.118, using Gitleaks 8.30.1, returned PASS, complete=true and zero findings for commit 3ebaba83e76354d249a2db4ee298f7dd936729ea, tree 1200acd7119e39a8bfc67b84a99c6f67c1f793d5. It inspected raw committed bytes and full selected/public-main history: 1,217 commits, 1,171 trees and 7,315 blobs. The actual report records implementation digest, timings and pre-existing observations separately. Its SHA-256 is d0e78609be630ad2fc586c21fe0500b1491e93309a9a0eae04a433edc2376522.

The initial invocation used incorrect destination arguments and returned one destination.invalid finding. The corrected invocation first validated the committed edition ID and full destination URL and then passed on the same unmodified commit. Both actual reports are retained.

A fresh origin/main fetch and no-op rebase preserved the candidate head. Every candidate commit, including side parents, passed the fleet identity and no-trailer inspection. The mandated cloud push guard printed PUSH_OK on attempt 1; Git independently advertised the exact product head. No default branch, PR, tag, release, deployment or external comment was created. The Mac fleet owns landing.

## Exact-SHA CI blocker

Run: https://github.com/just-every/run-oncall/actions/runs/44097793573
Head: 3ebaba83e76354d249a2db4ee298f7dd936729ea.

One watcher discovered this exact-SHA run and polled at intervals of at least 300 seconds. Its terminal response was completed/cancelled. plan, build, contract-docs and seven shards passed: runtime, intake, browser, hosted, transfer, changes and triage. The agents shard (job 134090689862) was cancelled during Run this shard, from 13:58:48Z to 14:13:56Z. The configured job budget is 15 minutes; elapsed time is about 15 minutes 8 seconds. That timing is recorded without asserting a cancellation cause the API does not establish. The final verify job 134100091748 failed because SHARDS was cancelled; full-push-proof was skipped. This is not the generated contract-view exception: contract-docs passed.

The prescribed failed-step archive command for agents exited 0 and returned no failed-step text. The failed final gate's archive was read once and confirms its failed coverage requirement. ci-log-receipt.json records commands, exits and limits; the published gate log omits its environment block. No transport failure occurred and no archive retry was made. No application assertion failure was established from these responses. No fresh Verify run was dispatched: the brief forbids rerunning a SHA that already has a run, and no unrelated or empty commit was added to obtain a new SHA.

Default: retain the narrow dependency fix and existing test assertions/workflow unchanged. Follow-up required from the fleet: resolve the agents cancellation and obtain independent exact-SHA full verification before landing. The product is pushed and preserved, but this builder cannot claim READY.

## Preservation and evidence return

Local maintenance result: /home/agent/rer-consolidation/work/maint/gr-mt-oncall-dep-2/result.json, status cannot because of the CI blocker; security=true denotes the security-maintenance fix, not completed CI acceptance. The product clone is retained at /home/agent/rer-consolidation/work/maint/gr-mt-oncall-dep-2/repo.

Verified recovery bundle: /home/agent/rer-consolidation/work/maint/gr-mt-oncall-dep-2/candidate.bundle
Bundle SHA-256: 93403edf231f25565e4fbab568389278bb7b6d7453b960f4f1e8b43c27f46d86
Bundle head: 3ebaba83e76354d249a2db4ee298f7dd936729ea. git bundle verify exited 0. The bundle is outside the clone and outside the report-only packet; bundle-receipt.json carries its actual provenance. Product publication succeeded; this was not a push rejection.

The complete relevant non-secret packet is published separately to refs/heads/evidence/gr-mt-oncall-dep-2 using cloud_evidence.py. The transport's terminal EVIDENCE line supplies the exact evidence head and is kept separately to avoid a self-referential manifest. Evidence publication conveys neither product acceptance nor landing. Paging stays OFF. No owner ruling or account credential is missing; the outstanding requirement is a successful full exact-SHA CI wall.
