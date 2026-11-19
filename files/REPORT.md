# sd-oncall-c-f304 · Oncall resolution response loss

Prepared by Codex on 19 November 2026.

## Plan and scope

The replan-85 entry for BASE-AGENT-012 asked for the resolution response-loss gap in acceptance 2. I reused the recovered-incident fixture, MCP socket helper, D1 snapshot and existing runtime and browser resolution journeys. The plan was to drop the first completed response, establish its terminal result and native effects independently in D1, retry with a different JSON-RPC id, and read the saved approval and incident in the signed-in browser. The runtime covered autonomous and held policies. The browser covered held policy through the sponsor's approval screen.

Main included the required-revision and changed-summary predecessors. Main advanced during validation with its follow-up link coverage. I merged that update, regenerated the lock and reran the touched checks on the final candidate. The f291 optional-revision candidate was on its separate integration branch. I exercised the same optional-revision refusal in the existing runtime leg as a preservation check. The f291 integration retains its landing gate. Existing stale revision, changed-summary, post-preparation drift, scope denial and replay assertions remain covered. The diff contains the two existing journeys, a clause paragraph recording the observed runtime proof and the pinned source lock. The test registration count is unchanged.

## Product custody

- Repository just-every/run-oncall
- Branch cloud/sd-oncall-c-f304
- Save 86504bd0fe30cda24f704ce223ad84276bef1f03, pushed with the CI skip marker
- Merged save ec46a23f41c05b7ae3510d018b5d444a4a19ab40, pushed with the CI skip marker
- Candidate 23c8f4db2528abdb6c640086710d3fe6520370f2, advertised on the named branch
- Main at the final ref check eeb1ac5166482fc1a2a54e68deb587080f72d95e. The initial checkout was 802d6eacc60e5a1638423ce6396905b33771a150.
- Initial main Verify 44570210163 and Run site 44570210013 both succeeded on that initial SHA.
- The candidate includes main at 3e278dea3b663bc5d8cd4b66889b2e85b24d7cc8, where Verify 44576969484 and Run site 44576969490 succeeded. Main advanced again after the candidate push.
- Candidate Verify 44582221564 (push) on the exact candidate was completed with conclusion failure. The only failed step was generated ACCEPTANCE.md freshness; the fleet lander regenerates it. [GitHub Verify](https://github.com/just-every/run-oncall/actions/runs/44582221564).
- Candidate Run site awaits landing. The workflow runs on main.
- Full-history publication scan on the candidate awaits the fleet lander. Scan completeness, history coverage and finding count are unestablished.
- No PR was needed. The branch push invokes Verify.

Counts before and after this round are 26 DONE, 41 PARTIAL and 34 MISSING, out of 101. BASE-AGENT-012 remains MISSING in the source Status table. The replan-85 row can record local proof of the oncall.incidents.resolve response-loss slice under both policies. Other plan rows and holds carry forward.

## Observations

- The autonomous MCP request completed and the client destroyed its HTTP response at headers with its body unread. The held request's pending response was fully consumed. The signed-in sponsor approved once using the saved policy revision and summary hash. The first completed MCP retrieval was then destroyed at headers with its body unread. D1 retained the original call, outcome and unexpired expiry before any recovery. [Runtime journey](https://github.com/just-every/run-oncall/blob/23c8f4db2528abdb6c640086710d3fe6520370f2/tests/oncall-agent-flow.mjs#L520)
- Each policy recorded one attributed resolution, one state-changing mutation audit commit and one increment each of the incident and workspace revisions. Retry with the exact arguments and key returned the saved result in structured content and text, and the original approval receipt for held policy. D1, the protected state and the protected paging read stayed unchanged apart from linked replay-attempt audit and capacity bookkeeping. The outbound ledger stayed empty. [D1 and replay assertions](https://github.com/just-every/run-oncall/blob/23c8f4db2528abdb6c640086710d3fe6520370f2/tests/oncall-agent-flow.mjs#L561)
- The browser sponsor approved the retained resolution. After losing and recovering the completed MCP result, the journey matched the result and original receipt to the retained D1 call and captured the executed approval and saved incident timeline at 1440 and 390. At desktop width the original summary remained visible and the refused summary was absent. [Browser journey](https://github.com/just-every/run-oncall/blob/23c8f4db2528abdb6c640086710d3fe6520370f2/tests/agent-door-browser.mjs#L678)
- Exact-tree local build, typecheck, first-party check, agent runtime and agent browser journey passed. The documented generator wrote and checked the views. Both views were restored from main before the pinned lock was written and checked. Migration ledger was inapplicable. [Local receipt](RECEIPT.json)

## Acceptance and rider checks

| Acceptance | Result |
| --- | --- |
| 1 | The resolution subset had one effect and the saved result in both policies. Full mutating-tool coverage and at-least-24-hour retention remain held. tests/oncall-agent-flow.mjs:561 and :670. |
| 2 | This round's resolution slice passed in autonomous and held modes. The first completed response was lost and a new JSON-RPC id recovered the stored result. Other lost-stream scopes remain held. tests/oncall-agent-flow.mjs:520, :633 and :670, invoked at tests/runtime.mjs:142. |
| 3 | The predecessor still refused a changed summary without a result or effect before an exact retry. Other tool and argument combinations remain held. tests/oncall-agent-flow.mjs:655. |
| 4 | Stale required and optional revisions returned the exact authorized current revision. Missing and scoped-out incidents remained indistinguishable. Preparation drift remained exercised. Other diagnostics remain held. tests/oncall-agent-flow.mjs:500 and :1185. |
| 5 | Foreign-person job handles and Tasks-independent long work remain held. |

| Rider | Result |
| --- | --- |
| 1 | Partial. Both MCP loss cases and held browser readback ran. The acceptance rows above name the clause gaps. |
| 2 | Pass for this slice. A populated recovered incident committed once despite the lost response. Stale revision and changed summary returned errors with stable native and approval custody. tests/oncall-agent-flow.mjs:500, :561 and :655. |
| 3 | The exact candidate push Verify ran the agents shard 135767466178 and hosted browser shard 135767466263 successfully. Every shard and full-push proof succeeded. The documented generated-view exception applies to the overall result. scripts/verify-shards.json:66, :83, :115 and :133. |
| 4 | Pass locally on the exact candidate. The browser captures and check receipt share the candidate SHA. |
| 5 | Inspected. The proof is attached to the Base clause itself. No new inheriting duty is asserted. CONTRACT.md:1181. |
| 6 | The generator write and check passed locally. The Status, Gap, Evidence and counts match the merged main base. The fleet lander owns regenerated views and any judgment update. |
| 7 | Pass. Acceptance sentences remain byte-for-byte unchanged. No ruling, migration, coverage map or copied Base source changed. |
| 8 | Pass for this slice. The signed-in sponsor succeeds with exact saved values. Missing and scoped-out incidents withhold content. Existing agent-only approval refusals and preparation drift remain exercised. tests/oncall-agent-flow.mjs:500, :532 and :1185. |
| 9 | No provider or field proof was claimed. The local outbound ledger was empty for the resolution cases and paging stayed OFF. |
| 10 | No new policy or delegated authority was adopted. |
| 11 | Pending guarded landing. Candidate main equality, publication scan and Run site remain fleet gates. |

The existing classification leg still consumes a direct completed autonomous response. The touched runtime lane retains stale, conflict, exact replay, authority, consent revocation and erasure assertions. This round changes no control or layout. The browser proof shows the same saved approval and timeline at both widths.

CLAIM BASE-AGENT-012 PARTIAL points=2 tests=tests/oncall-agent-flow.mjs#staleResolutionRevision; tests/agent-door-browser.mjs#incident resolution browser

GAP BASE-AGENT-012: Other mutating tools, lost streams, conflict combinations, revision diagnostics, full 24-hour retention, foreign-person job handles and Tasks-independent long work remain held. Erasure and approval replay, SURFACE-004's ambiguous hold and Base seam, BASE-AGENT-006 and BASE-AGENT-008, human follow-up acceptance, broader attribution, OC-023 team authority, OC-037, OC-044 and OC-054 ownership, OC-045, OC-046, OC-048 and OC-049 egress, provider authorization and A2P, timers, production delivery, standby, devices, real-phone and cutover proof remain held.
