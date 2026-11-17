# Oncall alert and incident owner journeys

Author: sd (Run Edit Run fleet), 17 November 2026. Task: sd-oncall-design-alerts-1. Repository: just-every/run-oncall. Product branch: cloud/sd-oncall-design-alerts-1.

## Plan

1. Read the launcher, seed rules, brand, contract and acceptance source. Configure fleet identity, credential transport and forwarding commit hooks. Run the pinned setup without changing package or release pins.
2. Repeat the baseline through the built Worker and browser at 1440 and 390: Alerts, integration choices, source tests after reload, alert details, recovery requirement and resolved incident actions. Preserve screenshots and a factual baseline receipt outside the product tree.
3. Add a session-authorized no-terminal sample door. Keep provider keys inside the Worker, run source samples through existing receivers, default every send to a fresh alert, expose same-alert addition/recovery deliberately, and preserve receiver refusals and rate limits. Make unavailable email visibly unavailable; move sender commands into Details and copy commands with the required key assignment.
4. Read current service coverage from the same rota resolver as On call. Show primary and backup on alerts and incidents with one-click Take it; retain explicit assignment rather than silently replacing it. Verify paging is off before explaining that responders have not been notified.
5. Add direct Resolve with inline note validation and optional recovery link. Preserve optional mitigation/recovery steps, record recovery at resolution or an entered earlier time, default linked-alert closure on, and provide direct Close alert. Add attributed Reopen with an optional reason and prior-state restoration.
6. Extend existing public journeys for changed controls and preserve sender identity, authenticated intake, rate-limit, timeline and recovery checks. Run the typecheck, touched runtime and browser journeys; capture changed screens at both widths. Regenerate and check sources.lock.json last. Keep generated acceptance views and release metadata unchanged.
7. Publish the first real save and each substantial commit using the push guard after inspecting every candidate identity and trailer. After a published save, merge fresh main only if needed; never rewrite published history. Push the final non-skipped candidate, inspect its exact-SHA Verify with the ten-call/300-second REST limit, publish this explicit report-only packet, then return custody and lane POST lines.

## Baseline

`BEFORE.json` identifies the baseline head and twelve desktop/phone captures. The before fixture did not seed a rota: the old alert/incident code has no current-coverage line, while the after journey explicitly creates and reads a real primary/backup rota. Thus five confusers were directly captured before; D6’s original rota-based reproduction is supplied by the signed brief, with source inspection and after proof here. The baseline had no Alerts test button, a reused source-test key with Recover selected after a trigger, mandatory recovery URL, active linked alert after resolution, and no Reopen action.

## Decisions and truth checks

- D4/D5: session-authorized workspace samples use normal alert admission and service response policy. Integration samples use held encrypted keys and the existing receiver; keys are never returned by the sample endpoint. New test sends generate fresh identities in the Worker. Explicit same-alert actions reuse the selected alert identity. Email and change integration pages offer a workspace alert sample rather than claiming email delivery or a change-provider connection test.
- D6: live primary/backup data comes from `workspaceOnCall`, including shared service rotas. Take it is the brief's permitted alternative to automatic assignment. Paging OFF is established by the seed's health, paging-state and record-only obligation implementation; no sender is added.
- D7/D8: resolution note remains required server-side. Recovery evidence is optional; a malformed supplied URL still refuses without a write. Human closure retains its own attribution and stopped obligation, separate from a sender recovery. Alert lists and navigation count closed coordination records immediately after the confirmed write.
- D9: Reopen is human-authorized and revision-checked. It records the current member and optional reason in the timeline, restores the last open state (ignoring an implicit recovery inserted during direct resolution), and invalidates accepted review status while retaining authored review text.
- 12ui skill was read and its improve command attempted against the baseline alert image. It requested an account connection; no generated design was available. Implementation follows the supplied UX decisions and existing Oncall brand without a wider redesign.

No contract clause claimed; these are owner-journey design fixes (DIRECT 87).

## Results

The former runtime assertion that a missing recovery URL must fail is obsolete under D7. It now proves that a malformed optional URL refuses without changing state, revision or timeline. The owner browser continuation proves successful note-only resolution and required-note refusal. Existing authority, source recovery, attribution, sender identity and rate-limit assertions are retained. Copied sender commands are executed with an empty preconfigured key, proving that the pasted command supplies its own assignment for bearer, signed and compatible senders. No contract status or acceptance prose is changed by this round.

Final checks, exact product provenance, counts and CI receipt are recorded in the final section when complete. The publication scan is performed by the fleet's landing machine; this cloud does not claim to have run that scan.


## Local validation provenance

The complete touched-check sequence passed on 680402aadade887c59a7f0943078b331b2a773e5: typecheck, production build, source/owner browser continuation, response-policy browser regression, runtime core (including archive restore and authority), and source-lock/contract-view checks. `LOCAL-CHECKS.json` is the actual exit receipt. The intermediate candidate b48f59b9d15c7144b6acdf59118e12f142a16c39 changes only two copied-command test arguments and their generated source lock; production code is identical. It is rebuilt and the source/owner journey is rerun with no sender key preconfigured; `COPY-CHECK.json` records that run. Browser assertions use 1440; changed-screen captures use 1440 and 390. The retained earlier timeline fit regression also checks its existing 390 layout.

Verification plan entries: 20 before, 20 after; no new journey registration. Six named UX items are implemented, with zero contract clause status changes. The public API/browser tests retain refusal and rollback coverage instead of asserting fixed prose. The only replaced obsolete assertion was the recovery URL requirement explicitly superseded by D7.


## Product custody

First durable save: 9d45a29f1c8dcc60f6c6138246bd970257688b8b, pushed with `[skip ci]`. Intermediate product candidate: b48f59b9d15c7144b6acdf59118e12f142a16c39, pushed without a skip marker to cloud/sd-oncall-design-alerts-1. `PRODUCT-REF.json` is the actual matching remote-ref receipt. At that earlier publication, main had no missing commits. A later fetch found four SNS commits, integrated by an ordinary merge as required for a published cloud branch; published history was never rewritten. Every candidate author/committer is Run Edit Run fleet <fleet@runeditrun.com>; there are no trailers. No PR was created because the fleet lands the named branch. No default branch, release metadata, tags, repository dependency pins, contract clause or generated contract view was changed.

Superseded-head Verify run discovered: 44099698247, https://github.com/just-every/run-oncall/actions/runs/44099698247. Its observed in-progress states are in `CI-DISCOVERY.json` and `CI-STATUS-2.json`; they are not used as the final candidate gate. The cloud task uses at most ten GitHub calls and a single watcher with at least 300 seconds between reads of this run.

The full Base publication scan is reserved for the landing machine by the cloud instructions. A local added-line credential-pattern check found zero matches; it is not represented as the full publication scan.


## Final integration follow-up

Screenshot review caught that the Reopen action from the menu succeeded but left its dialog open. Commit 2273cab15bb4aa3e0a0c1c168e1835d5eada9160 dismisses that dialog when the incident returns to an open state, and the browser now asserts dismissal before capturing the reopened incident. `REOPEN-CHECK.json` records the passing rebuild, typecheck and full owner continuation.

Fresh main then advanced by four SNS intake commits to 708271f0cbd8bb35ae45a5b402a97faa6197cc1a. The cloud policy requires merging updated main after published saves; merge candidate c1266e19a6a1fee81d9d83908cd06c455dc4d217 retains all of those changes. The sample endpoint explicitly excludes the new SNS provider from its existing service-bound browser sample kinds, consistent with that provider’s routed signed-message flow. Contract generation/write/check ran successfully, both generated views were restored from main, and the source lock was regenerated last. `MERGE-CHECK.json` records the combined candidate’s typecheck, production build and source/owner browser regression.


## Final candidate

The final integrated candidate is c1266e19a6a1fee81d9d83908cd06c455dc4d217 on cloud/sd-oncall-design-alerts-1, with its matching remote in `PRODUCT-REF.json`. Its exact-SHA Verify run is 44102820767, https://github.com/just-every/run-oncall/actions/runs/44102820767. `CI-FINAL-DISCOVERY.json` is the actual discovery receipt. The earlier run 44099698247 belongs to b48f59b9d15c7144b6acdf59118e12f142a16c39 and is superseded; no success on that head is used for READY.

All four candidate commits (including the merge and every side parent outside origin/main) were inspected before the push; author and committer are the fleet identity and every trailer set is empty. The merge retains main’s full SNS changes and regenerated source lock, without changing any contract clause or generated view relative to that main.
