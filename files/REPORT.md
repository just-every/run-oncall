# Readable approval decisions and states

Repository: just-every/run-oncall
Tag: main-oncall-readable-states-1
Branch: cloud/main-oncall-readable-states-1
Base: 8adae6c836f2fabda29e8a091b052450410c8ca5 (Oncall 0.5.13)
Candidate: 97ab38cfd3a0067072603585868d6506d02a69bc. CI: see CI.json for terminal provenance.
PR: none; repository instructions do not require a PR for this fleet branch.

## Result

Coordination approvals on Agents and their signed-in decision pages identify the requesting agent and sponsor, the saved incident title, its named service, and the proposed change in plain words. Native IDs, revision counters and the exact original field summary remain under Request details. The presentation callback projects already saved summaries at rendering time, so existing pending approvals work too. Saved summaries, hashes, arguments, revision fences and execution behavior are unchanged. All displayed values are HTML-escaped by the existing renderer. The callback also names people and follow-ups for coordination requests and respects the native default that follow-up completion requires human review.

The newly created Events source keeps a ready-to-copy request with its actual scoped service already supplied. Copy sample request remains available, while View request code deliberately opens the wire payload. Default setup names the service and asks for no ID lookup. Bearer and signed samples still execute unchanged against the real ingress endpoint, and source/service name mismatches remain refused.

Incident filter options and applied-filter chips use the existing incident, severity and urgency display words, including No priority. Their option values, URL parameters and protected HTTP cohorts remain unchanged. Timeline activity headings describe status changes, deadlines and follow-up evidence instead of exposing operation names. Readiness translates single-installation and not-provided into One installation and Not set. Stored timeline text, health JSON, exports and source IDs are untouched.

## Reproduction and proof

Before implementation, the emitted Worker and native owner door reproduced all five screens at 1440 and 390. baseline.json records the actual non-secret text. Before screenshots show the raw approval UUID, revision and state/summary dump, lower-case filter enums, operation headings, raw authority tokens and the open request payload. after.json and paired screenshots show the repaired screens. The after timeline fixture also contains a recorded deadline and completed follow-up so those headings can be inspected directly.

Measured default-screen counts in COUNTS.json:

| Observed item | Before | After |
| --- | ---: | ---: |
| Approval UUID/revision/field-dump artifacts | 4 | 0 |
| Raw enum filter choices | 14 | 0 |
| Raw Readiness authority tokens | 2 | 0 |
| CI assert-script registrations | 16 | 16 |
| Unique CI script files | 12 | 12 |
| New test registrations | 0 | 0 |
| Contract status edits | 0 | 0 |

The counts describe these measured screens and CI script registrations, not an invented total of all nested journeys. There is no test-budget.json in this seed; no cap increase or new registration was used.

Existing tests/agent-door-browser.mjs now checks readable approval cards on both public pages and the incident filters in the same journey at 1440. It opens raw details deliberately, verifies the original identity/revision, compares a filtered native HTTP cohort, and confirms reads have no native effects. Its existing approval flow proves one attributed resolution, stable saved digest, unchanged paging/outbound work and effect-free retries. Existing deadline, pause, erasure, inventory and signed-in browser checks remain intact.

Existing tests/product-browser.mjs and tests/readable-names-browser.mjs extend the Events source journey: the default recipe exposes no service ID, advanced code can be opened, copied bearer/signed commands supply the correct service and execute, Readiness displays no raw authority token, and raw health/audit data remain unchanged. One obsolete assertion requiring prose to mention an internal-ID lookup was replaced with deliberate-code visibility and executable prefilled-request proof; all existing ingress, authorization, deduplication and state-retention assertions remain.

Local commands passed for the touched surfaces. Build and the agent browser journey were rerun after the final follow-up display-default correction; the Events-source surface and tests were unchanged by it. RECEIPT.json records this timing:

- cloud_run npx -y @runeditrun/rer build
- pnpm run typecheck
- ONCALL_CHROMIUM_PATH=/usr/bin/chromium cloud_run node tests/agent-door-browser.mjs
- ONCALL_PRODUCT_JOURNEY=events-source ONCALL_CHROMIUM_PATH=/usr/bin/chromium cloud_run node tests/product-browser.mjs
- node src/base/contract-docs.mjs check
- node scripts/edition-authoring/cli.mjs check
- git diff --check

Assertions run at 1440; changed screens have 1440 and 390 captures. The existing agent-screen helper retains its overflow, accessibility and 44px control assertions. The added incident-filter proof uses overflow and serious/critical axe checks; it does not apply the agent-only 44px assertion to the existing list's 32px selection labels or 42px fields. No existing helper or prior assertion was weakened.

The full local suite was left to exact-SHA branch Verify, as required by the brief. Build, typecheck and browser outputs are included as actual receipts. Setup used the maintained rer command and private temporary setup data; credentials and setup-owner entry links are excluded from this packet.

## Contract and scope

No CONTRACT.md Status, Gap, Evidence or summary row changed; neither generated view was committed. The documented generator check passed. The source lock was regenerated last and checked after the no-op rebase onto fetched main; its new presentation helper is included. The cloud could not run the fleet's Mac publication scan; the fleet lander remains responsible for that independent gate. Candidate diffs, all candidate commit identities and trailers were inspected before each product push.

CLAIM BASE-AGENT-007 PARTIAL points=none tests=tests/agent-door-browser.mjs#incident resolution browser
CLAIM OC-060 PARTIAL points=none tests=tests/agent-door-browser.mjs#readable filters
CLAIM OC-054 PARTIAL points=none tests=tests/readable-names-browser.mjs#readableNamesBrowser

These are scoped presentation proofs, not claims that a full contract acceptance point or clause is complete. Existing clause judgments stay unchanged.

DEFAULT BASE-AGENT-007: identify the incident using its actual saved title and named service; do not invent an incident number.
GAP BASE-AGENT-007: this seed has no incident number field or numbered incident view. The brief's request for a number remains unimplemented; adding a stable numbering system would change data/API scope. UUIDs are deliberately available in Request details.

No other stranger finding, agent stale-revision diagnostic, owner-access flow, export sample, deployment, provider operation or release version was changed. Product landing and publication acceptance belong to the fleet. PLAN.md contains the full execution plan; RECEIPT.json and CI.json record the terminal head and CI result.

## Exact-SHA CI correction

Verify run 43544785621 on 35a5fd169576dce7ffa6a0cfefcacd2b3b808777 failed only in its browser shard (plus the dependent verifier). The readable option label Triggered shadowed an existing unscoped row-status locator, which waited on a hidden option. The four Triggered, Snoozed, Acknowledged and Resolved row assertions now select .incident-meta explicitly. The existing full triage journey passed, retaining all 50-item cohort, raw-query, durable-state, low-alert, attribution, source-retry and revocation assertions. No production logic was changed for the correction. The failed job archive was read once; its actual log and job receipt are included. The corrected head is recorded above and gets its own exact-SHA Verify.

The complete touched `tests/product-browser.mjs` script (without a focused-journey selection), including its agent-browser continuation, then passed locally with checkout HEAD 97ab38cfd3a0067072603585868d6506d02a69bc. This covered the corrected triage leg and the remaining source, readiness, workflow, reporting and agent flows. `full-product-browser.txt` is the actual successful output. This is the touched browser script, not a full local rer verify. No new registrations or skipped assertions were introduced.

## Terminal custody

Product branch cloud/main-oncall-readable-states-1 is pushed at 97ab38cfd3a0067072603585868d6506d02a69bc. Exact-SHA Verify 43546538381 completed successfully: https://github.com/just-every/run-oncall/actions/runs/43546538381 . Eight of the ten GitHub calls were used. Prior failed Verify 43544785621 is retained as diagnosis for the corrected locator; it is not the final candidate. No product blocker remains. The native incident-number gap described above remains explicit; no clause status changed and no DONE claim is made. The independent fleet publication scan and landing are still owned by the fleet.
