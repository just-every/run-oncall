# Source of the 0.5.10 public notes

The comparison is v0.5.9^{commit} 59af2f80bb67eb3382828f5c736698491006254c through main 37299328ad8c7baacfc3d0356aa49316650bb557. Only code already on this green main is described; the candidate itself changes metadata only.

- Move-in wording and support details: src/move-in/review-copy.ts, CompatibilityReview.tsx, CopyDetails.tsx and MoveIn.tsx. Review labels map source fields into readable words and dates, show paused effects and coverage comparison limits, and retain copyable raw details. owner-door.ts and refusals.ts carry named adopted-schedule refusal details.
- Agent triage reads: src/agent-door/triage-tools.ts and read-tools.ts. The read tool scopes incidents, unlinked alert-only rows, events and receipts before filtering, counting and pagination, and binds cursors to current workspace/person/agent/client/consent/service scope. Existing current-authority and company-policy gates remain required. It performs no triage mutation.
- Restore: scripts/installer/archive-policy.mjs and docs/data.md. Receiving staging pauses local agents, clears admission leases and expires pending/executing approvals before publication while retaining proposals and history. Old effects are not replayed when the owner resumes agents.
- Other changes in the comparison are the existing checklist, disclosure and portable-history proofs and an inherited contract judgment. The new public paragraph does not present those tests or internal checks as features or promote their statuses.

The 0.5.9 public paragraph and all earlier CHANGELOG content are retained byte-for-byte after the new paragraph. The same 0.5.10 public paragraph is used in RELEASE.json. Previous upgrade instructions are retained verbatim as the tail of the new patch upgrade path. The dependency pin and all source, test, migration, homepage and contract files match main.

## Actual commits since the published tag

```
3729932 Carry plain move-in review onto current main
3851653 Merge current main and prove erased triage credentials refuse captured cursors
7f9d042 Merge current main into checklist proof candidate
acabbc2 Add service-scoped agent triage reads [skip ci]
6b4689c OC-052 done: its gate passed (lander status flip)
25e6ed0 Prove active source approvals remain unconsumed until portable export
3f323cd Merge current main into paused agent restore proof [skip ci]
f179d01 Merge current checklist landing while preserving full disclosure and refresh proof
3615e5e Remove duplicate limitations proof while retaining default documentation coverage
3147075 Merge current main while preserving US checklist and default limitations proof
98df9d6 Run existing operating-limits browser proof in default Verify journey
4ddbcd0 Retain managed owner authority for existing import refusal checks [skip ci]
093106a Verify resumed native receipt after agent restore
1003d14 Compare complete portable agent history by durable identity [skip ci]
65667f8 Assert inactive native work created by the agent transfer fixture [skip ci]
7d9ce05 Document atomic agent receiving custody for portable restores
fbffe05 Use native owner login for emitted restore custody proof [skip ci]
1ceef44 Update agent custody in restore staging without live-table constraints [skip ci]
1f7a57b Bind transfer network probe to managed installation settings [skip ci]
a4e18ef Pause agent authority before portable restore publication [skip ci]
02ec9fb Preserve predecessor revoked and expired readiness disclosure proof
dc23dd7 Verify refreshed US installation checklist against protected readiness report
bbf58b2 Retain current-session checklist disclosure refusals after main integration [skip ci]
c720156 Verify every installation dependency and capture responsive checklist proof
c5e6948 Prove populated readiness refusals and denied network edge [skip ci]
```

## Actual changed-file summary since that tag

```
 ACCEPTANCE.md                        |  10 +--
 CONTRACT.md                          |   8 +--
 agent-surface.json                   |  44 ++++++++++++
 docs/agents.md                       |   8 ++-
 docs/data.md                         |   2 +
 scripts/installer/archive-policy.mjs |   4 ++
 sources.lock.json                    |  58 ++++++++++------
 src/agent-door/alert-tools.ts        |   4 +-
 src/agent-door/read-tools.ts         |  13 ++++
 src/agent-door/triage-tools.ts       |  54 +++++++++++++++
 src/move-in/CompatibilityReview.tsx  |  14 +++-
 src/move-in/CopyDetails.tsx          |  12 ++++
 src/move-in/MoveIn.tsx               |   8 ++-
 src/move-in/door-client.ts           |   4 +-
 src/move-in/move-in.css              |   4 ++
 src/move-in/owner-door.ts            |   2 +-
 src/move-in/refusals.ts              |   7 +-
 src/move-in/review-copy.ts           |  58 ++++++++++++++++
 tests/agent-door-runtime.mjs         |  16 +++++
 tests/oncall-agent-fixtures.mjs      |  69 +++++++++++++++++++
 tests/oncall-agent-flow.mjs          |   1 +
 tests/oncall-agent-triage.mjs        | 130 +++++++++++++++++++++++++++++++++++
 tests/product-browser-journey.mjs    |  72 +++++++++++++++++++
 tests/product-browser.mjs            |   9 ++-
 tests/readiness.mjs                  |   8 ++-
 tests/transfer.mjs                   | 119 +++++++++++++++++++++++++++++---
 26 files changed, 684 insertions(+), 54 deletions(-)
```
