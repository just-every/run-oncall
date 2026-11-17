# Alert notification run result

Author: Run Edit Run fleet (sd), 2026-11-17 UTC.

Repository: just-every/run-oncall
Branch: cloud/sd-oncall-alert-run-1
Product head: a30db902e6c9a5d69ccbd3ce6ce915e87afbc898
Base: ecdacdd840fcc4f87f8147c8df1175d6f2d6fb85
PR: none; the seed permits branch Verify and the fleet owns landing.

## What changed

The alert page now shows “Who this alert goes to” above urgency and the runbook: current assignment, a different originally assigned responder when applicable, the current rota backup with a schedule link, and every recorded notification-rule snapshot in chronological step/due-time order. Each line names the person, recorded contact, step, due time, wait until the next rule/step/end and a Waiting, Due, Answered or Closed state. A clear sentence says the records are not sent by Oncall. No-rule records link to Settings → Team; an alert with no recorded run says that separately. Step 2 names the policy's target kind and wait, but its actual recipients/rules appear only after the real recorded step starts.

The read model computes status, ordering and waits without changing durable history or starting any timer/provider action. The UI reuses the existing workspace coverage read for a distinctly current backup, rather than presenting today's rota as historical evidence. One signed paragraph documents it in getting started. CONTRACT.md and generated views, release metadata, pins and tags are untouched. sources.lock.json was regenerated last and checked with the installed pinned edition-authoring package, including after rebase.

## Plan and validation

The complete plan is PLAN.md. Setup completed with 68 local migrations. Production build and typecheck passed. The focused existing product-browser registration runs through public member/service/rota/policy/intake/triage/read doors against the emitted Worker and local D1, without application mocks. It proves primary assignment and current backup, ordered rules and waits, immutable contact/rule snapshots after settings changes, a no-rule gap with configuration link, acknowledgment, the actual backup second step, source recovery, no-run distinction, anonymous read refusal and zero outbound effects with paging OFF. Assertions run at 1440; eight actual screenshots cover four changed states at 1440 and 390. Accessibility checks report zero serious/critical findings on those desktop states. Browser receipt: alert-run-receipt.json.

The complete current build preparation list is declared in scripts/verify-oncall-build.mjs (first-party check, build, typecheck). Final exact-checkout preparation (all three current steps in order) and the focused browser replay both passed on the published SHA; actual results are recorded in CHECKS.json and PREPARATION.log/BROWSER.log. The historical brief's pnpm validate:release script is absent from current main; its explicit attempt returned ERR_PNPM_NO_SCRIPT. No clause meaning changed and no release was prepared. The actual current checks and exact-SHA CI are reported without presenting that unavailable legacy script as passed. Full local suite/verify was not run, following the cloud touched-check rule.

## Before / after

Configured public-journey registrations: 21 → 21 (the existing product browser journey is extended; no new registration and no weakened/deleted assertion). Contract summary: 26 done / 41 partial / 34 missing / 101 total → unchanged. Previously the alert page hid assignment in Event context and showed no notification run; it now exposes the recorded run near the top. Paging remains OFF and this run observed zero outbound requests. No contract clause or status change is claimed.

## Integration and custody

Fresh main advanced from b81d5cf to ecdacdd with unrelated agent action-retention proof. The unpublished candidate was rebased cleanly before the single product push; the sibling alert/incident on-call-now change was not on main at that time. Main's added tests were preserved. The single candidate commit's author/committer were inspected (fleet identity, no trailers) after rebase; active hooks preserve repository hooks. Guarded product push succeeded on attempt 1. No main/default branch push, force push, PR, release or self-submission occurred. The fleet Mac performs publication scanning and landing; no scan/landing success is claimed here.

CI: Verify 44158860004 on a30db902e6c9a5d69ccbd3ce6ce915e87afbc898; completed/success on the exact product head. Four GitHub calls were used in total (discovery plus three polls), with one watcher and at least 300 seconds between calls. See CI.json for the actual observations and URL. No rerun or failure-log request was needed.

## Limits and blockers

No product blocker remains. Exact-SHA Verify completed successfully. The candidate is READY for the fleet gates; it has not been landed or deployed. The 12ui hosted design command required account sign-in, so no generated design or post-alignment kit exists; implementation stayed within the existing brand and was inspected on the actual rendered desktop and phone pages. The Mac-only polish playbook was not supplied; its inline rules and BRAND.md were used. The missing legacy validate:release command is reported above; the current exact-SHA Verify passed without an exception. The historical missing script is not presented as a passing command. No live provider, paging, phone, standby, publication scan or deployed-site proof is claimed.

No contract clause claimed; this is a paging-trial fault fix (main-pack-dedup-1, 17 Nov).
