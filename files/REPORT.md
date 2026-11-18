# Oncall P2 evidence completion retention

Fleet round sd-oncall-c-f264-lin-1, 2026-11-18 UTC

- Repository: just-every/run-oncall
- Branch: cloud/sd-oncall-c-f264-lin-1
- Base: `ec20de7b42e527cd205b7c42c2dde493948eca7f`
- Feeder: `96f3bf2624da756947ec15fb1977024e0746bb51`
- Candidate: `0f2dd0e8ba15aa28423a09282025134578694ea1`

## Plan and implementation

1. Confirmed the f264 feeder head and the f263 landing on Oncall main. Applied the single feeder patch with `git cherry-pick --no-commit`. Kept main's source lock at the conflict and regenerated it after integrating the test wiring.
2. Registered `agedActionEvidenceRetention` next to f263's immediate evidence replay in the runtime and browser journeys. Main's f263 helper runs two policies internally and exposes only its browser observations. The aged case prepares one completion per isolated Worker through the same native HTTP and MCP doors, keeping the first caller identity and stored outcome available for later comparisons. Both browser cases use the same review and approval assertions.
3. Main advanced from `8215674a456bc19361dd21d224c6dd77e60f3262` with a responder-list contract update. Rebased the unpublished candidate, kept main's contract and checked its generated views, then regenerated and checked the source lock.
4. Built and typechecked the rebased candidate with the repository's Node 22.20.0 and pnpm 10.12.4. Ran the first-party profile, the focused case, the existing shared flow, and the agent browser journey. Verified the contract documents and regenerated source lock against the candidate.
5. Fetched main again, confirmed the single commit’s ancestry, scope and identity, and pushed the named cloud branch through the fleet guard. Read Verify for the exact head through GitHub Actions REST.

## Proof

The aged case advances the test Worker's platform clock to 24 hours and 24 hours plus one second after submission. Both policies renew the signed policy and use fresh short-lived access tokens with the same person, agent, client, consent and scopes. Replay uses the original key and arguments and a new JSON-RPC ID. It recovers the original completed P2 follow-up and, under the held policy, the original executed approval receipt. Native revisions, follow-up and timeline, stored call and expiry, original approval, reviews, paging and state-changing audit stay stable. Each replay adds one linked attempt and triggers zero outbound requests.

The browser exercises the sponsor's original approval under the held policy. It observes the autonomous and held review screens and the original executed approval after the later replay boundary, asserting at 1440 and capturing at 1440 and 390. The browser observes a single approval POST under held policy and zero evidence URL fetches.

## Counts and scope

| Count | Main | Candidate |
| --- | ---: | ---: |
| Done clauses | 26 | 26 |
| Partial clauses | 41 | 41 |
| Missing clauses | 34 | 34 |
| Total clauses | 101 | 101 |
| Scheduled verification entrypoints | 21 | 21 |
| Aged P2 completion case | 0 | 1 |

BASE-AGENT-012 remains missing. The bounded claim grants no full acceptance point. The change is limited to the three leased test files and the regenerated source lock. The candidate contains one ordinary commit. The Mac lander owns the full publication scan and landing.

## Results

The build, typecheck, first-party profile, focused case, shared runtime flow, full agent-browser journey, source-lock check and generated contract check passed on the candidate. All six retained browser captures fit at their intended widths and recorded zero serious or critical accessibility findings and zero undersized measured controls.

Verify 44232903750 completed successfully for the exact candidate at the 2026-11-18T04:03:29Z UTC observation. [Verify run](https://github.com/just-every/run-oncall/actions/runs/44232903750)
