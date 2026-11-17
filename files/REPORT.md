# Oncall alert and incident owner journeys

Author: sd (Run Edit Run fleet), 17 November 2026. Task: sd-oncall-design-alerts-1. Repository: just-every/run-oncall.

Product branch: cloud/sd-oncall-design-alerts-1. Product head: 467a003cbfba15bb1f8e297d734e90d27faf6bd1. Integrated main: 09f2821d713460dcd33d0878dc3a7825daccfc5a. Report updated: 2026-11-17T15:57:10.916850+00:00.

## Plan and completed implementation

1. Read launcher and seed instructions, brand, contract and acceptance source; configure fleet identities, bundle-backed Git transport and forwarding commit hooks; run pinned setup without changing dependency or release pins.
2. Capture the former Alerts, integration choices, source test, recovery and resolved screens through the built app at 1440 and 390. Keep non-secret receipts and screenshots outside the product checkout.
3. D4/D5: add Send a test alert to Alerts and created integrations, default to the first service, keep private source keys inside the Worker, use normal intake and response policy, generate a fresh alert identity for every send, and offer deliberate same-alert addition/closure under More options. Name the actual outcome with an alert link. Explain the sample beside the button. Disable Email without a receiving domain and put executable sender commands in Details.
4. D6: read primary and backup from the live service rota, including shared rotas. Show them on alerts and incidents with Take it, the brief's allowed alternative to silently assigning someone. Preserve existing explicit assignments. Explain the verified paging-off state.
5. D7/D8: offer Resolve directly with an inline-required one-line note, optional link and optional earlier recovery time. Keep Mitigating and Recovered as optional steps. Record recovery at resolution when needed. Default Close the alert too on, refresh list/nav counts, and provide direct Close alert independently.
6. D9: offer Reopen as a button and in Incident actions, accept an optional reason, attribute it in the timeline and restore the previous open state. Dismiss the dialog after success. Retain authored review text and invalidate its old acceptance.
7. Extend existing public API/browser journeys, preserve authority, malformed-input, rollback, intake identity/rate-limit and archive assertions; typecheck, build and run affected journeys. Capture changed screens at both widths. Regenerate/check sources.lock.json last. Inspect every candidate commit's identity and trailers, push only the named branch, observe exact-SHA CI within the ten-call budget, publish this separate report packet and return custody.

## Before and after

Six named design items are implemented. The verification plan has 20 entries before and 20 after, with zero new registrations. No contract clause or status changes. No release metadata, package pin, tag, PR, default-branch write or generated contract view changes.

The initial twelve baseline screenshots in BEFORE.json directly reproduced five confusers: no Alerts sample button, reused key/Recover default after a source sample, mandatory recovery URL, linked alert remaining active after resolution, and no Reopen action. That fixture did not seed a rota. BEFORE-D6.json completes the sixth before walk on the original fb54c79d904d66342f166910d64996aa399bddf9 build: a real primary/backup rota is visible on On call and returned by its protected API, while its alert and incident omit the coverage and the incident remains unassigned. Six companion captures cover On call, alert and incident at 1440 and 390. All six named confusers therefore have direct before evidence and passing after journeys. No baseline UI is mocked or modified. The first supplemental fixture assumed the native sender receipt contained an alert ID; that receipt correctly withholds workspace records. The final probe uses an authorized workspace read to find the admitted alert, and its completed receipt is separate from the retained first attempt.

Changed-screen assertions run at 1440; selected screens are captured at 1440 and 390. The 68 explicitly selected PNGs include baseline, source setup/accepted/refused samples, alert ownership, Resolve and Reopen. Existing phone layout/overflow checks are retained. Private key pixels are masked; fixtures use synthetic people and services.

## Behavior and truth checks

Workspace samples go through normal domain admission. Integration samples decrypt held keys inside the Worker and use existing authenticated receivers; the sample endpoint never returns those keys. Explicit add/close samples reuse a chosen active alert; ordinary sends always receive a fresh identity. Service-bound compatible sender commands and bearer/signed examples are copied and executed with no preconfigured source key, proving they work as pasted. Email/change pages offer an honest workspace sample rather than claiming external delivery or connection proof.

On-call names come from workspaceOnCall and the same scheduling data shown by On call. Paging OFF is verified through product health, paging-state and record-only obligations; the journey records zero outbound sends. No pager is implemented by this change. Outside this lease, the separate routed sender setup retains its existing terminal-key instructions; no new claim is made for that workflow. Source recovery remains distinct from a human alert closure. Machine incident resolution retains the existing source-driven alert lifecycle rather than forging a human-only alert history record.

A resolution summary remains required server-side. A supplied malformed URL still refuses without changing revision, state or history; the former required-URL refusal was superseded by D7. An omitted optional URL preserves a responder's earlier recovery link and immutable lifecycle evidence. Note-only recovery/resolution also passes archive validation. Reopen is revision-checked, human-authorized and attributed; an implicit recovery inserted at resolution does not replace the true previous open state.

The required 12ui skill was read and an improvement call was attempted using the baseline image. The tool requested an account connection, so no generated design was available. The implementation follows the supplied UX decisions and existing brand. The full Base publication scan belongs to the fleet landing machine and is not claimed here. Local added-line and selected-packet credential-pattern checks found no matches.

No contract clause claimed; these are owner-journey design fixes (DIRECT 87).

## Validation and exact provenance

Actual exit receipts distinguish code heads and never borrow a green result from another SHA:

- LOCAL-CHECKS.json: the initial touched sequence passed on 680402aadade887c59a7f0943078b331b2a773e5 (typecheck, build, source/owner and response-policy browser journeys, runtime core including archive/authority, lock and contract checks).
- COPY-CHECK.json: the published b48f59b9d15c7144b6acdf59118e12f142a16c39 was rebuilt and source/owner samples rerun with no sender key preconfigured.
- REOPEN-CHECK.json: 2273cab15bb4aa3e0a0c1c168e1835d5eada9160 passed the owner journey including menu-dialog dismissal.
- MERGE-CHECK.json: c1266e19a6a1fee81d9d83908cd06c455dc4d217 combined current SNS main changes and passed typecheck/build/source/owner checks.
- CI-REPAIR-CHECK.json: actual local repair sequence for focused source/owner browser, settings browser, response-policy HTTP and native transfer, with its exact code head and exit. The storm-selected triage check passed on 723a754b0f66acd2e916a8c14c19d3abf02ff87a.
- FINAL-CHECKS.json: the final integrated head's selected affected checks, lock/contract results and real exit status. Raw unrelated runtime describe/register output is excluded from this public packet.

An exploratory all-triage run was stopped after entering the unrelated 1,500-alert bound scenario and is not counted as a passing run. An earlier optional automation smoke was stopped and is not counted as proof. The environment restart interrupted one final source run before completion; ENVIRONMENT-INTERRUPTION.json records it, and it was rerun rather than counted as success. No original user-visible guard was deleted or skipped; obsolete fixed wording/selectors were updated while preserving their behavioral assertions. The response-policy browser now closes its deliberate invalid Resolve dialog before the next journey navigates. Local attempt receipts also retain a new client fixture refusal before policy selection (corrected through the existing public policy fixture), and an immediate row-count probe before Alerts navigation hydrated (corrected by waiting for the same recovered row, with every behavioral assertion retained).

## CI and publication custody

The first real save 9d45a29f1c8dcc60f6c6138246bd970257688b8b was published with [skip ci]. Every substantial candidate was preserved on the named branch. Published history was never rebased or force pushed. Fresh main was integrated with ordinary merges, as required by the cloud instructions. All candidate authors and committers are Run Edit Run fleet <fleet@runeditrun.com>; trailer sets are empty. Product evidence is kept out of the product tree.

Run 44099698247 belongs to the superseded b48f59b9d15c7144b6acdf59118e12f142a16c39 and was observed running. Run 44102820767, https://github.com/just-every/run-oncall/actions/runs/44102820767, completed failure on c1266e19a6a1fee81d9d83908cd06c455dc4d217. Build, contract documents, triage, intake, changes and agents succeeded; runtime, browser, hosted and transfer failed, followed by the aggregate Verify job. CI-FINAL-STATUS-6.json and CI-FAILED-JOBS.json are the actual observations.

Repairs address every observed failed assertion: replace the obsolete missing-link refusal with malformed optional-link refusal while retaining required summary; match the displayed alert state without weakening routing/obligation checks; restore unchanged change-event clipboard equality after an accidental broader selector; add explicit .ts suffixes to the new domain imports so the native archive policy loader and rer export work. CI-FINDINGS.json and failed-log receipts identify the job IDs and retrievals. Runtime, browser and hosted archives were each requested once after completion; transfer logs were read from that same downloaded cache without an extra API call. No raw archive, signed download URL or environment dump is published.

The ten-call GitHub budget is exhausted. The final corrected head is PUSHED pending its own exact-SHA Verify; there is no READY or green-CI claim for it. PRODUCT-REF.json records matching remote product custody. The evidence manifest binds this packet to that product head. Evidence publication is report transport, not acceptance or landing. No PR was opened; the fleet lands the named branch after its independent gates and publication scan.
