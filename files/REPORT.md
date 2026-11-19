# Oncall append-only test merge report

Signed by Codex for the Run Edit Run fleet, 2026-11-19 UTC.

## Plan and scope

1. Review the last ten evidence rounds among the last 40 commits on main. Count each file once per round, including the round's preparatory commits.
2. Add a commented built-in Git union rule for each of the three agent test files named in the brief and for the additional test files touched by three or more rounds.
3. Register one regression in the normal Verify changes lane. Copy the real attributes and the tail of the real agent browser test into scratch Git history. Append two different assertion blocks and test an ordinary merge and rebase. Require each block exactly once, no conflict markers and a successful Node syntax check in both cases. Remove the one browser attribute from a separate scratch copy to prove the regression detects the default merge conflict.
4. Run the focused regression, typecheck and the ordered build checks. Verify contract generation, restore the generated views, and regenerate and check the edition lock last. Fetch and rebase against current main, inspect the candidate and guarded-push the named branch. Observe exact-SHA Verify and attach this packet separately.

## Recent history

The base was 3e278dea3b663bc5d8cd4b66889b2e85b24d7cc8. Its root had no .gitattributes. Evidence rounds were identified by the commits that recorded contract evidence, with preparatory commits grouped by subject. Regeneration commits and product-only fixes were excluded from the ten-round count.

| Evidence round | Commits counted | Test paths touched |
| --- | --- | --- |
| Follow-up link | 1824071 | agent-door-browser, oncall-agent-flow |
| Communications-owner authority | 26b686d, 3848279 | member-coordination-browser, triage |
| Personal triage view | 3a08d78, c3c898b | product-browser-journey |
| Completed resolution | 5417bb8 | agent-door-browser, oncall-agent-flow |
| Acknowledgment parity | 5dba188, c131d98 | agent-door-browser, oncall-agent-fixtures, oncall-agent-flow |
| Declared incident link | e9edfd3, 938b414 | agent-door-browser, oncall-agent-fixtures |
| Alert chronology | 103446c, 91aac69 | product-browser-journey, triage, triage-time-fixture |
| Read-only runbook | f69c6f3, a884000 | None |
| Native Communications refusal | afa0187, bf9f806 | triage |
| Saved mail drafts | 60d13f9, 1e663a6 | product-browser-journey, product-browser, routing |

The rule covers **tests/agent-door-browser.mjs** (4 rounds), **tests/oncall-agent-flow.mjs** (3), **tests/oncall-agent-fixtures.mjs** (2, explicitly named), **tests/product-browser-journey.mjs** (3) and **tests/triage.mjs** (3). The extra browser and triage files also receive edits inside existing flows, so their overlapping edits warrant care. Other test files each appeared once. Git union keeps both sides' lines verbatim. Concurrent additions at the same location can duplicate imports, exports or closing braces, or break JavaScript. The focused regression checks the append case. Verify checks the candidate's existing suites, and the lander checks the exact integration SHA.

## Results

- Union rules for the named scope went from 0 to 5. The shared shard plan went from 21 to 22 registered scripts or script variants. Existing test registrations were retained and the new reader is recognized by the existing light-Verify selection logic.
- The failure when the browser attribute is removed is recorded in CHECKS.txt. All local required checks passed under the project's Node 22.20.0 and pnpm 10.12.4, including the first-party check, production build and typecheck in the seed's documented order.
- No contract clause claimed; this is merge configuration for test files.
- Contract counts before and after were 26 done, 41 partial and 34 missing (101 total). Core was 25/35/24 and Agent surface was 1/6/10. The generator wrote zero documents and reported zero prose errors or warnings.
- The guarded product push published c31772574d3946b8737b89608614849202123cc5 to cloud/sd-oncall-union-merge-1. The pre-push fetch found the same main base and rebase left the candidate unchanged. The candidate range contained one commit with fleet author and committer identity and no trailers.
- The product branch uses the fleet landing path. Its publication scan is run by the Mac lander.
- GitHub Verify run 44580102051 completed successfully on the exact published SHA, confirmed at 2026-11-19T18:02:57Z. https://github.com/just-every/run-oncall/actions/runs/44580102051
