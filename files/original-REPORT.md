# main-oncall-api-clients-ready-1

Repository: just-every/run-oncall
Product branch: cloud/main-oncall-api-clients-ready-1
Product head: fcc1fec3a3b0be2e85b4c928260fe80fa0ca1e01
Merged main: 0766444566ab517f42308c8a407f4791948f18b0
PR: none; this seed's fleet branch landing path is used.
CI: Verify 43140611903 completed/success on fcc1fec3a3b0be2e85b4c928260fe80fa0ca1e01. Four GitHub REST calls were used, spaced at least 300 seconds apart. Actual status and call timestamps are recorded in ci-receipt.json.

## Finding and chosen policy path

A fresh client with incident/service read grants returned 403 policy_unset with the unhelpful message “policy unset”. The response already carried fields.setup_url, but the client page and API reference did not explain the prerequisite. The existing supported standalone setup is /agents: a signed-in owner or standalone administrator chooses the declared class decisions and paid-AI answer and saves the policy. Business-managed installations use the Business policy settings, with the Business owner providing that policy.

OC-053's scoped service-account authority and the shared BASE-AGENT-007 company-policy requirement apply together. API reads already invoke the shared native agent door. This round retains that policy gate, shows its current state and links to the existing setup. It creates no policy editor, policy model, grant kind or outbound capability.

DEFAULT OC-053: Keep the supported shared agent-policy prerequisite. Standalone owners/administrators set it at /agents; Business owners set the Business policy. No policy answer is preselected.

On the cloned main 90f391b56d492b998e0e55509e076eaf588cbea4, Client actions initially had opacity 0 and pointer-events none at 1440 and 390; hit-testing found the LI at its center. Chromium's hover/touch handling let the eventual click open it on this newer main, so the original stranger's keyboard-only outcome was not reproduced exactly. The blank initial control and row hit target were reproduced at both widths. See reproduction.json and before-1440.png/before-390.png.

## Delivered behavior

- API client setup shows the policy prerequisite before and after creation. It shows current unset, set, paused, expired or unavailable state, and never treats grants alone as readiness. A set policy still requires an allowed decision and the client's grants.
- The policy link reaches the real document handler. The browser test found that an ordinary local link was intercepted by the workspace router; target=_self explicitly loads the separate policy document.
- The REST 403 policy_unset message and the client page share the same plain missing-step sentence: “Set agent policy before API clients can read or change records.” Existing setup_url fields remain available.
- The reference names the prerequisite, where to set it, the documented GET /api/v1/incidents, and unset/paused/blocked/expired/approval responses.
- Client actions stays visible and pointer-enabled without a preliminary row hover. Existing protected rotate/revoke confirmations and authority/revision checks remain in use.
- A read client created through the browser, after following that link and explicitly saving policy choices through the existing form, reads the granted service's incident with the same generated key. A foreign incident remains absent. An ungranted analytics read remains 403. Rotation makes the old key 401 and the new key 200; revocation makes the new key 401.

## Validation and receipts

The final merged product head passed:
- cloud_run npx -y @runeditrun/rer build
- pnpm run typecheck
- cloud_run node tests/member-coordination-browser.mjs using /usr/bin/chromium and --no-sandbox
- node scripts/edition-authoring/cli.mjs check
- node src/base/contract-docs.mjs check

The entire touched browser file was run again after merging current main's form-validation changes. It retains its conflict, viewer, outbox, machine-attribution, erasure, restore-refusal, hydration, overflow and accessibility checks. The API-client assertions run at 1440. The changed client states are captured at 1440 and 390, after dismissing one-time keys. local-checks.json binds the actual command results and log hashes to the final head.

A separate final-head 390-wide touch proof used unforced taps to create the client, follow and save the policy, open Client actions, rotate and revoke. phone-pointer-receipt.json records the actual HTTP outcomes and pointer results without key values.

An earlier local build caught the docs compiler's refusal of an app-absolute Markdown repository link; the reference now names the path in text and uses the live setup link on the client page. An earlier browser run caught the workspace-router interception of the policy link; both failures were fixed before the final merged-head checks.

## Counts, scope and clause claims

Before → after clause status counts: done 24 → 24; partial 43 → 43; missing 34 → 34. OC-053's stored status remains done → done, and this builder makes no DONE claim. CONTRACT.md is byte-identical to merged main. No Status, Gap or Evidence cell was edited. ACCEPTANCE.md and docs/CLAIMS.md were kept from main and are absent from this round's product diff.

No test registration was added. The existing API-client browser journey was extended. The maintained Verify plan remains 16 lane invocations over 12 unique journey files before and after; these are plan counts, not a new cap ruling.

CLAIM OC-053 PARTIAL points=none tests=tests/member-coordination-browser.mjs#OC-053 API client policy setup

The named browser segment proves the scoped read/setup and client-lifecycle subset of acceptance 1, not every create/acknowledge/reassign/resolve, pagination, limit and stale-edit requirement in that acceptance point. Existing broader evidence is preserved; this round requests no clause promotion or demotion. The brief's “no supported policy setup” GAP condition does not apply.

## Custody and limits

The first real commit 54e3af1304de5c4abca8823b234f7c692293f7db was pushed as a skip-ci save. The final candidate contains real changes and has no skip marker. Updated main was merged after the published save; published history was never rebased or force-pushed. The only merge conflict was the source lock, which was regenerated and checked after keeping main's newer files. All candidate authors, committers and trailers, including side parents, were checked before the guarded product push.

Product pushes went only to cloud/main-oncall-api-clients-ready-1. Report files are outside the product tree and are transferred only through evidence/main-oncall-api-clients-ready-1. Evidence publication is separate from product readiness or acceptance. The Mac fleet owns the complete publication scan and landing; neither was run or claimed in this cloud.

No blockers remain: local checks pass and exact-SHA Verify completed successfully. Final CI state and call timestamps are in ci-receipt.json. No live provider, hosted deployment, real handset, general paging, or full OC-053 acceptance claim is made.
