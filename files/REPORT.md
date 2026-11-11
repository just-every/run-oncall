# OC-018 local command completion

Repository: just-every/run-oncall. Branch: cloud/sd-oncall-c-f224. Starting main: 1e8f35e6ec553ed607b812dd6f957aae2b3acce9. Candidate: 2be483ab7374229a404e5df705b907688bdb6a39. Final validation and CI results are recorded below when complete.

The clause has one native acceptance point. Its remaining unproved command was the production deploy dry run. The existing transfer journey already explicitly removes dist and invokes the pinned root build, checks the production Worker and assets, excludes development identity and private fixture values, restores settings exactly and serves that build in production preview. The old Gap's build half is stale.

The installed 0.2.108 owner adapter marks managesHostedOwner; deployCommand runs its dry-run hook under withLocalDeployPlan. The kit maps dry-run to local-plan, refuses other operations while that context is active, validates the local plan and returns before constructing a provider client. The extended transfer journey uses that public CLI door with no Cloudflare or mail credentials and owned dev and preview stopped. It requires the CLI's explicit local-only completion, absent deployment record, production artifacts without private settings or development identity, and unchanged private-setting bytes and permissions. It checks both the synthetic exclusion sentinels and every fixture value declared secret by deploy.json.

The four declared-effect documents now match that behavior. OPERATIONS.md uses the actual 0.2.108 pin. Actual deployment and removal still require account and operation authorization; a dry run proves no credential, target-secret, deployment-permission, remote-readiness, mail-delivery or remote-removal fact.

No Status, Gap or Evidence cell changed. The lander owns the evidence reconciliation and status promotion. Both generated views remain origin/main's whole files. No application UI, homepage, logo, workflow, Base pin, migration or acceptance point changed. No test registration was added or removed, and no existing assertion was removed, narrowed or made conditional.

## Plan and scope results

The full executed plan is PLAN.md. Initial counts are 22 done, 45 partial and 34 missing (101). Product status counts remain those values because the builder preserves judgments. Accepting OC-018 as done would produce 23 done, 44 partial and 34 missing. The only proposed plan-row change is OC-018: remove the stale build and credential-requiring dry-run gaps, cite each command's current proof and retain the R-1 field-proof note. All other rows and holds remain unchanged.

The real-account R-1 journey is dated prior evidence, passed 19 October 2026, in CONTRACT.md's field register and docs/contract/acceptance-before-cleanup.md. It was not repeated. Paging, independent standby and real-phone proof stay held under their owning clauses. No new account operation was authorized or performed.

## Acceptance and inherited duty rubric

R1. Acceptance 1, the single sentence: documented setup, dev, build, preview, reset, archive and deploy dry-run run; owner entry opens the workspace; an admin-created member signs in by password. Proof is the maintained managed installation transfer journey and hosted member coordination journey through emitted application doors. Exact locations and run results are in the final receipt.

Command mapping for the lander's Evidence cell:

- Setup: tests/transfer.mjs, managed installation transfer, managedSeed.command setup with the private answers file; the journey then signs in as the configured owner and reads real application state.
- Dev: the same journey, managedSeed.start, actual foreground loopback Vite Worker, developmentReadiness and protected state reads.
- Build: the same journey, PROBE OC-018 build, explicit pinned root build after deleting prepared output, production Worker and assets, exclusions and exact settings restoration.
- Preview: the same journey, managedSeed.preview, real production preview readiness and anonymous-state 401 without development identity.
- Reset and archive: the same populated journey, export, nonempty and malformed import refusal, reset, exact retained archive bytes, private-state removal, empty schema, current restore and erasure-journal refusal.
- Deploy dry-run: the same journey, PROBE OC-018 deploy dry-run, production local plan without account or mail authority, completion, privacy, no deployment record and restoration assertions.
- Owner entry: the same journey, the managed phone smoke at 390 enters through the actual RER_OPEN link, confirms the same member, reads retained incident history after reload and navigates by keyboard.
- Member password: tests/member-coordination-browser.mjs, hosted member coordination, administrator creates the responder, /signin/local password entry succeeds, attributed coordination survives reload, viewer restrictions and signed-out, anonymous and revoked refusal remain enforced.

R2. BASE-INSTALL-001: pinned installer, native root commands, free self-hosted command lifecycle, portable data and removal boundary. Receiving citation exists in CONTRACT.md's OC-018 metadata. The transfer journey covers local lifecycle and custody; actual hosted deployment and removal remain dated R-1 field proof, not newly inferred.

R3. BASE-ACCESS-001: configured owner uses native entry and independent production sign-in, members use local passwords. Managed owner entry, hosted member coordination and the Production sign-in browser flow cover current native doors; unavailable mail refuses with no authenticated session. Real inbox receipt remains R-1 dated field proof.

R4. BASE-ACCESS-002: session and development-identity separation. Production preview refuses anonymous state, built artifacts exclude the development identity layer and key, and the member journey refuses signed-out, anonymous and revoked sessions. Portable restore excludes sessions and credentials, requires explicit receiving-owner mapping and preserves erasure fences.

## DONE riders and pre-ready checks

The final result records each of the eleven rider rows separately, exact-SHA local and CI evidence, source-lock and generated-view checks, publication-scan custody and landing state. No cloud publication scan or main landing is claimed. No new policy default was needed.

## Final validation results

Full candidate SHA: 2be483ab7374229a404e5df705b907688bdb6a39. Branch: cloud/sd-oncall-c-f224. The exact-SHA push Verify run 43100175114 completed success: https://github.com/just-every/run-oncall/actions/runs/43100175114. The required full local rer verify was executed and exited 1 on a browser connection reset. Its unchanged complete browser journey then passed on the candidate; the same journey also failed on baseline main with a support-hours sample-request timeout. Under the provided main-failure flake rule, these local browser failures do not block the green exact-SHA candidate. The touched transfer journey, typecheck, first-party check, generated-view write and check, and final source-lock check all exited 0. No migration changed; ledger check is not applicable. No PR was needed because branch pushes enter Verify directly.

PROBE OC-018 1: pinned production deploy dry run in the disposable managed installation, with owned dev and preview stopped and all Cloudflare and mail credentials removed -> exit 0; required local-only completion, no deployment record, production Worker and client assets without private settings or development identity, exact private bytes and permissions restored. Existing explicit fresh build and production preview proof also passed.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0, generated views restored whole from origin/main; ledger=none exit=0 (not applicable).

The first local attempt on the save head stopped at the existing phone smoke because ONCALL_CHROMIUM_PATH was omitted. The final attempt used /usr/bin/chromium with --no-sandbox and passed without weakening or changing the phone assertion. The CLI browser-cache executables also delegate to system Chromium. Full logs and actual command receipts are explicitly selected in this packet.

The first full local rer verify run exited 1 on an existing product-browser API read: `apiRequestContext.get: socket hang up (ECONNRESET)` for GET `/api/paging/state`, at `tests/product-browser-journey.mjs:629`. The complete failed log and actual nonzero exit receipt are retained. The exact unmodified browser journey then passed on the candidate in the same VM with system Chromium. The same journey failed on baseline main with `Support-hours sample requests did not settle` at `tests/product-browser-journey.mjs:1053`; the relevant application and browser sources have an empty diff. No test or implementation repair was made and no CI run was rerun. The brief treats a journey that also fails on main as a flake and directs handoff as usual. The local full-command failure is retained honestly; no subsequent full local pass is claimed. Exact-SHA full branch CI is completed success.

| Rider | Result | Exact proof |
| --- | --- | --- |
| 1 | PASS | tests/transfer.mjs L103-L168, L209-L240, L445-L534; tests/member-coordination-browser.mjs L24-L58, L481-L498; push Verify 43100175114 success |
| 2 | PASS | Populated transfer, bad and nonempty archive refusal, erasure-journal rejection, exact settings preservation and credential exclusion; tests/transfer.mjs L445-L534, L575-L663 |
| 3 | PASS | Existing push matrix transfer and browser lanes invoke both maintained journeys; exact-SHA push Verify 43100175114 success |
| 4 | PASS | Transfer and complete browser replay passed on exact candidate 2be483ab7374229a404e5df705b907688bdb6a39; full CI Verify green; local full attempt retains its nonzero transport-flake receipt |
| 5 | PASS INSPECTED | CONTRACT.md L100 explicitly cites BASE-INSTALL-001, BASE-ACCESS-001, BASE-ACCESS-002 and register R-1; receiving requirements unchanged |
| 6 | PASS MECHANICAL | Contract generator write and check exit 0; source status and stale Gap remain main-owned and are reconciled by lander claim, not builder edits |
| 7 | PASS INSPECTED | No CONTRACT.md change, acceptance rewrite, ID allocation or coverage loss; all 101 rows retained |
| 8 | PASS | Allowed local commands complete; private values and development identity excluded; rejected restore and revoked member access change no authority; tests/transfer.mjs L474-L534 and tests/member-coordination-browser.mjs L481-L496; Verify 43100175114 |
| 9 | PASS | No provider or legal qualification inferred; CONTRACT.md L1380 R-1 remains dated prior 19 October evidence, not repeated; no account operation |
| 10 | PASS INSPECTED | No new policy default or authority rule; documented existing pinned CLI behavior only |
| 11 | PENDING GUARDED LANDER | Candidate branch only; main equality false at handoff, candidate Run site and COMPLETE publication scan not run in cloud; baseline main Verify 43085467285 and Run site 43085467371 were success |

R1 acceptance rubric: PASS, the single acceptance sentence reaches every command and both identity entry doors through the named journeys. R2 inherited install duty: PASS for current local commands and custody, INSPECTED for unchanged installer and theme, with account operations remaining dated R-1 field proof. R3 inherited sign-in duty: PASS for native owner and member doors and unavailable-mail refusal; inbox receipt is dated R-1 field proof. R4 inherited session duty: PASS for production development-identity exclusion, revoked and anonymous refusal, inactive credential-free restore and erasure fences. All use exact-SHA push Verify 43100175114 (success); the native sources and the relevant preexisting assertions are unchanged except the added local-plan proof.

Pre-ready self-check: current native outcomes and failure cases are covered by maintained journeys; no assertion was removed, narrowed or placed behind another condition; authority, erasure and replay protections passed; no screen was changed, so screen design checks are not applicable; source lock and generated views check passed; zero new email-shaped strings were introduced. Run site, main equality and publication scanning are fleet landing duties and are not claimed here.

Publication scan receipt: commit=2be483ab7374229a404e5df705b907688bdb6a39; complete=NOT RUN IN CLOUD; historyScanned=UNESTABLISHED; findings=UNESTABLISHED. Full Git history is present. Main equality is false at this branch-only handoff. Baseline main 1e8f35e6ec553ed607b812dd6f957aae2b3acce9 had push Verify 43085467285 and Run site 43085467371 completed success. These are baseline facts, not candidate landing receipts. No candidate Run site result is claimed.

Proposed lander Evidence cell: tests/transfer.mjs — managed installation transfer: setup and loopback dev, explicit root build after removing dist, production preview, populated archive/reset/import with authority and erasure fences, production deploy dry run without credentials or provider work, artifact privacy and exact settings restoration, managed owner entry and phone reload. tests/member-coordination-browser.mjs — hosted member coordination: administrator-created password member, attributed acknowledgment and note after reload, viewer and revoked-session refusals; Production sign-in browser flow: native owner setup, configured email hint without send and unconfigured-mail refusal independent of development identity. R-1 remains dated prior field proof and was not repeated.

Proposed Gap reconciliation: remove both stale native command gaps; retain only the note that actual hosted account deployment, owner claim and setup-token retirement, real emailed sign-in and removal with empty provider readback are dated field proof in R-1 rather than repeated maintained tests. The lander owns the final Status, Gap and Evidence text. No native acceptance point remains unproved.

CLAIM OC-018 DONE points=1 tests=tests/transfer.mjs#managed installation transfer; tests/member-coordination-browser.mjs#hosted member coordination; tests/member-coordination-browser.mjs#Production sign-in browser flow
