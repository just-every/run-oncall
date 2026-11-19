# Oncall 0.5.20 release metadata

Prepared by Run Edit Run fleet, 19 November 2026 UTC.

No contract clause claimed; this is release metadata.

## Plan and execution

1. Fetched fresh Oncall main and confirmed the previous round at `d06b4e0741f3f33d6acb7114e35dc1b54637d1c0`. Used the published v0.5.19 tag at `518317b385c4535599bfc670dd676da46069b451` as the comparison and upgrade baseline.
2. Reapplied the release metadata to `071c74a352196f6778eb3b2942c351b4cf1e0ace`. Reviewed the v0.5.19 to main product diff, retained earlier release prose and kept the v0.5.20 changelog section and JSON public notes identical. The metadata records the same previous version, existing rer 0.2.118 pin, no migrations and no breaking or contract changes. No separate v0.5.19 release-history file was present in the tagged tree. The v0.5.19 changelog and earlier upgrade instructions were verified against the tag.
3. Ran release metadata, populated upgrade, TypeScript, workflow permissions, contract generator and source-lock checks. Regenerated the source lock last. Fetched main again and rebased immediately before push. Main had not moved, so the rebase kept the same ordinary commit.
4. Audited all candidate commit identities and trailers and pushed the cloud branch once at 20:10:54Z. Verified the advertised SHA from Git. Used the pushed SHA for the project hash and CI checks. The Mac lander owns the publication scan and landing.

## Product provenance

- Repository `just-every/run-oncall`
- Branch `cloud/sd-oncall-release-0-5-20-c1`
- Product head `e4123dded5d6a9f058880669ca10213bcfbe2646`
- One candidate commit, zero merge commits. Changed files are `CHANGELOG.md`, `RELEASE.json`, `RELEASE.md`, `package.json`, `seed.json` and `sources.lock.json`.
- No PR, tag or release was created.

## Notes checked against the product diff

| User-facing change | Oncall main evidence |
| --- | --- |
| Service-scoped feeds include shared rotas | `33ba96c`, `src/schedule-coordination/feed.ts` |
| Clearing an alert assignee leaves it unassigned in triage | `3a2f2ea`, `src/family/response-operations/triage.ts` |
| Keyboard focus returns after stale cover applies and incident notes | `df8efef`, `src/on-call/RotaSheet.tsx` and `8afbd28`, `src/app/FailureLine.tsx` |
| Unmatched service alerts have a queue filter and context | `d376e47`, `src/alerts/AlertList.tsx` and `src/alerts/alert-display.ts` |
| Triage recency includes retained alert activity | `91aac69`, `src/family/response-operations/triage.ts` |
| Saved mail compares historical and draft decisions without writing | `1e663a6`, `src/email/EmailActivity.tsx` and `src/email/EmailWorkspace.tsx` |
| The current revision is returned when incident resolution is stale | `66405c0`, `src/agent-door/coordination-tools.ts` |
| PagerDuty saved exports show detailed source mappings | `0c3b8c8`, `src/move-in/pagerduty-source.ts` and `docs/move-in.md` |
| Internal status controls follow the communications owner and administrator restriction | `3848279`, `src/business-status/StatusPanel.tsx` and `src/business-status/authority.ts` |
| Loading more incidents keeps results with the active triage filters | `fa9a8d2`, `src/app/IncidentTriage.tsx` |

The incident pagination fix is the single new release-note item since the previous candidate. Paging stays OFF and the existing pager remains authoritative.

## Local results

- `pnpm run validate:release` returned `ERR_PNPM_NO_SCRIPT`; the checkout defines no script with that name. The installed rer 0.2.118 release source validator successfully inspected the exact clean commit. Supplemental assertions verified the previous version, matching release notes and changelog, release history, pin, breaking flag and migration and contract metadata.
- Wrangler D1 applied the v0.5.19 migration tree to local synthetic state. Applying candidate migrations reported no pending work and preserved the owner, service, runbook, workspace revision and migration journal. Migration count was 68 before and 68 after, with identical file paths, modes and bytes.
- Passed the first-party rer check, TypeScript typecheck, workflow permission check, contract generator check, source-lock check and diff whitespace check. The first local pass used Node 24.19.0. The first-party check, typecheck and populated D1 upgrade were repeated successfully with the repository pins, Node 22.20.0 and pnpm 10.12.4.
- The only declared file hash is `setup.sha256` for `rer-setup.json`. Declared and actual were both `7296a21b69f52706bb0043c0f82321b54c2d3dc3a0eeb788cd2de65815092f5a`.
- Contract counts before and after were 26 done, 41 partial and 34 missing, for 101 total. Core stayed 25/35/24 and Agent surface stayed 1/6/10. Clause status changes and test changes were zero.

## Exact-SHA CI

[Verify 44605997400, attempt 1](https://github.com/just-every/run-oncall/actions/runs/44605997400) completed with failure on the advertised product SHA at 20:30:11Z.

- [Browser shard 135852047922](https://github.com/just-every/run-oncall/actions/runs/44605997400/job/135852047922) failed during the saved rota coverage journey. The archived stack points to `tests/product-browser-journey.mjs:879` and `:895`, the `/api/paging/state` readback after applying reviewed PTO. The candidate inherits the journey and app source from its main parent.
- [Changes shard 135852047977](https://github.com/just-every/run-oncall/actions/runs/44605997400/job/135852047977) was cancelled after 15 minutes 17 seconds against its 15-minute job limit. The transfer shard passed in 12 minutes 36 seconds. The other five shards passed.
- The aggregate failed on the shard results. The allowed retry of the timed-out Changes job alone cannot resolve the separate browser failure, which is outside the release metadata lease. Successful exact-SHA Verify remains blocked. The product branch stays pushed at the reported SHA.

Recorded 2026-11-19 UTC.
