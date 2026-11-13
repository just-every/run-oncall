# API client policy and responder result

Repository: just-every/run-oncall
Branch: cloud/main-oncall-api-clients-policy-1
Head: 5e80a4c80b97818a58b49203ee94016d5aefdbfa
Base: 809d67a8fbf255ee13e8531e4246a1ffbddf2fa4
Product push succeeded. No PR is required by this checkout's landing instructions; none was created. The fleet owns landing and its publication scan.

## Plan and implementation

The full plan is in PLAN.md. The emitted Worker/browser reproduction found eight initial choices, zero saved guided controls, and only the document editor. Saved guided controls now increase 0 -> 8 with the paid-AI answer retained; the responder lookup changes 404 -> 200 for an explicitly granted client. The responder endpoint returned 404 (BEFORE.json).

Saved policies that the existing form can completely express now expose Edit policy, filled with every saved answer and the paid-AI answer. Changing Sensitive information changes only its rule and any approval fields implied by that answer; rule order, IDs and every other setting remain intact. The document stays under the advanced editor. A policy with scoped exceptions or other unsupported settings explains the limitation and opens that document without flattening it. No new policy choices or model were introduced.

OC-053 requires a machine acknowledgment to name an active responder; an implicit default would change that contract. The chosen public door is GET /api/v1/responders under the explicitly granted responders:read permission, selectable as Responders in API client creation. It returns only eligible active responder/admin names and IDs. It shares signed cursor pagination, rate limiting, token revocation and service-filter fences with the other read families, and goes through oncall.responders.list at the existing standard+sensitive policy chokepoint. It adds no member-management or human-session authority. The acknowledgment continues to check active eligibility and service grants, assign responsibility and attribute the action to the client. The API reference puts lookup and selection beside the transition example. The native tool inventory and maintained conformance fixture include the new read.

## Verification

The existing API client browser journey passes at 1440: fresh policy setup; saved guided reopen; all prefilled answers; one Sensitive information change and exact preservation of the rest; approval removal; advanced fallback with exact custom-document retention; explicit client grant; scoped incident read; public responder lookup; and acknowledgment using only IDs obtained from documented APIs. It also retains pointer rotation/revocation, stale-management refusal, outbox and permanent machine-attribution coverage. The changed policy, API client and reference screens are captured at 1440 and 390 under browser/. Desktop policy checks find no serious/critical accessibility findings and no horizontal overflow. The phone captures were visually inspected.

The extended runtime automation journey passes its OC-053 scope, missing responder grant, exact eligible name/ID projection, inactive/non-responder exclusion, named acknowledgment, pseudonymous audit attribution, revocation, replay, cursor, capacity and restore checks. The wider machines invocation later fails at the brief's known analyticsFixture frozen-clock session expiration: tests/oncall-agent-fixtures.mjs:284, 401 != 200. That unrelated clock issue was not changed or rerun. The full actual output is RUNTIME-TEST.txt; this report does not label that overall command green.

The separate `node tests/agent-door.mjs` conformance and fresh/held-data adoption check passes 8,975/8,975 points, including the new read fixture (CONFORMANCE.txt). Typecheck, native inventory freshness, source lock check, generated contract-document check and diff whitespace check pass. No full local verify was run. CI is the full wall. Exact-SHA Verify run [43353321898](https://github.com/just-every/run-oncall/actions/runs/43353321898) completed with failure. Plan and build passed. The runtime, browser, changes, triage, transfer and hosted shards passed. Only shards (intake), job 131650377753, failed at Run this shard; the verify aggregator consequently failed and full-push-proof skipped. The failed-job archive was read once with `gh run view 43353321898 --repo just-every/run-oncall --job 131650377753 --log-failed`. It confirms precisely the known analyticsFixture expiration at tests/oncall-agent-fixtures.mjs:284, 401 != 200, reached through oncall-agent-flow.mjs:672. Per the brief this known failure was not rerun. CI-DISCOVERY.json, CI-POLL-*.json, CI-LATEST.json, CI-JOBS.json and CI-FAILED-INTAKE.txt retain the actual observations. The watcher made one discovery and three status polls, at least 300 seconds apart; job metadata and the single failed-log archive bring the total to six gh invocations.

## Counts, claims and limits

Contract counts remain 26 DONE / 41 PARTIAL / 34 MISSING = 101. No clause Status, Gap or Evidence was edited. Two existing journeys were extended, with no new test registration; the verification plan remains 16 configured entries. Native tool declarations increase 42 -> 43 and conformance fixture steps 65 -> 66. No DONE claim is made.

CLAIM OC-053 PARTIAL points=1 tests=tests/runtime.mjs#automationJourney; tests/member-coordination-browser.mjs#API client saved guided policy editing and public responder acknowledgment
CLAIM BASE-AGENT-007 PARTIAL points=none tests=tests/member-coordination-browser.mjs#API client saved guided policy editing and public responder acknowledgment
DEFAULT OC-053: Require an explicit responders:read grant for the minimal name/ID lookup; retain the contract's explicit member acknowledgment and service-account attribution.

The guided-edit proof covers this bounded UX behavior, not every BASE-AGENT-007 acceptance point. Paid-AI caps remain outside this form as before. The workspace currently allows any active responder/admin to be named for an incident in the client's granted services; no team-privacy model was invented here. Deployment, paging delivery and full clause completion are not claimed. The pre-existing clock failure remains the known Verify risk. Evidence publication is report transport only, never product READY or landing.

## Terminal custody

Product branch is pushed at 5e80a4c80b97818a58b49203ee94016d5aefdbfa; no unpublished product work remains. All author/committer identities and complete candidate messages were inspected before the guarded push, with fleet identity and no trailers. No main/default-branch push, history rewrite, contract-judgment edit or PR was made. Product status is BLOCKED only on Successful exact-SHA Verify due to the named pre-existing clock fixture. The scoped implementation is complete; the fleet's clock round owns the prerequisite. Separate evidence transport does not change that status.
