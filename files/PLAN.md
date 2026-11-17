# Plan for gr-mt-oncall-code-10

Author: Run Edit Run fleet, 2026-11-17.

1. Initialize fleet identity, launcher credentials, Git helper, push guard and commit hooks. Clone only just-every/run-oncall, retain full history, create cloud/gr-mt-oncall-code-10 from origin/main and read repository rules.
2. Trace CodeQL alert #19 at src/app/useWorkspacePath.ts through legacyWorkspacePath and both navigation sinks. Preserve valid shared links, stakeholder routing, in-app navigation and local unknown-path 404 behavior.
3. Resolve each canonical target against the current origin; refuse external origins, public handler paths and double-slash paths; pass only normalized pathname, search and hash to navigation.
4. Extend the existing shared-link browser journey, with a focused workspace-links selection. Assert canonical section and incident links, signed-out lobby behavior, retained shell, unknown local paths and URL-like hostile fragments at 1440. Capture the changed missing-workspace state once at 1440 and 390.
5. Use pinned Node 22.20.0 and pnpm 10.12.4. Run rer setup, a production build, touched browser journey, typecheck, JavaScript syntax checks, diff check and the pinned source lock generator/check. Keep contract and generated views unchanged.
6. Scan the exact committed source with the pinned Base publication scanner and Gitleaks 8.30.1. Hydrate missing historical blobs if needed, without suppressing findings. Require complete PASS with zero findings before product publication.
7. Inspect all candidate author/committer identities and trailers, then push only the named product branch using cloud-push.py. Discover and poll exact-SHA Verify via REST within the ten-call budget and 300-second polling interval. Fix actionable regressions, preserve unpublished work if blocked, and never push main.
8. Write result.json, full report, actual command/check receipts and browser evidence outside the product tree. Publish selected non-secret files only to evidence/gr-mt-oncall-code-10 using cloud_evidence.py. Return custody, CI IDs, counts, unchanged clause statuses and the required lane POST.
