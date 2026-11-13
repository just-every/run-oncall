# Oncall follow-up evidence and existing-service audiences

Task: main-oncall-followup-audience-1-c1. Repository: just-every/run-oncall. Product branch: cloud/main-oncall-followup-audience-1-c1.

## Plan and scope

The full execution plan is PLAN.md. Carry the original round as one squash on current main, retain the session-clock repair and all newer main content, run the touched journeys and intake lane plus typecheck, verify both changed screens at 1440 and 390, regenerate the source lock last, publish the single product commit, and require its exact-SHA Verify. Publish report/receipt custody on the separate evidence ref, then return the claims and main-lane queue line.

The fetched original branch head was exactly 8998e689a1888d8335efc30e6a14afff7cbc7557. Its merge base with origin/main was 809d67a8fbf255ee13e8531e4246a1ffbddf2fa4. Current main at clone was cc64205ca532de3ac8022838ecdd07cfa5bfae73, containing the fixture-clock repair. The squash applied cleanly without conflicts. During local checks origin/main advanced to 8976d008fa2ff43d9ccb3eed6ff94acaedb86cf2 with the native-resource round. The unpublished carry was preserved, its branch base fast-forwarded to that main, and the staged squash reapplied cleanly. All newer resources, tests and fixtures are preserved; no product merge commit was created. The six carried source/test files match the original head byte for byte; sources.lock.json is generated locally. No carry fixes, additional features or new tests were needed. The resulting product diff is seven files, 123 insertions and 17 deletions.

## Behavior and implementation

Reviews follow-up actions now remain in normal document flow. Removing the desktop-only absolute-position/hover arrangement keeps Add evidence fully visible and gives it an ordinary pointer target. Evidence submission and explicit human acceptance remain the existing workflow.

An admin can edit the Stakeholder audience inside an existing service's Manage internal status disclosure. Creation and editing share the same active-member audience validation. The existing autosave mechanism handles revisions, pending/error states, retry and conflict feedback. A newly granted stakeholder appears in Subscriber and can be subscribed. Removing a stakeholder withdraws visibility, stops their active subscriptions and stops recorded user notices. Unauthorized, invalid and stale edits preserve workspace state. Subscription/delivery policy has not been expanded.

No contract status, Gap or Evidence cell was edited. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain byte-identical to main. The newer session-clock fixture is retained. No evidence, screenshots, reports or receipts belong to the product commit.

## Before and after

| Item | Before | After |
| --- | --- | --- |
| Desktop Reviews Add evidence | Original stranger reported clipping/pointer interception | Ordinary click opens it; submission and human acceptance pass |
| Phone Reviews Add evidence | Worked in original stranger report | Retained; ordinary pointer proof at 390 |
| Existing-service stakeholder audience | No editor; newly created stakeholder absent from Subscriber | Grant/remove editor; subscription and reload persistence proven |
| Carried product commits on new main | 0 | Exactly 1 squash, no merge commit |
| New test registrations in this carry | 0 | 0; existing two journey files extended by the original round only |
| Contract Core done/partial/missing | 25 / 35 / 24 | 25 / 35 / 24 |
| Contract Agent done/partial/missing | 1 / 6 / 10 | 1 / 6 / 10 |
| Full target done/partial/missing | 26 / 41 / 34 (101) | 26 / 41 / 34 (101) |
| OC-036 status | PARTIAL | PARTIAL |
| OC-061 status | PARTIAL | PARTIAL |

## Verification and receipts

setup-build-receipts.json records successful unattended local setup and production build. local-checks-initial.json records the first complete passing touched-test and intake-lane run (typecheck, triage storm, member coordination browser, machine runtime, native intake and routing). local-checks-after-main.json records the rebuilt Worker, typecheck, repeated touched journeys, machine intake with the newer fixtures and focused phone proof after main advanced. The native intake and routing tests passed in the initial run; their source files were unchanged by the later resource-round integration. Exact-SHA Verify remains the final full wall for the integrated candidate. Receipt files include commands, settings, start times, durations and exit codes. Browser proof comes from the emitted production Worker, with Chromium at /usr/bin/chromium and --no-sandbox. Browser contexts and workers are closed by the journeys. The installed toolchain selected Node 24.19.0 and pnpm 10.12.4; the repository declares Node 22.20.0. CI uses its repository pin.

The carried desktop journey asserts ordinary Add evidence click, evidence submission, human acceptance, existing-service audience grant, subscription, reload persistence, removal and regrant at 1440. It also records screenshots at 390. The separate phone proof uses the same public HTTP and browser doors at 390, including a stakeholder created after the business service. It is external run evidence, not an added repository test.

Relevant screenshots are the Reviews follow-up ready/open/accept/completed states at 1440 and 390, service audience saved at 1440 and 390, and phone pointer/audience proof. Visual inspection of both changed screens at both widths found the controls visible without clipping or overlap. The carried member coordination checks include overflow, hydration and serious/critical accessibility assertions.

carry-comparison.json records the original/base/main provenance and exact carried-file comparisons. protected-documents.json records protected-document SHA-256 hashes. diff-hygiene.json records the bounded changed-file token/private-key-header check. The full publication scan is performed by the fleet lander as required by this cloud brief; it was not claimed locally.

Product provenance, Git identity/trailer audit, source-lock checks, exact-SHA CI outcome and final custody are recorded in the completed receipts and final section below. No PR is required by the seed's landing rules; the fleet owns landing and publication.

## Clause claims and remaining gaps

CLAIM OC-036 PARTIAL points=none tests=tests/member-coordination-browser.mjs#incidentSaves
CLAIM OC-061 PARTIAL points=1 tests=tests/member-coordination-browser.mjs#OC-061 browser; tests/triage.mjs#triage storm

OC-036 remains partial: this fixes ordinary use of existing follow-up evidence and acceptance, without proving every obligation of the clause. OC-061 proves point 1 through the existing browser/API journeys; notification delivery, mobile, private-team scope, SSO/SCIM assignment and the other existing clause gaps remain as recorded on main. This round makes no DONE claim and no clause judgment change.

## Product custody

The single product commit is a958359fd0641c8521dac53446e239aa48e3c950, parent 8976d008fa2ff43d9ccb3eed6ff94acaedb86cf2, pushed once to cloud/main-oncall-followup-audience-1-c1. The guard succeeded on attempt 1; a separate ls-remote confirmed the same SHA. The final commit has no skip marker or co-author trailer and both identities are Run Edit Run fleet <fleet@runeditrun.com>. The audit inspected every candidate commit including side parents; exactly one candidate commit and no product merge commit exist. No PR was opened because this seed uses fleet landing.

Exact-SHA Verify run: 43365038458, https://github.com/just-every/run-oncall/actions/runs/43365038458. Its initial observation was in_progress; the final CI receipt will record the completed outcome. The original branch was not changed and main was never pushed.

## Completed local results

All six initial commands passed. After integrating newer main, all six repeated/focused commands passed: production build (12.62 s), typecheck (4.98 s), triage storm (49.64 s), complete member coordination browser (200.95 s), machine runtime/intake with newer native-resource and analytics fixtures (549.73 s), and focused phone proof (36.73 s). The phone proof ran after the product commit and proves ordinary click, evidence submission/acceptance, audience grant/subscription/reload and removal at 390. All tracked files remain identical to the published product commit after these runs. All cloud_run child processes exited and were reaped. No carry regression or code repair was needed.

The initial native intake (80.09 s) and routing (144.38 s) passes are preserved in their original receipts/output. The updated main changed resource fixtures, so machine runtime was repeated; the native intake/routing files were unchanged.

## Final CI result and handoff

Verify run 43365038458 completed/success on the exact full product SHA a958359fd0641c8521dac53446e239aa48e3c950. This is the required full source-change Verify, whose push matrix includes intake; its aggregate requires the selected shards to succeed. No contract-generator exception, job rerun or failure-log download was used. Four GitHub REST calls were made, with at least 300 seconds between discovery/status observations, within the ten-call budget.

No blockers remain. The original source/test carry needed no repair; only integration with newer main and automatic source-lock regeneration were performed. OC-036 and OC-061 remain PARTIAL, with the claim lines above unchanged and no clause judgment edits. Full-target counts remain 26 done, 41 partial and 34 missing (101 total). No new test registrations, weakened assertions, evidence files or screenshots were added to the product branch.

The complete selected report, plan, actual receipts and changed-screen proof are published separately to refs/heads/evidence/main-oncall-followup-audience-1-c1. Evidence custody is separate from product READY and fleet acceptance/landing. The fleet lander still owns the full publication scan and landing gates. The scratch product clone is removed only after successful product/evidence custody; this external packet is retained.
