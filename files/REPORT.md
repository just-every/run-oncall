# Incident header and autosave feedback

Repository: just-every/run-oncall
Branch: cloud/main-oncall-incident-saves-1

## Plan

1. Refresh the fleet launcher, install credential and commit guards, clone the declared repository, and read AGENTS.md, CONTRACT.md, ACCEPTANCE.md and BRAND.md.
2. Set up the pinned toolchain and reproduce the header, disappearing save feedback, and repeated draft review timeline entries through the emitted Worker HTTP/browser doors.
3. Render only populated incident metadata, keeping separators with the preceding value when the header wraps.
4. Retain successful autosave feedback for service and review fields until their next edit; preserve the existing visible errors and Retry behavior.
5. Keep draft review writes durable and revision checked without adding timeline events; preserve explicit acceptance's attributed immutable snapshot.
6. Extend existing HTTP review and browser autosave journeys rather than adding registrations. Test assertions at 1440 and capture changed screens at 1440 and 390.
7. Run touched journeys and typecheck, update from main without rewriting published history, regenerate and check the source lock last, inspect every candidate identity and trailer, and publish only the named product branch.
8. Discover and poll exact-SHA Verify via REST within the ten-call budget, at most once per 300 seconds. Publish this actual packet separately to the evidence ref and relay the result to main.

No contract Status, Gap or Evidence edits or DONE claim are authorized. No provider, paging, review workflow, or other stranger findings are included. The Mac publication scan and landing remain with the fleet.

## Implementation and observations

The public-door reproduction found that the shared `.incident-meta > * + *::before` rule inserted another dot before the header's timestamp, even after main removed the previous empty lead slot. The 390 capture showed that dot at the beginning of a line. The header now builds a filtered set of metadata values, owns its separators, disables the inherited pseudo-element separator in that header, and keeps each trailing separator attached to the preceding value.

Service and review forms already used the shared SavedState and SaveFeedback components. Their successful state expired after two seconds. A scoped `keepSaved` option now retains success feedback for those forms until a field is edited again. Existing failed-save alerts and Retry remain in place. Feedback is confirmed only by a successful response; initial rendering or reloading does not invent a save receipt.

Draft review writes retain their optimistic revision checks, durable field updates, and permanent author audit. They append no incident timeline entry. Explicit acceptance continues to append the attributed immutable root cause, impact, review and material snapshot. Existing timeline history is preserved. Correcting an accepted review clears its current acceptance while retaining its historical accepted snapshot, as before.

The existing browser autosave journey now includes runbook persistence, transport failure and Retry, review field persistence, transport failure and Retry, phone header line starts, draft timeline equality, and exactly one attributed acceptance event. It captures the changed saved, error, header and accepted-timeline screens at 1440 and 390. The existing reports HTTP journey now performs two draft edits, proves both durable writes and their author audit, and then proves exactly one accepted review entry. Its correction assertions preserve earlier immutable acceptance and check the correction author's separate audit.

## Before and after

| Observation | Before | After |
| --- | --- | --- |
| Phone header | Extra generated dot began the date line | One separator per pair of populated values; no leading separator |
| Successful runbook/review feedback after 2.5 seconds | Absent | Saved remains visible until the next field edit |
| Timeline entries from two draft review edits | 2 | 0 |
| Review timeline entries after explicit first acceptance | Draft noise plus acceptance | 1 attributed immutable acceptance |
| Verify plan command registrations | 16 | 16 |
| Contract totals: done / partial / missing | 22 / 45 / 34 (101 total) | 22 / 45 / 34 (101 total) |

No test file or Verify registration was added; existing journeys were extended, with no cap increase. The optional incident-saves selector reruns the changed browser leg while default CI still runs the complete file. The first browser attempt exposed an incorrectly scoped Playwright filter; correcting the locator produced the passing browser run. This was a test locator issue, not an application refusal or a weakened assertion.

Main was fetched and incorporated by rebase before the first product commit/push. Main's newer coverage tests, source lock, contract text and readable time formatting were retained. The final browser leg is rerun against the merged source, including the new time formatting, at the requested widths.

## Clause scope

No clause status changes. OC-036 remains partial: this slice proves native draft and acceptance behavior, not the issue-provider integrations and complete follow-up obligations in acceptance 1. No complete new acceptance point or DONE judgment is claimed. OC-009's whole accessibility and human conformance obligations remain unchanged. The browser leg checks visible errors and no false Saved state on transport failure, plus responsive header behavior.

CLAIM OC-036 PARTIAL points=none tests=tests/triage.mjs#reports; tests/member-coordination-browser.mjs#incidentSaves
DEFAULT OC-036: Keep the existing explicit human Accept review step and its immutable attributed acceptance snapshot.
GAP OC-036: Remote issue integration, reminder, escalation and full acceptance-point proof remain outside this incident-save polish slice.

## Local validation and custody

All local checks passed. The full touched browser file completed successfully, including its unchanged coordination, production sign-in and scoped automation legs. After main was incorporated, the changed browser leg and HTTP reports/review journey passed on Node 22.20.0, along with typecheck and the production build. Contract document generation check and edition source-lock check passed. `git diff --check` passed. The final-source checks ran before committing; the only subsequently generated tracked content was sources.lock.json. `local-receipt.json` binds the final source file hashes, product tree, head, base and executed checks.

The source lock was regenerated last and committed with the product. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are unchanged. No proof, evidence, screenshots, reports or fleet helper files are included in the product commit. No PR is required by this repository's AGENTS.md; no PR was created. The product branch is intended for the fleet's guarded landing.

Product push succeeded on its first attempt:

`cloud/main-oncall-incident-saves-1` at `cf4615eae88e98457dcb118ddfcadd8363f379c4`

Both author and committer are Run Edit Run fleet <fleet@runeditrun.com>. The candidate has no trailers or CI skip markers. All candidates were inspected after rebase and again by the push guard. No published history was rewritten and no default branch was pushed.

## Branch CI

Exact-SHA Verify: https://github.com/just-every/run-oncall/actions/runs/43012054710

Run ID 43012054710, push event, head cf4615eae88e98457dcb118ddfcadd8363f379c4. The second REST discovery found it in progress. One watcher retains its observations and call count in ci-receipt.json; no run is polled more often than every 300 seconds.
