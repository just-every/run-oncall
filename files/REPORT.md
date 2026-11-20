# sd-oncall-c-f315 — Oncall parent incident after P1 follow-up submission

Run Edit Run fleet · 20 November 2026

## Scope and plan

The BASE-AGENT-003 row in planner return sd-oncall-replan-89 selected the P1 human-review branch of acceptance 4. The lease reference was 33cafdc7750103f51ac4173c7b52c8dbcf1efbe0. The checkout used main at e13220ee432bc9ac531627b20a92790a0024433f, which contains the lease reference, the f276 P2 completion proof and the f294 creation proof. Replayed f276 anchor 6ef9bc1, f294 anchor 3e278de and landed proof commits 9b45b58 and 1824071 were verified as ancestors. Main status was green at checkout (push Verify 44696528833 and Run site 44696528969).

The execution plan followed the selected row:

1. Read the full clause and status gap, and map the P1 submission and P2 completion journeys to acceptance 4.
2. Extend the existing P1 emitted-Worker journey to use the same resource assertion as P2. Read only the actual URI in the completed response. Verify read authority, exact incident equality and protected state across the read. Save the passing runtime work on the named branch.
3. Extend the existing signed-in review observation with the returned incident's review material, attribution and still-open P1. Observe both widths, keep existing approval and replay assertions, and retain four captures.
4. Record the observed behaviour in the clause body, regenerate and check views locally, restore checked-in views from main, and regenerate and check the source lock last. Finish the product branch and publish this packet separately.

## Acceptance and boundaries

| Acceptance | Result |
| --- | --- |
| 1. Discover every record URI template. | Existing bounded discovery retained. Complete surface discovery remains held. |
| 2. Read the exact UI-visible fields for two roles. | Sponsor state and signed-in review agree for this P1 incident. Wider scoped-role parity, particularly private teams, members and public teams, outbox and the native erasure receipt, remains held. |
| 3. Make out-of-scope and absent reads indistinguishable. | Existing scoped submission refusal exercised by `tests/oncall-agent-action-submit-native-revision.mjs`. Full resource non-disclosure coverage remains held. |
| 4. Read a write's resource link back to the new state. | Selected P1 path passes under both policies in `tests/oncall-agent-action-submit-replay.mjs` (actionSubmitReplay) and its shared `tests/oncall-agent-action-evidence-replay.mjs` helper. The signed-in review in `tests/agent-door-browser.mjs` corroborates the result. P2 completion and P1 creation remain covered. Other write links remain held. |
| 5. Refuse over-budget file bytes without partial content. | Copied Base byte-budget support remains held. |
| 6. Mark customer-sourced text untrusted. | Existing bounded proof retained. Wider marker coverage remains held. |

The selected journey exercises a nonempty native incident with an owned, due-dated P1 human-review follow-up. The autonomous write response and the held write's first completed MCP response each supply a single parent-incident link. The admitted agent reads that URI and gets the full incident at revision 3, identical to both the completed result and the sponsor's protected state. Held read content, including the evidence, is withheld until the sponsor approves the distinct saved read revision and summary digest. The read has its own approval and receipt. Both policies retain the original call, approval and receipt, all native records and revisions, mutation audit and paging. The prior audit is immutable and read audit identifies the same actor and resource. The follow-up submission has evidence and agent attribution, with human acceptance still open. The Worker and scoped browser observation recorded zero outbound requests.

The review's protected material matched the returned revision and follow-up collection. At 1440 and 390, both policies rendered the owner, P1, UTC due date, evidence link, awaiting-acceptance state and attributed timeline. The existing rendered review uses 13px metadata and tooltips on the icon-only Review actions and Close review controls. No UI layout or interaction code changed.

The round changes no existing human-acceptance, erasure or approval-replay guard. Existing BASE-AGENT-006, BASE-AGENT-008, BASE-AGENT-010 and BASE-AGENT-013 gates remain. SURFACE-003 held attribution and SURFACE-004’s ambiguous hold and Base seam remain scoped as before. OC-023 private-team and scoped authority, OC-037, OC-044 and OC-054 ownership, OC-045, OC-046, OC-048 and OC-049 egress, and paging, queue and release gates remain held.

## DONE riders and handoff

| Rider | Result |
| --- | --- |
| 1 | Incomplete for the clause. The selected acceptance 4 journey passes. Points 1–3 and 5–6 and broader write coverage remain held. |
| 2 | Pass for the selected path. Nonempty data, exact wire and native comparison, held content withholding and preserved state are asserted. |
| 3 | Candidate Verify result is in the receipt. The agents and hosted shards invoke the existing journeys. |
| 4 | Pass for the selected path. Local source proof is tied to the candidate's test and runtime bytes. |
| 5 | Pass by inspection. SURFACE-001 still cites BASE-AGENT-003. No duties moved. |
| 6 | Pass locally for regeneration. On the pushed tree the checked-in ACCEPTANCE.md is the main version. The status, gap and evidence cells and all judgment counts remain from main. Exact landing provenance is pending. |
| 7 | Pass by inspection. No acceptance sentence, obligation or coverage map changed. |
| 8 | Pass for the selected path. The admitted agent reads successfully only after the applicable policy checks and the held sponsor's separate saved approval. Existing stale and out-of-scope write refusals remain exercised. |
| 9 | No external provider or legal claim. |
| 10 | No policy default or scope ruling needed. |
| 11 | Pending the guarded lander. Exact candidate main equality, full-history publication scan and candidate Run site are lander gates. |

CLAIM BASE-AGENT-003 PARTIAL points=4 tests=tests/oncall-agent-action-submit-replay.mjs#actionSubmitReplay; tests/agent-door-browser.mjs#P1 submission review

GAP BASE-AGENT-003: Other write links, complete discovery and role parity, absent and scoped-out read parity, untrusted markers beyond current proof, lease-free outbox, independent native erasure receipt and copied Base byte budgets remain held.

The source judgment remains MISSING. Counts remain 26 DONE, 41 PARTIAL and 34 MISSING out of 101. Only the selected plan row advances.

## Candidate and local checks

Product branch cloud/sd-oncall-c-f315 advertises af13461de86da3018e1cc2f2119c73d62d0a6614. The runtime save was 60f913b00109380e2289414caa146f3744791454. The candidate traverses the save and the checked main. Both candidate commits use the fleet identity and have no trailers. The checked-in generated views match main. No migration or workflow changed. No test registration was added.

The local build, Node 22.20.0 typecheck, first-party check, focused P1 and P2 journeys, agent runtime and full agent browser journey passed. The browser matched protected review material against the linked incident before rendering the P1 state. The four selected captures have no overflow, serious or critical accessibility finding, or undersized control. The existing review tooltip keyboard checks ran in the same browser invocation. The suite's merge fixture also passed.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

The checked-in ACCEPTANCE.md intentionally takes main’s version for guarded landing, where the generated view will incorporate the new observation. Local regeneration wrote one view and the check passed. On the checked-in tree the only view difference is ACCEPTANCE.md.

Proof locations and actual command observations are in candidate-receipt.json. Publication scan and exact-candidate Run site are pending the guarded lander.

## Exact-SHA Verify

Push Verify 44700177222 completed for af13461de86da3018e1cc2f2119c73d62d0a6614. The build, all shards, and full-push-proof job 136173301876 succeeded. The runtime agents shard was 136167789467 and the hosted shard with the agent browser was 136167789650. The workflow conclusion was failure from the expected generated ACCEPTANCE.md freshness check alone, observed in contract-docs job 136166483609. The aggregate verify job 136173330722 failed on that dependency; its log records success for build, shards and push proof. These are the generated-view exception for handing the branch to the lander. Both failed job archives were read and the matching excerpts are in the receipt. The publication scan and Run site will apply to the lander's exact candidate.

Verify run https://github.com/just-every/run-oncall/actions/runs/44700177222
