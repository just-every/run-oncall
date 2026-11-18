# Oncall owner journey replay

The work reapplies decisions D10, D11, D15, D16, D17 and D19 to current Oncall main. No contract clause claimed; these are owner-journey design fixes (DIRECT 87).

## Plan and execution

1. Confirm the owner-1 and owner-2 remote tips and locate the common base with main. Inspect the historical failed-job archive for each of the Browser, Transfer, Hosted and Runtime shards.
2. Apply the owner-2 net patch to fresh main on `cloud/sd-oncall-design-owner-3`. Keep main's workspace links, immediate response-setting and retry assertions, Team contact explanation and paging notice. Preserve access to alert mechanics through Details and omit the disclosure when there are no mechanics to show.
3. Use real emitted Worker and managed installation journeys for the changed assertions. Generate the contract views from their source, restore main's tracked copies and regenerate the source lock with the repository's pinned authoring package after the build output is reconciled.
4. Validate the release metadata, audit the exact candidate identities and messages, recheck current main immediately before the guarded product push, and collect exact-SHA Verify status through GitHub REST.
5. Preserve the local test receipt and synthetic browser captures on the separate evidence branch.

## Replay provenance

- Owner-1 was `24dfae3babb62b0789c25c1e36b59ac02fda8fe4`.
- Owner-2 was `c8f021a2f1781d0902213b0eca8b1b4b558c15e2`.
- Both branch tips shared merge base `4988fbbe5e310410f02d3cfbd4ffc323bc967a6f` with starting main `76e7ed5eb83d6cf3dba8b591a10cf63028eb4f4a`.
- The replay combines the four overlapping files `src/alerts/AlertPage.tsx`, `src/on-call/RotaPage.tsx`, `src/team/PersonNotifications.tsx` and `tests/product-browser.mjs`. Each path differing from the owner-2 tree also changed in main since the shared base. Rebuilding the source lock combines both sets of source bytes.
- The product branch changes 45 files. No merge commits or changes to CONTRACT.md, ACCEPTANCE.md, docs/CLAIMS.md or RELEASE.json entered the replay.

## Product and assertions

- **Browser** — `supportStartBrowser` opens Urgency history, checks that policy mechanics start collapsed, opens Details, and compares the reopened history after reload. `responsePolicyBrowser` preserves main's immediate apply and retry checks while testing that stop, recovery, and cancellation mechanics are still reachable. `incompleteIntakeBrowser` still checks the assigned integration owner and explicit incident-service choice. `triageBulkBrowser` opens Details before it checks human-resolution history.
- **Transfer** — `tests/transfer.mjs` uses the backup file label and still submits REPLACE and observes a successful restore. The stale-archive journey in `tests/member-coordination-browser.mjs` uses the same label and still checks HTTP 409 and unchanged state after erasure.
- **Hosted** — `changeAndSigningBrowser` checks the single related alert and opens Related alerts and evidence. `eventsSourceBrowser` and `routingBrowser` locate the renamed alert address and sample controls and verify the real address, clipboard, event lifecycle and secret exclusion.
- **Runtime** — The installed recovery command path agrees across the installer adapter, deployment policy, base packaging declaration, generated deployment specification, README and data instructions. No release version or clause changed.
- **Rota and contact** — `productSchedule`, `rotaTimelineScreens`, `coverageRulesBrowser` and `scheduleCoordinationBrowser` verify coverage times, no gaps before start, and reachable reviewed time-off and swap actions. `ownerFaultsBrowser` verifies normalized phone input across four ordinary formats and checks that the downloaded backup and the restored workspace retain rota and override records with paging OFF.
- **Reviews and readiness** — `responseReportBrowser`, `captureViews` and `captureReviewMaterial` keep the numeric, date-range and evidence-link checks with owner-facing terminology. `readinessBrowser` and `readableNamesBrowser` open Details and still check the actual release and readiness data.

## Contract counts

| Tier | Before (done / partial / missing) | After (done / partial / missing) |
| --- | --- | --- |
| Core | 25 / 35 / 24 | 25 / 35 / 24 |
| Agent surface | 1 / 6 / 10 | 1 / 6 / 10 |
| Full target | 26 / 41 / 34 | 26 / 41 / 34 |

The field proof register remains 2 passed and 12 not run. This run used synthetic test data and made no deployment or delivery claim.

## Historical run

Verify run `44130574848` failed on owner-1. The jobs endpoint confirmed failures in Browser `134207650528`, Transfer `134207650579`, Hosted `134207650591` and Runtime `134207650598`. The four archive calls were made before applying the replay. The Browser archive command returned `failed to get run log: zip: not a valid zip file`. Each of the other three commands exited successfully with an empty log. The diagnoses above use the brief's historical findings, the owner-2 patch and local tests. See the verification receipt for this candidate's checks and exact-SHA workflow result.

## Published candidate and browser proof

The product branch `cloud/sd-oncall-design-owner-3` is one commit ahead of the checked main. Verify run 44205374436 completed successfully on exact head `588b45da0cdd4a0f09774688e48cce743552dbe2`. [Verify run](https://github.com/just-every/run-oncall/actions/runs/44205374436)

The captures show synthetic records from the emitted application at both viewport widths.

| Screen | 1440 px | 390 px |
| --- | --- | --- |
| Rota Check summary and optional preview | [Desktop](browser/rota-check-1440.png) | [Phone](browser/rota-check-390.png) |
| Week grid, including a future rota | [Desktop](browser/rota-week-1440.png) | [Phone](browser/rota-week-390.png) |
| Alert history with policy details opened | [Desktop](browser/alert-history-1440.png) | [Phone](browser/alert-history-390.png) |
| Team contact country and phone fields | [Desktop](browser/phone-contact-1440.png) | [Phone](browser/phone-contact-390.png) |
| Archive backup and successful restore | [Desktop](browser/archive-backup-1440.png) | [Phone](browser/archive-backup-390.png) |
| Integration sample and recorded receipts | [Desktop](browser/integrations-1440.png) | [Phone](browser/integrations-390.png) |
| Review response numbers and recorded recovery | [Desktop](browser/response-numbers-1440.png) | [Phone](browser/response-numbers-390.png) |
| Review material timings and human-reported recovery | [Desktop](browser/review-material-1440.png) | [Phone](browser/review-material-390.png) |
| Readiness details | [Desktop](browser/readiness-details-1440.png) | [Phone](browser/readiness-details-390.png) |

The integration screenshot uses the browser journey's existing private-field mask. Backup files, GitHub archives, and raw browser diagnostics are excluded from this packet.
