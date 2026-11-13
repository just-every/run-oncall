# Readable names carry onto current Oncall main

Task: main-oncall-readable-names-1-c1
Repository: just-every/run-oncall
Product branch: cloud/main-oncall-readable-names-1-c1
Original completed round: 21c7b435b0a9b821ba803d7fdef6d9bc6dc71a74
Base: cc64205ca532de3ac8022838ecdd07cfa5bfae73
Candidate: 92a9c25ac24f71c287cd4267dccd6c73196400a1

## Result and scope

The old branch's two commits were squashed onto current main without conflicts. The nine carried source/test files are byte-identical to the original final head. The source lock was regenerated and checked using the repository's documented commands. No additional product fixes were necessary. Main's session-clock correction remains unchanged.

Native Events API setup names its service and supplies the required wire identity inside the copyable request. Routed setup names the key and every allowed service; raw key identity is under deliberate Key details. Configuration audit resolves source/key display names without changing retained records. Readiness shows Oncall and the actual release version. Wire identifiers, storage identities and API/export formats remain unchanged.

## Plan

The full plan is in PLAN.md: initialize fleet authentication/hooks; verify and squash the original head onto current main; run setup/build/typecheck, touched browser flows and the intake lane; inspect 1440/390 proof; refresh main and regenerate the lock; make one fleet commit and push the named branch; watch exact-SHA Verify with REST; publish an explicitly selected report packet on the separate evidence ref.

## Local validation

- Setup and production build completed successfully with the supplied cloud toolchain and subreaper.
- Typecheck passed.
- The existing focused eventsSourceBrowser, extended by readableNamesBrowser, passed through the emitted production Worker and local D1. It copied and executed bearer, signed and routed requests; checked default display names, the hidden raw key field, audit allowance/refusal names, unchanged raw audit, and the actual release version.
- Existing routingBrowser passed at 1440 using a runner outside the product tree. It exercised native keyboard setup, deliberate key details, copied signed command execution, allowances, stale publication refusal, rotation and revocation.
- Four changed views were captured and visually reviewed at 1440 and 390. Native bearer/signed detail samples were also captured. Original screenshot masking conceals one-time private credentials.
- Contract generator check passed. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are byte-identical to the main base; SHA-256 receipts are in contract-receipt.json.
- Vendored edition-authoring lock and check passed. The full actual command output is in source-lock.log.
- Complete intake lane passed: runtime machines, intake and routing. Per-command timestamps and exit codes are in intake-receipt.json. The formerly failing analyticsFixture passed under autonomous and held policy, confirming main's clock correction survives the carry.
- The staged diff has no whitespace errors or credential-shaped matches in the inspected patterns. The full publication scan is reserved for the fleet Mac lander, as the cloud brief requires.

The local checks ran on the candidate's source tree before its sole commit. Exact-SHA branch CI is the complete wall; its result is recorded separately in the CI receipt.

## Before/after counts and clause claims

- Changed everyday views: 4 targeted, 4 passing local browser checks.
- Scheduled journey entries: 16 before / 16 after, across 12 distinct files. No new journey registration was added; the carried helper extends the existing Events source journey.
- Product delta: 10 files, 135 insertions, 20 deletions, including the generated source lock.
- Contract summary remains 26 done / 41 partial / 34 missing / 101 total.
- Clause status changes: none. No Status, Gap or Evidence cells were edited, and no acceptance points are newly claimed.

CLAIM OC-001 PARTIAL points=none tests=tests/product-browser.mjs#eventsSourceBrowser
CLAIM OC-041 PARTIAL points=none tests=tests/readable-names-browser.mjs#readableNamesBrowser
CLAIM OC-054 PARTIAL points=none tests=tests/readable-names-browser.mjs#readableNamesBrowser

## Publication and limitations

Product push: successful on the first guard attempt. Exactly one commit, no merge and no skip marker. Identity/trailer review passed for every candidate commit. The committed tree matches the tree checked locally. Exact-SHA Verify: completed/success, run 43364025209, https://github.com/just-every/run-oncall/actions/runs/43364025209, head 92a9c25ac24f71c287cd4267dccd6c73196400a1. The watcher used 5 task GitHub calls; every run read was at least 300 seconds apart. The existing full push Verify includes the intake shard. No rerun or follow-up product commit was needed.
Authentication recovery: the read at 04:17:52 UTC returned HTTP 401; the launcher bundle was refreshed and fleet Git setup repeated. The next permitted read at 04:22:52 UTC succeeded on the same credential source and still found Verify in progress. The actual failure and subsequent observation are retained in ci-receipt.json and ci-watch.log.
PR: none required by the repository's candidate-branch rules; the fleet owns landing.
Evidence is published separately under evidence/main-oncall-readable-names-1-c1. No proof, report, receipt or screenshot is committed on the product branch. Evidence publication does not declare product acceptance or landing.
No real provider, deployment, paging, live-device or production-readiness claim is made by these local synthetic checks. Existing clause gaps remain unchanged.

Terminal product custody: READY branch=cloud/main-oncall-readable-names-1-c1 head=92a9c25ac24f71c287cd4267dccd6c73196400a1
