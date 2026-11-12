# Oncall refusal explanations: READY candidate

The refusal-explanations round is published as exactly one ordinary commit on current main. Exact-SHA Verify succeeded. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md retain main's bytes and judgments, including OC-022 done.

- Repository: just-every/run-oncall
- Branch: cloud/main-oncall-explain-refusals-1-fix1-c2
- Head: d563ad121bcc5508a89c85e908e823c910a11ac5
- Base: 4fed382945f688afdcceb15ae9df976135cdbb1e
- Tree: 13fe9bd3a2e0034a955515624c33a8d8cdd12394
- Verify: https://github.com/just-every/run-oncall/actions/runs/43130282710 — completed/success on this exact head
- Product push: first guarded attempt succeeded; no PR was created

## Full plan and implementation

[PLAN.md](PLAN.md) records the full seven-step plan. The fleet identity, authorized launcher, decrypted-bundle Git authentication, preserving commit hooks, push guard and separate evidence entrypoint were installed. The declared repository was cloned with full commit history and blob filtering. The named branch started at origin/main, then the prior fix1-c1 branch was merged with --squash. The only conflict was sources.lock.json. Main's contract documents and source lock were restored; the documented generator regenerated the lock last. Main did not drift before publication, and the unpublished rebase check was up to date.

All eight UI source files match the previous refusal-explanations round. Both browser journey files retain main's newer changes alongside the replay. The candidate changes exactly the intended eleven files:

- sources.lock.json
- src/app/autosave/InlineConfirm.tsx
- src/business-status/StatusPanel.tsx
- src/form-validation.tsx
- src/forms.tsx
- src/on-call/Field.tsx
- src/on-call/RotaPage.tsx
- src/on-call/rota-steps/RotaSteps.tsx
- src/schedule-coverage/ReviewedChange.tsx
- tests/member-coordination-browser.mjs
- tests/product-browser-journey.mjs

The forms retain native constraints, persistent inline errors, focus on the first bad field, refused drafts and the server's refusal reason. Set status explains the missing reason; coverage review explains its required confirmation; swap submission explains its required substitute. The member-coordination refusal captures and existing user-flow assertions are preserved. No unrelated feature or Events-source fix was added.

## Before and after

| Measure | Before | After |
| --- | ---: | ---: |
| Candidate commits beyond main | 0 | 1 |
| Candidate merge commits | 0 | 0 |
| Done clauses | 23 | 23 |
| Partial clauses | 44 | 44 |
| Missing clauses | 34 | 34 |
| Total clauses | 101 | 101 |
| Configured verification command registrations | 16 | 16 |
| Tests added, removed or skipped | 0 | 0 |

The command-registration count is not a count of every assertion or distinct behavior. No test was added or weakened, and no cap raise was requested. The final diff has 164 insertions and 38 deletions across eleven files. All locally tested changed-file hashes match the committed source. All three contract documents are byte-identical to the fetched main. No clause Status, Gap or Evidence cell changed. OC-009 remains partial; OC-022 remains done.

## Actual local checks

The prescribed cloud toolchain ran setup with the fleet owner address. Typecheck, production build, generated contract freshness, documented source-lock generation/check and changed-line credential-shaped-value inspection passed. The runtime was Node 24.19.0 with pnpm 10.12.4 under the supplied toolchain script. Browser commands used system Chromium at /usr/bin/chromium with --no-sandbox, --use-mock-keychain and --password-store=basic, sequentially under cloud_run. Browsers and owned workers closed before their commands exited.

| Command | Exit | Result |
| --- | ---: | --- |
| pnpm run typecheck | 0 | Passed |
| cloud_run npx -y @runeditrun/rer build | 0 | Passed |
| node src/base/contract-docs.mjs check | 0 | Current, zero errors or warnings |
| node scripts/edition-authoring/cli.mjs check | 0 | Passed after the last lock regeneration |
| cloud_run node tests/member-coordination-browser.mjs | 0 | Complete member journey passed, including all three Status refusal states |
| cloud_run node tests/product-browser.mjs | 1 | Intended refusal, schedule and keyboard checks passed; later unchanged Events-source check failed |
| cloud_run env ONCALL_PRODUCT_JOURNEY=readable-times node tests/product-browser.mjs | 0 | Existing focused coordination, swap and coverage journey passed |
| cloud_run env ONCALL_PRODUCT_JOURNEY=rota-timeline node tests/product-browser.mjs | 0 | Existing focused schedule, override and preview journey passed at 1440 and 390 |

The complete local product script failed in eventsSourceBrowser at tests/product-browser.mjs:633. It read an Ingress URL that was still relative, then new URL(url) threw ERR_INVALID_URL. RequestExample initially renders an empty origin and supplies location.origin in useEffect; the failure is consistent with the assertion reaching the field before that effect. Both the test and Events-source implementation are unchanged from main. The full log and failed exit are retained. No assertion or unrelated product behavior was changed to pass this replay. Exact-SHA CI subsequently succeeded without a rerun.

Ten original refusal captures were visually reviewed: required supporting service, real server create refusal, manual-status missing reason, cover-review confirmation and swap missing substitute, each at 1440 and 390. New assertions use 1440; the existing phone smoke remains. The phone server-refusal viewport shows its first line at the lower edge; the desktop capture shows the complete reason. This capture-framing limitation does not change the passing server-refusal assertion. Only the relevant, visually inspected screenshots are selected for publication.

## CI and custody

A single REST watcher discovered and polled only this exact SHA, using five of the ten workflow invocations and at least 300 seconds between calls. The first successful API response was discarded because task-side URL sanitization damaged its JSON; the sanitizer was corrected to clean parsed strings without damaging structure. That call remains counted. Verify run 43130282710 finished completed/success on d563ad121bcc5508a89c85e908e823c910a11ac5. No failed-job log read or rerun was needed.

Every candidate author and committer is Run Edit Run fleet <fleet@runeditrun.com>. All candidate messages and trailers were audited, including side parents; the candidate has no merge parent, no trailer and no skip-CI marker. The named product branch was pushed once, successfully on the first guarded attempt. No main push, force push, published-history rewrite, PR or other repository write occurred. Reports are transported separately on refs/heads/evidence/main-oncall-explain-refusals-1-fix1-c2, with fleet identity and report-only trees. Evidence publication does not certify acceptance or landing.

There is no product or CI blocker. The full fleet publication scan remains the Mac landing gate, as required by the cloud adaptation; it cannot run in this VM. The ordinary changed-line credential check and explicit report-packet non-secret audit passed. No credential, environment dump, private held-out gate material or symlink is selected. Clause counts and judgments remain unchanged.

## Claim and follow-up

CLAIM OC-009 PARTIAL points=none tests=tests/product-browser-journey.mjs#productSchedule

GAP OC-009: This bounded refusal-feedback replay does not prove every acceptance point or the named assistive-technology and conformance-report duties. No DONE claim is made.

Follow-up for the parallel Events-source round: its unchanged create helper can read the relative ingress URL before RequestExample's origin effect has run. The complete local product log records the failure; this candidate's exact-SHA Verify is green.

READY branch=cloud/main-oncall-explain-refusals-1-fix1-c2 head=d563ad121bcc5508a89c85e908e823c910a11ac5
