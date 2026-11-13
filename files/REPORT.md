# sd-oncall-timeline-hint-1

## Result

Completed main-wide timeline hint repair. Product head `37fd6d2446588971e8c611b826461d01eb192a0d` is pushed. Verify run **43393246829** completed **success** on that exact SHA, observed through REST at 2026-11-13T08:46:43Z using five of ten budgeted GitHub calls. Final product and CI custody are recorded in `validation.json` and `ci-status.json`. Product branch: `cloud/sd-oncall-timeline-hint-1`, repository: `just-every/run-oncall`. No PR is required by the repository rules, and no PR was created. The only product files changed are `src/on-call/WeekBands.tsx` and the regenerated `sources.lock.json`.

## Root cause and repair

The old hint compared a calculated minimum axis width with the card's content width. The actual scroll container has 4px padding on each side and border-box sizing, leaving less space for that axis. A normal nine-hour cover gives an 1111px axis inside an 1114px scroll container: actual scrollWidth is 1119px, so five pixels require scrolling while the old hint is absent. The original assertion reports `scrolling timeline advertises more dates`.

The repair measures `scrollWidth > clientWidth` on the real scroll viewport. A ResizeObserver watches the viewport and its axis; mode and axis-width changes reconnect the observer, and cleanup disconnects it. This handles resize and transitions between a timeline and the existing phone list without changing coverage, dates, names, data doors, layout thresholds or hint wording.

No product mock, fallback, artificial response, assertion weakening or fixture edit was introduced. The diagnostic schedules were saved through the real setup/member/service/schedule HTTP doors, and the rendered coverage came from the emitted production Worker and local D1. Paging remained off and recorded outbound requests were zero.

## Same-runner reproduction

Runner date: 13 November 2026 UTC. Chromium: `/usr/bin/chromium`, version 154.0.8037.57, headless, `--no-sandbox`. Browser locale en-US, time zone UTC, viewports 1440x1000 and 390x1000. Schedule clock: 2026-10-30T12:00:00.000Z in both the Worker and browser. Setup/build used the fleet toolchain and `cloud_run`; rer selected repository Node 22.20.0 for its commands, while direct diagnostic/browser commands used the available Node 24.19.0, consistently across the three before runs and candidate.

Starting main was `4eab299d2ca0113ef0c27743bb22e4c14e200237`. Diagnostic worktrees combined that same main with:

- f235: `cloud/sd-oncall-c-f235-merge-fix-1`, `39e3c24ab627122b9b38ada8d2af3c45d4a8cbdd`. The only merge conflict was the generated source lock, regenerated from the merged sources. CONTRACT.md had no conflict or status change.
- f236: `cloud/sd-oncall-c-f236-land-r2`, `6e0a080362a31c787910b6870c673523353f71e7`. Merge was clean; its resulting product tree equals the starting main tree.

All three unchanged focused rota-timeline journeys passed with their existing twelve-hour cover. That isolated fixture did not hit the faulty overview boundary on this runner. This report does not claim that the originally reported full integration failures were reproduced with that isolated fixture.

A separate boundary diagnostic retained the same weekly rotations and public doors, changing the saved cover duration to a normal nine-hour shift. It invoked the repository's original exported `rotaTimelineScreens` function without editing it. On each of main, f235-plus-main and f236-plus-main, its desktop assertion failed identically: clientWidth 1114, scrollWidth 1119, axis min-width 1111, hint absent. All three phone legs passed. The detail timeline's larger overflow already showed its hint. See `geometry-*-before/receipt.json` for actual saved schedules, public coverage, measured geometry and outcomes.

The candidate starts from main and includes no feature-branch integration. Main advanced to `bd21a32ed14a7edec11570867039545f2b1dd010` during diagnosis; the cloud candidate incorporated that update before final build/checks. Those changes did not alter WeekBands, the timeline fixture or the hint assertion. All newer main tests and whole contract status rows were retained. Both feature integrations remain separate fleet landing work; this branch only repairs their shared timeline cause.

## Before and after

| Observation | Before | After |
| --- | --- | --- |
| Nine-hour boundary overview at 1440 | 5px overflow, hint absent; original assertion fails on all three refs | Same 5px overflow, hint visible; original assertion passes |
| Detail at 1440 | 2090px scrollWidth / 870px clientWidth, hint visible | Same geometry, hint visible |
| Keyboard reachability on candidate | Additional diagnostic | Overview scrollLeft 0 to 5; detail 0 to 1220, final date reaches viewport |
| Overview and detail at 390 | Full cover names and dated lists pass on all three refs | Preserved original phone assertions pass |
| Browser application errors / outbound requests in boundary diagnostic | 0 / 0 | 0 / 0 |
| Unchanged focused rota-timeline journey | 3/3 pass across main and both source merges | 1/1 pass on candidate |

Candidate screenshots are `geometry-after/overview-1440.png`, `geometry-after/rota-1440.png`, `geometry-after/overview-390.png`, `geometry-after/rota-390.png`. The same saved coverage supplies all four. The existing helper also writes its ordinary timeline screenshots. Screenshots and report material are kept exclusively in the evidence packet, never the product branch.

An additional after-repair wheel diagnostic showed the corrected hint but timed out waiting for an exact maximum scroll position on the detail timeline. Its actual receipt/log and script are retained as `geometry-after-wheel-attempt/`, `geometry-after-wheel-attempt.log` and `timeline-probe-wheel-attempt.mjs`. The completed keyboard probe checks actual extra coverage and the final date; it does not alter or replace the repository's hint assertion. `timeline-probe-before.mjs` is the exact original boundary diagnostic; `timeline-probe.mjs` is the completed after diagnostic.

## Validation and publication

Commands and actual outcomes are recorded in `validation.json`; focused logs and geometry receipts are included. Only the focused journey was run locally, with the full wall delegated to exact-SHA Verify. No full baseline suite, workflow rerun or workflow dispatch was performed. The first-party check, generated-contract check, source-lock check, final product identity audit and push receipt are retained separately. `ci-status.json` records REST observations for the exact pushed SHA and its Verify run IDs. Historical source Verify 43381583523 is only the brief's supplied context, not candidate validation.

Diagnostic `receipt.json` fields `head` and `tree` identify each checkout's HEAD and index tree at invocation; reproduction worktrees were deliberately uncommitted merges and the candidate repair was still uncommitted during its local browser proof. They are not claims of an exact committed working-tree identity. `validation.json` maps the measured candidate source hash to the final product commit. The exact-SHA remote workflow is the committed candidate wall.

The full plan is in `PLAN.md`; the source-traced diagnosis is in `DIAGNOSIS.md`. Product custody and evidence publication are distinct. The evidence manifest records the actual product head and each selected file's hash. No main, default branch, tag, release, deploy or landing was written.

## Clause limits

No CONTRACT.md status, gap or evidence rows changed. No generated view was committed. Before/after counts remain 26 done, 41 partial, 34 missing, total 101 (published 19/3/0 of 22; target and push further 7/38/34 of 79). This bounded timeline repair is reported only as `CLAIM OC-009 PARTIAL points=none`; it makes no DONE claim, no new acceptance-point claim and no accessibility, live-provider, paging, hosted or human-proof claim.

No product or CI blocker remains. Exact-SHA Verify is green without a generated-view exception. Evidence transfer is separately recorded by its terminal EVIDENCE line. The fleet's publication scan and landing remain on its own machine; this cloud task does not land the repair or either feature integration.
