# main-oncall-rota-timeline-1

Repository: just-every/run-oncall
Branch: cloud/main-oncall-rota-timeline-1
Starting main: 0dac089dba93dc1209c3a2317d5e7a4392d44c4e

## Plan and scope

1. Configure the fleet identity, decrypted-bundle Git helper, publication hook and toolchain; read launcher/repository rules, branding and relevant contract points.
2. Reproduce the phone/desktop timeline and demo schedule mismatch through `rer demo` and its owner entry, without using any real browser profile or provider credentials.
3. Make each on-call timeline readable on both the overview and rota page. Use a dated chronological list on a narrow surface; keep proportional desktop bands with a scrolling hint, complete names when they fit and initials plus a complete accessible name when they do not. Very dense timelines also use a list rather than an enormous axis. Preserve the exact ranges of interactive swap choices.
4. Correct the sample schedule data, preserving the production scheduling computation. Resolve every sample cover boundary from the same named-zone Monday wall clock as its rota, including DST, rather than offsetting the demo launch timestamp.
5. Extend the existing keyboard schedule and demo activation journeys. Add no verification registration or extra phone journey. Run the focused touched browser flow, the existing demo HTTP block, typecheck, build, source-lock check and exact-SHA branch Verify. Keep generated contract views and all evidence out of the product branch.
6. Refresh from main before publication, regenerate the source lock last, check every candidate identity/trailer and push only the named cloud branch through the fleet guard. Publish this explicitly selected non-secret packet to the separate evidence ref, then remove the successful product clone.

## Reproduction

The public demo On call page showed Checkout's rule as Mondays 09:00 America/New_York, but its next hand-over was Friday 13 November 2026 at 07:28. The backup cover started two elapsed days after demo launch, so it correctly influenced coverage but contradicted the sample's advertised weekly rule. Payments also contained launch-minute-relative conference cover boundaries. The weekly anchors and production coverage resolver were already correct.

At 390, the overview included a roughly 8 px person chip. The rota page included 64 px chips containing full names. Both used ellipsis, and sideways scrolling had no visible hint. Complete before images and measured bands are retained in `before-demo.json` and the four before PNGs.

## Implementation

`src/demo.ts`: sample past swap and upcoming primary/backup covers now start/end on the rota's zoned weekly Monday boundary. Each boundary is resolved independently, so an offset change preserves 09:00 New York or 10:00 London. No coverage or hand-over computation changed, and existing saved installations are not rewritten.

`src/on-call/WeekBands.tsx` and its CSS: narrow timeline surfaces show full names and dated, zoned from/to values in primary/backup lists. Proportional desktop bands reserve enough space for initials; visible names are measured after font load and resize. Each chip's accessible name gives the full person and both zoned times, and the tooltip says “Shift details”. Scrolling desktop axes advertise sideways scrolling. Dense intervals use the readable list. Overview rendering coalesces uninterrupted assignments; interactive rota ranges retain their original boundaries.

Existing product-browser schedule coverage now includes a twelve-hour named substitute, checks both timeline doors, asserts complete phone names/dates and fitting desktop initials, checks accessible zoned ranges and the scrolling hint, and retains the create/cover/review/edit/calendar keyboard and axe assertions. The existing demo activation block compares next hand-overs and every sample override endpoint against the stated weekday/local minute, then repeats next-hand-over reads around future spring/fall clock changes. Paging remains OFF and existing simulated-delivery checks remain in place.

## Counts and clause custody

Contract before/after: 22 DONE / 45 PARTIAL / 34 MISSING, total 101, unchanged. No Status, Gap, Evidence or acceptance text changed. No generated view is committed. Verification plan entries before/after: 16 / 16; no new registration or test entrypoint was added. Existing schedule and demo flows were extended; no prior assertion was removed.

CLAIM OC-009 PARTIAL points=1 tests=tests/product-browser-journey.mjs#keyboardCoordination; tests/product-browser-journey.mjs#productSchedule; tests/product-browser-journey.mjs#rotaTimelineScreens
GAP OC-009: This claim covers the schedule/override/preview web leg, including the phone timeline. It is not a DONE claim for every web/native accessibility duty or the held human assistive-technology passes.
DEFAULT OC-020: Preserve the meaning of next effective coverage change, including overrides; correct the sample overrides to match the demo's advertised weekly rules instead of hiding legitimate production overrides.

## Validation and publication

Candidate: b2c7ebf9342581aff62bbd358147866c1134c5af. First product push succeeded on its first attempt. Exact-SHA Verify run: 43022735176 (status recorded in ci-receipt.json). Final command receipts, product identity, CI observations and browser results accompany this report. The fresh public demo page shows Monday 16 November 2026 at 09:00 America/New_York and 10:00 Europe/London, with complete names and ranges on both phone screens. All four final demo screenshots have been inspected. All browser and demo processes are stopped. No PR was required or created. Local checks use the emitted Worker and Chromium at /usr/bin/chromium with --no-sandbox; browser processes and demo servers are task-owned. A focused local browser assertion initially encountered the intentional dense-list fallback because the fixture's weekly edge left a three-hour final slice; the fixture now aligns its weekly edge with the journey clock so the same flow independently exercises compact desktop chips and phone lists. The final checks use the completed implementation.

The cloud cannot run the Mac publication scan or land main. Those remain fleet landing gates. No main/default push, force push, PR or provider operation is part of this task. Evidence publication is separate from product READY and grants no landing authority.

## Final screen observations

At 390 px both public demo screens show chronological primary/backup lists with each complete person and both dated, zoned endpoints. At 1440 px the overview retains proportional bands and the rota shows the sideways-scroll hint; a separate twelve-hour substitute in the existing public schedule journey produces compact initials with the complete accessible person/time range. No measured page overflow occurs on either final demo screen at either width. The demo readings are Monday 09:00 New York (14:00 UTC) and Monday 10:00 London (10:00 UTC), matching their rendered rules. These checks do not claim provider delivery, native apps, or the held human assistive-technology passes.

The first push was the final substantive product commit, with no skip-CI marker. Identity review covered all commits reachable in origin/main..HEAD and complete candidate messages; the only candidate is authored and committed by Run Edit Run fleet <fleet@runeditrun.com>, with no coauthor trailer. The main refresh/rebase found no drift. The worktree was clean after publication. The public packet selects 12 before/after/focused timeline screenshots and actual reports/receipts explicitly; unrelated journey captures remain outside that packet.

## Initial Verify failure and bounded rerun

Verify 43022735176 attempt 1 failed. Plan, build, browser, changes (including the changed demo activation flow), runtime, triage, transfer and hosted shards passed. Intake failed at tests/initialize-agent-owner.mjs:34, invoked by agentRuntime and agedReplayRetention in tests/oncall-agent-flow.mjs:370: POST /api/members returned 409 instead of 201. The completed failure log was read once with `gh run view 43022735176 --repo just-every/run-oncall --job 130531158355 --log-failed`; it is retained as ci-intake-failure.txt, with the job summary in ci-jobs.txt. These files and this flow were not changed by this task. The retained agedReplayRetention fixture fixes its clock at 2026-11-04T12:00Z, whereas the run date is 11 November. This is diagnostic context, not a new fix or a claim that the rerun is green.

The one brief-authorized rerun of failed jobs was accepted on the same exact product SHA. Seven of the ten GitHub calls were used through that request. The single watcher delays its next observation long enough for the intake shard, preserving calls for any completed failure diagnostics. No product rewrite, new commit or extra workflow dispatch was used.

The source explains why the historical-clock setup needs its own follow-up: migrations/core/0106_relational_workspace.sql defines oc_current_sessions using SQLite julianday('now'), while the aged replay fixture starts at a fixed 4 November timestamp. Native member writes require that session view. The changed timeline/demo code does not participate in this normal-installation agent fixture. This task has not changed the agent fixture, session authority or its assertions; the brief reserves other live agent rounds' files. If the authorized rerun repeats the failure, the candidate must remain blocked on exact-SHA Verify and the lane should repair that fixture's real-time bootstrap/clock alignment without weakening the session fence.

## Terminal outcome

BLOCKED on successful exact-SHA Verify, not on a product push. Run 43022735176 completed with failure again at attempt 2. Intake job 130537579161 repeats the same /api/members 409-versus-201 assertion at initialize-agent-owner.mjs:34, called by agedReplayRetention. Its failed-job log was read once using the required archive command and is retained as ci-intake-rerun-failure.txt. ci-rerun-jobs.txt records the complete latest job outcomes. Build, browser, changes, runtime, triage, transfer and hosted jobs passed. The aggregate verify job correctly remains red because intake failed. Ten GitHub calls were used; there are no active watchers or requested further reruns.

Product branch cloud/main-oncall-rota-timeline-1 and commit b2c7ebf9342581aff62bbd358147866c1134c5af are already pushed. No product code or assertions were changed in response to the unrelated agent fixture failure. No READY, DONE or landing claim is made. Clause statuses remain 22/45/34 and the only proposed clause claim is the bounded OC-009 PARTIAL point 1 web leg above. The lane should repair the aged fixture's bootstrap clock alignment under its own agent round and rerun the wall on the resulting candidate before landing. No PR was created or required.

The complete non-secret packet, including both actual failure logs, is published only on evidence/main-oncall-rota-timeline-1. All demo/browser processes are stopped. The product clone is removed only after the evidence transfer is verified; product custody remains the pushed branch and full SHA, independent of evidence publication.
