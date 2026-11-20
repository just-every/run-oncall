# OC-050 continuation · stale merge-source confirmation

Run sd-oncall-c-f311-pc1, 19 November 2026. Report author Run Edit Run fleet.
Repository just-every/run-oncall. Product branch `cloud/sd-oncall-c-f311-pc1`.
Continuation base `2a0944f2448904b1dce542315058c95d9a8029a0`.
Initial main was `071c74a352196f6778eb3b2942c351b4cf1e0ace`. The first continuation candidate merged `e4123dded5d6a9f058880669ca10213bcfbe2646` with the 0.5.20 release metadata. The final merge incorporates current main at `8b30370587527f91331d9fc84deb82688dbfa67a`.

## Plan and scope

1. Start at the advertised continuation head and retain both predecessor commits. Read the clause, main's status row, the plan extract and the DONE riders. Recheck f287, f300 and main changes to the shared journeys and contract.
2. Reproduce the prior Verify guard and contract document failures on the saved SHA with the recorded environment. Run the cancelled changes shard locally with its ordinary CI entry point and a hard timeout.
3. Keep the existing public browser fixture and its successful template, role, merge, alias and split legs. Confirm the separate note and review actors, compare the refusal's permanent audit revisions to actual saved values, and retain the visible conflict and source revisions in the receipt.
4. Run the emitted application browser and HTTP journeys, typecheck, first-party check, contract generation and source-lock checks. Preserve main's Status table and restore generated views from main. Publish the product head, observe exact-SHA Verify, then transfer the report and selected receipts to the evidence ref.

## Clause and predecessors

OC-050 stays PARTIAL. The selected slice is the stale second-source browser confirmation in acceptance 2. Full acceptance 1 still includes chat role operations and backup paging. Full acceptance 2 still includes overdue stakeholder updates and reminders with the browser closed. The clause also retains broader alert workflows and team mobilization. Paging remains OFF. The relevant dependencies are OC-034 and OC-067 for chat, OC-068 and OC-026 for responder paging, OC-027 for timers, OC-043 and OC-056 for automation, and OC-023 for team scope. Provider authorization, A2P, actual delivery, standby, devices and real-phone or cutover proof remain held. No new policy decision or provider operation was needed for this slice.

The main count is 26 DONE, 41 PARTIAL and 34 MISSING across 101 clauses, with the same counts on the candidate. The observed paragraph below the OC-050 acceptance text is source evidence. Status, Gap and Evidence cells match main exactly.

- f287 landed via `661edf1829f20cfeb4912ad4f7e30efa156c1721`. Its signed-in viewer Communications refusal and responder transfer remain in the storm case.
- f300's last advertised integration head was `f0722dcc9b751d4a85f429fe8362875ff0b3b035`. At the predecessor check it was outside main. Its lifecycle refusal proof remains with that lane's branch. This continuation leaves the shared HTTP fixture and application authority untouched.
- Main's newer triage pagination, continuity, note-focus and communications-owner authority work is in the continuation ancestry. The product continuation changes the existing browser fixture and the source lock relative to final main. The observed contract paragraph carries forward from the original save. No new test registration was added.

## Saved Verify diagnosis

Push Verify run 44622973540, attempt 1, had a successful browser job (135910907424) and successful runtime and triage jobs. [Saved Verify run](https://github.com/just-every/run-oncall/actions/runs/44622973540)
The contract-docs job (135909467780) failed on `ACCEPTANCE.md: generated content differs; run contract-docs write.` The final verify job (135919650842) rejected the contract-docs result and also received a cancelled shards result. Changes job 135910907370 was cancelled inside `node scripts/verify-oncall.mjs changes` after about 15 minutes of job time. The one permitted failed-log command for the cancelled job returned no failed assertion. Job timing is consistent with the 15-minute matrix budget.

The saved-SHA `node src/base/contract-docs.mjs check` reproduced exit 1 and the same view diagnostic. The exact aggregate guard from the workflow with the saved job results exited 1 on the contract-docs condition. Candidate views remain the copies from main for the guarded lander to regenerate.

With Node 22.20.0, the emitted build and first-party check passed on the saved SHA. The same changes shard timed out at 900 seconds with exit 124. The changes and activation journeys completed. The last progress line from `tests/import-door.mjs` was “Synthetic account applied: business”. The reproduction receipt records the command and outcome. The same command on main `e4123dded5d6a9f058880669ca10213bcfbe2646` with its original shard plan also stopped at 900 seconds with exit 124. The changes and activation journeys passed there, and the import journey reached “Synthetic account catch-up and undo: business” before the deadline.

The first repair at `497ff1684e738869c8c689c85c40ba001db45c52` isolated the imports lane and grouped the existing triage bounds lane with runtime. It retained eight shards and the existing time budgets and commands. Push Verify run 44635621937 completed with failure on that earlier SHA. Its job breakdown was outside the remaining CI-call budget after the final head was verified. [Superseded Verify run](https://github.com/just-every/run-oncall/actions/runs/44635621937)

While it ran, main landed its own fix for the same timeout. The final merge takes main’s newer plan and its duplicate-command check whole. Main’s nine-shard plan gives Activation a separate 15-minute job and leaves Changes and Imports together. The workflow and shard configuration match current main; the earlier published repair remains in the branch history.

## Runtime proof and landing

The exact product candidate is `bf446d4fbc19251bb4ca5e28ff940da626ea99ab`. Both continuation pushes preserve the original saved commits. The final product branch advertised the exact clean checkout after all four candidate commits passed the fleet author, committer and trailers check. The final merge replaces the overlapping shard configuration with main’s version and refreshes the source lock.

The focused emitted-Worker run of `incidentWorkflowBrowser` passed on the candidate with Chromium at 1440 pixels and retained the same refused confirmation at 390 pixels. Both screenshots show the two checked sources, the second source's revision warning and the conflict without a success message. The two icon-only controls in this interaction expose their keyboard-focus tooltips. The desktop assertions also checked horizontal fit, hydration and serious or critical axe findings.

PROBE OC-050 2: A signed-in responder reviewed a public-service merge through Incidents, selecting both sources. A different signed-in responder used Add note to advance the second source from revision 1 to 2. Confirming the original review sent one protected merge request, which returned 409 and displayed “Incident changed. Reload before applying your edit.”

The request retained target revision 9, first-source revision 3 and the reviewed second-source revision 1, in the original order. The independent note was the only change to a participant before confirmation. The first source remained at its own incident URL. The refused confirmation preserved protected and durable incident records, timelines and revisions, kept paging OFF and caused zero outbound requests. Permanent audit appended one refusal attributed to the original responder and target. Its audit, workspace, paging and handoff revision fields matched the retained values, and the attempt appended zero accepted merges.

The browser witness starts in `tests/product-browser.mjs:359`. The emitted HTTP comparison, preserved merge and split, and the viewer role refusal are in the storm journey in `tests/triage.mjs:580` and `tests/triage.mjs:621`. The review holds ordered source revisions in `src/incident-workflows/Controls.tsx:84` through line 102, and confirmation controls and result handling are at lines 124–132. The server checks each participating incident in `src/incident-workflows/relations.ts:51` through line 80.

The candidate's first-party check, emitted build, typecheck, focused role and workflow browser test, and HTTP storm journey passed. On the earlier published head, the broader local browser shard passed the selected merge and split legs before a loopback connection reset in the imported-email journey. Its exact workflow exit was 1.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

Generated views are restored from main. The candidate's complete contract Status section equalled main after the merge. The migration ledger is outside this round's diff.

The same earlier head passed the focused imported-email journey on retry. The failure in the broader local shard was a loopback transport reset in an unrelated leg. The final head’s isolated Activation shard passed locally in 6m45s. The local Changes shard reached its 900-second deadline after the import door and both erasure journeys passed, with reports still running. This local timing result is separate from the repository’s exact-head Verify verdict.

## Exact candidate Verify

Push Verify 44638761623, attempt 1, finished on `bf446d4fbc19251bb4ca5e28ff940da626ea99ab`. All nine shards succeeded, including browser 135965606770, runtime 135965606655, activation 135965606789, changes 135965606801 and triage 135965606834. The build and full-push-proof jobs succeeded. [Exact candidate Verify](https://github.com/just-every/run-oncall/actions/runs/44638761623)

GitHub recorded failure for contract-docs job 135964163935 and the dependent aggregate verify job 135972092787. The only failing contract-docs step checked the generated documents. With main’s views restored, the same command on the exact candidate reported that ACCEPTANCE.md differs. The regenerated write and check passed before restoration. This is the brief’s generated-view exception, so the candidate qualifies for READY.

Publication scanning and Run site remain guarded landing requirements. Main was `8b30370587527f91331d9fc84deb82688dbfa67a` at the final candidate preflight. The complete full-history scan and Run site for a landed head remain unestablished here.

## DONE riders

| Row | Candidate finding |
| --- | --- |
| 1 | Selected scope proven in the browser and HTTP storm witnesses. OC-050 stays PARTIAL because the full acceptance sentences still include held paging, chat and browser-closed reminders. |
| 2 | Passed for the selected scope. The fixtures start with real retained incidents, advance the second source, refuse the old review and exercise the successful merge and split. |
| 3 | The exact push Verify ran the browser and HTTP witnesses and all nine shards succeeded. The generated-view exception applies to the workflow conclusion. See run 44638761623 and the jobs below. |
| 4 | Passed for the selected proof. The focused Worker and browser ran at the exact product SHA, with dimensions and visible output checked in both screenshots. |
| 5 | Existing cross-clause duties and door rules are preserved in OC-050. The round introduces no new inheritance. |
| 6 | The Status table matches main. The generated write and check both passed before restoring the views. Claim promotion and regenerated views belong to the lander. |
| 7 | The requirement and acceptance sentences match main. The only contract addition is dated observed evidence. |
| 8 | Passed for the selected scope. Current responders have the two legitimate write paths, and the stale attempt has exactly one attributable refusal with no state change. The existing viewer Communications refusal and responder success passed in storm. The f300 lifecycle addition has separate predecessor custody. |
| 9 | Held. Paging stays OFF and this round yields no provider, carrier, standby, device or cutover proof. |
| 10 | No policy default was needed. |
| 11 | Pending guarded landing. The cloud branch is the product head. Full-history publication scan, eligible exact-head Verify and Run site are fleet gates. |

## Plan handoff

Keep the existing OC-050 held row for f300 and append the stale merge-source browser proof to its progress. The wider linked duties and release gates stay in that row. No other plan row changes.

CLAIM OC-050 PARTIAL points=none tests=tests/product-browser.mjs#incidentWorkflowBrowser; tests/triage.mjs#storm

GAP OC-050: Chat role transfer, backup paging, stakeholder cadence, browser-closed reminders, broader workflows and team mobilization remain held.
