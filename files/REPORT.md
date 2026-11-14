# Restored owner access and authored names

Repository: just-every/run-oncall
Branch: cloud/main-oncall-restore-owner-1

## Plan
Reproduce both stranger findings through public doors; fix only seed identity integration; extend the existing installation transfer journey; run the touched journey and typecheck; integrate main and regenerate the source lock; audit commit identities and publish the candidate; await exact-SHA Verify and return evidence separately.

## Reproduction
- Native JSON archive: entered as the owner, renamed the owner Maya Chen, created an owned service, exported and restored via protected HTTP, stopped dev, built, and opened preview's printed private link in the same browser. It led to /signin/local?restore=1 and refused administrator listing because the owner was already linked. A fresh browser context opened successfully, isolating the old workspace cookie as the cause. baseline.json and before-native-1440.png contain the observed result.
- Portable installation archive: exported, reset, imported, configured the receiving owner and opened rer dev's private link. Selecting the archived Maya Chen administrator yielded a member named Owner. baseline-portable.json records the observed result.

## Changes
- Successful /auth/owner-signin now clears the workspace cookie, as successful email confirmation already does. The new native session can resolve the preserved owner mapping; ordinary requests retain stale-session refusal.
- Explicit archived-owner mapping adopts the selected archived name by default, or the valid name the owner entered. The owner-name update and identity link share a D1 batch; both repeat the existing owner-session, active-admin, no-password and unlinked-installation gates. A selected archived name is fenced against concurrent change.
- The mapping form includes Your name, initially filled from the selected archived administrator. Editing or selecting resets explicit confirmation.
- The existing transfer journey now restores through Settings > Archive, builds, opens preview in the same browser, and checks the preserved mapping without another mapping step. Portable mapping verifies name preservation across refresh, account identity, team/service references and cover-holder identity. Anonymous, unconfirmed, invalid-name, missing-admin and held-password mapping refusals remain covered.

Both defects are in seed integration. No Base, vendored module, rer, archive format, export or import code was changed. No BASE referral is needed.

## Counts and clause custody
Targeted stranger findings: 2 reproduced failures before / 0 failures after in the extended public-door journey.
Existing transfer registration: 1 before / 1 after. Verify lane journey entries: 16 before / 16 after. No new registration.
Contract progress remains 26 done / 41 partial / 34 missing (101 total). No clause Status, Gap or Evidence cells changed; no DONE claim.

## Validation
- `pnpm run typecheck`: passed (unchanged product source; the later test-only correction completed first-run setup before opening the workspace).
- `npx -y @runeditrun/rer build`: passed. The transfer journey also builds its exact candidate source through the pinned CLI twice.
- `node scripts/edition-authoring/cli.mjs lock`, then `check`: passed after the final fetch/rebase. Main was unchanged; no contract conflict or generated view changes.
- `ONCALL_CHROMIUM_PATH=/usr/bin/chromium node tests/transfer.mjs`: passed in a fresh clone of `90bbf1e215eaa5e01ad72d2823f5d84bf2768759`. The full actual log and emitted health receipt are retained as transfer.log and transfer-receipt.json. The pinned CLI is rer 0.2.113; CLI operations use Node 22.20.0 and pnpm 10.12.4, with the outer journey on Node 24.19.0.
- Browser proof inspected at 1440 and 390: restored-owner mapping form, restored workspace with Maya Chen as account and current/next cover holder, and native preview workspace. No horizontal overflow in the restored-owner form.
- All candidate commits, including side-parent reachability, have fleet author/committer identities and no co-author trailers. No credential-shaped values were added to the product diff. The cloud does not run the fleet publication scan; the fleet scans before landing.
- Product push succeeded on its first attempt to cloud/main-oncall-restore-owner-1. Exact-SHA Verify run [43544860440](https://github.com/just-every/run-oncall/actions/runs/43544860440) completed successfully on `90bbf1e215eaa5e01ad72d2823f5d84bf2768759`. The single REST watcher used 4 calls, separated by at least 300 seconds. No failed jobs or reruns; no PR created.

CLAIM OC-018 PARTIAL points=1 tests=tests/transfer.mjs#managed installation transfer
CLAIM OC-052 PARTIAL points=1 tests=tests/transfer.mjs#managed installation transfer

No clause status changes are requested. These claims cover the exercised local command/restore points and do not claim held-account deployment, provider delivery, or every obligation of either clause.

## Product custody
Product SHA: 90bbf1e215eaa5e01ad72d2823f5d84bf2768759
Product branch: cloud/main-oncall-restore-owner-1
PR: none required by this checkout's branch landing rules; none created.
Evidence is published independently under evidence/main-oncall-restore-owner-1 and carries no product readiness or landing signal.
Blockers: none. The product candidate is ready for the fleet publication scan and landing gates. No main push or landing was performed.
