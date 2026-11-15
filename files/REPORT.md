# gr-mt-oncall-code-9 — CodeQL alert #20

Author: Run Edit Run fleet. Date: 2026-11-15 UTC.

Outcome: **no-change**. The reported js/xss-through-dom path is a false positive on current main. No product code, contract, generated view, source lock or product test was changed. Recommend a human dismiss alert #20 as false positive using this evidence; no alert state was changed by this run.

Repository: just-every/run-oncall
Local task branch: cloud/gr-mt-oncall-code-9
Examined main and branch HEAD: 98d633ee7d20ebbb1d68842eaab998bbdffb284b
Product commits: 0. Product branch push: none, because no change is needed.
PR: none. New candidate CI runs: none. READY/PUSHED: not claimed.

## Plan and classification

The complete plan is retained in PLAN.md. Its sequence was: fleet identity/credential/hook setup; fresh declared-repository clone and source/history investigation; independent read-only boundary investigation; smallest fix if needed, otherwise a demonstrated no-change disposition; focused build/typecheck/browser verification; clean-tree/custody inspection; actual report/result/receipt files and separate evidence publication.

The direct caller, component, region type, exporter helpers, OAuth handler, and nearest existing import/browser tests were inspected before classification. The independent read-only investigation is retained in INVESTIGATION.md. It agreed that the fixed URL prefix and React attribute assignment already preserve the boundary. No speculative hardening was added.

## Reported flow and security invariant

The supplied finding points to src/move-in/ConnectStep.tsx:30.

1. The component initializes region to us at line 10. At line 24, its select's DOM event.target.value becomes region state; the ordinary options are us and eu. The as Region cast is not runtime validation, and safety does not rely on it.
2. Line 30 renders an anchor whose href expression is '/api/move-in/pagerduty/start?region=' + region. The DOM value is only a suffix after a literal same-origin pathname and query key. It cannot become the URL scheme, origin or pathname. A javascript: suffix is query data, not a JavaScript URL.
3. React assigns the href attribute rather than parsing the value as markup. Quote, image, SVG and event-handler text remains attribute data. This component contains no innerHTML, outerHTML, insertAdjacentHTML or dangerouslySetInnerHTML sink.
4. The production OAuth route in src/move-in/pagerduty-oauth.ts:84-96 checks current administrator authority, maps exact eu to EU and every other value to US, chooses one of two literal identity origins, then builds /oauth/authorize using URL and URLSearchParams.
5. src/move-in/MoveIn.tsx:111-115 renders the component only for administrators. Region has no uploaded-file, server-response, URL-query or prop initialization.

The invariant is that DOM region text never becomes executable markup or an arbitrary navigation destination. Both current client construction and native server normalization enforce the relevant boundaries.

History independently rules out mistaking an unrelated later repair for a new fix: git log -- src/move-in/ConnectStep.tsx contains only its introduction, 4e83731196a33c6ccd4ca0a97cb18f9a84810d52 on 2026-10-27. The file is unchanged at the examined main SHA, so these safety properties also predate the supplied 2026-10-28 alert update.

## Ordered verification

The final checks used the checkout's exact Node 22.20.0 and pnpm 10.12.4. The supplied toolchain initially retained the VM's newer Node 24.19.0; setup, build, typecheck and the browser probe also passed there. The exact Node pin was then installed and the final build, typecheck and probe passed again.

- cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive: PASS. Dependencies, local build and 68 local migrations completed; its temporary application stopped before command exit. Private setup output is excluded from this packet.
- cloud_run npx -y @runeditrun/rer build: PASS, including the final Node 22.20.0 build.
- cloud_run pnpm run typecheck: PASS, including the final Node 22.20.0 check. Its actual final output is typecheck.log.
- cloud_run node <packet>/connect-step-probe.mjs <repo> <packet>: PASS against the emitted production Worker with local D1 and system Chromium /usr/bin/chromium --no-sandbox. The source and actual final receipt are connect-step-probe.mjs and connect-step-receipt.json.

The focused browser probe drives the real /settings/move-in screen as a synthetic administrator created through the existing /api/setup public door. It does not mock the application, change product source, call a real provider, or use private held-out gate material.

At 1440px, it changes the actual DOM region select and dispatches its change event for 12 cases: US, EU, javascript:, external HTTPS, protocol-relative URL, quote/image markup, quote/SVG/event-handler markup, encoded markup, query separators, fragment, newline and backslash. For every case it waits for React's actual href update, asserts the fixed same-origin pathname, checks that no HTML child or event attribute appears and that no injected script executes, then GETs the resulting href through the real native HTTP handler with redirects disabled. Every native response is 302 to the expected fixed PagerDuty identity origin with PKCE S256 and read-only scopes. Returned OAuth state, PKCE challenges, transaction cookies and local session values are never retained in the packet.

Legitimate controls also pass: both ordinary region options, read-key mode, its disabled empty-submit control, enablement after entering a synthetic value, clearing that value when switching back to sign-in, the Opsgenie key control, and the file-upload control. The probe submits no provider read or import. Browser application errors, external browser requests and outbound Worker requests are all zero.

The connection and cleared key-fallback screens were captured once per screen at 1440 and 390:
- browser/connect-1440.png
- browser/connect-390.png
- browser/key-fallback-1440.png
- browser/key-fallback-390.png

An initial probe attempt failed before Chromium launched because the scratch harness expected named exports from the resolved CommonJS Playwright entrypoint. The harness was corrected to use createRequire; no product assertion failed and no product code was changed. Its actual failure receipt is probe-initial-failure.json. Both subsequent runtime versions passed; the earlier successful Node 24 receipt is also retained.

Existing relevant tests were inspected rather than running the full local suite: tests/import-door.mjs:347-350 covers native US/EU identity hosts; tests/product-browser-journey.mjs:335-341 covers read-key mode. The focused probe covers the complete reported boundary and legitimate controls without the unrelated full import suite. Full local rer verify was not run under the brief's touched-check limit.

## Counts and clause status

| Measure | Before | After |
| --- | ---: | ---: |
| Product files changed | 0 | 0 |
| Registered lane journey entries | 17 | 17 |
| New product tests | 0 | 0 |
| Contract DONE | 26 | 26 |
| Contract PARTIAL | 41 | 41 |
| Contract MISSING | 34 | 34 |
| Contract total | 101 | 101 |

One supplied alert was investigated: one false-positive disposition, zero code fixes. GitHub's actual alert state is unknown, not claimed resolved or dismissed.

No clause status, Gap, Evidence, acceptance text, count, generated view or lock was edited or promoted. OC-038 and OC-042 remain partial. No new acceptance obligation or clause-completion claim is made.

## Access limits, custody and remaining default

gh api repos/just-every/run-oncall/code-scanning/alerts/20 returned "gh: Resource not accessible by integration (HTTP 403)" on all five attempts. The injected bundle was refreshed and re-read between retries with 15/45/90/150-second bounded backoff, and the fleet Git setup was repeated after each refresh. alert-access-receipt.json contains the actual sanitized results. Five GitHub API calls were used. The full provider trace was unavailable; the no-change disposition rests on the supplied location, source history and the emitted browser/native-HTTP proof, not an uninvestigated failure to reproduce.

No new product candidate exists, so no product branch Verify, product publication scan, product push or PR was requested. Base's publication scanner is unavailable in this VM; no new product tree is being published. The evidence publication uses only the separately authorized report-only entrypoint/ref and conveys no READY, landing or acceptance authority.

git diff --exit-code, the cached diff and git status --porcelain were clean; git log origin/main..HEAD was empty. A Git ref probe confirmed the examined SHA was still main and there was no product or evidence task branch before evidence publication. Exact provenance and source SHA-256 hashes are in validation-receipt.json. The report transport records unchanged product branch/HEAD in its manifest.

result.json is retained both in this packet and at $HOME/rer-consolidation/work/maint/gr-mt-oncall-code-9/result.json. Its security: false means no security code change was warranted. All probe browser/Worker processes were closed. The clean clone and its dependencies are removed after successful report transfer under the supplied clone-cleanup rule; there is no unpushed product work to preserve.

Default: a human reviews this false-positive disposition and dismisses #20 if satisfied. No product blocker or required code change remains; GitHub alert-detail access/dismissal remains outside the integration's permission.
