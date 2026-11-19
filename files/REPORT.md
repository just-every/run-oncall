# Oncall 0.5.20 release metadata

Prepared by Run Edit Run fleet, 2026-11-19T19:19:12Z UTC, for sd-oncall-release-0-5-20.

Repository: just-every/run-oncall  
Branch: cloud/sd-oncall-release-0-5-20  
Candidate: d06b4e0741f3f33d6acb7114e35dc1b54637d1c0  
Main base: 738f5efacaad9f65191a4a851b701c6fc953cd5d  
Previous release: v0.5.19 at 518317b385c4535599bfc670dd676da46069b451

## Plan and execution

1. Start from current main and compare the actual tree with the v0.5.19 tag. Probe for the v0.5.20 tag and Release before choosing the version. Git advertised neither the tag nor the candidate branch before work. GitHub's release-by-tag endpoint returned HTTP 404 for v0.5.20. A second Git tag probe before the push still returned no tag.
2. Map buyer-facing changes to the implementation in calendar feeds, alert triage and Alert details, stale-write focus, mail rules, Move in, internal business status and the MCP incident-resolution door. The rota-override revision refusal was already present at v0.5.19. This range expands its proof, and adds browser focus recovery after a stale cover apply. The public notes give the buyer-facing delta. Synthetic PagerDuty proof does not establish a live pull or cutover.
3. Compare every migration entry with Git tree records. All 68 prior migration paths have identical Git blob IDs and file modes. Added, removed and changed file lists are all empty. RELEASE.json therefore lists an empty migration array.
4. Update CHANGELOG.md, RELEASE.json, RELEASE.md, package.json and seed.json. Add the 0.5.19-to-0.5.20 upgrade instructions alongside the complete earlier history. Preserve the local and hosted backup, update and restore procedures, mail-mode guidance, paging limits and the prior release's absence of a screenshot reference. The rer pin remains 0.2.118. The tracked pnpm lockfile carries no root package version and remained byte-identical to main.
5. Regenerate sources.lock.json last with the pinned edition-authoring CLI. The contract document generator wrote zero files, and its check passed. The pinned source lock check, frozen dependency install, pinned Node 22.20.0 typecheck, candidate metadata assertions and diff whitespace check passed. No tests changed. Verify on the exact pushed SHA covers the branch integration suite. The fleet lander owns the full-history publication scan.
6. Rebase onto freshly fetched main ahead of the sole product commit. Inspect every candidate commit and full message, then push only the named product branch. Git confirmed the remote branch advertises the candidate. No PR was requested or opened. No tag or GitHub Release was created.
7. From the exact pushed commit, hash every local file declared by rer-project.json. The only declaration is setup.sha256 for rer-setup.json. Its declared and computed SHA-256 both equal 7296a21b69f52706bb0043c0f82321b54c2d3dc3a0eeb788cd2de65815092f5a.

## Counts

| Inventory | Before | Candidate |
| --- | --- | --- |
| Applied migrations | 68 | 68 |
| Core clauses, done / partial / missing | 25 / 35 / 24 | 25 / 35 / 24 |
| Agent clauses, done / partial / missing | 1 / 6 / 10 | 1 / 6 / 10 |
| Full target, done / partial / missing | 26 / 41 / 34 | 26 / 41 / 34 |

No contract clause claimed; this is release metadata.

## Public release notes

- Service calendar subscriptions now include a shared rota for every service it covers.
- Clearing an alert's assignee keeps it Unassigned in triage. Recently updated sorting and filters now include retained events, such as a recovery, as well as responder actions.
- In Alerts, choose Unmatched service alerts to find active, unassigned, unsuppressed alerts that entered without a matching route. Event context shows why each alert was unmatched.
- If a newer change prevents a cover apply or note from saving, keyboard focus returns to the cover sheet or the incident's Add note button. You can revise the retained draft. Agent clients that try to resolve an incident from a stale revision receive the current revision before an approval is created.
- Test draft against saved mail compares historical and draft decisions side by side, including the rule versions, without changing any saved mail or alerts.
- Move in reviews separately saved PagerDuty details with their exported parents, including contacts and overrides. Copy or download the full field-by-field review to see what maps, what is kept for reference and what is refused.
- Internal business status shows management controls only to active administrators and active responders assigned as communications owner.

Back up before upgrading and keep all 68 applied migration files unchanged. This update adds no migrations and keeps rer pinned to 0.2.118.

### Known limits

Paging stays OFF. Keep your existing pager active. Release 2 paging and independent standby are still unavailable. Live AWS delivery and live PagerDuty account migration or cutover remain unverified.

## Exact-SHA Verify

GitHub run 44596527018 returned completed/cancelled for d06b4e0741f3f33d6acb7114e35dc1b54637d1c0 at 2026-11-19T19:36:09Z. https://github.com/just-every/run-oncall/actions/runs/44596527018

Packet checked at 2026-11-19T19:37:23Z.

The transfer shard (135818557974) was cancelled after 15m16s against its configured 15-minute job timeout. The aggregate verify job (135827969876) failed because full shard coverage did not complete. The build, contract-docs and seven other shards succeeded. The blocker is successful exact-SHA Verify. See VERIFY-JOBS.json and VERIFY-DIAGNOSTICS.md for the job receipt and archive diagnostics.
