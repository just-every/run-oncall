# main-oncall-api-clients-ready-1-c1

Repository: just-every/run-oncall
Branch: cloud/main-oncall-api-clients-ready-1-c1
Base: c3e47a61047a1396df78e337ad76bb7e0a2fd85d
Product head: d4922ff315c71dcf2693b00405b083e121c17397
Exact-SHA Verify: 43150587877; final observations are in ci-receipt.json.
PR: none; the seed uses fleet branch landing.

## Plan and scope

The complete plan is in PLAN.md. This replacement starts at current main, squashes the net API client round, keeps main's newer tests and contract judgments, compares the existing focus journey on main and the candidate, checks the policy prerequisite and client actions, regenerates the source lock last, and publishes one product commit to the named cloud branch. Product and evidence custody remain separate. The fleet owns publication scanning and landing.

## Focus investigation

The requested first read of Verify 43147182798 attempt 2 found it still running. Subsequent REST reads, spaced at least 300 seconds apart, observed that same head 49ae1417e32cb35fdc3343fe2c51ca8e018db0f7 complete successfully on attempt 2. Actual responses are retained in prior-verify.json, prior-verify-latest.json and prior-verify-completion.json.

The unchanged `ONCALL_PRODUCT_JOURNEY=accessibility node tests/product-browser.mjs` passed on the squashed candidate and independently built origin/main c3e47a61047a1396df78e337ad76bb7e0a2fd85d. This includes the Settings > Services native keyboard path and the existing visible-focus assertion, plus incident, stale-write, schedule, override, preview, containment, Escape return, label, overflow and axe checks. Both desktop 1440 and existing phone 390 legs passed. Logs are focus-candidate.log and focus-main.log. A separate candidate browser proof also tabbed to Add service and asserted and captured its visible focus at 1440 and 390.

The earlier focus failure was not reproduced, so no CSS focus cause is asserted and no speculative focus rule was added. The API client CSS change is scoped to `#response-api .integration-client-actions`; the global focus rules and the Services styles are unchanged.

## Delivered behavior

The policy-unset API refusal names “Set agent policy before API clients can read or change records.” The client page shares that sentence, reports current policy state, and links to the supported standalone /agents document or the existing Business policy settings. Explicit class and paid-AI choices remain necessary; no default policy decision or wider grant is introduced. The API reference explains this prerequisite and its supported refusal states.

Client actions remains visible and pointer-enabled without a preliminary hover. The existing browser journey follows the policy link, saves explicit choices, then uses the same key to read only the granted service's incident. The ungranted analytics read remains refused. Protected rotation, revocation and stale-write refusal remain in place.

The separate direct input proof used unforced desktop clicks and phone taps to open Client actions, then native Tab/Enter to open it, rotate and revoke the client, at 1440 and 390. Old and revoked keys returned 401. It also captured Settings > Services with visible keyboard focus at both widths. The actual results are in client-input-receipt.json; no private key value is recorded or shown in these captures.

## Additional repair found locally

The first full run of the touched browser file reached the API client policy flow, then failed when a new navigation to /settings/integrations was interrupted by the policy document's own /agents reload. The successful PUT triggers `location.reload()` in src/modules/agent-door/page-style.ts. Waiting only for its response allowed the journey's next page.goto to race that reload.

The existing journey now starts waiting for the document navigation before clicking Save policy and awaits load before leaving. No assertion was removed or weakened; no forced click or test registration was added. This is the only change beyond the earlier round's net product change and the regenerated source lock. The first actual failure log is retained as browser-api-first-failure.log.

## Counts and claims

Clause statuses before → after: done 25 → 25; partial 42 → 42; missing 34 → 34. OC-053's stored status is unchanged. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain byte-identical to origin/main. No Status, Gap or Evidence cell was edited.

The maintained verification plan remains 16 lane invocations over 12 unique journey files before and after; these are plan counts, not a new test-cap ruling. No test registration was added.

CLAIM OC-053 PARTIAL points=none tests=tests/member-coordination-browser.mjs#OC-053 API client policy setup

This carries the original round's claim: the browser segment proves only the scoped read/setup and client lifecycle subset of acceptance 1, not a complete acceptance point or clause. No DONE claim or promotion is made.

DEFAULT OC-053: Keep the supported shared agent-policy prerequisite. Standalone owners/administrators set it at /agents; Business owners set the Business policy. No policy answer is preselected.

## Validation and custody

Actual final command results, tree identity, source/view hashes and log hashes are recorded in local-checks.json and provenance.json. The final exact-SHA branch Verify is recorded in ci-receipt.json, with bounded API call history in github-calls.json. The product commit contains no reports, receipts, proof scripts or screenshots; those remain in the separate evidence packet.

The complete Mac publication scan cannot run in this cloud, as specified by the task adaptation. Local diff review, identity/trailer review, source lock and generated-document checks are recorded without claiming that scan is complete. The fleet reruns its independent gates before landing. No main push, fast-forward, merge commit, earlier branch rewrite, live deployment, production paging or full OC-053 acceptance is requested or claimed.

The final local touched checks all passed after the navigation synchronization repair: complete tests/member-coordination-browser.mjs, typecheck, explicit rer build, generated-contract check and regenerated source-lock check. The original net API-client runtime and docs changes were preserved. The only additional edit is the existing journey reload wait. The product push succeeded on its first guarded attempt. One product commit was published, with fleet author and committer, no trailer, no merge and no skip marker.

Final product diff: 9 files, 151 insertions and 21 deletions. Before/after clause statuses and verification-plan counts are unchanged within this replacement. Original main-oncall-api-clients-ready-1 evidence is retained as read-only context in original-REPORT.md; its earlier main status counts differ because current main has since advanced.

## Final result

Verify 43150587877 completed/success on exact head d4922ff315c71dcf2693b00405b083e121c17397. Eight GitHub CLI/REST invocations were used in total, including the required prior-run reads; repeated reads of each run were at least 300 seconds apart. Actual commands and timestamps are in github-calls.json. No PR was required or created. No blockers remain. The original rebased head's attempt-2 success was read for diagnosis only and was never used as this candidate's CI proof.

Product custody: the first and only product commit pushed successfully through the fleet guard to cloud/main-oncall-api-clients-ready-1-c1. Evidence is published separately to evidence/main-oncall-api-clients-ready-1-c1. No earlier landing record is readmitted; this replacement branch is the candidate.
