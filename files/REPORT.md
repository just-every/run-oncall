# main-oncall-events-sample-1

Repository: just-every/run-oncall
Branch: cloud/main-oncall-events-sample-1
Candidate: 5c3fcdae807d6cbd08fbe5521f9ba89ca1a5222d
Starting main: 669b0c877ca659e5475e4ed2016fe584ac3d859d
PR: none; repository guidance did not require a builder PR.

## Result

The Events API sample on source creation and detail now uses the source’s displayed name, a service-named dedup key, and timestamp-based event/lifecycle identities. The current API requires a service ID; a paragraph beside the sample names its service, explains this ID, and links to Services, where it can be copied. Source URLs and ingress addresses retain their original internal IDs.

The authenticated native endpoint accepts either its existing source ID or the same displayed name used by Settings → Integrations. It normalizes names to the existing ID before admission. It retains the established source/event identity, dedup scope, receipts, generation handling, service authorization, bearer/HMAC authentication and credential-echo refusal. It never selects another endpoint from a supplied name. Service-name aliases are not added.

## Public-door reproduction and proof

Before editing, the existing emitted-Worker Events source journey passed, while its screenshots showed a suffixed source value, service ID, UUID-based event ID and generation, and an ID-based alert key. This establishes that sending worked before the readability fix.

The extended existing eventsSourceBrowser journey reads and copies the sample from each source’s detail page, then executes its entire shell command without rewriting the payload, for bearer and HMAC authentication. Each command opens an active alert that is seen and opened in Alerts. Protected state confirms the expected service, key and stable source identity. Repeating the sample with the original source ID returns the same receipt with duplicate=true. Wrong source names and display-name service substitutions are refused with 403 and create no accepted events or alerts. The original page URL and ingress address work before and after sending.

The prior Critical Trigger → navigate to Alerts → Warning Recover assertions remain intact: one recovered alert, matching nav/list/detail, retained key/generation and declared incident still open. Browser assertions run at 1440; changed-screen images also show 390. Browser screenshots mask private-key fields.

## Plan outcome

Launcher/identity/hooks configured; baseline public-door reproduction completed; sample and scoped alias implementation finished; existing browser journey extended and passed; typecheck/source-lock/contract checks passed; first save and final candidate published; exact-SHA CI and separate evidence return are the final custody steps. See PLAN.md for the full ordered plan.

## Validation and counts

- Production build: cloud_run npx -y @runeditrun/rer build — exit 0.
- Touched journey: ONCALL_CHROMIUM_PATH=/usr/bin/chromium ONCALL_PRODUCT_JOURNEY=events-source cloud_run node tests/product-browser.mjs — exit 0.
- Typecheck: cloud_run pnpm run typecheck — exit 0, repeated before final commit.
- Contract generator check — current, 0 errors and 0 warnings. CONTRACT.md and both generated views are unchanged.
- Source lock generated last with node scripts/edition-authoring/cli.mjs lock, then check — exit 0; checked again on the final committed tree.
- git diff --check — clean. Both product pushes used the fleet guard and passed identity/full-message inspection. No co-author trailers.
- Test registrations added: 0. Existing Events source journey: 1 → 1. Verify lane script entries: 16 → 16. This change extends the existing journey and does not raise the 200-test cap.
- Sample fields using internal/generated IDs: source, service, key, eventId and generation (5) → service only (1). The endpoint’s stable internal source ID remains in the URL as required for existing senders.
- Contract judgment counts before → after: done 22 → 22; partial 45 → 45; missing 34 → 34.
- Clause status changes: 0. No CONTRACT Status, Gap, Evidence, acceptance text or generated summary edit; no DONE claim.

A first local test run found a strict-mode heading locator collision; the locator was scoped to the named source region and the focused journey passed. No product assertion was removed or weakened. The first product save carried [skip ci]; the final candidate carries no skip marker.

## Claim boundaries

CLAIM OC-001 PARTIAL points=none tests=tests/product-browser.mjs#eventsSourceBrowser
DEFAULT OC-001: Keep the API-required service ID and explain it beside the sample; accept only the current endpoint’s displayed source name as an alias.
GAP OC-001: This bounded sample/readability and lifecycle regression does not newly prove all of acceptance point 1 or point 2; it makes no full clause-completion or delivery claim. Paging remains OFF.

## Custody and CI

First save: 3e696d8511db6218c52a394542f74a6d4e2e29d6 — pushed with [skip ci].
Final candidate: 5c3fcdae807d6cbd08fbe5521f9ba89ca1a5222d — pushed, no skip marker.
Verify run: 43011729603 — completed/success on exact candidate SHA 5c3fcdae807d6cbd08fbe5521f9ba89ca1a5222d; https://github.com/just-every/run-oncall/actions/runs/43011729603. Four GitHub calls used. No blockers. See CI-RECEIPT.json and ci-api-calls.jsonl for final observed outcome and API budget. The REST watcher uses a minimum 300-second interval including discovery.

Mac-only Base publication scan and landing remain the fleet’s gates, as the cloud adaptation requires. This task does not push main, land, deploy, claim provider delivery, or publish fleet evidence to product refs. Evidence files are selected explicitly and transported only to evidence/main-oncall-events-sample-1.

Full execution plan: PLAN.md. Actual local results: LOCAL-RECEIPT.json and the named logs. Browser evidence is under before/ and browser/ in this packet.

Terminal product custody: READY branch=cloud/main-oncall-events-sample-1 head=5c3fcdae807d6cbd08fbe5521f9ba89ca1a5222d
