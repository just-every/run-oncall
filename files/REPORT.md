# Oncall test event carry

Repository: just-every/run-oncall
Branch: cloud/main-oncall-test-event-results-1-c1
Candidate: 4397efcb37f73ca21efe4eef872c5fa7b4cee1cb
Parent/current fetched main: cc64205ca532de3ac8022838ecdd07cfa5bfae73
Source: b9e47fa70881e514b14d3ffed5a224bc7d1c6b5f
Original merge base: 809d67a8fbf255ee13e8531e4246a1ffbddf2fa4

## Plan and carry

The full executed plan is in PLAN.md. Refresh the fleet launcher, install credential/push/hook guards, clone full history, confirm the old branch head, squash its change onto current main, preserve contract documents, regenerate and check the source lock, create a single commit, run the affected browser and intake journeys plus typecheck, publish the product branch, wait for exact-SHA Verify, then separately publish explicitly selected non-secret evidence and receipts.

The squash applied cleanly. There is exactly one commit above main, with one parent and no merge commit. The carried four-file product/test patch is byte-identical to the original round's patch. Only those four files and the generated sources.lock.json changed. No carry-specific repair was necessary. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are byte-identical to main, as is tests/oncall-agent-fixtures.mjs with the session-clock fix. Product custody and evidence publication are separate.

## Behavior selected

The form exposes and reuses the PagerDuty-compatible receiver's documented dedup_key. Compatible receivers derive lifecycle generations from that key and receipt order; a resolve closes the generation open when received, and a later trigger reopens a new generation. The form recovers the trigger it sent, retains the entered private key while mounted, and restores the durable outage key after returning from Alerts. Navigation does not persist the private key.

Immediate refusals use the allowance explanation shared with Rejected requests and identify retry time or the Per-key rate allowance setting. A rotated valid key keeps the same allowance refusal. Wrong-key refusals identify authentication and explain copying or rotating the current key. Native Events API key clearing remains explicit beside the field. Receiver acceptance rules and limits are unchanged.

## Counts and claims

No clause status, gap or evidence changed. The core summary remains 26 DONE / 41 PARTIAL / 34 MISSING, 101 total, before and after. OC-055 and OC-084 remain PARTIAL. Existing eventsSourceBrowser is extended, with zero added registrations; the verification plan still has 16 lane journey entries before and after. This count is the lane plan, not a claim to have recounted every internal assertion as a test.

CLAIM OC-055 PARTIAL points=none tests=tests/product-browser.mjs#eventsSourceBrowser
CLAIM OC-084 PARTIAL points=none tests=tests/product-browser.mjs#eventsSourceBrowser
DEFAULT OC-055: Use the explicit visible dedup_key, as the compatible receiver derives its own lifecycle generation.
GAP OC-055: Synthetic local browser and receiver proof does not establish live unmodified vendor sender or production paging acceptance.
GAP OC-084: This bounded form-result proof does not establish every allowance acceptance point across all source kinds.

## Local validation

Contract document check and vendored edition-authoring source-lock check passed. Setup, candidate build and candidate typecheck passed. Browser/intake results and exact-SHA CI are recorded in the completion section below and their actual receipt files.

## Publication boundary

Fleet identity and commit-hook cleanup stay active. No credentials, environment dumps, proof files or screenshots enter the product branch. The local candidate diff is checked for scope and credential-shaped content before push. The full publication scan remains the fleet Mac lander's prerequisite; no unavailable Mac scan tool is used in this cloud run. No main/default branch or old product branch is pushed, and no PR is required by this repository's rules.

## Browser results

The exact-candidate focused events-source journey passed through the built Worker and real local D1. The compatible same-mounted-form Trigger/Recover pair ended recovered; reopening and returning from Alerts restored the same outage key and a second recovery left both generations recovered with zero active alerts. Private key input persisted between sends but was empty after navigation. Native allowance failures returned HTTP 429, Retry-After and retry-or-raise guidance for both the original and rotated valid key. Wrong keys returned compatible 400 and native 401 with key/signature repair guidance. Refused requests preserved alerts and events.

Behavioral assertions ran at 1440. The four changed states (compatible Recover form, recovered Alerts list, authentication refusal and allowance refusal) were captured once at 1440 and 390 with password fields masked. The reviewed desktop/phone form and Alerts screenshots fit the viewport and show no active compatible test alerts after recovery. The original source recovery and signed/bearer sample-request regressions also passed.

## Product push

The only product push succeeded on its first guard attempt to cloud/main-oncall-test-event-results-1-c1 at 4397efcb37f73ca21efe4eef872c5fa7b4cee1cb. Candidate author and committer are Run Edit Run fleet <fleet@runeditrun.com>, with no trailers; no published history was rewritten. The clone was clean and the current fetched main was still cc64205ca532de3ac8022838ecdd07cfa5bfae73 immediately before push. Exact-SHA Verify run 43363012811 was discovered in progress; subsequent observations are recorded in ci-receipt.json.

## Session-clock regression

The candidate machine-intake suite completed successfully in 631.43 seconds. Its analyticsFixture-backed response analytics and readiness journey passed under both autonomous and held policies, including the login/coordination door that produced the original expired-session 401. The actual successful output is retained in session-clock-regression-receipt.json and intake-machines.log. No clock fixture code was changed by this carry.

## Completed local checks

| Check | Exit | Seconds |
| --- | ---: | ---: |
| build | 0 | 13.17 |
| typecheck | 0 | 4.17 |
| events-source | 0 | 47.14 |
| intake-machines | 0 | 631.43 |
| intake | 0 | 97.34 |
| routing | 0 | 168.19 |

Every listed receipt names the exact candidate SHA. The intake lane consisted of runtime machines, intake.mjs and routing.mjs, run sequentially in this dedicated VM. The full local suite was not repeated; exact-SHA branch Verify supplies the full wall. No new tests beyond the carried extension were added.

The additional first-party source check (`pnpm exec rer check --profile first-party`) also passed on the candidate.

The intake suite emitted an untracked synthetic imported-email receipt file. It was moved unchanged into this packet as intake-imported-email-receipts.json; it was never staged or committed to the product branch. The post-test product tree is clean.

## Final exact-SHA CI and custody

Verify run 43363012811 completed/success on exact candidate 4397efcb37f73ca21efe4eef872c5fa7b4cee1cb:
https://github.com/just-every/run-oncall/actions/runs/43363012811

The full branch workflow is green, including its intake lane. The local intake lane also passed the previously failing analyticsFixture-backed journey. Five GitHub API calls were used, with one watcher and at least 300 seconds between discovery/observations. No failed-job logs or reruns were needed. No contract-generator exception was used.

No carry blocker remains. The product branch is pushed and independently verified at the exact candidate SHA. The report, all actual local receipts and logs, and the focused browser journey's complete masked screenshots are selected explicitly for evidence/main-oncall-test-event-results-1-c1 only. Evidence custody does not promote clause status or claim landing; fleet landing and its publication scan remain separate. The finished product clone will be deleted after successful evidence publication; this packet stays outside that clone.

Final before/after results: each test outage had one active alert before recovery and zero afterward; two compatible generations are recovered. Added test registrations: 0. Clause status changes: 0; OC-055 PARTIAL and OC-084 PARTIAL remain unchanged. Core summary before/after: 26 DONE, 41 PARTIAL, 34 MISSING, 101 total. Carry-specific fixes: none. Product commits ahead of fetched main: 1, merge commits: 0. PR: none required or created.
