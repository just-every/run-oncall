# sd-oncall-c-f222 — OC-017

Recorded 2026-11-11T21:11:55.698260+00:00. Repository: just-every/run-oncall. Branch: cloud/sd-oncall-c-f222. Candidate: `4451720a3e353d18218c03cbd0d75c180e322403`. No PR is required by the push Verify entry point.

## Outcome and scope

OC-017 has no unbuilt native acceptance observation. The pre-existing HTTP export assertion compares the whole exported record directly with the reviewed record. This round documents the proof for both acceptance points in HANDOFF-STAGE.md and refreshes only its source-lock hash. The handoff API, model, every test, workflow, package pin, migration and generated view remain unchanged.

The brief contains an older request to edit Evidence and Gap, followed by the explicit contract one-writer rule. The latter governs: no Status, Gap or Evidence cell was edited. The claim supplies the lander with the corrected evidence and asks it to clear the stale exact-copy Gap when its independent gate accepts.

## Plan and completed work

PLAN.md contains the full ordered plan. Read the inline campaign extract, rulings, builder rules and all DONE riders; read the repository instructions, full target clause, maintained handoff specification, HTTP journey, Worker helper and checkpoint CLI helper. Map existing proof before changing anything; run the current-main changes lane through rer verify; document the existing proof; run the candidate gates and fresh candidate journey; push the guarded named branch; inspect exact-SHA CI; publish the explicit report packet. No other plan row is changed. The next campaign contains no assigned next buildable clause; external and unrelated holds remain intact.

## Counts and claim

Contract counts on base and candidate remain **22 DONE, 45 PARTIAL, 34 MISSING; 101 total**. Proposed lander judgment after acceptance: **23 DONE, 44 PARTIAL, 34 MISSING; 101 total**, OC-017 PARTIAL to DONE, both points 1 and 2. Product assertions and test registrations: no additions, removals or changes. No unproved native OC-017 point was found.

CLAIM OC-017 DONE points=1,2 tests=tests/activation.mjs#OC-016/017: checkpoint consistency, auth exclusion, atomic refusal under invalid/capacity/storage/concurrent writes, winner session, paused jobs and orphans, version 1, empty-target mapping, the 1 MiB aggregate, review identity/eligibility/hold/withdrawal and the private CLI passed; tests/checkpoint-cli.mjs#checkpointCli

## Frozen native rubric

Each acceptance sentence and named inherited safeguard is scored below. Status reflects local execution; the CI column explicitly records the separate candidate Verify evidence.

| ID | Acceptance sentence or retained duty | Door and proof | Local result | Exact-SHA Verify |
| --- | --- | --- | --- | --- |
| A1 | Prepare, review, inspect and export exact copy; change source or revision, withdraw, restore versions 1 and 2 and race writes. | Protected HTTP and real private CLI; tests/activation.mjs:1014-1166; tests/checkpoint-cli.mjs:149-211 | PASS | 43099362981 event=push status=in_progress conclusion=None |
| A2 | Eligibility and holds, stable identities, append-only attribution, every storage bound, no send authority. | Protected HTTP, restored-state readback and CLI; tests/activation.mjs:1050-1150; tests/checkpoint-cli.mjs:105-119,143-211 | PASS | 43099362981 event=push status=in_progress conclusion=None |
| D1 | Explicit audience, immutable payload and incident and service snapshots, canonical hashes. | Prepare, review, export and tampered checkpoint refusal; tests/activation.mjs:1025-1067; tests/checkpoint-cli.mjs:49-55,105-119,149-170 | PASS | 43099362981 event=push status=in_progress conclusion=None |
| D2 | Current responder and administrator mutation authority; viewer inspection; administrator restore. | Current-role HTTP doors; tests/activation.mjs:1015-1018,1051-1062,1099,1130; tests/checkpoint-cli.mjs:163 | PASS | 43099362981 event=push status=in_progress conclusion=None |
| D3 | Exact review never conveys independent-review, recovery, sending or publication authority. | Self-review marker, unsent export, empty outbound ledger, held refusal; tests/activation.mjs:1060-1069,1080-1082,1118-1125; src/family/response-operations/handoffs.ts:296-309 | PASS | 43099362981 event=push status=in_progress conclusion=None |
| D4 | Terminal withdrawal retains attributed append-only history; legacy unreviewed envelope stays unchanged. | Review, legacy export, withdrawal and restored record readback; tests/activation.mjs:1026-1028,1069,1087-1089,1120,1135 | PASS | 43099362981 event=push status=in_progress conclusion=None |
| D5 | All storage bounds preserve prior state on refusal. | 65-record archive refusal, history and byte-bound reviews, aggregate restore refusal; tests/activation.mjs:1131-1150 | PASS | 43099362981 event=push status=in_progress conclusion=None |
| D6 | Atomic snapshots, current password mapping, earlier-session revocation and winning-session protection. | Checkpoint capture, injected SQL failure, competing restore, fresh-target mapping and CLI restore; tests/activation.mjs:1092-1128,1156-1164; tests/checkpoint-cli.mjs:149-211 | PASS | 43099362981 event=push status=in_progress conclusion=None |
| D7 | Erased subject or replayed old capture cannot resurrect records or authority. | Erase, stale archive restore refusal, CLI erasure fence and revoked-session reads; tests/activation.mjs:1246-1250,1364-1365; tests/checkpoint-cli.mjs:216-228 | PASS | 43099362981 event=push status=in_progress conclusion=None |

## DONE riders

| Row | Result | Proof and limits |
| --- | --- | --- |
| 1 | PASS | Both acceptance points have the populated HTTP and CLI observations in A1 and A2; exact-SHA Verify 43099362981 event=push status=in_progress conclusion=None. |
| 2 | PASS | Supported review and export succeed; wrong role, hash, identity, source state, restore authority and capacity refuse. Complete prior-state assertions cover dangerous failures. |
| 3 | PENDING CI | The unchanged changes lane is loaded by push Verify, via scripts/verify-shards.json and tests/verify.mjs. Exact candidate run: 43099362981 event=push status=in_progress conclusion=None. Fresh local candidate run is independently recorded. |
| 4 | PASS | Candidate journey receipt binds the local command to the reported SHA. No source or test byte differs from the fresh main run; implementation-identity.json records hashes. |
| 5 | PASS INSPECTED | OC-017 has no separate Base citation in its meta line. Its own requirement names the recovery, identity, credential and session safeguards; D6 and D7 cover those inherited duties. No new inheritance is claimed. |
| 6 | PASS MECHANICAL; LANDER JUDGMENT PENDING | Generator write and check pass. CONTRACT.md, including Status, Gap and Evidence, is unchanged by explicit one-writer policy. The stale exact-copy Gap is reported for the lander to remove after its gate, not hand-edited. |
| 7 | PASS INSPECTED | No acceptance, clause ID, coverage mapping or ruling changed. No assertion was removed, narrowed, skipped or hidden. No test registration was added or removed. |
| 8 | PASS | Viewer mutations and responder restore refuse; legitimate responder review and administrator restore succeed. Restore revokes prior sessions and preserves winner authority. Audit failure rolls back every handoff lifecycle mutation. |
| 9 | PASS INSPECTED | Only native local unsent handoff behavior is claimed. No provider receipt, account access, legal qualification, independent review or recovery verification is inferred. |
| 10 | PASS INSPECTED | No new privacy, custody, consent, spending or authority default was adopted. Existing explicit-audience and current-role semantics are retained. |
| 11 | PENDING LANDER | Candidate is branch-only. Main equality, full-history publication scanning and resulting main Run site are the guarded Mac lander duties. Current base Verify 43085467285 and Run site 43085467371 are green, but are not candidate landing receipts. |

## Local gates and receipts

Current-main journey: `ONCALL_VERIFY_LANE=changes timeout 1200 npx -y @runeditrun/rer verify`, head `1e8f35e6ec553ed607b812dd6f957aae2b3acce9`, exit `0`.

Candidate journey: `ONCALL_VERIFY_LANE=changes timeout 1200 npx -y @runeditrun/rer verify`, head `4451720a3e353d18218c03cbd0d75c180e322403`, exit `0`.

| Command | Exit | Receipt log |
| --- | ---: | --- |
| `node src/base/contract-docs.mjs write` | 0 | views-write.log |
| `node src/base/contract-docs.mjs check` | 0 | views-check.log |
| `git checkout origin/main -- ACCEPTANCE.md docs/CLAIMS.md` | 0 | restore-views.log |
| `node scripts/edition-authoring/cli.mjs lock` | 0 | lock-write.log |
| `node scripts/edition-authoring/cli.mjs check` | 0 | lock-check.log |
| `pnpm exec rer check --profile first-party` | 0 | first-party.log |
| `pnpm run typecheck` | 0 | typecheck.log |
| `git diff --check` | 0 | diff-check.log |

No migration was changed; migration-ledger check is not applicable. The source lock is regenerated with the documented tool, never hand-edited. Both generated view files are restored from origin/main and excluded from the product commit.

## Runtime probes

PROBE OC-017 1: protected preparation, exact-hash review, viewer inspection and HTTP export; source revision change, terminal withdrawal, checkpoint versions 1 and 2 and concurrent restores -> the reviewed record equals the exported record, source drift and held copy refuse export, history is retained, one restore wins and its session remains valid.

PROBE OC-017 2: stable-ID retries and changed-content conflicts, wrong-role and wrong-hash requests, audit-insert and storage faults, bounded review histories and aggregate restores -> refused operations preserve prior records, valid operations retain attribution and holds, all storage bounds enforce, export remains unsent and unpublished with empty providerActions and an empty outbound ledger.

These probe descriptions refer to the existing activation flow, not a new permanent test. The fresh terminal log and exit receipt establish whether each completed.

## Pre-ready self-check

1. Native behavior has populated public-door assertions; missing and wrong behavior is caught by exact equality, HTTP refusal and complete-state comparisons. Candidate CI is reported separately above.

2. No existing assertion was removed, narrowed, skipped or moved behind a width or branch condition.

3. Restores revoke earlier authority, keep losing restores from revoking the winner, hold imported approvals, and reject erased handoff replay. The activation journey also exercises private-CLI erasure fences.

4. No screen or control changed. Browser screenshots at 1440 and 390, typography and tooltip changes are not applicable to this documentation-only change. The root verify still performs its maintained public-page hydration check.

5. Source lock and local gates are recorded. The candidate is not main; publication scanning, guarded landing and its Run site remain unestablished cloud-side. No new email-shaped fixture or string was added to the product diff. Only real file paths with extensions use slashes in added documentation.

## Publication and custody

Publication scan: commit=4451720a3e353d18218c03cbd0d75c180e322403, complete=false, historyScanned=false, findings=unestablished. A cloud-side publication scanner is not required for the branch push. The maintained Mac lander must run the complete full-history exact-SHA scan and require zero findings before landing. This report makes no scan-success claim.

Branch Verify: 43099362981 event=push status=in_progress conclusion=None. Base Verify 43085467285 and base Run site 43085467371 were completed/success on 1e8f35e6ec553ed607b812dd6f957aae2b3acce9. No candidate Run site or main equality is claimed; main was never pushed.

All actual non-secret receipts remain in this packet. Only explicitly selected regular files are published on the separate evidence ref. Evidence publication is not product READY, landing, acceptance or provider authorization.

## Held boundaries and blockers

No native implementation blocker was found. Slack and Teams account prerequisites, OC-051 Statuspage and Lamp prerequisites, connected submission, synchronization, reminders, publication and provider sends remain outside this clause. Paging stays OFF. No new account, provider, deployment, recovery-verification or independent-review authority is claimed.

