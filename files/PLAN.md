# Dependency maintenance plan

1. Inspect the fresh main checkout, repository rules, manifests, lockfiles and affected dependency parents.
2. Preserve patched Vite 8.2.4. Raise the existing root and mail undici overrides to the first patched 7.30.1; update only transitive zod to patched 4.6.7 (the release selected by pnpm within the existing ^4.5.4 ranges) through pnpm 10.12.4, keeping parent versions unchanged.
3. Regenerate both lockfiles with the pinned package manager. Install both projects with frozen lockfiles, set up the application non-interactively, and regenerate/check the edition source lock last.
4. Commit only the dependency manifests/locks and source lock under fleet identity. Run the production build, TypeScript check and the smallest relevant existing HTTP/runtime journey; do not add version pin tests or run the whole local suite.
5. Find and run Base publication scan against the exact committed tree, requiring COMPLETE/PASS and zero findings before any public product push. If unavailable or failing, preserve a verified bundle and report the actual blocker without publishing product code.
6. Fetch main and integrate any drift without rewriting published commits. Audit every candidate identity and trailer before each guarded push to cloud/gr-mt-oncall-dep-4. Poll exact-SHA Verify with REST at most once per 300 seconds within the ten-call GitHub budget.
7. Write result.json and full non-secret reports/receipts. Publish the explicitly selected packet only to evidence/gr-mt-oncall-dep-4 using the report-only entrypoint. Report product custody independently of evidence transfer, with lane POST and READY/PUSHED/BLOCKED as warranted.

No UI or contract clause/status changes are planned. Existing acceptance judgments and test registrations remain intact. No deployment, paging, main push or landing is authorized.
