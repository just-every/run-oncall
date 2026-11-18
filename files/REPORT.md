# OC-070 saved mail draft decisions

Run Edit Run fleet · 2026-11-18 UTC

## Plan and replay

1. Clone Oncall main and confirm the feeder head at e8f3230211887a68c606ae64402b2f8ae027c021.
2. Apply only feeder commits 43fe407f735957c30ca07e31e4cf4a2275462f3d and e8f3230211887a68c606ae64402b2f8ae027c021 to fresh main. Keep newer assertions and contract judgments. Regenerate and check the contract views, restore main's view files, then regenerate and check the source lock with the edition pin.
3. Build and run the routing journey and focused saved-email browser journey on the candidate. Compare the administrator's historical and tested draft decisions and check that preview leaves durable state unchanged. Assert at 1440 and capture the same panel at 1440 and 390.
4. Fetch main immediately before publication and verify the linear history and clean candidate. Push the named branch, check exact-SHA Verify, and attach this packet to the published head through the evidence ref.

Main was 39e6d289a2fbae32c9901640f61646ca0ff9ca53 at checkout and at the pre-push fetch. The product branch cloud/sd-oncall-c-f280-lin-1 was published once at 785efc54b0ab59a7435583ac3df04279e366fa12 at 21:06:33 UTC. It has two replayed commits and zero merge commits.

- c6ae2b9312d20a98978bed4028807ae58b8ed8f9 shows the historical and tested draft actions, modes, rule versions, matched rules and keys in the existing administrator preview.
- 785efc54b0ab59a7435583ac3df04279e366fa12 extends the existing routing and saved-email browser flows and records the acceptance 7 proof in contract prose. The source lock was regenerated after resolving its conflict. The replay retained newer shared assertions, clause judgments, generated views and release metadata from main.

## Local results

- Setup, production build, typecheck, first-party profile and the pinned edition source lock check passed. The exact CI build entry point also passed under Node 22.20.0 and wrote the candidate SHA to its build receipt.
- The routing suite and focused browser journey both passed under the pinned Node 22.20.0 toolchain. The attached proof comes from that pinned run. The saved-email replay compared six admitted samples, matched historical decisions to archive receipts, and proposed quarantine for unmatched mail with durable and paging state preserved.
- The focused Chromium browser journey passed through the emitted Worker. Anonymous preview returned 401 and the administrative comparison returned 200. The matched trigger and recovery retained their archived decisions apart from the next rule version. The unmatched trigger became a proposed quarantine. Published rules, durable rows, audit, archive and paging were unchanged. The browser and Worker each made zero outbound requests during the comparison, and the accessibility scan found zero serious or critical violations.
- Browser assertions ran at 1440. Attached captures show the comparison at 1440 and 390. The recorded document widths equal the viewports and the smallest measured comparison text was 14 px at both sizes.
- The contract generator and its check passed together with zero prose errors and warnings. On the committed tree the generator check reports only the expected stale ACCEPTANCE.md view. Main's ACCEPTANCE.md and docs/CLAIMS.md are both preserved for landing.
- Contract counts before and after were 26 done, 41 partial and 34 missing, 101 total. No clause advanced. The Verify plan stays at 21 runner commands across eight push shards. Within the touched coverage, the existing email-import browser case gains one saved-draft comparison, and the existing routing replay is expanded in place.

CLAIM OC-070 PARTIAL points=7 tests=tests/product-browser-journey.mjs#savedMailDraftBrowser; tests/routing.mjs#saved email draft replay

GAP OC-070: Live paging, provider accounts, standby, real-phone and cutover proof remain held, including acceptance 2’s two actual pages, continued escalation and recovery stops.

## Exact-SHA Verify and custody

Verify run 44398012041 completed on 785efc54b0ab59a7435583ac3df04279e366fa12. Plan, build, all eight shards and full-push-proof succeeded. The contract-docs job (135133366529) reported only an out-of-date ACCEPTANCE.md. The aggregate verify job (135143878007) failed on that same job result. Both archived job logs are in the Verify receipt. The generated-view exception applies and the branch is READY for the fleet's independent publication scan and landing checks. The branch query found no open pull request.

https://github.com/just-every/run-oncall/actions/runs/44398012041
