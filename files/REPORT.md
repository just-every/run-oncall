# sd-oncall-c-f331 · Completed override coverage readback

Product candidate 900509be411168d03ee9f6817b1032c7f7e348bd on `cloud/sd-oncall-c-f331`. Main at the pre-push fetch a88277234a1c53ac983f6df2f90a7a8bd6d684a6. The brief started from d5eb53d4 and the candidate incorporates main's newer overdue-swap work and schedule-update inventory correction. Counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING (101 clauses). BASE-AGENT-003 retains MISSING. The candidate diff preserves the contract source, judgments and generated documents from that main. Paging stayed OFF.

## Plan and results

The plan row for this round targets only the acceptance 4 coverage link returned by a completed primary override on one granted public-service rota. Extend the successful override fixture already reached by `tests/runtime.mjs` through `tests/oncall-agent-flow.mjs`. Use the existing coverage comparator and resource completion helper. Capture the same committed rota with the existing signed-in browser journey, asserting at 1440 and recording at 1440 and 390 for both policies. The plan needs only a result note for this row. All other queue entries and holds carry forward.

The existing scoped client makes the write and follows the URI from its first completed response. The Worker clock is fixed within the active override while reading the native now-and-next endpoint and agent resource. The saved revision, whole rota and current windows match. The primary changes to the override holder, the distinct backup and its rotation window remain identical, and the resource exposes only the two current holders in native order. Held policy withholds the resource pending a separate sponsor approval for the saved read revision and summary. Both policies preserve the original write outcome and receipt, all earlier approval rows, native state and revisions, state-changing audit, and the full paging response. The outbound ledger stays empty.

`tests/agent-door-browser.mjs` visits the actual signed-in rota built by the same fixture, fetches the identical protected now-and-next response at the frozen instant and displays the primary override and distinct backup with their next handover details. It checks the existing Remove cover focus tooltip, text size, layout and accessibility. There are four synthetic-only browser captures in this packet.

PROBE BASE-AGENT-003 4 autonomous: first completed MCP override link and the same scoped agent → native rota revision 3, current primary override and unchanged backup, two scoped holders and zero native or outbound effects.

PROBE BASE-AGENT-003 4 held: first completed MCP override link and the same scoped agent → the same native observations after a distinct saved sponsor read approval, with the original completion and approval preserved.

## Acceptance coverage

| Point | Result in this round | Public proof |
| --- | --- | --- |
| 1 | Held. Complete discovery is outside the selected scope. | Existing template inventory in `tests/oncall-agent-resource-parity.mjs`. |
| 2 | Held. Wider two-role parity is outside the selected scope. | Existing coverage matrix in `tests/oncall-agent-coverage-parity.mjs` continues to compare its populated native fixtures. |
| 3 | Held. Wider missing and out-of-scope equivalence remains separate. | Existing scoped and missing refusals in `tests/oncall-agent-resources.mjs` and the unchanged stale override fixture checks. |
| 4 | Proven for the selected primary schedule override in both policies. Other links remain held. | `tests/oncall-agent-schedule-replay.mjs:225`, `:293`, `:348` and `tests/agent-door-browser.mjs:200`. |
| 5 | Held. Copied Base byte budgets are outside this round. | No claim. |
| 6 | Held. Wider untrusted marker proof remains separate. | The existing coverage matrix still checks the established resource marker. |

Inherited proof and scope boundaries include f325 schedule-create coverage, f322 Communications clear, other launched readback and schedule parity, native revision campaigns, private teams and scoped ownership (OC-023), viewer authority mismatch, lease-free outbox projection, native erasure receipts and copied Base byte budgets. Human follow-up acceptance, broader attribution, BASE-AGENT-006, 008, 010 and 013, SURFACE-003 held attribution, SURFACE-004 held authority and Base seam, ownership under OC-037, OC-044 and OC-054, and agent egress under OC-045, OC-046, OC-048 and OC-049 carry forward. Paging, provider authorization and A2P, delivery and timers, standby, device, real phone and cutover remain held. The fleet owns queue, publication scan, Run site, predecessor and release gates.

## DONE riders and pre-READY checks

| Rider | Result |
| --- | --- |
| 1 | Pass for the selected slice. Wider clause coverage remains held. The browser and first returned URI both reach real saved coverage. |
| 2 | Pass for populated selected records. Primary holder changes and backup is preserved. The held read withholds all content before separately approved read execution. Existing stale, out-of-scope and replay refusals remain in the surrounding fixture. |
| 3 | Exact-SHA push Verify 44944812907 is completed with conclusion success. The existing Verify agents lane invokes `tests/runtime.mjs`; the hosted lane invokes `tests/agent-door-browser.mjs`, per `scripts/verify-shards.json`. |
| 4 | The signed-in browser proof and the shared fixture ran on cacaaf6a3f98a15eeac49e587515cc510474b01c. The final main merge changed only CONTRACT.md, sources.lock.json, so all relevant runtime, browser and test bytes are identical. |
| 5 | The receiving duties and Base citation stay as stated in CONTRACT.md. This round adds evidence for the existing record readback duty. |
| 6 | Pass. Contract document write and check passed, source judgment and narrower round proof remain separate, and the contract views match main. |
| 7 | Pass. The acceptance and ruling text and coverage map have zero candidate diff. |
| 8 | Pass for this scope. The same admitted scoped credential is used from write to read; the exact sponsor-approved saved read and the original write approval remain distinct. Existing authority, erasure and replay tests retain their assertions. |
| 9 | No provider or legal claim. |
| 10 | No new policy default. |
| 11 | Pending fleet landing. Product main, exact main Verify, publication scan and Run site are fleet-controlled. Proof for the earlier main SHA is recorded in the receipt as baseline only. |

One existing runtime journey and one existing browser journey were extended. The comparator refactor retains every assertion, including the native boundary checks. No existing assertion was removed or weakened. No test registration, provider configuration, migration, dependency pin or workflow changed. The selected slice fails if the real completed response stops linking the saved rota or if native readback diverges by revision, holder, backup, approval or side effect. The browser evidence uses the existing rota view and tooltip. The task makes no policy change.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none.

CLAIM BASE-AGENT-003 PARTIAL points=4 tests=tests/oncall-agent-schedule-replay.mjs#overrideCoverageReadback; tests/agent-door-browser.mjs#override-coverage-autonomous; tests/agent-door-browser.mjs#override-coverage-held

GAP BASE-AGENT-003: The selected override link is proven. Other links, complete discovery, two-role parity, broader scoped denial and untrusted markers, team privacy and Base grant-byte limits remain held.
