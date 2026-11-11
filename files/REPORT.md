# sd-oncall-c-f231 — OC-017 reviewed handoffs

Actual local command receipts and exact-SHA CI observations accompany this report. Counts and landing receipts are explicitly distinguished from a builder claim.

The assignment is to finish OC-017 using maintained native proof. The later single-writer rule controls the conflicting earlier request to edit its status cells: this branch preserves all Status, Evidence and Gap cells and all generated views. The lander receives the DONE claim and writes the judgment after its independent gate. No acceptance point is intentionally omitted.

The predecessor documentation commit 4451720a3e353d18218c03cbd0d75c180e322403 was replayed onto current main with fleet identity and active commit hooks. The first real save was pushed with skipped CI. The final documentation identifies the direct reviewed-versus-HTTP-export comparison separately from the private checkpoint CLI comparison and explains that restored approvals remain held. The product change is limited to HANDOFF-STAGE.md and its generated source-lock entry. Neither handoff implementation boundary, any test, the Base pin nor the workflow changes.

## Plan and result scope

The complete actual plan is PLAN.md. Its steps cover setup, predecessor replay, observation mapping, changes-lane runtime proof, mechanical checks, rider review, final synchronization, exact-SHA CI observation and separate evidence publication. The supplied campaign has only OC-017 as an unblocked target touching these files. No plan file was rebuilt or changed. The returned plan-row change is OC-017: native points 1 and 2 proven; proposed PARTIAL to DONE on acceptance by the lander.

## Acceptance rubric

This is one frozen rubric for the round. Each row is bound to the exact candidate by code-provenance.json and command-receipt.json. The maintained activation journey is a single public-door sanity flow, with a private CLI continuation; no per-point test was added.

| Row | Checkable acceptance outcome | Existing public-door proof |
| --- | --- | --- |
| A1 | Acceptance 1, prepare, review, inspect and export exact handoff copy over protected HTTP | tests/activation.mjs:1014–1084 prepares explicit internal copy, denies missing audience and viewer mutations, inspects a populated record as a viewer, refuses prepared-only export and wrong review hashes, reviews as a current responder, and at line 1067 directly deep-compares the exported record with the successful review result. The compared value includes authored payload, immutable incident and service snapshots, hashes, revision and complete attributed history. The packet is unsent, not published, with empty providerActions and an empty outbound ledger. |
| A1b | Acceptance 1, source or revision change and terminal withdrawal | tests/activation.mjs:1059–1090 refuses changed review identity, appends an incident note to change the source revision, refuses stale export, withdraws, refuses another review and compares the entire retained history prefix. Preparation identity replay and changed-copy conflict are at lines 1057–1058. |
| A1c | Acceptance 1, restore versions 1 and 2 and race writes | tests/activation.mjs:1093–1155 reads one consistent three-revision checkpoint, refuses malformed references, excess capacity, bad mapping, storage failure and non-admin restore, preserves complete previous state, races two restores, checks one winner and its valid session, revokes prior sessions, holds active approvals, refuses held export and retains historical identities. It restores version 1 and the separate handoff archive. tests/checkpoint-cli.mjs#checkpointCli runs real CLI versions 2 and 1, compares complete populated HTTP readback, retains current installation cookies, revokes replaced local sessions and races another restore. |
| A2 | Acceptance 2, eligibility and holds, stable action identities and append-only attribution | tests/activation.mjs:1048–1068 and 1085–1134 exercises eligible and ineligible exports, exact hash binding, unchanged preparation retry, changed-content conflicts, self-review attribution, terminal withdrawal and recovery hold. tests/checkpoint-cli.mjs:104–116 and 138–231 compares complete records and retained attributed histories, allowing only the documented appended recovery hold. |
| A2b | Acceptance 2, every storage bound | tests/activation.mjs:1124–1153 refuses 65 records, reserves room for a recovery hold at the 128-entry limit, reaches the 128 KiB record bound before the history bound, and refuses an aggregate above 1 MiB while each individual record remains valid. Refusal comparisons retain the prior archive or all three prior datasets, and the valid bounded records restore. |
| A2c | Acceptance 2, no send authority | tests/activation.mjs:1023–1084 compares paging and automation state, requires empty providerActions, unsent transport, not-published Lamp status and an empty recorded outbound ledger. It follows actual protected source links with and without authority and gets populated authorized records versus anonymous 401 error-only responses. tests/checkpoint-cli.mjs:138–142 refuses restored export and job resume without new effects. |

## Inherited and requirement duties

| Duty | Evidence and boundary |
| --- | --- |
| Current responder and administrator mutation authority; viewer read-only inspection; administrator-only restore | tests/activation.mjs:1048–1064 and 1098–1124 exercises accepted responder mutations, viewer mutation refusals, populated viewer inspection and non-admin restore refusal. Protected Worker routes and current storage authority are used throughout. |
| Recovery, credential and winner-session safeguards | tests/activation.mjs:1093–1135 and tests/checkpoint-cli.mjs#checkpointCli compare complete state under bad input, capacity, injected SQL failure and concurrency, demonstrate prior-session revocation, retain the winning session, and keep restored approvals and jobs inactive. |
| Erasure and replay cannot resurrect authority or data | The same activation journey's existing OC-040 incident, member and change erasure legs and checkpointErasureCli refuse old and forged archives, revoke erased-member credentials, scrub handoff custody and preserve current erasure fences on retry and restore. No receiving Base citation or new inherited obligation is introduced. |
| Existing OC-006 legacy drafts remain unreviewed; OC-034 and OC-051 own connected communication | tests/activation.mjs:1026–1084 proves unchanged unreviewed legacy draft and no outbound action. Native review grants no sending, publication, recovery verification or independent-review authority. Slack, Teams, reminders, synchronization, subscriber delivery and public status publication are outside this clause and are not claimed. |

## DONE-RIDERS review

| Rider | Result at handoff | Evidence or required landing action |
| --- | --- | --- |
| 1 | Local behavioral proof; exact-SHA CI observation recorded below | All acceptance outcomes are exercised by A1 through A2c, including the populated HTTP export comparison. The claim names activation and checkpointCli; the lander updates the stale Evidence cell. |
| 2 | PASS on passing runtime receipt | Populated records and both allowed and unsafe cases are checked. Deep equality compares independent API results, while mutation denials, storage faults and concurrent writes preserve the prior state. |
| 3 | Exact-SHA CI observation recorded below | The candidate push's Verify coverage is reported honestly. The changes lane is also run in this round through pinned rer verify. No earlier-SHA run is passed off as candidate CI. |
| 4 | PASS | code-provenance.json binds runtime and helper blobs to the candidate and current main. Relevant source and tests are unchanged, and the round's runtime receipt names its exact executed head. |
| 5 | PASS, INSPECTED | OC-017 names authority, recovery and no-send duties in its own Requirement and acceptance points. No new Base conformance or receiving inheritance is claimed. |
| 6 | Generation PASS; judgment cells deferred to lander | Contract generator write and check pass. Views are restored whole from origin/main and remain uncommitted. The source Status and Gap are deliberately unchanged under the single-writer instruction; the claim supplies fresh point-by-point proof for the lander. |
| 7 | PASS, INSPECTED | No acceptance sentence, ruling, coverage map, ID or status row changes. |
| 8 | PASS on passing runtime receipt | Responder prepares and reviews, viewer mutation and non-admin restore refuse, storage and audit faults roll back, and only the restore winner retains authority. A1, A1c and A2 carry the public-door details. |
| 9 | PASS, INSPECTED | No provider, device, legal, availability, paging, independent-standby or live-send proof is claimed. Local software storage bounds are exercised without claiming hosted capacity. |
| 10 | PASS, INSPECTED | No policy default or new authority choice was adopted. |
| 11 | PENDING LANDER | Candidate remains branch-only. Main equality, full-history publication scan, exact landed-SHA Verify and Run site are the guarded lander's receipts. No landing is claimed here. |

## Pre-ready self-check

1. The existing public-door journeys reach both native acceptance points, with direct user-visible value comparisons and unsafe-case refusals. The final exact-SHA CI observation is reported below, without equating a local run to GitHub green.
2. No assertion was removed, narrowed, skipped or conditioned. No tests were added or deleted; the test budget is unchanged.
3. Current-role refusals, revoked sessions, restore races, erased-member credentials and old-checkpoint replay fences are covered by the maintained activation and checkpoint CLI journey. No authority or erasure source was changed.
4. No screen or UI control changed. A 1440 and 390 screenshot pass is not applicable to this documentation-only handoff proof map.
5. Source lock and generated-view command results are recorded below. Publication scanning and final main Run site remain with the lander. Changed product text contains no email-shaped value; fixtures are unchanged. Existing synthetic fixture identities elsewhere in the repository were preserved.

## Honest retained boundaries

Connected submission, synchronization, automatic reminders, publication and provider sends remain omitted. Microsoft Teams still needs the unavailable tenant; OC-051 still needs a Statuspage account and its Lamp proof needs a Lamp environment. None is a native OC-017 acceptance point. Review grants no send, publication, independent-review or recovery-verification authority. No homepage, look or logo changed. No real blocker has been identified by the reviewed native observations; final command and CI results below determine the actual handoff status.

## Actual local results and provenance

Candidate branch: cloud/sd-oncall-c-f231.
Candidate head: 05e955fadd58ab162f3fce04d0370efff143d071.
Main at the final fetch: 2743e71f76044322080b1b136b9dce82c4793915. It was already up to date, so no merge was needed.
Executed local journey head: bc58a5da7a8204b54f8bf0c7d08c45f4bd9d94d0. The only subsequent change removes a bare slash label from the documentation and regenerates its lock entry. All runtime, test, script, migration, package, dependency-lock and edition-manifest bytes are identical between that executed head and the candidate; code-provenance.json records the relevant Git blobs. Current main also has the same handoff and journey blobs. The earlier refused predecessor's old run is not used as runtime proof.

The actual command was run through cloud_run with ONCALL_VERIFY_LANE=changes and a 1,200-second timeout: npx -y @runeditrun/rer verify. It completed with exit 0. Its preparation passed 1,398 first-party checks with zero failures, production build and typecheck. The change-context journey took 51.2 seconds, activation took 365.0 seconds and passed all 40 recorded requirement flow groups, including the reviewed handoff and private CLI leg. The built-in hosted-output check, hydration check (4 pages and 23 loads) and agent-door conformance (7,780 of 7,780 points) also passed. changes-verify.log is the actual complete emitted output, and command-receipt.json records the observed results.

Final contract write and check exit 0, with no generated document changes. The generator reports zero errors and warnings. ACCEPTANCE.md and docs/CLAIMS.md were restored from origin/main. Final edition-authoring lock and check exit 0 and cover 1,644 files. Neither generated view is committed. No migration changed, so no migration-ledger command was applicable.

MECHANICAL lock=node scripts/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check, then restore generated views from origin/main exit=0; ledger=none exit=0

PROBE OC-017 1: protected HTTP prepare, inspect, exact review and export; source change and withdrawal; paired checkpoint versions 1 and 2 and private CLI with concurrent restore -> exact reviewed record exported unsent, unsafe transitions refused, complete prior state retained on failure, historical identities retained and one winning restore session survives.
PROBE OC-017 2: repeated and changed action identities, wrong review hashes, source drift, recovery hold, terminal withdrawal and all four storage bounds through handoff and recovery doors -> only matching eligible copy exports, history stays attributed and append-only, bound violations preserve prior data, and providerActions and outbound request ledger stay empty.

Identity review covered every candidate commit and side parent with git log origin/main..HEAD. Both new commits use the fleet author and committer and contain no trailers. Changed product prose contains zero email-shaped values and zero bare slash tokens. The repository is full history. The cloud push guard succeeded on its first attempt for the final head; no force push or default-branch write occurred. The preserved first save is 1fc550c5359abaf620d5adc394fba76c3152317b.

Contract counts are unchanged in this candidate: 23 DONE, 44 PARTIAL, 34 MISSING, total 101. The proposed accepted OC-017 flip would make 24 DONE, 43 PARTIAL, 34 MISSING, total 101. This report claims native OC-017 points 1 and 2 DONE for the guarded lander; it does not count them as landed. All 101 parent Status rows remain. No other clause or plan row changes.

Publication scan: commit=05e955fadd58ab162f3fce04d0370efff143d071 complete=false historyScanned=false findings=unestablished. The scan was not run in cloud, as the adaptation reserves it to the maintained Mac lander. Main equality is false: this candidate is intentionally branch-only. Candidate Run site is not run because that workflow is main-only; the lander must establish it on the resulting exact main SHA. The baseline main's Verify 43115851492 and Run site 43115851706 are completed/success, as recorded by the first REST query; they are not candidate CI proof.

No PR was created or required by this repository's branch Verify entry point. The declared write scope was only just-every/run-oncall. No external adapter, account, provider or other repository was modified. Evidence is published on the separate evidence ref and is never product READY or landing proof by itself.
