# sd-oncall-c-f280 — Oncall OC-070 acceptance 7

Fleet builder, 18 November 2026.

## Scope and plan

Start from current main, verify the landed predecessors, and extend the existing admin comparison with the decisions already returned by the protected preview. Use the current saved sample list in the emitted Worker browser and routing fixtures. Compare the live response, rendered decision fields and archived records, then check storage and outbound invariants. Recheck the saved-import and Opsgenie readiness fixtures. Record only acceptance 7 in the clause body, regenerate and check the views, restore main's views, and lock the exact candidate before branch publication.

- Starting main was `93b25a01d22f5b16bf679c6f4008f0e444980196`, descended from the plan's `dfdd89469d3b2b2d552e39137cacc7b64633ddb1`. Exact main Verify runs 44283231598 and 44279924349 and Run site 44283231793 were completed successfully.
- The f234 saved-file email work is present through its landed rebase `69f6d7b3ac67b97241e9167472b212da976a242c`. Its original cloud head was superseded by that rebase. Rechecked the unchanged saved-import decision comparison in `tests/email-fixtures.mjs` with emitted Worker intake and the existing PagerDuty and Opsgenie mapping and activation browser flow.
- The f154 readiness predecessor `f0ca401eaa688e49a703c62042b26af963923883` is on starting main. Rechecked via `providerExport` and `opsgenieReadiness`. The Opsgenie selection reaches the 31 October 2026 review and 5 April 2027 shutdown guidance. The five official references, blocked account checks and unchecked inventory, mapping, inactive import and cutover gates remain. The browser check preserved native state, durable records and paging with zero provider or mutation requests.
- Existing interrupted-rule and saved-runbook changes in the shared browser file were retained. No predecessor or queue row was edited. Record acceptance 7 against f280 and retain the existing f234 feeder hold and f154 OC-038 hold.

## Observation

The owner admitted three synthetic messages through the emitted email door while the published custom rules used subject fallback. The browser selected quarantine only in the draft and submitted the existing control. The request included all three current sample IDs and the unchanged rule definitions. The protected response returned HTTP 200 and zero side effects. An anonymous request with valid input returned HTTP 401.

| Saved subject | Historical mode and version | Historical rule, key, action | Draft mode and version | Draft rule, key, action |
| --- | --- | --- | --- | --- |
| FAILED: synthetic-oncall-db | custom, 1 | failed, synthetic-oncall-db, trigger | custom, 2 | failed, synthetic-oncall-db, trigger |
| OK: synthetic-oncall-db | custom, 1 | ok, synthetic-oncall-db, resolve | custom, 2 | ok, synthetic-oncall-db, resolve |
| Unmatched observation | custom, 1 | none, Unmatched observation, trigger | custom, 2 | none, no key, quarantine |

The historical objects matched the archived receipt decisions. The published version stayed at 1 with subject fallback. The browser checked each displayed mode, version, matched rule, key and action against the protected response. The preview was the only browser POST in the comparison and both browser and Worker recorded zero outbound requests. All durable tables and audit rows were identical before and after the preview. The archive, address and workspace revisions, alerts, receipts, quarantine and paging state matched. Paging remained OFF.

Assertions ran at 1440. The two screenshots show the same control and resulting comparison at 1440 and 390 viewports. Text measured at least 14 px at both widths. Both documents fit their viewport, and the desktop axe check found zero serious or critical issues. The control is text-labeled and the comparison added no icon-only control. This sits inside Settings and uses the existing activity list presentation. The comparison uses the most recent 100 saved samples at most, matching the existing server bound.

PROBE OC-070 7: admin Test draft against saved mail with only the draft fallback changed to quarantine -> archived version 1 and proposed version 2 decisions shown for matched trigger, matched resolve and unmatched trigger, with the unmatched proposal quarantined and zero durable writes or outbound requests.

## Riders and retained scope

1. The selected acceptance reaches the visible would-be actions in `savedMailDraftBrowser`. The final clause remains partial for the retained paging, account and cutover requirements.
2. Three saved rows include the changed unmatched fallback. Protected HTTP, archive and display observations are compared against independent expected actions and keys.
3. The browser and intake workflows already invoke these existing journeys. Exact-SHA CI status is recorded below.
4. The initial browser run placed the post-preview archive read before the durable comparison. Archive reads have their own audit event. The passing run takes the durable snapshot before that second archive read. No browser or product code changed after the passing capture. The routing fixture's local name collision was corrected before its passing execution.
5. The clause already names OC-002 replay and zero writes. No Base duty was added or claimed.
6. Generated views pass after the documented write. Main's view files are restored for the fleet lander. All Status, Gap and Evidence rows match main. Counts are 26 DONE, 41 PARTIAL and 34 MISSING before and after, 101 total.
7. All eight acceptance sentences and both OC-070 and OC-038 Status rows were preserved. Only the observed acceptance 7 note was added.
8. Anonymous preview returned 401. The existing emitted Worker intake and erasure fixture covers protected activation, revoked or retired replay and archive fencing. No authorization, erasure or replay policy changed.
9. Paging was OFF. R-2 remains dated 21 October 2026 provider evidence. R-11 current live export shapes and OC-074 pull and reconciliation remain held.
10. The existing admin access and preview policy govern this change. No policy default was adopted.
11. Guarded landing, full-history publication scan and candidate Run site remain with the fleet. The candidate is branch-only and no scan result is claimed.

CLAIM OC-070 PARTIAL points=7 tests=tests/product-browser-journey.mjs#savedMailDraftBrowser; tests/routing.mjs#saved email draft replay

GAP OC-070: Live paging, provider accounts, standby, real-phone and cutover proof remain held, including acceptance 2's two actual pages, continued escalation and actual recovery stops under OC-026, OC-027, OC-075 and OC-078. OC-062 code management remains behind registry accounts and OC-063. R-11 live exports and OC-074 live API pull and reconciliation remain held.

## Check and publication receipts

- Product branch \`cloud/sd-oncall-c-f280\` advertised exact head \`e8f3230211887a68c606ae64402b2f8ae027c021\`. Save \`43fe407f735957c30ca07e31e4cf4a2275462f3d\` was pushed first with the CI skip marker. Both candidate commits passed identity and trailer inspection.
- The enacted plan passed emitted Worker build, browser, routing and intake, the Opsgenie readiness journey, typecheck and the first-party check. \`savedMailDraftBrowser\` is in \`tests/product-browser-journey.mjs\`, and the public routing fixture logs \`PASS saved email draft replay\` in \`tests/routing.mjs\`. The exact candidate also passed \`ONCALL_PRODUCT_PART=core node tests/product-browser.mjs\` with Chromium.
- Branch Verify 44286481603 was a push run on the exact candidate. Observed status \`completed\` and conclusion \`failure\`. All eight shards, build and full-push proof passed. The only independent failure was the expected generated ACCEPTANCE.md freshness check in job 134740585006. Job 134749313852 failed on that dependency. Archived logs confirmed both. The fleet readiness exception applies and the lander will regenerate the views.
- The local packet holds the measured decisions and both viewport captures, the original saved-import receipt, and the exact product and check receipt.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0
