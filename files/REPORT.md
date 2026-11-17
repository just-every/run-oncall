# Documented PagerDuty saved-response import

Author: Run Edit Run fleet. Prepared 2026-11-17T12:34:28Z.
Task: sd-oncall-import-pagerduty-1. Repository: just-every/run-oncall.
Product branch: cloud/sd-oncall-import-pagerduty-1. Final head and CI custody are recorded in the final receipt.

## Implementation and counts

The existing 75-object/11-category account fixture is unchanged. The additional deterministic account contains 498 objects across 17 categories, packaged as 265 original endpoint responses, with 6,211 original JSON leaves. It is 204425 bytes, within the unchanged 512 KiB / 500-record bounds. SHA-256: 08963daadc47d636e9d6b341b0a1ce030bf33102ffd21f0f84d64e4415813fbd.

The public PagerDuty OpenAPI 2.0.0 schema read on 2026-11-17 has SHA-256 cbae7d77f588e8fb5b14118003c9b8a71f274c57719ddc39eb8e77a71994f6d8. Every one of the 265 synthetic response wrappers passes the public schema validator (OpenAPI nullable semantics applied). Endpoint names and per-kind counts are in the fixture manifest and schema-shape-receipt.json. Unknown future_setting is deliberately retained as an explicit gap. Generation twice produces byte-identical account.json and manifest.json.

The existing file reader accepts separate parent bindings outside the provider responses. Contacts and notification rules bind to users; overrides to schedules; integrations to services; timeline entries to incidents; subscribers to business services; routers to orchestrations. Complete offset and cursor pages are validated. Missing or contradictory parents, missing referenced details, duplicate identities, wrong envelopes, incomplete pages and credentials refuse the file. Legacy embedded details and all older fixtures remain supported.

The existing mapper emits one decision per original JSON leaf, including nulls, empty containers, response metadata and packaging. Each decision carries source kind/ID, RFC 6901 pointer, original value, mapped/lossy/retained-only/refused disposition, reason and receiving place. Repeated explanations refer to their complete object rejection/difference in the same report. The owner review offers an exclusive field summary, an expandable object list, exact clipboard copy and a complete JSON download. Business diagnostics include the same field pointers, dispositions and receiving-place explanations. The complete first reviewed account report is retained without a presentation cap. Changed catch-ups retain preceding reviewed details for unchanged sources.

Contacts remain unverified E.164. Schedules and policies stay paused; integrations stay inactive and keyless. A separate override change participates in its schedule's source hash, so catch-up re-reviews the receiving schedule even if its own endpoint response is unchanged. The mapping version is advanced to require re-review after this semantic change. Email-reference scans avoid work on strings containing no @, preserving the existing matching semantics.

## Plan and verification

The full execution plan is PLAN.md. Actual successful HTTP, erasure, browser, schema, deterministic-generation and final CI receipts are selected explicitly into this packet. The public journeys use the emitted Worker and real local D1 with synthetic source files. SQL is used for observations and deliberate transactional failure/revocation injection; application mutations use public HTTP doors.

Observed HTTP account proof: both owner and signed Business doors reconcile all 498 source objects, 6,211 original leaves and 132 paused targets (60 people, 12 schedules, 12 policies, 48 integrations). Each begins at checkpoint 20/498, survives Worker restart without changing its committed prefix, replays identical bytes without effects, applies a changed profile plus separate override, and performs newest-first layered undo. Both doors refuse all eleven malformed/wrapper/binding/detail/pagination/identity/credential cases without changing authoritative workspace or paging state. Business publication-time revocation and an injected SQL failure roll back. The actual shared-door reconciliation reports all 498 sources as explained because the complete report supplies notes for each; it separately checks all 132 native targets. Field totals are 767 mapped, 241 lossy, 4,073 retained-only and 1,130 refused (sum 6,211). Object classifications are 364 mapped-with-differences and 134 rejected (sum 498).

Typecheck, the source-lock check, contract-document check, production build, activation journey, product browser journey and managed-installation transfer journey passed. The final browser receipt reconciles its copied/downloaded report against all original leaf pointers (498 objects, 6,211 fields, 6,916,137 copied bytes), with no serious/critical Axe findings at the asserted 1440 width; the changed review is shown at both 1440 and 390. The actual imported-person erasure receipt proves eight custody records removed, one paused schedule rewritten with a gap, all local D1 tables and the portable archive inspected, no identity occurrences, and 59 other people retained. Erasure fences advance while operational native workspace and paging stay unchanged.

The final candidate is f14b9337969e42646cc7a36272ac1e7fb6e4e8a2. It was pushed through the fleet guard. Exact-SHA Verify run 44096591720 completed successfully on f14b9337969e42646cc7a36272ac1e7fb6e4e8a2, observed at the tenth budgeted GitHub call on 2026-11-17T14:16Z. The complete branch Verify is the rer-verify/full-suite wall; no local full-suite rerun was added. There is no PR and no remaining round blocker. The raw final REST response and final-receipt.json preserve the exact result. An earlier candidate (c17cf0d31ce4ce8aea49f04838c9f3db8f7cf88b) had a cancelled changes shard, so aggregate Verify 44085883158 failed. The retained job and aggregate-log evidence records that outcome; it is never counted as green. The complete final local import-door rerun passed with exit 0, including changed-source pointer uniqueness after fixing a cached schedule-note array. It also passed all existing vendor, OAuth custody, rollback, adoption and erasure regressions. The packet contains its newly generated actual report and receipts. The exact-SHA transfer receipt and final browser proof use the final source head.

A computed per-kind loss table is in field-summary.md, and pagerduty-synthetic-report.json is the complete actual owner report. The exclusive dispositions reconcile to all 6,211 original leaves; summary counts and the 132 receiving targets are distinct measures.

## Scope and policy

No CONTRACT.md judgments or acceptance points were edited, and neither generated view is committed. Before this round the contract contained 26 done, 41 partial and 34 missing clauses; this round changes no status. OC-021 and OC-022 are existing done clauses; OC-038, OC-040 and OC-042 remain partial. Existing registrations are extended; no test registration is added.

DEFAULT OC-021: Current owner/admin review of exact source bytes; source-only evidence and paused configuration; no native service or login grant.
DEFAULT OC-022: Same lineage and current SQL authority, reviewed catch-up, newest-first undo, and preservation of native edits.
DEFAULT OC-038: Saved synthetic files only; no provider account calls, imported credentials, live integration activation, outbound actions or pager cutover.
GAP OC-038: Complete native conversion of teams, services, histories, subscribers, actions, routed keys and every incumbent; real exports/live APIs, live provider delivery, DST/parallel routing, standby and authorized real-phone cutover remain outside this saved-file proof. Timeline entries, subscribers and Automation Actions are individually retained/refused rather than fabricated as native objects. PTO, reviews, action items and other absent account categories remain missing evidence.
GAP OC-040: This round proves local imported custody/portable-copy erasure only; cross-site standby reconciliation and external recipient deletion remain unproved.
GAP OC-042: Saved-file credential refusal and existing custody exclusions do not prove every connector, provider or model egress obligation.

No real PagerDuty account, real export, production activation, paging, access grant, live provider send, standby operation or account secret is used or claimed. Public documentation is read through one GitHub API request; all other planned API calls are reserved for exact-head CI. The Mac fleet owns the complete publication scan and landing. Product publication and report-only evidence transfer are independent custody.

## Builder claims and terminal custody

Run Edit Run fleet, 2026-11-17 UTC. These claims do not edit existing contract judgments; the lander owns acceptance and publication.

CLAIM OC-021 DONE points=1 tests=tests/import-door.mjs#documented PagerDuty account; tests/activation.mjs#OC-021/022 saved-response journeys; tests/product-browser-journey.mjs#documentedPagerDutyReview
CLAIM OC-022 DONE points=1 tests=tests/import-door.mjs#documented PagerDuty account; tests/activation.mjs#OC-022 unfinished checkpoint and native-edit undo conflicts
CLAIM OC-038 PARTIAL points=none tests=tests/import-door.mjs#documented PagerDuty account
CLAIM OC-040 PARTIAL points=none tests=tests/import-door.mjs#documented PagerDuty erasure
CLAIM OC-042 PARTIAL points=none tests=tests/import-door.mjs#documented PagerDuty account credential refusal

DEFAULT OC-040: Erasure is local and atomic; preserve anonymous restore fences and explicit schedule gaps. No standby success is inferred.
DEFAULT OC-042: Reject credential-bearing source files; no account credential is imported or activated.

All eight local check groups in local-checks.json passed. Owner and signed Business receipts, complete loss report, source/schema digests, byte-identical generation, browser proof, transfer proof and CI provenance are retained in this packet. The earlier cancelled Verify remains historical evidence only. Product and evidence branches were published separately. The fleet owns main, its complete publication scan, independent acceptance and landing. No main push, self-submit, release or production deployment was attempted.
