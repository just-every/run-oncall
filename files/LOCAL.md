# Exact candidate local receipt

Repository and branch: just-every/run-oncall · cloud/sd-oncall-c-f298

Commit: 8b9d6a9c069e39ccb0527f5c3f17ad8dc328c16d

Base at candidate push: 50a05ac92632c5eba8f30cc0b9405fcab4df685b

Preservation save: d1dd333456da6a4a83f89c7753113c19dcbcd0c8

| Check | Result |
| --- | --- |
| Emitted Worker build using the candidate tree | Exit 0 |
| pnpm run typecheck | Exit 0 |
| node tests/member-coordination-browser.mjs | Exit 0 |
| ONCALL_TRIAGE_PART=storm node tests/triage.mjs | Exit 0 |
| pnpm exec rer check --profile first-party | Exit 0 |
| node src/base/contract-docs.mjs write, then check | Exit 0 for each with refreshed views. The contract prose check reported zero errors and warnings. |
| Restore ACCEPTANCE.md and docs/CLAIMS.md from origin/main | Exit 0. Checked-in ACCEPTANCE.md differs from the generated candidate view as expected. |
| node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock, then check | Exit 0. Repeated the check after the commit. |
| Migration ledger | Inapplicable because the diff contains no migrations. |
| Candidate identity and trailers | Both product commits carry fleet author and committer identity and have no trailers. |
| Candidate hygiene | Clean diff check and no added email-shaped literals. Changed source tokens with slashes are real file or request paths. |

The initial browser invocation detected the missing managed Playwright cache in the mail-off prerequisite. Installing the pinned browser resolved the prerequisite. The exact-candidate rerun passed with system Chromium for browser automation.

PASS OC-061 direct stakeholder details: owner reads populated incident, alert and service; stakeholder lands on Checkout status with no private document, response or hydrated content at 1440 and 390; custody intact and zero outbound requests
PROBE OC-061 6: signed-in communications owner saved major outage with reason and attribution at revision 7 -> 8; derived degraded. Same session as active viewer read the override and no management controls; current-revision POST returned 403, with one refusal audit and unchanged native and paging custody. Both roles captured at 1440 and 390 with zero outbound requests.
PASS OC-061 communications owner override: one attributed revision with derived status preserved; demotion keeps reads and refuses a valid override with unchanged status and paging custody
