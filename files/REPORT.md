# gr-mt-oncall-code-10: workspace redirect validation

Author: Run Edit Run fleet, 2026-11-17.

Repository: just-every/run-oncall. Product branch: cloud/gr-mt-oncall-code-10.
Candidate: 678f3fe3ed03e412fa211c4d54e4e8f4993eadbb, based on origin/main 09f2821d713460dcd33d0878dc3a7825daccfc5a.

## Finding and change

CodeQL alert #19 names js/client-side-unvalidated-url-redirection at src/app/useWorkspacePath.ts:12. The hook derives a canonical string from the current URL using legacyWorkspacePath, then previously supplied that string directly to window.location.replace when the workspace route was unknown. Known routes went to TanStack navigation. Legacy hash sections and incident IDs are already encoded by the path builder, but the redirect sink did not independently validate the destination. This change adds a boundary check at that sink rather than classifying the alert as a false positive.

The hook now parses the canonical target against the current origin and refuses a different origin, a reserved public/transport path, or a pathname starting with two slashes. It sends only the validated normalized pathname, query and hash to either navigation sink. Valid workspace sections, incident sharing, stakeholder /status routing and local unknown-route 404 behavior are retained. No homepage, copy or owner screen redesign was performed.

Files changed:
- src/app/useWorkspacePath.ts: destination origin/path checks and normalized navigation arguments.
- tests/product-browser-journey.mjs: extend sharedIncidentLinks with five hostile URL-like legacy fragments, external navigation interception and local 404 assertions; expose the existing journey for focused use.
- tests/product-browser.mjs: add workspace-links selection using a synthetic service and incident, and capture the changed unknown-workspace state at 1440 and 390.
- sources.lock.json: regenerate the three touched source hashes with the pinned package.

## Validation

Node 22.20.0, pnpm 10.12.4, rer package 0.2.118, system Chromium /usr/bin/chromium with --no-sandbox.

- Fleet launcher refresh, decrypted-bundle Git helper, clone-local fleet identity and forwarding commit hooks: installed.
- pnpm install --frozen-lockfile: passed. rer setup --owner-email fleet@runeditrun.com --non-interactive: passed; the temporary setup server exited.
- cloud_run npx -y @runeditrun/rer build: passed.
- pnpm run typecheck: passed on the pinned Node.
- ONCALL_PRODUCT_JOURNEY=workspace-links ONCALL_CHROMIUM_PATH=/usr/bin/chromium ONCALL_BROWSER_EVIDENCE=<packet>/browser cloud_run node tests/product-browser.mjs: passed through the emitted production Worker and real browser.
- Shared-entry proof covers 19 canonical section/incident addresses, each in one hop; signed-out shared links retain the lobby without incident data; ordinary in-app section navigation retains the mounted shell; missing incident links show the workspace not-found door.
- Five hostile fragments (absolute HTTPS URL, protocol-relative URL, backslash authority, relative sign-in traversal text and API path text) stay on the current origin as encoded local workspace paths, show a workspace not-found page and answer HTTP 404. No external document navigation was attempted. Assertions run at 1440; screenshots show the missing-workspace state at 1440 and 390.
- node --check for both changed JavaScript test files and git diff --check: passed.
- node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and the same tool check: passed. Generated contract views were not changed.
- Candidate author, committer and full messages including all candidate parents: fleet identity, no trailers.

The existing runner footer mentions its usual keyboard smoke even in focused modes. The focused PASS line and checks.json describe this run accurately: workspace-link assertions at 1440 and screenshot evidence at both widths; no unrelated keyboard journey is claimed.

## Counts and scope

One listed alert addressed in code; zero new test registrations (the existing shared-link journey is extended and can now be selected independently). Five hostile-input cases added inside that journey. Contract counts before/after: done 26 -> 26, partial 41 -> 41, missing 34 -> 34, total 101 -> 101. No clause status, gap, evidence or acceptance text changed; no DONE/PARTIAL promotion is claimed. CodeQL alert state was not queried or dismissed; an independent analysis must confirm closure.

## Publication and custody

The first Base publication scan was INCOMPLETE because the blobless mirror lacked historical blobs. No push occurred. Missing objects for the full source ref set were then fetched using the configured fleet Git helper, with zero missing objects remaining. The rescan is complete and FAIL: 2,388 commits, 2,223 trees, 15,115 blobs and 25 tag messages inspected. It returned 568 findings: 567 in existing history and one invocation-context error. None names a changed file or the candidate release tree. The original context arguments incorrectly used a short project name and a bare repository. The independent destination validator passes with project just-every/run-oncall and repository https://github.com/just-every/run-oncall. The other 567 findings are unaffected by that correction. No passing scan is claimed. The scan inspects raw committed source plus full mirrored history, using pinned Gitleaks 8.30.1; no generated local setup secrets or browser-session files enter the publication tree.

Full plan: PLAN.md. Actual check receipts: checks.json, source-lock-check.json, identity-check.json, production-build.log, typecheck.log and workspace-links.log. Browser evidence: browser/workspace-navigation-1440.png and browser/workspace-navigation-390.png. No credentials, environment dump or held-out gate material is selected for evidence publication.


## Terminal result and blocker

Product commit is locally complete and clean but unpublished. The brief explicitly requires COMPLETE/PASS with zero findings before a public product push. Four historical findings occur in origin/main ancestry: SEC-3 on tests/checkpoint-fixtures.mjs, tests/fixtures/credential-opsgenie.json and tests/runtime-authority.mjs (example historical commit 8719aa71ce8ad045f2779a6db025f828ec41fc49), and hygiene.email in an old commit message (example d009af8859f38727c619df281f93920ca9afd5ed). The remaining historical findings belong to other mirrored refs. No matched secret content or personal address is included in this report. Cleaning or rewriting published history is forbidden and outside this redirect fix. No scanner exception or suppressed finding was added.

Correct destination validation command (exit 0): python3 -B node_modules/@runeditrun/rer/scripts/publish-check/destination.py --repo <product clone> --ref HEAD --project just-every/run-oncall --repository https://github.com/just-every/run-oncall.

Product push: NOT ATTEMPTED because publication gate failed. There is no Git transport rejection, failing push command or HTTP response to report. Exact-SHA Verify: NOT RUN; run IDs: none. PR: none. READY/PUSHED: neither is claimed. The fleet can recover the tested branch and apply its authorized publication/landing process; no additional product scope is proposed by default.

The unpublished clone and full candidate ancestry are retained. A bundle outside the clone is verified and contains the named product branch. Its absolute path, size, full head and SHA-256 are recorded in bundle-receipt.json and custody.json. result.json is written both in the maintenance task root and this packet with status cannot and security true (the code change addresses the security finding; publication remains blocked).

Evidence publication is separate report-only custody and does not signal product acceptance or readiness. The complete explicitly selected packet is published only to evidence/gr-mt-oncall-code-10; the terminal EVIDENCE line identifies its exact ref and head.
