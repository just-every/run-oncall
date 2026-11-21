# OC-068 responder-request custody at resolution

Codex · 21 November 2026 · sd-oncall-c-f327

## Plan and scope

1. Read OC-068, its status row, the campaign extract, the Oncall rulings and the DONE riders. Keep the campaign on the selected acceptance 5 work. Use the existing emitted Worker and signed-in incident journeys.
2. Prepare a manual incident on a service owned by a public team. Retain one accepted, declined, cancelled and pending responder request. Compare the protected incident state, prior timeline, audit, paging snapshot and outbound ledger around resolution.
3. Change the resolution handler in the existing manual-page model. Preserve the primary obligation resolution and close the recorded requester notice. Reopen the existing request history at desktop and phone widths.
4. Run the touching journeys, typecheck and first-party check. Generate and check the contract views, restore the tracked views and regenerate and check the lock. Push the candidate for exact-SHA Verify. Publish this packet on the evidence ref.
5. Keep the plan's OC-068 row held for its remaining scope. Record local progress in that row and retain the other campaign entries.

## Acceptance and inherited duties

| Point or duty | Result |
| --- | --- |
| 1. Support-team responder creates a high-urgency page for Payments and assigns an engineer | Existing local web and HTTP coverage exercises creator, urgency and named responders in `tests/activation.mjs` and `tests/member-coordination-browser.mjs`. Support-team authority and the named cross-team scenario remain held under OC-023. |
| 2. Timed phone notification names the creator | Held under OC-026 and OC-064. It needs authorized voice delivery and a real phone. |
| 3. No acknowledgment escalates and records the assignment outcome | The existing assignment rule is readable and versioned. Automatic repeat and escalation remain held under OC-027. |
| 4. Mobile and scoped API select a policy with one idempotent incident and actual policy paging | Existing scoped retry coverage lives in `tests/runtime.mjs`. Native mobile and actual policy delivery remain held under OC-029, OC-026 and OC-027. |
| 5. Slack responder request has its own page and acknowledgment and decline notifies the requester | Local independent custody at resolution is the selected increment. Slack and Teams commands, actual decline notices and live acknowledgments remain held under OC-067 and OC-081. The recorded local requester notice still closes at resolution. |
| 6. Stakeholder and viewer attempts create nothing | `tests/activation.mjs` exercises both roles against the manual-page and responder-request command doors and compares state. The signed-in viewer also sees the existing refusal. |
| OC-004 incident lifecycle | Both the existing bulk command and the signed-in recovery and resolution preserve primary acknowledgment attribution and complete primary resolution. |
| OC-023 team visibility and OC-053 scoped API | The two local journeys use a public-team service. Scoped API idempotency and team authorization duties keep their existing requirements. |
| OC-026, OC-027, OC-028, OC-029 and OC-064 | The local obligation and notice remain recorded. Provider authorization, A2P, deadlines and escalation, independent standby, real-device and real-phone verification remain held. |
| OC-067 and OC-081 chat | Slack and Teams provider journeys remain held. |
| Cutover and release | Paging remains OFF. The existing pager, predecessor, publication and release gates stay in force. |

## Implementation

The resolution handler changes only pending responder requests to ended and stops their obligations with the resolution outcome. Accepted, declined and cancelled request obligations retain their exact target, actor, action time and outcome. The handler continues to finish primary manual-page obligations and close recorded requester notices.

The product diff covers the existing model, two existing journeys and the corresponding source-lock entries.

## Observed proof

- The emitted Worker from initial main `d0a94b025d5ef864b77485a56c1474ae805c569e` failed the new protected-state equality assertion. Resolution replaced accepted, declined and cancelled obligation outcomes with `Incident resolved`. All three retained outcomes passed with the fix.
- `tests/activation.mjs` at lines 724–811 ran the existing public-service manual-page flow through protected HTTP. Before resolution, the three terminal rows held the original target and response action time and actor. After resolution, their terminal obligations were byte-identical. The pending request alone became ended. The earlier timeline was unchanged, one bulk-resolution entry and one permanent audit identified the resolver, the primary obligations finished, and the recorded decline notice stopped.
- `tests/member-coordination-browser.mjs` at lines 1048–1232 kept the requester-only cancellation proof and then completed the normal recovery and Resolve form. The existing request region showed accepted and declined with Rosa Responder, cancelled with Oncall lead, and ended with the original requester. The resolution timeline retained the human actor and time. The two packet screenshots show all four rows. The request text inherits the 15-pixel application size. The sheet’s Close dialog tooltip was visible on keyboard focus. Incident actions uses the existing tooltip control.
- The protected paging data and paging revision were unchanged. Both Worker probes observed zero outbound requests. The browser communication observer recorded zero external browser requests. Activation also completed existing source revocation, replay and erasure journeys, including old-session and old-checkpoint refusals.
- The build, activation journey, member coordination journey, typecheck and first-party check exited 0. Playwright's local cache check initially required its browser installation. The touched journey then passed with system Chromium. Updating main preserved every source file, the touched tests and toolchain inputs byte-for-byte, so the local proof applies to the pushed content.
- Base main advanced to `82c51561770c1a67ba6e1a3b41752bbabf707007`. Its push Verify 44931991659 and Run site 44931991602 completed successfully. The candidate adds only the custody change, two existing journeys and the regenerated source lock.
- Counts before and after are 26 DONE, 41 PARTIAL, and 34 MISSING, for 101 clauses. OC-068 remains PARTIAL. The plan row for OC-068 gains the local resolution result and keeps the existing hold.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0

## DONE riders

| Rider | Result |
| --- | --- |
| 1 | Partial. The two named journeys prove the local resolution outcome. The provider, channel and team scenarios in the acceptance table remain held. |
| 2 | Local pass. Four populated requests distinguish stopped outcomes. The new HTTP assertion failed against main's emitted Worker when resolution overwrote the terminal outcomes. Existing requester cancellation and role refusals remain exercised. |
| 3 | See the recorded candidate Verify result below. The existing activation and member browser lanes include both touched tests. |
| 4 | The receipt names the candidate and the relevant source and test content. |
| 5 | The receiving clause lists D-2 and D-4 and names the relevant inherited product duties. The change uses the existing human incident command and protected reads. |
| 6 | Local generator write and check passed. The candidate preserves main's judgment, counts and generated views. |
| 7 | Pass. The acceptance text and judgment cells are byte-identical to the base. |
| 8 | Local pass. Existing requester-only cancellation plus viewer and stakeholder refusal run through ordinary doors. Team-manager scope remains held under OC-023. |
| 9 | Held provider and legal boundaries are explicit. Paging remains OFF, with zero outbound requests in the resolution probes. |
| 10 | The existing resolver authority and policy govern the change. |
| 11 | Publication scan, main equality and candidate Run site are fleet landing conditions. The cloud candidate stays on its branch pending the guarded process. |

## Candidate custody and verification

The advertised product candidate is `47a542826f975f4c60137de5d49e921e94c79a8c` on `cloud/sd-oncall-c-f327`. Push Verify 44932439138 completed successfully on that exact SHA. Both touched journeys are part of the configured push lanes. [Verify run](https://github.com/just-every/run-oncall/actions/runs/44932439138)

The fleet owns the candidate’s full-history publication scan, main update and main Run site. The evidence packet contains the local runtime receipt and the two signed-in browser captures.

## Handoff

CLAIM OC-068 PARTIAL points=6 tests=tests/activation.mjs#OC-068 permissions

GAP OC-068: Support-team and per-team permissions, creator-naming phone delivery and timing, automatic repeat and escalation, mobile and actual policy delivery, Slack and Teams paging and acknowledgment, actual decline notices, provider authorization and A2P, standby continuity, and real-device and real-phone proof remain held.
