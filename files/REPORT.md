# Oncall 0.5.21 release metadata

Builder receipt · sd-oncall-release-0-5-21 · 2026-11-20 UTC

- Repository just-every/run-oncall
- Product branch cloud/sd-oncall-release-0-5-21
- Fresh main base 8b30370587527f91331d9fc84deb82688dbfa67a
- Published candidate 33cafdc7750103f51ac4173c7b52c8dbcf1efbe0
- No open PR was returned for this branch. The push created the branch.
- No contract clause claimed; this is release metadata.

## Plan and results

1. Fetch Oncall main and the immutable v0.5.19 and v0.5.20 tags. Check v0.5.21 for a collision. The v0.5.21 tag was absent and the release-by-tag API returned HTTP 404. The v0.5.20 tag still had object 91ca76b40a673cb40b8ede306ea4d8ab367614c1 and commit e4123dded5d6a9f058880669ca10213bcfbe2646. Its release-by-tag API also returned HTTP 404.
2. Compare published v0.5.19 with fresh main for buyer-facing changes and migrations. Use the v0.5.19 backup and upgrade procedure for buyers on either 0.5.19 or 0.5.20, including D1 export and restoring into an empty installation. Preserve prior published upgrade instructions. Carry the known limits for paging, standby, live AWS delivery and live PagerDuty migration or cutover.
3. Set 0.5.21 in the package, seed and release metadata. Keep previousVersion at 0.5.20 and mark the prior changelog section unpublished. The seed has no validate:release entry and the v0.5.20 tree contains neither requested release-history snapshot. The candidate keeps the explicitly requested predecessor and adds no fabricated snapshots. Following the v0.5.19 release metadata, no screenshot is declared. This seed has no package-lock.json, and pnpm-lock.yaml has no seed version reference to update. The rer pin stays at 0.2.118.
4. Regenerate sources.lock.json with the installed pinned edition-authoring CLI after the metadata edits. Check release metadata coherence, migrations, contract generation, source lock and typecheck. The six changed paths are CHANGELOG.md, RELEASE.json, RELEASE.md, package.json, seed.json and sources.lock.json.
5. Inspect every candidate commit's author, committer, message and trailers. Push the one linear release metadata commit with the fleet guard and read back the remote branch and every declared own-file SHA-256 from that exact commit. Await exact-SHA branch Verify. The full publication scan is the Mac lander's gate.

## Changes carried since v0.5.19

- A service calendar feed includes all shared rotas that cover the service.
- Alert triage respects explicit unassignment and sorts and filters updated times using retained alert activity as well as responder actions. Pagination keeps results scoped to the active incident filters.
- The unmatched-service filter shows active, unassigned and unsuppressed service alerts. Event context explains why the route did not match.
- A stale cover apply returns keyboard focus to the cover sheet. A stale incident note returns focus to Add note. Drafts remain available for editing.
- A stale agent incident resolution returns the current revision before creating an approval. The rota-override revision refusal already existed at v0.5.19. The diff extends its tests, so the public notes describe the newly observable changes.
- Draft mail testing shows historical and proposed decisions with rule versions. PagerDuty Move in reviews separate exported details alongside their parent records and can copy or download the detailed mapping review.
- Internal business status shows management controls only to active administrators or active responders assigned as communications owner.

## Counts and release declarations

| Item | Before | Candidate |
| --- | --- | --- |
| Contract clauses | 26 done, 41 partial, 34 missing (101 total) | 26 done, 41 partial, 34 missing (101 total) |
| Migration files since v0.5.19 | 68 | 68, all byte-identical |
| Added migrations | 0 | 0 (empty inventory) |
| Contract statuses changed in this round | 0 | 0 |
| Rer dependency | 0.2.118 | 0.2.118 |

The candidate changes no product code, tests or contract views. The generated views check passed. The source lock check and typecheck passed. Both lockfiles and the release-history paths are accounted for above. Local command results, exact push provenance, declared hash values and exact-SHA CI observations are in the accompanying receipts.

## Exact-SHA Verify

Verify 44647513882 completed successfully on 33cafdc7750103f51ac4173c7b52c8dbcf1efbe0. Read back at 2026-11-20T00:59:17Z. [Workflow run](https://github.com/just-every/run-oncall/actions/runs/44647513882)
