# Oncall Hono maintenance

Prepared by Codex on 2026-11-18 UTC.

The direct Hono dependency moved from 4.13.7 to 4.13.16, the first release that fixes all five advisories in the brief. The ten Dependabot entries refer to these five advisories.

- GHSA-46wx-v44x-9hh2
- GHSA-4h7h-rv7c-7m2v
- GHSA-4m76-xfj5-7975
- GHSA-h7mg-cq63-vhpq
- GHSA-3gg2-335m-rxc6

## Plan and changes

1. Update the exact Hono pin in `package.json` and resolve it in `pnpm-lock.yaml` with pnpm 10.12.4. Confirm the frozen install on Node 22.20.0 resolves one Hono version, 4.13.16.
2. Verify contract generation and restore the generated views at the base revision. Regenerate the edition source lock with the repository’s pinned authoring tool. The two source-lock digests correspond to the changed package files.
3. Build the committed candidate, typecheck it, and exercise the emitted Worker through the core coordination and intake journeys. These cover application routes, authority and input handling through the Hono API server.
4. Scan the exact committed candidate with Base’s publication check, push the named branch, and check the exact-SHA Verify run. Return this report and the execution receipt through the evidence ref.

Three files changed. One direct dependency changed. The resolved Hono version count moved from one vulnerable version to one patched version. The count of affected advisories from this brief moved from five to zero for the candidate. GitHub alert closure follows landing on the default branch.

All 101 clauses retain their judgments and evidence. The full target counts are 26 done, 41 partial and 34 missing before and after. The Core counts are 25 done, 35 partial and 24 missing. The Agent surface counts are one done, six partial and ten missing. No test definitions changed. No UI work was required.

## Results

- Branch `cloud/gr-mt-oncall-dep-8` advertises exact product commit `96bcc22b78c4c0488d7bd4a7b63c68fc291c0995`.
- Frozen installation, local setup, production build, typecheck, contract generator check and edition source-lock check passed. The generated contract views already matched the base.
- The core coordination and intake journeys passed against the emitted Worker. The core journey exercised session authority, request validation, API event routing and incident coordination. The intake journey covered native events and compatible monitoring and email input.
- Base publication scan completed on the exact commit with zero candidate findings across 1,269 commits. The scanner separately recorded four already-public findings against the published baseline.
- Exact-SHA Verify run 44405347928 completed successfully. [Verify run](https://github.com/just-every/run-oncall/actions/runs/44405347928)

The reported product commit is ready for guarded fleet landing. The execution, scanner, and CI receipts are selected alongside this report.
