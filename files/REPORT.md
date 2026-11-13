# Readable names in Oncall setup, audit and readiness

Product repository: just-every/run-oncall
Product branch: cloud/main-oncall-readable-names-1
Product head: 21c7b435b0a9b821ba803d7fdef6d9bc6dc71a74
Base main: 809d67a8fbf255ee13e8531e4246a1ffbddf2fa4
Exact-SHA Verify: 43354027409 — https://github.com/just-every/run-oncall/actions/runs/43354027409
PR: none; this repository's supplied rules use fleet branch custody and Mac landing.

## Outcome

All four brief findings reproduced before editing and resolved in the candidate. The native Events API setup names its service and says the copyable sample is already filled in. The receiver still requires the service identity, which remains prefilled in the executable sample. Both bearer and HMAC samples are copied and executed through real HTTP; existing source-name/legacy-ID deduplication and mismatched-identity refusals remain asserted.

Routed sender setup shows the key's display name and every allowed service name, both on creation and on the retained routing page. A collapsed Key details section retains the identifier and copy action for deliberate inspection. Working ingress URLs, source/service identities, credentials and native/provider sender configuration are unchanged. The browser executes the copied routed sample; the separate keyboard continuation proves HMAC setup, allowances, stale-publish refusal, rotation and revocation.

Configuration audit resolves native source names and complete intake-prefixed key references. The allowance change and real throttle refusal show names without generated suffixes. Retained audit bytes remain unchanged after display; no API, storage, export, credential or identity format changed. Native display names use the same established nativeName function as the integration page.

Readiness renders Oncall followed by the actual report release version (Oncall 0.5.10 in this candidate), leaving the protected API's package/version provenance intact.

## Reproduction and proof

BASELINE.json records all four observed failures through an emitted production Worker, local D1, protected public HTTP and Chromium before edits. It contains no private keys or sessions. No screenshots from the Mac were needed. The actual temporary baseline and isolated routing drivers are preserved under drivers/ in this evidence packet; run them from .rer/ in a prepared checkout to retain their original import paths. They contain synthetic fixtures and runtime-generated local secrets only, no captured credential or session values.

The existing tests/product-browser.mjs#eventsSourceBrowser registration now continues through tests/readable-names-browser.mjs#readableNamesBrowser: native source setup, a two-service routed key created in the browser, copied sender execution, both allowance namespaces, a real refusal, default Configuration audit and actual Readiness version. Assertions run at 1440. The four changed screens were captured and visually inspected at 1440 and 390. Tests/keyboard.mjs#routingBrowser was extended to inspect the deliberate Key details control while preserving its prior identity/copy and lifecycle assertions.

The old assertions requiring internal-ID instructions and a default visible Key ID were replaced by display-name and hidden-details behavior checks; sender execution, raw wire identity and scope/refusal assertions remain. No test registration added or removed, and no test cap increase requested. This is an extension of the existing public journey, with its continuation extracted into a helper.

Local touched checks passed: setup, production build, tsc --noEmit, focused Events source journey, keyboard routed-sender journey, source-lock generation/check and git diff --check. CHECKS.json is the actual command/result receipt; associated full output files are selected in the evidence packet. The browser driver uses /usr/bin/chromium with --no-sandbox and cloud_run. All started browsers and Worker servers were closed by their owning journeys.

The source lock was regenerated last, including the indexed browser helper; its digest was independently checked. Fetch and rebase found main unchanged, so no conflict or replay was needed. Every outgoing author and committer was Run Edit Run fleet <fleet@runeditrun.com>; no trailers. The guard pushed the product implementation, then a second honest test-only refinement that explicitly establishes its rate window before asserting refusal. Both published heads are preserved; the final candidate has no skip-CI marker. After the first push, a fresh fetch and merge found main unchanged; published history was not rewritten. The final focused Events source journey and source-lock check passed again. No evidence, screenshot, report or temporary driver files entered the product commit.

## Before and after

| Observation | Before | After |
| --- | ---: | ---: |
| Brief findings reproduced / remaining | 4 | 0 |
| New test registrations | 0 | 0 |
| Removed test registrations | 0 | 0 |
| Clause status changes | 0 | 0 |
| All contract done / partial / missing | 26 / 41 / 34 | 26 / 41 / 34 |
| All contract clauses | 101 | 101 |

CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md were not edited. These narrow UI regression observations do not newly establish any complete contract acceptance point and make no DONE claim:

CLAIM OC-001 PARTIAL points=none tests=tests/product-browser.mjs#eventsSourceBrowser; tests/readable-names-browser.mjs#readableNamesBrowser
CLAIM OC-041 PARTIAL points=none tests=tests/readable-names-browser.mjs#readableNamesBrowser
CLAIM OC-054 PARTIAL points=none tests=tests/readable-names-browser.mjs#readableNamesBrowser

DEFAULT OC-001: Preserve the service identity required by the existing receiver, prefilled in the sample; use display names in default explanation.
GAP OC-041: This round proves configuration-audit presentation and unchanged raw history, not the permanent-audit clause's full mutation, failure, erasure or restore matrix.
GAP OC-054: This round proves the readable release label only, not reference load, independent alarms, provider/device acceptance or cutover.

## Plan and boundaries

PLAN.md contains the full executed plan. This round stayed within native/routed setup, Configuration audit and Readiness, plus the existing tests and required source lock. No other stranger finding, identifier rename, provider operation, contract judgment or main/default-branch write was attempted. The known expired-session fixture in tests/oncall-agent-fixtures.mjs was not changed. No full local suite was run; exact-SHA branch Verify is the full wall.

The cloud cannot run the fleet's Mac publication scan or land a product. Those remain independent fleet gates; no publication scan, READY, acceptance, deployment or landing is implied by an evidence publication. CI-WATCH.json and CI status receipts carry the actual observed status and exact SHA. Terminal custody is updated below after CI completes or the bounded watch ends.


## Terminal CI result and custody

Product pushed and remote head independently confirmed: cloud/main-oncall-readable-names-1 at 21c7b435b0a9b821ba803d7fdef6d9bc6dc71a74. Verify 43354027409 completed with failure on that exact SHA. Build and the browser, runtime, transfer, triage, hosted and changes shards passed. Intake job 131652786555 failed at Run this shard: analyticsFixture in tests/oncall-agent-fixtures.mjs:284 returned 401 instead of 200. This exactly matches the pre-existing expired-session clock issue named in the brief. Final verify job 131657467438 failed at Require the selected coverage and its proof because SHARDS=failure. Each failed job's archive was read once using the prescribed gh run view --job --log-failed command; both succeeded. No direct blob redirect request and no job rerun was attempted. The task used ten GitHub calls in total: two observations for the superseded candidate, five for the final candidate including discovery, one jobs read and two failed-job log invocations.

The known fixture remains outside this round and unchanged. The product is not READY; the remaining prerequisite is Successful exact-SHA Verify. This is not a view-generator exception. The full browser shard passed on the final candidate, including the extended readable-name journey. CI-RESULT.json, CI-JOBS.json, the status receipts and both complete failed-job outputs provide the actual result. The fleet can integrate the independent clock fix and rerun its gates; this cloud did not wait for or implement that other round.

The full report and actual receipt packet is published separately to refs/heads/evidence/main-oncall-readable-names-1. It does not signal READY, acceptance or landing. The pushed scratch clone is removed only after successful evidence publication; complete reports and proof remain outside it in the task packet.
