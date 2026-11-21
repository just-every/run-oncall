# SURFACE-001 schedule-update classification

Run Edit Run fleet, 21 November 2026  
Run tag `sd-oncall-c-f321` · Repository `just-every/run-oncall` · Branch `cloud/sd-oncall-c-f321`  
Base `d0a94b025d5ef864b77485a56c1474ae805c569e` · Candidate `8e3062590f3c796e070bff5f66e6bd820dc39dbd`

## Plan and result

The selected plan row is SURFACE-001 acceptance 1, the `oncall.schedules.update` risk cell. Read the clause, main's judgment, the current schedule implementation, the manifest, the guide, and the existing journeys. Change only the cell and regenerate the source lock. Compare the emitted list and the served guide under both policies with a populated schedule fixture. Run the agent HTTP and browser journeys, check the generated views and source lock, then publish the product candidate and this packet on their respective refs.

`CONTRACT.md:1253` now says `standard (+ sensitive) (+ live)`. The list exposes the same three possible classes, OC-011, OC-024 and OC-077, and `schedules:write`. It advertises a mutating tool with the exact review digest required. The served guide displays the same scope, classes and maintained `schedule-update` fixture per class. Both policy runs read an unchanged populated native installation, immutable permanent mutation-audit rows and identical paging state with paging OFF. The Worker and browser recorded zero outbound requests. Desktop assertions used 1440 px. The attached browser proof also shows the existing scrollable table at 390 px. The phone captures scroll the existing table to show the three class values.

The public-door inventory and custody checks are maintained in `tests/oncall-agent-flow.mjs:1053` and `tests/agent-door-browser.mjs:949`. The focused probe carries the extra row-specific comparison, under both autonomous and held policy. It ran against the same committed candidate using the shared fixture in `tests/agent-door-runtime.mjs:28`. The maintained runtime inventory likewise compares the guide with the list, including all tool classes, scopes and fixture references. Its separate incident-update contract-row probe remains distinct from this observation.

The maintained `scheduleReplay` journey also reaches the existing reviewed apply door. It obtains a native review digest, receives the policy approval, reads the one committed revision, and verifies identical replay, stale evidence refusal, insufficient scope and Pause without another native effect. The local inventory observation itself performs read operations. `tests/oncall-agent-schedule-replay.mjs:7`

PROBE SURFACE-001 1: Emitted MCP tool list and served agent guide under autonomous and held policies → the schedule-update row agreed with the manifest and contract on three possible classes, kept the reviewed digest and scope, and preserved native records, permanent mutation audit and paging OFF with zero outbound requests.

## Acceptance and riders

| Item | Result | Evidence |
| --- | --- | --- |
| Acceptance 1 | Selected schedule-update row observed. Whole point incomplete. | `schedule-update-observations.json`, `tests/oncall-agent-flow.mjs:1053`, and `tests/agent-door-browser.mjs:949`. Other class and Today mismatches and unshipped rows are held. |
| Acceptance 2 | Held. | Complete resource and event coverage remains open. Prompt obligations remain held. |
| Acceptance 3 | Held. | Complete Base conformance under both policies and stranger-agent proof remain open. |
| Rider 1 | Incomplete for the clause. | Populated public-door probe and maintained inventory prove the selected row only. |
| Rider 2 | Pass for the selected row. | The focused probe compares contract to independent emitted metadata and rendered guide, checks the review digest requirement and compares populated native state and mutation-audit records. |
| Rider 3 | See exact candidate CI below. | The existing Verify plan places the runtime and browser journeys in full coverage. The focused observation was run locally on the exact candidate. |
| Rider 4 | Pass for the selected row. | Journeys and browser proof ran with the candidate checked out. The preceding build used the same staged product tree. |
| Rider 5 | Inspected. | `CONTRACT.md:1317` cites BASE-AGENT-001, BASE-AGENT-002, BASE-AGENT-003, BASE-AGENT-010, BASE-AGENT-012 and BASE-AGENT-013. The receiving Base duties remain allocated there. |
| Rider 6 | Views pass. Existing judgment retained. | `node src/base/contract-docs.mjs write` and `check` completed. The preserved main judgment provides the Status, Gap, Evidence and prior provenance. |
| Rider 7 | Inspected. | The diff changes one class cell. The three acceptance sentences and their obligations are intact. |
| Rider 8 | Pass for the selected read probe. | Both policies expose the same write scope and required native digest. Discovery and guide reads preserve authority and native effects. The runtime's revoked-bearer, erased-resource and captured-note checks remain in place. |
| Rider 9 | Held. | Paging OFF was observed. Real delivery, standby, phone and provider proof stay held. |
| Rider 10 | Inspected. | The existing class, scope and review behavior needed no new policy default. |
| Rider 11 | Awaiting guarded landing. | Publication scan, main equality and exact-main Run site remain with the fleet lander. |

No test assertions or fixtures changed. No user interface code changed. The added contract text contains no email-shaped or bare slash-pair token. The source lock is fresh and the packet contains synthetic observations and public guide captures. Main's application behavior and Base pin are preserved.

## Judgment and custody

Before and after both count **26 DONE, 41 PARTIAL, 34 MISSING** across 101 clauses. SURFACE-001 remains **MISSING**. Only the selected slice of acceptance 1 is recorded. The plan row to annotate is the SURFACE-001 entry in replan-92. Predecessor decisions f244, f265, f309, f312 and f317 stay in scope as holds and are not superseded by this observation.

GAP SURFACE-001: The rest of acceptance 1, complete resources and event coverage, and full Base conformance remain held. Other class and Today mismatches, service access and live classification, privacy classification and replay, escalation, triage bulk and saved views, client and endpoint grants, integrations, routing, archive, usage analytics and wider agent tools remain held. OC-023 team privacy, complete resources, events and prompts, BASE-AGENT-006, BASE-AGENT-008, BASE-AGENT-013 and stranger-agent proof, the SURFACE-004 Base seam, copied Base, OC-045, OC-046, OC-048 and OC-049 egress, real paging, standby, phone and release gates retain their prior holds.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

The cloud branch push leaves the fleet's full-history publication scan pending. No scan completion, history coverage or zero findings are asserted. No PR was required for the branch Verify entry point.

## Reproduce the focused observation

The packet includes `schedule-update-probe.mjs`. From the checked-out candidate with the emitted build and dependencies ready, place a copy at `.git/schedule-update-probe.mjs` and run `node .git/schedule-update-probe.mjs` with `ONCALL_POINT_PACKET` pointing to a scratch output directory. The script resolves the seed's native test fixture relative to that location and uses headless Chromium. The runtime and browser journeys were run separately on the candidate with Node 22.20.0. The pre-commit build and typecheck used the same product tree. The initial ad hoc launch from standard input passed its module-mode flag into Miniflare's internal CommonJS worker. Running the probe as an ordinary module file resolved the startup stall.

## Exact candidate verification

Local checks passed on the candidate or on the identical pre-commit product tree. They include the focused observation, agent runtime, browser journey, contract generator, source lock, first-party check, application build, typecheck and run-site build. `CHECKS.json` records the commands, observed exits, exact SHA and browser artifact hashes.

Push Verify [run 44921586130](https://github.com/just-every/run-oncall/actions/runs/44921586130) was `in_progress` at the last permitted poll in the cloud handoff window. Its conclusion was `pending`. The remote cloud branch advertised the candidate SHA. Main still advertised the base, with passing Verify [44916181661](https://github.com/just-every/run-oncall/actions/runs/44916181661) and Run site [44916181647](https://github.com/just-every/run-oncall/actions/runs/44916181647) on that base. Candidate publication scan and Run site await guarded landing.
