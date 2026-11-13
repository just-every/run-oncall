# Oncall API client and saved policy carry

Repository: just-every/run-oncall
Branch: cloud/main-oncall-api-clients-policy-1-c1
Product head: d04294e0a08ad3916a14fbf6091894fbe3fd8ce4
Source round: 5e80a4c80b97818a58b49203ee94016d5aefdbfa
Base: cc64205ca532de3ac8022838ecdd07cfa5bfae73

## Plan and scope

The complete plan is in PLAN.md. Carry the complete original round as one squashed product commit onto current main, preserve main's session-clock fix and contract documents, regenerate the source lock, run touched public-door tests/typecheck and the intake shard, check the two target screens at 1440 and 390, push only the named product branch and require its exact-SHA Verify. Publish these separate reports through the evidence ref.

The squash applied with no conflicts. All 12 non-lock files have exactly the original round's blobs, and the lock was regenerated with the repository tool. No product fixes beyond the carry were needed. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain byte-identical to origin/main. Main's newer tests/oncall-agent-fixtures.mjs remains intact. No proof, evidence, screenshots or fleet tooling enter the product commit.

## Behavior and contract choice

Saved guided policies reopen in Edit policy with the saved class answers and paid-AI answer. Updating Sensitive information preserves every other saved rule and setting. The advanced policy document remains accessible. A custom document the choices cannot preserve opens the advanced editor with an explanation instead of flattening its scoped rules.

DEFAULT OC-053: Keep the original explicit responders:read capability. OC-053 requires a machine acknowledgment to name an active responder. GET /api/v1/responders provides paginated eligible names and IDs; the documentation teaches this step before acknowledgment. Eligibility is checked again at mutation time, ordinary and sensitive agent policy applies, and service-account attribution remains distinct from a person's acknowledgment. This adds no member-management or human-session authority.

## Counts and claims

Before and after: 26 done, 41 partial, 34 missing; 101 total. No clause Status, Gap or Evidence changes. Existing runtime and browser journeys were extended in the original round; this carry adds no tests beyond the original round and removes none.

CLAIM OC-053 PARTIAL points=1 tests=tests/runtime.mjs#automationJourney; tests/member-coordination-browser.mjs#API client saved guided policy editing and public responder acknowledgment
CLAIM BASE-AGENT-007 PARTIAL points=none tests=tests/member-coordination-browser.mjs#API client saved guided policy editing and public responder acknowledgment

## Validation and custody

Setup, production build, source-lock check, contract document check and typecheck passed. The complete intake lane passed: runtime machines (493.4 seconds, including the analytics fixture), intake (76.3 seconds) and routing (119.7 seconds). The focused API client browser journey passed in 41.6 seconds at assertion width 1440; changed client, guided policy and API reference screens were captured and visually reviewed at 1440 and 390. The journey also proved advanced-editor fallback and exact preservation of unmodified policy settings. There are 20 actual screenshots in browser/, with dimensions and hashes in browser-receipt.json. Local commands, exits and log hashes are in local-checks.json; complete output is retained beside it. No test was deleted, skipped or weakened.

The guarded product push succeeded on attempt 1. The candidate has one parent (main cc64205ca532de3ac8022838ecdd07cfa5bfae73), one product commit, fleet author and committer, and no trailers or skip marker. The checkout was clean after moving the test-produced synthetic import receipt outside it. No PR is required by this checkout's landing rules; none was opened. Exact-SHA Verify 43363908228 completed successfully on d04294e0a08ad3916a14fbf6091894fbe3fd8ce4, including the intake shard. Run: https://github.com/just-every/run-oncall/actions/runs/43363908228 . Its watcher used REST at five-minute intervals within the ten-call budget. No rerun or follow-up commit was needed.

Blockers: none. READY is builder custody only; the fleet owns publication scanning, independent landing gates and release. Evidence publication is separate and makes no product acceptance claim. The product clone is removed after successful report transfer; the actual packet and transport receipt remain under the task work directory. Setup raw output is excluded because it can contain a local owner entry. The full fleet publication scan is reserved for the Mac lander as specified by this cloud brief. This report does not claim landing or production release.
