# Oncall alert journeys — linear re-apply

Author: sd / Run Edit Run fleet. Date: 2026-11-17 (UTC).
Repository: just-every/run-oncall. Product branch: cloud/sd-oncall-design-alerts-2.

The full work plan is in PLAN.md. This round re-applies the earlier alert/incident work as ordinary non-merge history on fresh main. It changes no release metadata, rer pin, tag or contract clause.

## Provenance and main preservation

Confirmed the previous branch at 467a003cbfba15bb1f8e297d734e90d27faf6bd1. Started from main at 0f19e1a989c05a824ee75024665fb5c22da06252. Applied the net diff from the round's base, 09f2821d713460dcd33d0878dc3a7825daccfc5a, excluding its old sources.lock.json. This carries the round's fixes without its merge commits.

The only apply conflicts were the imports in src/api.ts and one browser step in tests/product-browser.mjs. Both installation-name and test-alert imports were retained. Main's collapsed Details step remains, beside the reapplied title-case alert-state expectation. Main's newer response-policy application/retry assertions remain intact. Other newer main work retained includes installation naming/sign-in, team editing/access, submission recovery/retention/revision assertions and portability cookie validation. ancestry-receipt.json lists the newer main commits and every file differing from the old candidate; every difference except the newly generated source lock belongs to newer main.

## Results by item

| Item | Main baseline, reproduced on the built page | Reapplied behavior and public-door proof |
| --- | --- | --- |
| D4 | No test button on Alerts or a created source; Email offered without a receiving domain. | Session-only Send a test alert on Alerts and created integrations. Service selection defaults to the first service; results name the service and link to the alert. Email is disabled with an explanation when no receiving domain is configured. Copied native and compatible sender commands include held keys and execute unchanged through public receiver doors. |
| D5 | Reload selected Recover and retained the alert key. | Each default send uses a fresh alert identity. More options exposes adding to an open alert and closing it, with explicit result effects. Native and compatible samples prove new/add/recover behavior and receiver refusals. |
| D6 | Alert and incident had no current-rota section. | Both show live primary and backup names from service rota coverage and offer Take it. This round takes the permitted manual-ownership choice rather than auto-assignment. The owner journey proves saved alert ownership and incident assignee. |
| D7 | Mark recovered required a link. | Resolve requires an inline-validated note, accepts no link, and records recovery at resolution with an optional earlier time. Mitigating and Recovered stay optional steps. Native archive validation accepts optional evidence, and bulk resolution retains an earlier link when no replacement is supplied. |
| D8 | Resolving left the linked alert active; no Close alert button existed. | Resolve defaults Close the alert too to selected; an explicit opt-out retains the alert. Direct Close alert works separately. The browser journey proves closed list grouping and immediate navigation count refresh. Source recovery still leaves its incident open; client transitions retain their source-driven alert lifecycle. |
| D9 | No Reopen button or menu item on a resolved incident. | Both doors reopen with an optional reason, attribute the timeline to the responder, restore the prior open state, and dismiss the dialog. The journey covers reopening to acknowledged and declared. |

Main's failures were captured against its existing emitted Worker before rebuilding. before-receipt.json records the actual observations and before/ images. The candidate's owner-alerts-receipt.json, test-event-receipt.json and timeline-receipt.json record actual public-door runs; after/ contains changed screens once at 1440 and 390. Assertions use 1440. The phone images are presentation evidence. The existing source timeline proof also keeps its established timezone/phone boundary assertions.

## Truthfulness and verification limits

The test-alert handler calls admission/response-policy code and reports the resulting alert. Held keys remain in server custody for browser tests; copied terminal commands explicitly include the key and warn to keep it private. The no-paging statement matches the paging OFF state and the owner journey's zero-outbound ledger assertion. Primary/backup names come from the same service schedule resolver as the on-call view. Resolve and Reopen are checked against persisted state, immutable lifecycle metadata, native archive loading, client history and browser results. No unsupported behavior sentence was added or dropped in this linear re-apply.

Main's new Details placement and installation behaviors were preserved. The actual current date is used for stamps. Screenshots contain synthetic owner/service data, and credential fields are masked.

## Test and clause accounting

Configured public-journey registrations: 21 before, 21 after. Unique configured test scripts: 15 before, 15 after. The new helper extends the existing Events source journey; it adds no verify-plan registration. These counts describe the repository's existing configured journey entries, not an expansion of every assertion into a separate test.

The earlier round's obsolete required-link refusal was replaced with malformed-optional-link refusal in runtime/triage; required-note refusal remains and the owner journey proves no-link success. Existing source test expectations were updated for the deliberately changed fresh-alert default, with explicit add/close and invalid-key receiver behavior retained. Main's newer tests were preserved.

Contract counts: 26 done / 41 partial / 34 missing / 101 total before and after. No clause Status, Gap, Evidence or acceptance point changed. Generated ACCEPTANCE.md and docs/CLAIMS.md are unchanged.

No contract clause claimed; these are owner-journey design fixes (DIRECT 87).

## Publication

Actual command results, final product SHA, source-lock check, commit identity/linearity, push receipt and exact-SHA CI outcome are recorded in validation-receipt.json and ci-receipt.json. The source lock is regenerated last with the installed package pin. Local checks are limited to affected journeys and typecheck; full Verify belongs to the exact pushed SHA.

The cloud does not run the fleet's public-history publication scan or land main. The fleet owns that scan and landing, as specified by the cloud adaptation. Product custody and report-only evidence custody are separate; evidence publication does not signal acceptance or landing. No PR is required by this repository's AGENTS.md, and no PR was opened by this task.

Final product head: `be2d69c6021f5318eb2256584a5aaa060aba6a37`. One candidate commit, zero candidate merges, clean checkout. The first guarded product push succeeded on attempt 1. The exact-commit build and Events source/owner browser journeys passed; `/health` independently returned this full SHA for the supplemental result-line/inline-validation captures. All affected runtime, triage, policy and role journeys passed. Source lock regeneration and check passed; the post-build lock recheck also passed. Actual sanitized logs are in logs/. Final CI status is recorded in ci-receipt.json.
