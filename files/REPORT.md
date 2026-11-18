# Oncall 0.5.19 release metadata

Run Edit Run fleet · 2026-11-18 UTC

The product candidate is 39a34f308498a72bee4401429f0e1b698b6d66dd on cloud/sd-oncall-release-0-5-19 in just-every/run-oncall. Its sole parent is fresh main at 6ef9bc1294fc981c71e990df9bf12104337c81b3. The previous tag v0.5.18 points to 8dd2a0acf06b30fbc810c8a2a7e0fe8c01dd85ef. Git advertised no v0.5.19 tag and the GitHub Release lookup returned 404. The guarded product push created the named branch on its first attempt. The PR lookup found no open pull request.

## Release plan and results

1. Compare the published tag directly with fresh main. Review shipped behavior, the migration inventory and clause statuses.
2. Prepare synchronized package, seed, release guide, machine-readable release metadata and changelog entries. Retain prior upgrade instructions, keep the pinned rer at 0.2.118 and preserve the dependency locks. The pnpm lockfile has no root release-version reference. The repository uses pnpm without a tracked npm lockfile.
3. Validate the existing delivery setup declaration with the project's canonical manifest loader. Refresh the descriptor's setup.sha256. Check the generated contract views, regenerate the edition source lock last and run the lock check.
4. Run the first-party rer check, typecheck and metadata consistency checks. Confirm fresh main and absence of a tag collision, audit candidate identity and messages, and push the single metadata commit through the fleet guard.
5. Recompute the setup hash from the pushed Git blob and the worktree. Compare both with the declaration at the advertised SHA. Observe Verify on that SHA and return this packet on the evidence ref.

## Changes operators will see

- The platform's Oncall approval previously failed because the install-description hash was stale. The published tag declares 9a01a7b3853ffb59efdf5fa1ab4edb6b743e2d64b7448bf9c67b742f4b7038bd for bytes hashing to 8ad205fe4a2573aa9cddafc6fd00dfd44d52cf98eb73d4e5d4a2f079fd201ae2. Fresh main carried the same declaration with different setup bytes. The candidate's exact blob and declared hash now both read 7296a21b69f52706bb0043c0f82321b54c2d3dc3a0eeb788cd2de65815092f5a.
- Installation naming appears during setup and under Settings → General, with the saved name shown in the app and on sign-in. Local setup explains that development mail mode is the local no-email choice. Settings → Team opens Add member at the name field, lets the owner edit their own name and explains the last-admin restriction.
- Alert details show the assigned responder, current rota backup and recorded notification steps. Service response settings save as they change and show what is in effect and who changed it. A missed initial acknowledgment remains visible after a late acknowledgment.
- Admins can route Amazon CloudWatch alarms through an Amazon SNS routed key and see its subscription status. Live AWS delivery remains unverified. Stale approved follow-up submissions and stale schedule updates through the agent door return a revision conflict with the current revision.
- Upgrades retain all 68 migration files. Back up before updating. Paging stays OFF and the existing pager remains authoritative.

## Inventory and gate scope

| Inventory | Published v0.5.18 | Fresh main | Candidate |
| --- | ---: | ---: | ---: |
| Done clauses | 26 | 26 | 26 |
| Partial clauses | 41 | 41 | 41 |
| Missing clauses | 34 | 34 | 34 |
| Total clauses | 101 | 101 | 101 |
| Migration files | 68 | 68 | 68 |
| Tracked files under tests | 90 | 102 | 102 |

No clause changed status. The metadata candidate adds zero tests and changes zero UI files. The exact setup-hash and local check receipts accompany this report. The complete public-history scan and any release operations remain fleet gates.

## GitHub checks

Fresh main Verify passed in run 44290219523. [Verify](https://github.com/just-every/run-oncall/actions/runs/44290219523)

Fresh main Run site passed in run 44290219470. [Run site](https://github.com/just-every/run-oncall/actions/runs/44290219470)

Candidate Verify completed successfully on 39a34f308498a72bee4401429f0e1b698b6d66dd in run 44292467383. [Verify](https://github.com/just-every/run-oncall/actions/runs/44292467383)
