# OC-025 service-scoped calendar feeds

Run Edit Run fleet · 18 November 2026 UTC · sd-oncall-c-f282-lin-1

## Plan

1. Confirm the feeder head and the current main. Replay the single feeder commit as a linear commit rooted at main.
2. Keep main's clause judgments, generated views, newer assertions and release metadata. Regenerate the source lock with the pinned authoring package after restoring the generated views to main's versions.
3. Verify the exact candidate with the first-party check, build, typecheck, activation journey and a Chromium service-feed journey. Capture the subscription controls at 1440 and 390 after dismissing the one-time URL.
4. Refresh main and check candidate ancestry, scope and commit metadata before the guarded product push. Check exact-SHA Verify and return the report, check receipts and screenshots on the evidence ref.

## Replay

- Feeder `cc1111675053e8ade57a09d9f39bfbc09c608f3d`.
- Main `39e6d289a2fbae32c9901640f61646ca0ff9ca53`.
- Candidate `768bf1416297a9610f344bf8c39105a600a170fa` on `cloud/sd-oncall-c-f282-lin-1`.
- The source lock was the sole replay conflict. It was regenerated from the replayed tree with the pinned edition-authoring package. The candidate has one commit and zero merge commits.
- The feeder's OC-025 Observed note was added to CONTRACT.md. Status, Gap and Evidence cells retain main's judgments. The generator passed after writing the views and reported zero prose errors or warnings. After restoring main's views, its check reported only the expected ACCEPTANCE.md drift.
- Clause counts before and after are 26 Done, 41 Partial, 34 Missing (101 total). The existing activation journey gained assertions and registered zero additional journeys. The declared Verify lane command count was 21 before and after.

## Behaviour

The service feed uses the existing schedule-service relationship to include every linked rota, including when the subscriber chose a secondary linked service. A legacy single-service rota continues to appear in its service's feed. The activation case compares 31 days of both UTC coverage roles before and after a reviewed override, checks privacy and no-store responses, and exercises immediate revocation and retained assignments with zero outbound requests.

CLAIM OC-025 PARTIAL points=1 tests=tests/activation.mjs#scheduleCoordination

GAP OC-025: R-14 Google Calendar and Outlook viewing still needs dated owner-role proof. Team manager and privacy coverage, mobile swaps, automatic notices and visible delivery failures, and automatic reminders remain held.

The fleet owns the complete publication scan and landing.

## Local verification

The edition lock check, first-party profile check, production build, typecheck and full activation script passed on the candidate. Activation reported 40 requirement flow groups. Its OC-025 receipt covers the second service, reviewed override, privacy, revocation and zero outbound requests.

The Chromium case used the emitted worker and a local fixture. From the secondary service's rota, the owner chose **This service**. An anonymous client retrieved an ICS feed containing the owning and shared rotas. The assertions also checked that the feed omitted the unrelated rota and raw member identity. After the owner dismissed the bearer URL, the browser captured the active controls at 1440 and 390. The owner revoked the subscription and the same anonymous URL returned 404. Browser assertions ran at 1440. Both proof images were checked for the calendar controls and the absence of visible bearer links and email addresses.

The local app setup completed with 68 migrations. The product push succeeded on the first attempt after refreshing main, and Git read back the exact candidate SHA.

## Exact-SHA Verify

Run 44399270275 completed for the pushed candidate on 18 November 2026 UTC. The build, all eight shards and full push proof passed. The generated-document check failed only on ACCEPTANCE.md drift (job 135137721557), and the aggregate gate reported that dependency failure (job 135146907773). Both failure archives were read successfully. The local generator passed with freshly written views, and the local build and touched checks passed after restoring main's views. The documented generated-view exception therefore applies. [Verify run 44399270275](https://github.com/just-every/run-oncall/actions/runs/44399270275)
