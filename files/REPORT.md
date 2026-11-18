# Oncall OC-050 native role refusal

Run Edit Run fleet, 18 November 2026. Fleet run sd-oncall-c-f287.

## Plan and scope

1. Read OC-050 and its Status row on main. Preserve the existing browser journey for Lead transfer and Scribe and Communications assignment and transfer. The plan row from sd-oncall-replan-81 calls for the unauthorized native role mutation in acceptance 2.
2. Extend the emitted Worker storm journey in `tests/triage.mjs`. Reuse the signed-in viewer and acknowledged incident, then submit the current revision and a different active responder through the public native command. Compare protected state and paging, attribute the single refusal in D1, and run the identical request as the authorized responder.
3. Run the touched journey, first-party check, typecheck and production build. Recheck main and retain its shared-file updates. Regenerate the contract views, restore the main versions, and refresh and check the source lock.
4. Push the save and landing candidate on the task branch. Record exact-SHA Verify and attach this packet to the candidate on the evidence branch. Guarded landing, full-history publication scanning and Run site belong to the fleet lander.

## Observed result

PROBE OC-050 2: POST `/api/command` with `assign-role`, the acknowledged incident's current revision, a populated Communications role and a different active responder, using the signed-in viewer session -> 403. D1 added exactly one `command.assign-role` refusal attributed to the viewer and incident. Protected state readback and paging were equal before and after, including the role, timeline, workspace and incident revisions. The Worker attempted zero outbound requests. The authorized responder then used the identical payload successfully.

The existing `storm` journey asserts the refusal and the authorized comparison. `incidentRolesBrowser` retains the landed native transfer and administrator-boundary evidence at 1440 and 390 pixels. No browser or production source changes were needed, and this run reused the landed browser proof. The existing boundaries in `src/api.ts`, `src/family/response-operations/incident-controls.ts` and `src/audit-request.ts` already handled the request and attribution.

The starting main was 82a4b02d2be3a0031afbeb08bca7ccdd25cc5a72, with Verify 44401376636 and Run site 44401376569 completed successfully. Main then advanced through the OC-060 explicit unassignment work to f585355904fed9ce76c09b128f16e45c9051b497. The shared `tests/triage.mjs` additions traveled with that main update. The task patch applied cleanly in the storm section and preserved the new bulk fixture. The browser journey retains the original role-transfer proof from 6ad2161d98d31cfd22d956b7d07618ec213b2744 and the later Lead acknowledgment proof from bb04c4bb7bb5ed8f0962325daf8a5d79d440452c. The new base had Verify 44405167937 and Run site 44405167651 completed successfully.

Before and after, the contract lists 26 DONE, 41 PARTIAL and 34 MISSING across 101 clauses. OC-050 stays PARTIAL. Its dated observation is the only contract text change. The acceptance sentences and Status table were compared byte for byte. The test count is unchanged because the new assertions run inside an existing journey.

CLAIM OC-050 PARTIAL points=2 tests=tests/triage.mjs#storm

The claim lists the selected refusal within acceptance 2.

GAP OC-050: Chat assignment and transfer require OC-034 and OC-067. Backup responder delivery requires OC-068 and OC-026. Stakeholder update cadence and browser-closed reminders for unfilled roles, stalled actions and overdue updates require OC-027. Broader eligible-alert orchestration and team mobilization remain with OC-043, OC-056 and OC-023. Paging stays OFF pending authorization, production delivery, independent standby, devices, real-phone and release prerequisites.

## Riders and handoff

| Rider | Result |
| --- | --- |
| 1, public outcomes | The selected viewer role refusal passed. The acceptance sentences retain the held outcomes above. |
| 2, seeded and two-sided | A populated acknowledged incident, an active replacement responder and one unchanged transfer payload exercise both principals. |
| 3, exact-SHA Verify | The runtime lane selects `tests/triage.mjs` with `ONCALL_TRIAGE_PART=storm`. See the CI receipt below. |
| 4, current proof | The candidate's production build and storm journey were checked locally. |
| 5, inheritance | OC-050 retains D-2 and D-4 and its existing cross-clause obligations. No new inheritance is claimed. |
| 6, contract metadata | Regenerated views checked successfully. Main's Status, Gap, Evidence and judgment provenance are preserved. The lander regenerates the views on landing. |
| 7, acceptance text | Both acceptance sentences are unchanged. |
| 8, authority | Signed-in viewer returned 403 with one attributed refusal and no change to protected state, paging or outbound traffic. Authorized transfer succeeded. |
| 9, provider proof | The probe uses the emitted Worker with an outbound ledger. Production paging, connected chat, standby, devices and real-phone proof remain held. |
| 10, policy | Existing authority rules supplied the result. No new default was needed. |
| 11, landing | Main equality, the complete publication scan and candidate Run site belong to the guarded lander. |

Existing assertions remained in place. Existing expiry, revocation and replay probes in the storm journey ran with the selected case. Erasure and UI were outside the changed path. Generated files were checked locally and the branch carries the versions from main as required.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

## Exact candidate and Verify

The pushed save is 814539d7129b072d42175f8a41043b26a3bdbe5f. The candidate on `cloud/sd-oncall-c-f287` is d13b0bebb2f2f4ab8d4146f3f9c066c5005164f3. The runtime fixture begins at `tests/triage.mjs:579`. The candidate's pinned Node production build, first-party check, typecheck and storm journey exited zero.

Push Verify 44406203025 completed on that exact SHA. Build, all eight test shards and full-push-proof passed. The runtime shard that runs the refusal is 135163346603. The browser shard is 135163346613. The workflow conclusion is failure because contract-docs job 135162172896 checks the generated views on the branch, and the dependent final guard 135171004815 requires that job. The exact pushed checkout reproduced the generated `ACCEPTANCE.md` freshness difference locally. Generation followed by its check passed before restoring the main views. This meets the brief's generated-view exception for READY.

Candidate Run site, main equality and the publication scan remain pending guarded landing. The product branch and save were pushed directly and no pull request was needed.

[Verify 44406203025](https://github.com/just-every/run-oncall/actions/runs/44406203025)
