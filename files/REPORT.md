# sd-oncall-c-f228 results

Product branch: `cloud/sd-oncall-c-f228` in `just-every/run-oncall`.
Final pushed head: `0aa680bcde80637ca688881af05ba23b87f7b2cc`.
Baseline main: `2743e71f76044322080b1b136b9dce82c4793915`. Main was re-fetched before every product push and remained unchanged. Published history was preserved; subsequent integration used merge, never rebase or force push. No PR was required or created. No default branch was pushed.

The selected events listing work is implemented and proven, with one real Base dependency: `policy.adopted` lacks class metadata and a decision reference. The clause is claimed PARTIAL and no whole-clause promotion is requested. Point 4 below refers only to the planner-selected events listing channel; its subscription and webhook duties remain held.

## Counts and plan result

- Contract judgments before and after: 23 DONE, 44 PARTIAL, 34 MISSING; 101 Status rows retained.
- BASE-AGENT-010 remains MISSING in CONTRACT.md, unchanged from main. The builder supplies a PARTIAL claim for the fleet to judge.
- Exposed tools: 39 to 40; the source manifest retains the same 40 tool targets, with the existing retained-events tool now available.
- No new journey registration, budget increase, migration, Base copy, rer pin, workflow, homepage, branding or provider authority change.
- Plan row result: BASE-AGENT-010 cursor replay and current native access filtering complete for events.list; pending and decided approvals and flagged reviews have direct metadata proof; adoption metadata remains blocked on Base. No other plan row changes. The supplied campaign queue has no next unheld clause in scope.

The complete working plan is in PLAN.md. The finite proof map is in RUBRIC.md. Every DONE rider and pre-handoff result is in RIDER-CHECKS.md.

## Implementation

`./src/agent-door/index.server.ts` declares the existing `events` capability. `./scripts/write-agent-surface.mjs` regenerates `./agent-surface.json` and the complete tool inventory in `./docs/agents.md`, including the existing events journey fixture. The guide explains retained cursor reads and the policy-adoption limitation.

`./tests/oncall-agent-events.mjs` exports retainedEvents, invoked by `./tests/oncall-agent-flow.mjs:1126` through the existing `./tests/runtime.mjs` machines journey. `./tests/oncall-agent-fixtures.mjs:80` creates distinct real native people, sessions and explicit signed Business mappings. `./tests/agent-door-runtime.mjs:442` snapshots native records and paging while allowing required attempt audit and capacity bookkeeping.

The same journey exercises all-autonomous and held policies against the emitted production Worker, real D1, real MCP, the native member command, the signed-in approval door and the signed-in review feed. It reads populated retained history, checks original IDs and ordering, and preserves native records and paging on reads. Missing native scope, an unrelated person and the same still-live bearer after native read authority is removed cannot obtain the protected record events or another sponsor's decision events. Own still-readable approval events remain. Every policy mode ends with zero outbound requests in this isolated journey.

## Acceptance and requirement proof

| Item | Result | Proof |
| --- | --- | --- |
| Requirement: typed events for every native change | Retained gap | This slice proves real agent declarations. Native UI event completeness is not implemented here. |
| Requirement: stable ID, type, record URI, actor and time | PASS for observed native events | retainedEvents lines 32–44; populated declarations produce distinct retained IDs and agent-for-person attribution. |
| Requirement: no secrets or unauthorized subscriber data | PASS for selected channel | retainedEvents lines 18–29 and 78–104; exact minimal decision-event fields, missing scope, foreign reader and current native authority removal; native and paging snapshots remain exact. |
| Requirement: three channels | Retained gap | Only events.list is declared. Subscriptions and signed change webhooks remain unshipped. |
| Requirement: retained replay and filtering at delivery | PASS for selected channel | retainedEvents lines 45–50 and 95–103. |
| Acceptance 1: UI notification within ten seconds | Not claimed | Native UI commits do not supply this notification or streaming proof. |
| Acceptance 2: same event ID as webhook | Not claimed | The edition does not carry Base integrations for signed change webhooks. |
| Acceptance 3: cursor replay returns same IDs in order | PASS | ./tests/oncall-agent-events.mjs#retainedEvents, lines 45–50; both company policies, nonempty retained history, exact ordered equality on two replays. |
| Acceptance 4: revoked access | PASS for events.list only | Same journey, lines 86–103; missing native scope and same-bearer native-role removal hide incident IDs, URIs and contents, while own approval events remain readable. The native authority removal applies to all native service reads; no new fine-grained service grant is introduced. Other channels remain held. |
| Acceptance 5: failed webhook visibility and replay | Not claimed | Base integrations and actual webhook delivery are absent from this edition. |
| Acceptance 6: approval.pending | PASS for observed outcome | Same journey, lines 52–63 and 78–84; real held resolution, saved classes and originating decision ID, exact minimal envelope. |
| Acceptance 6: approval.decided | PASS for observed outcome | Same signed-in sponsor approves the exact saved revision and summary; executed state, original classes and decision ID retained. |
| Acceptance 6: review.flagged | PASS for observed outcome | Same journey, lines 64–69 and 78–94; real review appears in the signed-in feed, the person flags it, unrelated people cannot read it. |
| Acceptance 6: policy.adopted | FAIL, Base dependency | ./policy-event-probe.mjs on `0aa680bcde80637ca688881af05ba23b87f7b2cc` exits 1. Both policy modes return sequence and revision but neither classes nor a decision reference, with zero outbound requests. |
| Inherited native authority, audit and paging boundary | PASS for selected channel | Focused journey, existing full agent native flow, native transport and browser journey; current scope and role, attempt audit, erasure, replay and immutable native snapshots retained. Paging remains OFF. |

The Base emitter is `./src/modules/agent-door/index.ts:47`. It emits adoption data containing only seq and revision, with the ordinary event envelope. The strict public-door probe fails with:

> AssertionError: policy.adopted must carry its class and decision; emitted Base events contain neither under either company policy

No Base file is changed. Adding policy fields or altering upstream behavior in the seed would contradict this round's boundary; the remaining dependency is an upstream Base event payload change and its normal approved adoption.

## Verification

- Setup and production build: exit 0, through cloud_run.
- Typecheck and first-party check: exit 0; also repeated by the final hosted verification preparation.
- Runtime lane: its core, bulk and storm journeys passed in the initial full invocation. The core also passed separately in 152.5 seconds.
- Full native agent flow after correction: exit 0, including existing authority, policy, Pause, consent, erasure and revision checks and the new retainedEvents function.
- Browser: exit 0. The complete 40-tool guide inventory matches live MCP under both policies. Guide proof at 1440 and 390 has no page overflow, no serious or critical axe findings and no undersized controls. Horizontal inventory tables remain keyboard scrollable. Images were inspected and are included as guide-1440.png and guide-390.png.
- Required rer verification, existing hosted lane: exit 0 on `0aa680bcde80637ca688881af05ba23b87f7b2cc`. Production serving and hydration pass: four pages and 23 loads. Base conformance passes 8412 of 8412 points, including enabled effect, event-shape, cursor, policy-event-presence and audited-events checks. Its adoption-event check tests presence; it does not establish the class and decision payload required by acceptance 6.
- Final focused replay and authority probe: exit 0 on the final production build and pushed head.
- Final strict adoption-metadata probe: exit 1 on the final pushed head; this is the explicit remaining blocker.
- Contract generator write and check, vendored lock generation and check, and installed lock check: exit 0. Generated contract views were restored from main and are absent from the product diff. CONTRACT.md and all vendored agent-door Base files are byte-identical to main.

An initial full rer verification on `27c5a2b7f35b6e04d56bf4517339a58b77747338` reproduced the stale transport assertion: expected two undeclared tool audit rows, observed one. Events were now declared. The repair preserves exact resource-refusal audit identity and every audit, immutable-record and native-revision invariant, and updates the rendered guide to require the now-available event tool. The redundant count assertion is folded into exact row equality. No security refusal or user flow is removed, skipped or moved behind a new condition. The repaired full agent flow and browser journey pass. The required hosted CLI lane then passes on the final head. No CI workflow was edited, dispatched or rerun.

VERIFY_REPRODUCED {"head":"27c5a2b7f35b6e04d56bf4517339a58b77747338","job":"local application verification, runtime machines","command":"npx -y @runeditrun/rer verify --non-interactive","test":"tests/oncall-agent-transport.mjs#refusalAudit","exit":1,"failure":"Only resource and event refusals enter the tool audit pipeline: 1 !== 2","repair":"Retain exact resource-refusal audit identity and invariants; events are declared and no longer generate a capability refusal. Update rendered inventory to include the live event tool."}

## CI and custody

Exact candidate push Verify: run 43120294053, event push, observed in_progress, conclusion None; head `0aa680bcde80637ca688881af05ba23b87f7b2cc`. URL: https://github.com/just-every/run-oncall/actions/runs/43120294053.
The earlier candidate's run is 43118259411; its last observed status before the final push was in progress. No green result from that head is substituted for the final head. Baseline main Verify 43115851492 and Run site 43115851706 were completed successfully on `2743e71f76044322080b1b136b9dce82c4793915`.

All three product commits were pushed successfully on the named branch. The first save carries skip ci; the final head does not. Candidate authors and committers are the fleet identity, with no co-author trailers. Full Git history is present. No main publication or landing occurred.

Publication scan for `0aa680bcde80637ca688881af05ba23b87f7b2cc`: NOT RUN IN CLOUD; complete=false; historyScanned=unestablished; findings=unestablished. Main equality is false. Candidate Run site is not run here; the baseline main Run site above is historical, not a candidate receipt. The independent fleet retains publication scanning, exact-SHA Verify, landing and Run site gates. This report provides no READY or landing signal.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0
PROBE BASE-AGENT-010 3: emitted MCP cursor replay under both policies -> same retained IDs in order, audited reads, unchanged native and paging records, zero outbound requests.
PROBE BASE-AGENT-010 4: same live bearer after native read authority removal -> no protected incident event identity or content; readable own approval events remain.
PROBE BASE-AGENT-010 6: signed-in approval and review feed -> three typed events retain classes and originating decision IDs; signed policy adoption -> classes and decision reference absent under both policies, strict probe exit 1.
CLAIM BASE-AGENT-010 PARTIAL points=3,4 tests=tests/oncall-agent-events.mjs#retainedEvents
GAP BASE-AGENT-010: acceptance 6 needs Base policy.adopted class and decision metadata. Acceptance 4 is proved only for the planned events.list channel. UI timing, subscriptions, signed webhook identity and failed-webhook replay, complete native event coverage and all existing agent egress and paging holds remain unproved.

## Report return

This packet contains the full plan, proof map, rider checks, actual non-secret receipt files, relevant verifier outputs, the strict failing probe and the changed guide images. It is published separately to the task evidence ref. Product custody and evidence publication remain separate. The clause remains blocked on the named Base dependency even when existing conformance checks pass.
