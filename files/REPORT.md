# sd-oncall-c-f256 results

Author: Run Edit Run fleet, 17 November 2026.

Candidate: `38988564d2de70c8e3951e87076b609ba497e319`, branch `cloud/sd-oncall-c-f256`, repository `just-every/run-oncall`. Baseline main: `112c6f14e2327d8e5cc1ac6bd9b9a6eac92a7554`. The first real commit was pushed immediately; the product push succeeded on its first attempt. No pull request is required for this repository's branch Verify entry point and none was created.

The selected native-client slice of acceptance 2 is implemented in `tests/oncall-agent-client-parity.mjs` and invoked by `resourceParity` in `tests/oncall-agent-resource-parity.mjs:168`. The already-existing runtime call in `tests/oncall-agent-flow.mjs:573` and browser call in `tests/agent-door-browser.mjs:584` load it transitively. Their invocations and all previous assertions remain intact. The implementation, authority boundaries, copied Base module, workflows, contract and derived views are unchanged.

Contract status is MISSING before and after. Counts remain 26 DONE, 41 PARTIAL, 34 MISSING, 101 total. The claim is PARTIAL for the selected acceptance 2 observations, not a full-point or full-clause promotion. The plan row to update is only the launched BASE-AGENT-003 client parity entry: its selected administrator and viewer observations are now covered; keep its remaining scope and holds. No other plan entry is changed.

The existing primary matrix retains 36 comparisons, coverage retains 12, and f254 follow-ups retain 12. Six client cases are added: four administrator record comparisons and two viewer denial matrices, one of each role under each policy. Aggregate parity cases increase from 60 to 66. Eight client screenshots extend the parity screenshot set from 184 to 192. Verify lane entries remain 20; this is a helper inside an existing sanity journey, not a new test registration. No test was deleted, replaced, narrowed, skipped or put behind a new condition.

## Work performed

The journey reuses the actual administrator and viewer password sessions, explicit Business links and separately admitted agents. The sole added requested permission is `integrations:read`; the five existing requested scopes remain. The active native client is reused from the maintained fixture. An inactive client with a different native owner, two services and mixed read and write permissions is created and revoked through the protected native administrator management door before the observation baseline.

All expected resource values come from the same administrator's protected `GET /api/automation` response at frozen Worker time and unchanged native revisions. D1 is used only to inspect agent admission, policy custody and unchanged durable effects. It is never the parity oracle. Every record field is compared, including id, name, owner, services, permissions, active, revision, createdAt and lastUsed. In these native fixtures lastUsed is null; reads preserve it exactly. The client credentials are never used for parity reads.

Both policies retain the existing standard-only client classification. Autonomous reads have no review or approval change; held reads create one open review with the actual sponsor and leave all existing reviews and approvals exact. Viewer native management reads return 403, native state omits apiClients entirely, and reads of active populated, inactive populated and missing client IDs return the identical resource_unavailable error with no content. Denied resource reads create no review or approval.

Browser disclosure uses the actual protected document's workspace bootstrap, which is what this native page consumes. Administrator client names, service labels, read and change permissions, and inactive status agree with the HTTP oracle. Viewer disclosure retains the administrator-managed notice with no client names, identifiers, permissions or mutation controls. API-only fields are compared over HTTP. Assertions run at 1440; native views are captured at 1440 and 390 under both policies. The new client section has no icon-only controls. Existing typography is at least 13px in the inspected client panel, desktop has no horizontal overflow, and configuration remains under Settings. Visual inspection of administrator and viewer captures at both widths found the expected disclosure.

An initial precommit browser run incorrectly waited for an /api/state request that this page does not make at initial load. It timed out. Reading the native server and useWorkspace showed the protected document bootstrap; the harness was corrected to compare that actual payload instead. The corrected full parity browser run passed. No product behavior or access rule was changed to repair the harness.

## Frozen selected-slice rubric

| Item | Public-door proof | Result |
| --- | --- | --- |
| R1: actual native roles and linked, admitted Business sponsors with preserved scopes | `tests/oncall-agent-resource-parity.mjs:28` to 32; `tests/oncall-agent-client-parity.mjs:24` to 43 | PASS locally |
| R2: every active and inactive administrator client field equals protected native HTTP at the same time and revisions | `tests/oncall-agent-client-parity.mjs:44` to 60 and 76 to 80 | PASS locally |
| R3: viewer native denial, state omission and indistinguishable populated and missing resource errors | `tests/oncall-agent-client-parity.mjs:87` to 107 | PASS locally |
| R4: existing classes and policy-appropriate custody, no collateral review or approval change | `tests/oncall-agent-client-parity.mjs:61` to 75 and 101 to 103 | PASS locally |
| R5: native records, revisions, permanent state-changing audit and paging unchanged; no outbound request | `tests/oncall-agent-client-parity.mjs:76` to 80, 103 to 107, 119 to 127 and 181 to 183 | PASS locally |
| R6: administrator disclosure and inactive state; viewer notice and no data or mutation controls; both widths | `tests/oncall-agent-client-parity.mjs:130` to 178, eight client screenshots | PASS locally |
| R7: maintained primary, recent changes, review material, coverage and follow-up parity remain loaded | `tests/oncall-agent-resource-parity.mjs:64`, 87 to 141 and 164 to 168 | PASS locally |

## Acceptance and inherited-duty accounting

| Acceptance sentence | Evidence and remaining scope |
| --- | --- |
| 1: every primary record type has a template | Maintained `tests/oncall-agent-resources.mjs` resourceJourney compares the 17-template inventory through emitted MCP. No expansion or new full-surface claim. |
| 2: two-role reads agree with native UI | This round closes only the client slice through clientParity and captureClients. Existing primary, changes, review material, coverage and follow-up comparisons remain. Private-team and scoped-ownership parity and member, public-team, endpoint, erasure and outbox role parity remain omitted. Existing member and public-team viewer mismatch is not repaired or widened. |
| 3: inaccessible and missing records are indistinguishable | Maintained resourceJourney retains all-template denial proof. This round adds active and inactive client viewer comparisons with actual admitted native sponsors. |
| 4: write links read back committed state | Maintained resourceJourney note write and actual returned link readback remain. No claim of complete every-write-link coverage. |
| 5: grant byte budget exhaustion returns no partial content | UNMET: copied Base grant byte-budget work remains unfinished. Request and body limits do not substitute. Copied Base source stays unchanged. |
| 6: untrusted customer text is marked | Maintained resourceJourney and existing resource parity preserve customer, imported and email assertions. Client resources retain the existing untrusted metadata. |
| Native authority and read privacy | Administrator native management is the oracle; actual viewer native and resource denials execute and preserve effects. No stronger authority is granted. |
| Policy, custody and audit | Standard class, autonomous or held review, immutable prior custody and permanent state-changing audit are asserted through the existing public doors and durable effect snapshots. |
| Provider and Business boundaries | Signed fixture linkage supplies no actual Business account or federation proof. Paging is OFF and the outbound ledger remains empty. No account, provider, activation, publication or release authority follows. |

## DONE-RIDERS

| Row | Result | Evidence or limit |
| --- | --- | --- |
| 1 | PARTIAL for the whole clause; selected slice PASS locally | R1 to R7 cover the requested observations; omitted role parity and Base bytes prevent DONE. |
| 2 | PASS for selected slice | Populated active and inactive clients, administrator success and real viewer denial; expected fields originate only in native HTTP. |
| 3 | PASS | Push Verify run 44028209580 completed successfully on exact candidate 38988564d2de70c8e3951e87076b609ba497e319. It loads runtime agents and hosted agent browser through the existing invocations; ci-status.json records the final result. |
| 4 | PASS on exact SHA | Full runtime agents invocation completed in 364.6 seconds. The full agent browser entry point also passed on 38988564d2de70c8e3951e87076b609ba497e319, with eight client captures and 192 parity captures. Both resource-parity receipts bind to the candidate; no source edit after commit. |
| 5 | INSPECTED, unchanged | No receiving clause or Base inheritance rewrite is made. Existing duties remain assigned. |
| 6 | PASS mechanical; status reserved | Generator write and check pass; views restored whole from main; contract judgment cells and summary counts unchanged. |
| 7 | PASS | No acceptance sentence, ruling or coverage map changed. |
| 8 | PASS for selected slice | Same-sponsor administrator allowed and viewer denied; native records, paging and state-changing audit preserved. |
| 9 | PASS boundary honesty | No provider, account, legal, delivery or native-device claim; lastUsed null is recorded honestly. |
| 10 | PASS, no policy default introduced | Existing owner and administrator boundary and policy classification are unchanged. |
| 11 | Pending guarded landing | Main is the baseline, not the candidate. Exact-tree full-history publication scan and candidate Run site are fleet lander duties. No COMPLETE scan or landing is claimed here. |

## Pre-ready self-check

The new tests exercise the selected behavior through protected native HTTP, emitted MCP and built native pages. Exact-SHA push Verify 44028209580 is completed with success, confirming every selected-slice PASS row under that event. Full-object equality and both allowed and denied paths guard the requested outcomes. All existing assertions and scopes remain. The maintained resourceJourney's revoked credential, erased incident and handoff reads, and captured write replay checks remain loaded in the runtime invocation. Source lock includes the new tracked helper and is checked after the final commit and no-op rebase. No migration was changed. No email-shaped literal was added. Review of new slash tokens found only real MIME, MCP method and evidence path syntax. Publication scanning and landing remain fleet gates.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check, then restore main views exit=0; ledger=none exit=0

PROBE BASE-AGENT-003 2: protected administrator GET /api/automation and Business-sponsored client resource reads -> every field equal for active and inactive records under both policies; native viewer GET -> 403, state omits clients, populated and missing resources -> identical resource_unavailable with no content; unchanged native effects and zero outbound requests.

CLAIM BASE-AGENT-003 PARTIAL points=2 tests=tests/oncall-agent-client-parity.mjs#clientParity; tests/oncall-agent-client-parity.mjs#captureClients; tests/oncall-agent-resource-parity.mjs#resourceParity

GAP BASE-AGENT-003: Acceptance 2's omitted private-team, scoped ownership and additional template role parity, acceptance 5's copied Base grant byte budgets, complete every-write-link and target-surface coverage, actual Business identity and all held provider and release duties remain unproved. Keep the main MISSING judgment and every existing hold.

DEFAULT: none. No authority discrepancy was found in the selected client slice. No unrelated clause is taken from the empty unblocked queue.

Plan and complete actual results are in PLAN.md, checks.json, the exact-SHA runtime and browser logs and resource-parity receipts. CI and final custody are recorded separately when completed. Evidence publication is report transport only and signals neither product acceptance nor landing.

Local final result: both maintained entry points passed on the exact pushed head. Main still equals 112c6f14e2327d8e5cc1ac6bd9b9a6eac92a7554. Product ref matches 38988564d2de70c8e3951e87076b609ba497e319. Verify run 44028209580 remained in progress at the fourth total GitHub API call, observed 2026-11-17T06:12:56Z; no failure is established. CI polling is at least 300 seconds apart.

Final CI: push Verify 44028209580, completed/success on 38988564d2de70c8e3951e87076b609ba497e319, observed 2026-11-17T06:18:50Z. Five total GitHub API calls were used. No dispatch, rerun, PR or repair round was needed. Both full maintained local entry points passed on the exact SHA, and their resource-parity receipts bind to it. The emitted Worker fingerprint is recorded; all application source and toolchain files match the baseline.

Final rider results: 1 PARTIAL for the whole clause, selected slice PASS; 2 PASS for the slice; 3 PASS; 4 PASS; 5 INSPECTED unchanged; 6 PASS mechanical; 7 PASS; 8 PASS for the slice; 9 PASS boundary honesty; 10 PASS with no new default; 11 pending the guarded fleet lander. Main equality is false because the candidate is branch-only. Candidate Run site and publication scan remain with that lander; neither is claimed complete. Baseline main Verify 44021767668 and Run site 44021767617 were successful. No source or test edit followed the candidate commit.
