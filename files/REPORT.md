# OC-006 closure — sd-oncall-c-f223

OC-006 is claimed DONE for both native acceptance points, ready for independent acceptance and guarded landing. No native outcome is missing. The shared contract judgment cells remain unchanged for the lander.

Repository: just-every/run-oncall. Branch: cloud/sd-oncall-c-f223. Full candidate SHA: 5d7364435e696b4ce1ca35d06c3f02372e8b69b4. Base main: 1e8f35e6ec553ed607b812dd6f957aae2b3acce9. No PR was required or created.

## Plan and execution

1. Read OC-006's full requirement, its two acceptance points and stale Gap, the existing emitted-Worker handoff block and network-edge helpers, the supplied campaign extract and rulings, and all eleven DONE riders. Map existing public-door assertions before adding work. All native observations already existed; no new implementation or test was needed.
2. Run the existing changes lane on the base code in this round, plus setup, explicit build, typecheck and the first-party profile check. Both OC-006 probes passed, all 40 activation flow groups passed and the labelled demo flow passed.
3. Explain the existing handoff boundary in docs/limits.md. Keep CONTRACT.md, its acceptance points, Status, Gap and Evidence cells, generated views and implementation unchanged. CONTRACT CLAIMS overrides the planner's request for a direct Evidence rewrite; the proposed lander wording is below.
4. Generate contract views and check them; restore ACCEPTANCE.md and docs/CLAIMS.md whole from origin/main. Regenerate and check sources.lock.json last. Commit only the product documentation and its generated lock hash. Reconcile main before push; the rebase was a no-op. Inspect every candidate author, committer and complete message before the first guarded push. No trailer was present; identity was the fleet identity throughout.
5. Push the first real commit immediately to the named cloud branch. Run the required full local rer verify on that committed, pushed SHA; it passed. Observe completed successful push Verify on that exact SHA via REST. Preserve the reports and actual receipts in this packet and publish them only on the separate evidence ref. Leave publication scanning, the contract judgment update, main and Run site to the fleet.

## Product change and boundaries

The diff contains six added documentation lines in docs/limits.md and one regenerated hash in sources.lock.json. It explains the normal-installation precondition, unsent exports, the distinction between a legacy review-required draft and separately reviewed authored copy, and access checks on source links. No assertion, test registration, source boundary, acceptance point, policy, workflow, package pin, Base copy, homepage or migration changed. No test was added, removed, narrowed or conditionally skipped. There was no failed observation and no repair round.

The protected boundaries src/delivery.ts, src/handoff-api.ts and src/mail.server.mjs are byte-identical to main, as are the relevant handoff implementations and journeys. See unchanged-proof.json and product.diff. Added product text has no email-shaped string or bare repository-shaped slash token.

AI calls, agent execution, remediation, production paging and connected chat or publication remain omitted under their owning holds. Approved OC-053 response events remain a separate explicitly approved flow. This closure grants no AI, provider, paging, delivery, deployment or publication authority and adopts no new policy default.

## Frozen acceptance and inherited-duty rubric

| ID | Acceptance sentence or inherited duty | Public-door proof and result |
| --- | --- | --- |
| R1 | Point 1: on a normal installation without an approved OC-053 endpoint, coordination, handoff preparation and export create no paging receipt, production action, AI call or publication | PASS. tests/activation.mjs:1014–1084, emitted-Worker handoff block, recorded PROBE OC-006 1. The authenticated declaration, legacy draft export, preparation, refused unreviewed export and reviewed export begin with no approved endpoint and an empty outbox. Their network-edge ledger stays empty; paging jobs, receipts and revision and automation endpoints and outbox stay unchanged; providerActions stays empty and Lamp stays not-published. The edge records and refuses any attempted outbound request. |
| R2 | Point 2: draft exports remain unreviewed | PASS. tests/activation.mjs:1026–1070, PROBE OC-006 2: legacy draft intent is reviewed-handoff-required, preparation alone cannot export (409), separate authored-copy review permits an unsent reviewed packet but leaves the legacy draft identical and still review-required. |
| R3 | Point 2: source links confer no access | PASS. tests/activation.mjs:1071–1084 follows every actual exported evidence and impact link: authorized responder gets populated permitted records, anonymous caller gets 401 with error-only body; records and review history remain identical. tests/runtime.mjs:1299–1329, coordinationJourney, additionally refuses revoked sessions on the actual legacy source references with no state change. |
| R4 | Inherited BASE-DATA-004 outbound duty within OC-006's native scope | PASS. CONTRACT.md:88 explicitly cites BASE-DATA-004. R1–R3 prove the scoped no-outbound boundary and source-link authority through the emitted HTTP doors. Future approved response events remain under OC-053; no other connector or AI duty is promoted. |

Both the initial changes-lane log and the exact-candidate full-verify log record the probes. candidate-probes.json binds the latter to this SHA. Push Verify 43098968229 completed successfully on 5d7364435e696b4ce1ca35d06c3f02372e8b69b4; the maintained changes lane includes tests/activation.mjs in scripts/verify-shards.json. No old Verify is substituted for the candidate.

## DONE riders

| Rider | Result | Evidence |
| --- | --- | --- |
| 1 | PASS | R1–R3 cover both acceptance points through populated public HTTP flows; both probes in changes.log and verify.log; exact-SHA push Verify 43098968229 success. |
| 2 | PASS | Actual declaration and prepared/reviewed records; successful populated authorized reads; refused unreviewed export and anonymous/revoked source reads preserve state. tests/activation.mjs:1014–1084 and tests/runtime.mjs:1299–1329. |
| 3 | PASS | This round's initial changes lane and committed-candidate full rer verify both pass; exact-SHA push Verify 43098968229 is completed/success. CI changes job 130785550069 passed on this SHA, so activation was actually invoked; all seven shards passed and the light job was skipped. Existing workflow and lane wiring are unchanged. |
| 4 | PASS | Full rer verify ran after the final commit and push on 5d7364435e696b4ce1ca35d06c3f02372e8b69b4; unchanged-proof.json also proves the relevant implementation and test bytes equal the green baseline. |
| 5 | PASS — INSPECTED | CONTRACT.md:88 explicitly cites BASE-DATA-004 for OC-006. |
| 6 | PASS — builder mechanical work | Contract write and check pass, then generated views restored from origin/main; final lock check passes. Existing stale Gap and Evidence remain reserved for the lander under CONTRACT CLAIMS. Proposed replacement below. |
| 7 | PASS — INSPECTED | product.diff changes no acceptance sentence, ruling, coverage map, Status row or generated view. |
| 8 | PASS | Authenticated responder success, viewer preparation/review/withdrawal refusal, anonymous source refusal and revoked source refusal. Exact-candidate full verify also passes current credential, erasure and replay fences. No implementation change introduces an authority path. |
| 9 | PASS — INSPECTED | No new provider, legal, delivery, handset, standby or deployment receipt is claimed. Native paging remains OFF; approved OC-053 events remain separately scoped. |
| 10 | PASS — INSPECTED | No policy default adopted; existing RL-2 authority and current contract scope retained. No ruling is requested or inferred. |
| 11 | PENDING GUARDED LANDING | Branch-only candidate. Main equality, COMPLETE full-history publication scan with zero findings, the lander-owned judgment flip and candidate Run site remain with the fleet. This is acceptance on landing, not a claim of already-landed status. |

## Pre-ready self-check

1. Both acceptance outcomes have meaningful positive and refusal assertions and passed on the committed candidate; exact-SHA Verify is green.
2. No existing assertion was removed, narrowed, skipped or moved. Test registration count is unchanged.
3. Private reads require authority. Anonymous and revoked reads refuse with no content; erasure and replay fences remain unchanged and pass the full verification. This change adds no execution or data path.
4. Only documentation copy changed. Existing limits-page browser proof was captured at 1440 and 390 in this candidate run, in limits-1440.png and limits-390.png. Both screenshots were visually inspected: the added section is readable and wraps without clipping at either width. Existing layout and controls remain unchanged; no icon-only control was introduced.
5. Source lock is fresh and contract write/check pass. Exact-SHA branch Verify is green. The cloud adaptation defers publication scan, main equality and Run site to the guarded lander; none is represented as completed here.

## Verification receipts

- Setup: cloud_run npx -y @runeditrun/rer setup with the required non-interactive fleet owner, exit 0. Raw setup output is excluded because it can contain a private local entry.
- Explicit build: cloud_run npx -y @runeditrun/rer build, exit 0.
- Typecheck: pnpm run typecheck, exit 0, repeated by both the changes-lane preparation and exact-candidate full verify.
- First-party checks: pnpm exec rer check --profile first-party, exit 0, also repeated by verification preparation.
- Changes lane: ONCALL_VERIFY_LANE=changes node tests/verify.mjs, with the required 1200-second alarm and cloud_run, exit 0; both probes, 40 activation flow groups and demo flow pass.
- Full committed-candidate check: cloud_run timeout --signal=TERM --kill-after=30s 5400 npx -y @runeditrun/rer verify --non-interactive, exit 0; started 2026-11-11T20:57:04Z, ended 2026-11-11T22:05:22Z. Chromium /usr/bin/chromium with --no-sandbox; browsers and servers close through the maintained journey cleanup and cloud subreaper.
- Exact-SHA CI: push Verify 43098968229, completed/success, https://github.com/just-every/run-oncall/actions/runs/43098968229. Seven explicit GitHub API calls total, including one completed-jobs receipt after the required spacing; the watcher used at least 300 seconds between observations and stopped at success. All seven shards, including changes job 130785550069 and runtime job 130785550483, passed on this exact SHA. The light document-reader job was skipped. No dispatch or rerun was requested.
- Main baseline only: Verify 43085467285 and Run site 43085467371 completed successfully on 1e8f35e6ec553ed607b812dd6f957aae2b3acce9. Those Run site results are not candidate landing proof.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, generated views restored whole from origin/main; ledger=none exit=0.

Exact-candidate publication scan: commit=5d7364435e696b4ce1ca35d06c3f02372e8b69b4, complete=false, historyScanned=unestablished, findings=unestablished, status=not run in cloud under the cloud adaptation. The checkout has complete history. The guarded lander must independently require a COMPLETE zero-finding scan and all landing gates.

## Proposed lander judgment and counts

OC-006 PARTIAL → DONE after independent acceptance. Replace its Evidence with the R1–R3 mapping above, explicitly retaining the normal-installation, no-approved-OC-053-endpoint and empty-outbox precondition; empty its Gap. No native acceptance point remains unproved. No DEFAULT or GAP line is needed.

Actual builder counts before and after remain 22 DONE, 45 PARTIAL, 34 MISSING, total 101. Published counts remain 16 DONE, 6 PARTIAL, 0 MISSING. After the proposed lander-only OC-006 flip, the expected full counts are 23 DONE, 44 PARTIAL, 34 MISSING, and published counts 17 DONE, 5 PARTIAL, 0 MISSING. Only the OC-006 plan target changes; all other queue entries, held clauses and scopes are unchanged.

## Custody and claim

Product pushed successfully on the first guarded attempt. Fleet authors and committers only; no trailers. No force push or main push. Product branch, head and index remain unchanged by the separate evidence publisher. Complete non-secret reports, actual receipts and the two relevant screenshots are explicitly selected for evidence/sd-oncall-c-f223. Raw environments, credentials, private local entries, browser session state and unrelated artifacts are excluded. No blocker remains; publication and landing duties are pending with the fleet.

CLAIM OC-006 DONE points=1,2 tests=tests/activation.mjs#PROBE OC-006 1; tests/activation.mjs#PROBE OC-006 2; tests/runtime.mjs#coordinationJourney

READY branch=cloud/sd-oncall-c-f223 head=5d7364435e696b4ce1ca35d06c3f02372e8b69b4
