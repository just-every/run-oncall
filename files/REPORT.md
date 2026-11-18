# Oncall required override revision diagnostic

Fleet round sd-oncall-c-f274 · 18 November 2026 · just-every/run-oncall

## Plan and scope

1. Follow the existing schedule override from scoped MCP admission through native revision and current sponsor checks. Keep the diagnostic in the Oncall override preparation path.
2. Reproduce the missing diagnostic in the emitted Worker. After a separately reviewed owner edit, check an ordinary primary override with a stale required revision and a fresh idempotency key under both company policies. Compare unauthorized and absent rota errors and the retained effects.
3. Retry with the returned revision and a fresh key. Verify one stored override, one state-changing native audit commit, the expected disposition, and effect-free retrieval. Inspect the retained rota and primary cover in Chromium.
4. Recheck inherited journey coverage, run the affected agents shard and first-party checks, regenerate views locally and restore them from main, regenerate the lock, and publish the candidate and builder evidence on their respective refs.

The selected entry is the BASE-AGENT-012 acceptance 4 slice in sd-oncall-replan-78. The approved scopes and other entries remain in force. The change leaves copied Base, authorization rules, the approval decision, product UI, and paging behavior as before. It introduces no new policy default. The checked-in Status, Gap, Evidence and counts remain as judged on main. Before and after counts are 26 done, 41 partial, 34 missing, 101 total. BASE-AGENT-012 remains MISSING.

## Runtime outcomes

- Regression control on the original Worker build failed on input revision 1 after a legitimate owner edit produced revision 2. The MCP error had code revision_conflict and omitted current_revision.
- With the fix, autonomous and held calls return isError and revision_conflict with current_revision 2 in both metadata and parsed text. Scoped-out and absent results are identical and carry no revision or private structured content.
- The refusal comparisons cover protected workspace state, the workspace and paging control revisions, schedules, existing notices, state-changing audit, original call outcomes, approvals and reviews, and paging tables. Only the separate refusal audit and capacity accounting are permitted to advance.
- A fresh key with revision 2 saves one primary override at revision 3. The native transaction increments both controls once and appends one accepted mutation audit commit, with the scoped agent, sponsor and rota recorded. The held policy uses one ordinary approval from the saved sponsor at the exact displayed revision and summary hash. The autonomous case completes directly. Identical retrieval with a new JSON-RPC id preserves native and call state, notices and approval custody. Outbound requests remain zero.
- The regression uses the existing test registration. No prior assertions were removed, narrowed or conditionally skipped. The extended journey is invoked by the agents lane through tests/runtime.mjs and tests/oncall-agent-flow.mjs.

## Acceptance and rider disposition

| Item | Result and proof |
| --- | --- |
| Acceptance 1 | Bounded replay in staleOverrideRevision, plus preserved pre-existing journeys. Complete mutating-tool and retention coverage remains open. |
| Acceptance 2 | No new dropped-response case. The agents shard retains the preceding real transport cases, including P2 submissions. |
| Acceptance 3 | No new changed-argument case. Existing cases run in the same agents shard. |
| Acceptance 4 | Selected slice proved by staleOverrideRevision in tests/oncall-agent-schedule-replay.mjs. Other tools and optional and required revision variants remain open. |
| Acceptance 5 | Foreign-person job handle and Tasks-independent status remain held. |
| Rider 1 | Selected outcome reached on seeded data through MCP. The full clause retains gaps. |
| Rider 2 | The original build fails the exact revision assertion. Current code demonstrates both policies and unchanged native state on refusals. |
| Rider 3 | The agents lane invokes the new assertions. See the CI receipt for the candidate run result. |
| Rider 4 | Browser and candidate provenance, local commands and program exit results are in the receipt files. |
| Rider 5 | The slice applies BASE-AGENT-012 directly. No inheritance is claimed. |
| Rider 6 | Regenerated contract views pass the check locally. The checked-in views and Status table stay with main's judgments until the lander regenerates. |
| Rider 7 | No acceptance sentence, rider or existing assertion changed. |
| Rider 8 | Scoped-out and absent rotas return identical refusals. The existing schedule receipt journey also exercises scope, Pause and current sponsor role checks. |
| Rider 9 | Paging remains OFF and the edge ledger is empty. No provider proof is claimed. |
| Rider 10 | No policy default was needed. |
| Rider 11 | Candidate branch only. Exact landing main equality, publication scanning and Run site are the guarded lander's work. |

## Predecessors and remaining work

The product checkout started at main fd67732578ab13b03f883bbbe1dc9bbd70bc114f, which includes cea90c2b and c7c61ef. The named f232, f263, f264, f270 and f273 ref tips are separate from main. Main retains their applicable conflict, follow-up submission, completion evidence, age and dropped-response journeys, including the P2 reapplications. This round leaves those proof files and their call sites in place. The agents exit and selected P2 observations are recorded in the receipt.

The broader BASE-AGENT-012 obligation still includes schedule creation, reviewed update, other mutation and revision variants, complete 24-hour coverage, the remaining changed-argument and dropped-stream cases, foreign-person job handles and Tasks-independent status. The other planner holds remain active, including agent and AI egress, team and PTO authority, human follow-up acceptance, erasure and approval replay, publication scanning and release gates. Provider authorization, A2P, timer execution, production paging, standby, native devices, real phones and cutover remain held.

No publication scan was performed in cloud. A local candidate-hygiene check reviewed changed lines for email-shaped text, credential patterns and ambiguous GitHub-reference tokens. Run site runs on main after landing. Previous main results, branch Verify and the exact observed branch are in the CI receipt.

## Candidate and commands

Product branch cloud/sd-oncall-c-f274 at 012bdc342a362ee1882ebc623718ef7498224986. The push succeeded. The source lock was regenerated after restoring the two generated views from origin/main. No migration was edited.

- tests/oncall-agent-schedule-replay.mjs lines 64–159 contain the scoped setup, the native edit, both error representations and the refusal-state comparisons. Lines 161–241 prove successful retry, exact approval, the audit, stored effect and replay.
- src/agent-door/schedule-tools.ts lines 71–90 retain the lookup and sponsor checks, and lines 106–113 emit the authorized override diagnostic. tests/oncall-agent-flow.mjs line 1033 invokes the test from the existing agents journey, which tests/runtime.mjs line 141 imports.
- The emitted Worker agents run completed in 474.3 seconds with exit 0. Typecheck, the first-party profile, contract generation and the exact committed source lock passed.
- Main before the round had successful Verify runs 44260227040 and 44257340422 and successful Run site 44260227102.
- E2E evidence uses the real emitted Worker, a dedicated local D1 database and a refused outbound edge. Browser capture uses synthetic sessions generated by the same test runtime.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0

CLAIM BASE-AGENT-012 PARTIAL points=none tests=tests/oncall-agent-schedule-replay.mjs#staleOverrideRevision

GAP BASE-AGENT-012: The override diagnostic slice is proved. Other revision paths and mutation variants, complete 24-hour retention, dropped and changed-argument matrices, and job-handle and Tasks-independent status remain open.

## Browser proof and remote readback

Chromium opened the retained held-policy rota at native revision 3. Both 1440 and 390 show the edited rota name, the named next primary, and the same one-hour override in the shift list and Cover section. The 1440 assertion confirmed the single entry, viewport fit, 15 px participant text, 14 px cover details, and the Remove cover tooltip on keyboard focus. The 390 screenshot and measured layout show the same retained assignment with the same text sizes and no horizontal overflow. The browser receipt records the exact UTC interval and candidate SHA. The browser runtime recorded zero outbound requests.

Git advertised the exact candidate on the named product branch and main at fd67732578ab13b03f883bbbe1dc9bbd70bc114f after the product push. The browser proof is linked to the exact committed Worker build.

## Exact-SHA Verify

Push Verify 44263382228 finished on 012bdc342a362ee1882ebc623718ef7498224986 with reported conclusion failure. The build, all eight shards and full-push-proof succeeded. The agents shard was job 134662834164. The two failing jobs were contract-docs 134662048419 and dependent summary verify 134668149370. The contract-docs archive identifies only ACCEPTANCE.md, which fleet rules reserve for regeneration at landing. The summary archive has CONTRACT_DOCS failure with successful build, shards and push proof. The cloud generated-view exception applies. Both archive reads succeeded. The exact Run site and complete publication-scan receipts await guarded landing.

- Verify run 44263382228: https://github.com/just-every/run-oncall/actions/runs/44263382228
- Agents job 134662834164: https://github.com/just-every/run-oncall/actions/runs/44263382228/job/134662834164
