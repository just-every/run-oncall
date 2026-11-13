# Oncall recipes carry

Tag: main-oncall-recipes-toolchain-1-c1
Repository: just-every/run-oncall
Branch: cloud/main-oncall-recipes-toolchain-1-c1
Head: 8e18f79b63ec045d3efcc625e6f994aca8319e88
Base: cc64205ca532de3ac8022838ecdd07cfa5bfae73
Original round: 8b21d6ea781a11d750e5434cb3d107b534d01215
Original merge-base: 809d67a8fbf255ee13e8531e4246a1ffbddf2fa4

## Change

One commit, one parent, no merge commit and no skip-CI marker. The five product/test/documentation file patches are byte-identical to the original round's patch against its merge-base. The edition source lock was regenerated with the documented tool against current main and passed its check. The squash had no conflicts and required no compatibility fixes. The clock fix from main is retained.

The Events API HMAC recipe signs with OpenSSL and shell tools. All Change Events recipes now use shell, curl and OpenSSL, including native bearer/HMAC, Argo CD, Terraform, GitHub, GitLab Standard Webhooks and PagerDuty-compatible change events. Source pages name the prerequisites and provide copied shell run commands. Hosting and explicit setup docs begin with the installer-provided `rer` launcher; no global Node or npx prerequisite remains in these changed paths. Receiver authentication and signing contracts are unchanged. No Base installer change is needed; an alternative Base solution would expose its private Node on PATH, but this round deliberately makes Oncall's displayed recipes work with the tools they name.

## Scope and counts

CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are byte-identical to origin/main. Clause counts before and after: done 26 -> 26; partial 41 -> 41; missing 34 -> 34. OC-018, OC-033 and OC-065 remain PARTIAL; no Status, Gap or Evidence judgment changed. Existing senderSetupBrowser and eventsSourceBrowser journeys were extended; zero test registrations were added. The product commit contains only the two UI source files, two guides, existing browser test file and regenerated source lock. Proof, logs and reports remain in the evidence packet.

## Plan and validation

The full plan is PLAN.md. Product ancestry, original source patch, immutable contract hashes and identities are recorded in product-receipt.json, carried-diff.patch, counts.json and identity-inspection.txt. Build, typecheck and the two focused browser journeys passed on this exact committed tree. Browser screenshots capture the Change Events sample and bearer/signed Events API sample detail screens at 1440 and 390. The browser journeys assert receipt retention, copied commands, Events API recovery/deduplication/refusal, accessibility, overflow and application-error checks. No ordinary recipe exposes the private key in the sample.

Completed validation and exact-SHA CI results are appended below. The cloud cannot run the fleet Mac publication scan; the fleet owns that scan and landing. This report makes no hosted-deployment, live-provider, paging, release, default-branch or DONE claim.

CLAIM OC-018 PARTIAL points=none tests=tests/product-browser.mjs#senderSetupBrowser
CLAIM OC-033 PARTIAL points=none tests=tests/product-browser.mjs#eventsSourceBrowser
CLAIM OC-065 PARTIAL points=none tests=tests/product-browser.mjs#senderSetupBrowser

## Completed local results

All eight checks in validation-receipt.json passed: build, typecheck, sender-setup browser, events-source browser, machines intake runtime, intake, routing and change events. The clock-sensitive analyticsFixture passed via analyticsReads under autonomous and held policies; its scoped response analytics/readiness pass is retained in the complete intake-machines log. The source lock and contract checks passed.

The displayed all-variant recipes were exercised through the emitted Worker HTTP doors in a shell PATH containing only sh, curl, OpenSSL, date, od, tr and awk. No Node, npx or package manager was present. Seven variants returned HTTP 201; PagerDuty-compatible change events returned HTTP 202. Every accepted change identity was read back in protected state. recipe-receipt.json records the actual statuses and native identities. The report probe's two navigation/receipt assumptions were corrected as described in probe-harness-correction.txt; product code and repository tests were not modified for those probe corrections. The final recipe proof ran on the exact product SHA.

The public getting-started and changes guides were also checked for page overflow and captured at 1440 and 390. Six sample screenshots and four guide screenshots are included. All sample screenshots were visually inspected; the retained sample text names shell tools and no Node prerequisite.

A fresh scratch HOME and tool PATH proved the one-line installer supplies its private Node 22.20.0, and that rer install plus unattended rer setup complete with no global node or npx. The current global installer supplied rer 0.2.112; the checkout installed its pinned rer 0.2.108. The first cloud-only attempt stopped while fetching pnpm: the private Node 22 registry fetch reported ECONNREFUSED because this host routes network access through an explicit proxy and Node 22 lacks NODE_USE_ENV_PROXY. A scoped installed-undici EnvHttpProxyAgent preload reused the supplied proxy and CA trust; the same probe returned HTTP 200 and the documented flow passed. No Base, installer or product edit was made. guide-receipt.json preserves this distinction and the actual successful step outcomes. These results supply no real Cloudflare deployment or hosted sign-in claim.

## CI and publication custody

Product push succeeded on its first attempt to the named branch. Exact-SHA Verify run 43362541255 was discovered and observed in progress on 8e18f79b63ec045d3efcc625e6f994aca8319e88. The fourth REST call returned HTTP 401 Bad credentials. Only the prescribed decrypted fleet bundle was used. Launcher refresh and fleet Git helper installation were repeated. The next permitted CI read succeeded, observing completed/success on the exact product SHA. The transient REST authentication failure is retained in ci-poll-4.json. The packet retains all local results independently of CI transport.

## Final result

READY candidate: cloud/main-oncall-recipes-toolchain-1-c1 at 8e18f79b63ec045d3efcc625e6f994aca8319e88. Exact-SHA Verify 43362541255 completed successfully: https://github.com/just-every/run-oncall/actions/runs/43362541255 . Five GitHub API calls were used, including one empty discovery immediately after push and one transient HTTP 401; no failed-job log reads, reruns or workflow dispatches were needed. The complete local intake machines run also proves analyticsFixture on this head. There are no unresolved product blockers or compatibility fixes. No PR was created; this repository's brief returns the pushed branch to the fleet lander. The cloud does not land or push main and does not run the Mac publication scan.

Counts remain done 26 / partial 41 / missing 34 before and after; clause status changes: none. New test registrations: zero. Contract documents remain byte-identical to the recorded main base. All eight sample variants returned 2xx without Node, the installer-based guide steps passed with the documented cloud network adaptation, and visual proof covers 1440 and 390. The only new product commit is the requested squash. The product branch was pushed once and was never rebased after publication. Temporary guide clones were deleted after successful proof; the product clone is deleted after the final evidence publication, as the brief requests. Evidence is confined to refs/heads/evidence/main-oncall-recipes-toolchain-1-c1 and is independent of product custody.
