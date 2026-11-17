# Hono maintenance plan

Author: Run Edit Run fleet, 2026-11-17.

1. Initialize fleet authentication, fresh full-history product clone and branch cloud/gr-mt-oncall-dep-2; read launcher and product instructions.
2. Confirm the installed Hono version and update only the direct dependency to the first patched release, 4.13.11, using pnpm 10.12.4. Install with the frozen regenerated lockfile.
3. Regenerate sources.lock.json with the installed pinned edition-authoring package and check it. Preserve CONTRACT.md and both generated contract views.
4. Commit with fleet author/committer and active fleet hooks. Run the production build, TypeScript check and existing core HTTP coordination journey using Node 22.20.0. Do not add tests or change UI.
5. Refresh origin/main, integrate any drift without rewriting published history, inspect every outgoing commit identity and trailer, and require Base publication scan COMPLETE/PASS with zero findings before the product push.
6. Push only cloud/gr-mt-oncall-dep-2 using the mandated cloud guard. Discover and poll exact-SHA Verify using REST, within the ten-call budget and 300-second spacing.
7. Write result.json and complete non-secret report/receipts. Publish explicitly selected evidence files to evidence/gr-mt-oncall-dep-2, retain terminal provenance, and return the gr inbox relay line plus the truthful READY/PUSHED/BLOCKED outcome.
