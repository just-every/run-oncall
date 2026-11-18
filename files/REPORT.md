# sd-oncall-c-f289 · BASE-AGENT-003 declaration readback

Run Edit Run fleet, 2026-11-18 23:18 UTC

- Product branch `cloud/sd-oncall-c-f289` at `278752e5c9b0060e2a589dc2c2b1f0dc58412f0c`.
- First save `643714fe17bad5ec6108f2e2eb6f1c5188f590c1`, pushed with a skip-CI marker.
- Main at candidate reconciliation `e4a617f9217e652b05f655b258bdfd102b16b44c`. Main Verify 44412152106 and Run site 44412152515 passed on `e4a617f9217e652b05f655b258bdfd102b16b44c`.
- The earlier candidate `04347bf1a87f6d6617ca43dbbf04d9c227703bca` had Verify 44410433236 (in_progress, conclusion pending). The final candidate merged main after it picked up the service runbook link observation. The merged contract retains both observations and main’s judgment table.
- Exact candidate Verify 44417255890 (push, queued, conclusion pending). The final REST poll returned queued. The earlier poll returned in progress. Candidate Verify has no terminal conclusion.
- Counts before and after are 26 DONE, 41 PARTIAL, 34 MISSING. BASE-AGENT-003 stays MISSING. The candidate is branch-only. No pull request is needed for branch Verify.

## Plan and outcome

Use the existing alert-to-incident declaration journey from replan-79. Admit two equivalent, initially unlinked alerts for the same service, retain the signed-in native declaration, and follow the link from the first completed MCP declaration under each existing company policy. Reuse the browser's saved-incident inspection at both evidence widths. Reconcile shared files against main, regenerate and check the contract documents, restore the generated views, and regenerate the pinned source lock. Submit the branch for the fleet's guarded landing.

The f281 runtime registration remains the entry point in `tests/runtime.mjs`, with its existing call in `tests/oncall-agent-flow.mjs`. The shared `declareFromAlertParity` fixture follows the wire URI with the same agent and sponsor, using the existing write-only scope for the declaration and read-only scope for the resource. The public MCP and protected HTTP results agree on the complete incident, linked alert ID, copied runbook, revision and declaration attribution. The snapshot preserves the linked native alert and all other native records and revisions, paging, mutation audit, approved actions and executed write custody.

The autonomous policy served the standard read directly without a review. The held policy served the standard read and created one separate open review. The original write result, audit and open review remained intact. Neither policy required a human approval for this standard read. The only new retained read state was the standard MCP decision audit and usage, plus its open review under the held policy. The outbound request ledger was empty and paging stayed OFF. No policy default was introduced.

The existing saved-incident browser journey used the incident returned by the read and showed the declaration, attribution and runbook under both policies. The exact ordered checklist and check state are asserted at 1440 pixels, and the existing 390-pixel inspection and screenshots were retained. No UI implementation or control changed. No test registration or existing assertion was removed.

The declaration implementation persists and returns the link at `src/agent-door/coordination-tools.ts:140–147`. The existing incident resource projects the visible record at `src/agent-door/resources.ts:154–157`. The Base wire adapter emits the successful response's resource link at `src/modules/agent-door/wire.ts:39–43`.

## Acceptance coverage

1. Template discovery. Existing bounded discovery remains. Complete discovery is outside this selected check.
2. Two-role visible-field parity. Existing role checks remain. The retained private-teams, members and public teams, lease-free outbox and independent native erasure comparisons remain open.
3. Missing and out-of-scope equality. Existing scoped refusals remain. Complete target equality remains open.
4. Write-link readback. The selected declaration link passed under both policies through the public MCP door and protected native state. Other write links remain in their existing scope.
5. Byte budget. Grant byte accounting needs unfinished copied Base work.
6. Untrusted markers. Existing covered sources remain. Additional markers stay open.

## DONE riders

1. Partial. The selected declaration readback runs to completion. The other unproved outcomes remain open.
2. Pass for the selected slice. Real admitted alerts, copied runbook and signed-in readback are compared with the emitted result. The expected scope, distinct held review and exact retained write custody are asserted.
3. Exact-SHA Verify status is in the receipt. The existing agents and hosted shards invoke the touched journeys.
4. Local verification provenance is in the receipt.
5. Pass. The evidence sits on the owning Base clause. No receiving clause or inheritance changes.
6. The status, gap, evidence table and counts keep main's judgment. Generation was checked with fresh views. The guarded lander owns view regeneration and status custody.
7. Pass. No acceptance point, ruling, ID map or coverage map changed.
8. Existing scope, denial, revocation, erasure and replay checks are retained. The selected read is scoped to the admitted sponsor and neither mutates nor grants authority. The clause-wide scope gaps remain.
9. No live provider or legal boundary was claimed.
10. No custody, consent, spending or authority default was adopted.
11. Pending guarded landing. The Mac lander owns the exact-head full-history publication scan and Run site receipt.

## Retained holds

Keep BASE-AGENT-003 MISSING. Complete discovery, other write links, broader scope equality and untrusted markers remain held. The viewer authority mismatch for members and public teams, private-team and scoped ownership under OC-023, the complete lease-free outbox projection and independent erasure GET remain open. Grant byte budgets are copied Base work. Hold BASE-AGENT-006 and BASE-AGENT-008, BASE-AGENT-010 f228, BASE-AGENT-013 conformance, SURFACE-003 held-read attribution, human follow-up acceptance, erasure and approval replay, the SURFACE-004 Base seam, OC-037, OC-044 and OC-054 ownership, and OC-045, OC-046, OC-048 and OC-049 agent and AI egress authority. Authorization and A2P, timers, production delivery, standby, devices and real-phone and cutover proof remain excluded, with paging OFF.

For the replan-81 BASE-AGENT-003 row, record only the declaration-link observation under acceptance 4. Keep the other plan entries and their existing holds.

## Receipts

The tested scope enters through `tests/runtime.mjs:140`, `tests/oncall-agent-flow.mjs:655` and `tests/oncall-agent-fixtures.mjs:529`. Readback is compared with the saved browser incident at `tests/agent-door-browser.mjs:146`. Mutation audit, retained write calls, original reviews and paging are checked in the same fixture. The snapshots retain the previously admitted native alert.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none (no migration changed)

The freshly generated views passed the local check. Restoring main's views produced the expected ACCEPTANCE.md difference. The branch retains main's generated views as instructed. The pinned source lock is fresh after restoration. Touched tests, emitted Worker build, typecheck, first-party check and workflow permission validation passed. The exact-head local runtime and browser source provenance are in the receipt. Changed text was checked for email-shaped strings and unexpected repository-like slash tokens. The separate fleet publication scan and exact-main Run site are pending landing.

PROBE BASE-AGENT-003 4 declaration autonomous: first completed MCP write link -> full incident equals the write and protected native state; direct autonomous read; zero approvals, unchanged write outcome and native custody, paging OFF, zero outbound requests
PROBE BASE-AGENT-003 4 declaration held: first completed MCP write link -> full incident equals the write and protected native state; separate open standard read review; zero approvals, unchanged write outcome and native custody, paging OFF, zero outbound requests
PROBE BASE-AGENT-003 4 declaration browser: returned incidents under both policies -> saved declaration, copied runbook and agent attribution shown at 1440 and 390; zero outbound requests

## Shared-file predecessors

Rechecked main and the launched branch tips before reconciliation. Main contains f229 resource authority and note-link coverage at `c4d1659`, f266 mitigating-incident observation at `2a8e7db`, f269 reassignment at `40dc98e` and `c717ab1`, f271 Scribe-clear link at `443c361`, f276 P2 completion link at `9b45b58`, and the f281 native and browser declaration parity carried through `0d1c258`. Main also contains earlier assignee-clear replay at `cda7ea5` and the saved service runbook edit at `321ad8b`. The returned service runbook link from f284 then landed via `d5bb3d0` and generated-view commit `e4a617f`. The final candidate merged those changes and retained both observation paragraphs.

The separate f279 assignee-clear returned-link candidate `f0b38b2ca9669faa3944622cc46f268e1dd1f688` and f286 stale incident resolution candidate `26832cb3a081161a5bce8549795aae5f729670fe` are branch-only by ancestry at the checked main. They keep their own landing order and scope.


CLAIM BASE-AGENT-003 PARTIAL points=4 tests=tests/oncall-agent-fixtures.mjs#declareFromAlertParity; tests/agent-door-browser.mjs#saved declaration inspection

GAP BASE-AGENT-003: Declaration readback is the only newly observed write link. Other links, broader resource coverage and the copied Base grant byte budget remain open.
