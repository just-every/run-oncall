# Oncall reviewed schedule revision
Run Edit Run fleet · 21 November 2026 · sd-oncall-c-f323

## Plan and scope

1. Read BASE-AGENT-012, the current MISSING judgment, the shipped plan extract and ct riders. Map the existing proof for each acceptance point and take the named acceptance 4 slice.
2. Extend the existing MCP schedule replay journey. Start with a granted rota and a real name-only review. Use a separate native administrator session to advance it, then submit the stale outer revision and old digest without `expected_revision`.
3. Return the authorized native revision after the existing grant and sponsorship checks. Exercise identical opaque refusals for a scope-excluded rota and an absent rota. Refresh the native review at the returned revision, use a fresh key, satisfy the exact sponsor approval under held policy and read back the committed outcome.
4. Recheck override predecessors and the pending create-retention branch. Exercise the existing runtime entry point, capture the saved rota under both policies at 1440 and 390, run the contract generator and first-party checks and refresh the source lock. Push the candidate, verify the exact push SHA and publish the report separately.

The product change is limited to `src/agent-door/schedule-tools.ts:88`. The reviewed apply checks the outer revision after `savedSchedule` resolves current scope and authority. The existing nested revision, digest, override, and replay paths retain their earlier behavior.

## Observations

The focused emitted Worker probe on main's build failed with `{code: 'revision_conflict'}` where the new assertion expected `{code: 'revision_conflict', current_revision: 2}`. Both predecessor override variants passed before that failure. The candidate proved the following with real MCP, protected native HTTP and D1.

- A scoped local client received a populated, name-only review of a name-only edit. A distinct signed-in administrator applied a different native edit, advancing the rota from revision 1 to 2. `tests/oncall-agent-schedule-replay.mjs:116` and `tests/oncall-agent-schedule-replay.mjs:159`.
- Under autonomous and held policies, revision 1 and the stale digest without an optional expected revision returned MCP `isError` and `revision_conflict` with the exact native revision 2 in metadata and text. There was no structured result, approval or receipt, and the scope-excluded and absent rotas returned identical revision-free `not_found`. The refusals preserved native records, permanent state-changing audit, original outcomes, approvals, reviews and paging. Attributed refusal attempts were recorded. `tests/oncall-agent-schedule-replay.mjs:187`.
- A fresh native review bound revision 2 and produced a different digest. A fresh mutation key committed the proposal once in each mode. Held policy kept the edit pending until the signed-in sponsor approved the exact saved approval revision and summary hash, which named the native revision, digest and range. `tests/oncall-agent-schedule-replay.mjs:213`.
- The result was the saved name-only revision 3. The workspace and paging control revisions each advanced once. Exactly one permanent mutation audit identified the scoped client, rota and sponsor. A new RPC id retrieved the stored structured outcome and original held receipt. The durable native receipt retained the before and after schedules, and the application audit retained the fresh review digest. Replay preserved calls, approvals, reviews, paging and native state. Recorded notices kept paging off and no outbound requests were attempted. `tests/oncall-agent-schedule-replay.mjs:254` and `tests/oncall-agent-schedule-replay.mjs:285`.
- The existing protected On call screen rendered the saved rota under both policies at 1440 and 390 pixels. The four captures fit with zero serious or critical Axe findings and zero undersized controls in the existing scan. Browser readback preserved native state and made no outbound requests. `tests/agent-door-browser.mjs:216`.

PROBE BASE-AGENT-012 4 autonomous: MCP reviewed schedule update at native revision 1 with an old digest and omitted expected_revision -> revision_conflict with current_revision 2 in metadata and text, opaque out-of-scope and absent errors, then one autonomous revision 3 and exact replay after native re-review.

PROBE BASE-AGENT-012 4 held: same native revision 1 and omitted expected_revision with the company hold in force -> revision_conflict with current_revision 2 and no approval, then native re-review, a fresh key and one exact sponsor approval yield revision 3 and the original receipt on replay.

## Contract coverage

| Acceptance | Public-door evidence reviewed | Judgment for this round |
| --- | --- | --- |
| 1 | Exact outcome retrieval and one effect in `tests/oncall-agent-schedule-replay.mjs:285`. Existing `agedReplayRetention` is invoked by `tests/oncall-agent-flow.mjs:1002`. | Bounded replay demonstrated. Complete mutator coverage and remaining 24-hour retention variants are held. |
| 2 | Existing `droppedDeclarationReplay` runs via `tests/oncall-agent-flow.mjs:1101` and destroys a real response at headers before retrieval. | Existing bounded proofs preserved. Other response-loss variants remain held. |
| 3 | Existing `changedArgumentConflicts` runs via `tests/oncall-agent-flow.mjs:1108`. Existing schedule receipt tests also check changed arguments. | Existing bounded proofs preserved. Other tools and changed inputs remain held. |
| 4 | `staleReviewedScheduleRevision` uses `tests/oncall-agent-schedule-replay.mjs:69` through `tests/oncall-agent-flow.mjs:1495` and `tests/runtime.mjs:142`. The browser hosts the same helper at `tests/agent-door-browser.mjs:200`. | The selected outer native revision refusal for the reviewed schedule update is proved under both policies. Other stale-revision variants remain held. |
| 5 | Foreign-person job-handle refusal through the status door. | Unproved and held. Tasks-independent long-work custody is also held. |

## Shared files

Main already carries the f274 stale required override diagnostic in e22e1840df3128e88363e5349a6637693678af3f and the f278 stale optional override proof in 2f0d28b79a60291eafdce56660d1c42a76896f61. The focused replay and browser checked those paths. The f320 head f1990cc0bac8219c01998614609cd5275f3c1dde was independently advertised and outside the base's ancestry. Its aged create-retention and browser readback edits overlap the flow and schedule replay files. A read-only three-way merge of each shared file preserved both the f320 retention journey and this round's reviewed-update journey. The existing held create replay on main was exercised by the agent runtime.

The only plan item advanced was the selected BASE-AGENT-012 acceptance 4 slice. The contract judgment stays MISSING. Counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING, 101 total. No inherited or separately held scope was reprioritized.

## DONE riders and pre-READY checks

1. **Gap remains for the clause.** The scoped schedule outcome passed through the public door in the existing replay journey. The five acceptance rows above record its limit.
2. **Pass for this slice.** A populated granted rota can be updated after re-review. Two inaccessible IDs are indistinguishable and make zero native changes. The same assertion failed on the baseline. `tests/oncall-agent-schedule-replay.mjs:187`.
3. **Exact-SHA CI.** See the Verify receipt below. The push plan loads the runtime agents lane and the agent browser lane through `scripts/verify-shards.json`.
4. **Pass.** The local build contained the candidate source. The browser test and schedule helper matched the eventual commit byte for byte. The later flow entry and source lock were checked by the final runtime and lock commands.
5. **Pass.** SURFACE-001 names BASE-AGENT-012 in its citations at `CONTRACT.md:1317`.
6. **Pass mechanically.** The documented generation wrote zero files and both checks passed. Main's MISSING judgment and its provenance remain the fleet's recorded clause judgment.
7. **Pass.** Acceptance text and inherited coverage are identical to the base.
8. **Pass for this slice.** Existing grants and sponsorship gate disclosure. The scoped refusals make no effect, and the held authorized edit commits after exact sponsor approval. `tests/oncall-agent-schedule-replay.mjs:193` and `tests/oncall-agent-schedule-replay.mjs:228`.
9. **Outside this local slice.** The proof uses local coordination. Outbound requests were zero. Provider authorization, actual delivery, standby and real phones remain held.
10. **Pass.** This applies the existing native scope, sponsorship, and company policies. There is no new policy decision.
11. **Lander pending.** The candidate was advertised on its cloud branch, and main was still at its base on the post-push ref check. The fleet owns the complete full-history publication scan, guarded landing, and candidate Run site.

The runtime also passed the existing revocation, demotion, erasure and native replay journeys. The override and creation tests retained their assertions. The browser proof covers existing On call controls. The added-text scan found no email-shaped strings or bare owner-like slash tokens. The packet's four captures were checked for their saved rota headings and screened for addresses.

The independent publication scan is pending for the candidate. Its completion, scanned history and finding count are unobserved here.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none

CLAIM BASE-AGENT-012 PARTIAL points=4 tests=tests/oncall-agent-schedule-replay.mjs#staleReviewedScheduleRevision

GAP BASE-AGENT-012: The selected reviewed-update conflict is covered. Remaining mutating-tool coverage, full 24-hour retention, other dropped-response, changed-argument and stale-revision variants, foreign-person job handles and Tasks-independent long work remain held.

## Candidate and Verify

- Product HEAD `a9433e3d6d1d9c9b6f8ea872d7a247669c08decd` was advertised on `cloud/sd-oncall-c-f323`.
- Verify 44921621036 was a push event on that exact SHA. The last observed status was `completed` with conclusion `success`. [Verify](https://github.com/just-every/run-oncall/actions/runs/44921621036)
- The base SHA was `d0a94b025d5ef864b77485a56c1474ae805c569e`. Its push Verify 44916181661 and Run site 44916181647 both completed successfully.
- Build, typecheck, the agent runtime shard, the agent browser journey, first-party checks, generation and source lock all exited 0. See `receipt.json` for the recorded checks and screenshot hashes.
