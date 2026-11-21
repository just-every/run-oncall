# sd-oncall-c-f329 · OC-040 local erasure guidance

The selected plan row was OC-040 in Oncall replan 94. The round checked the clause and its existing Gap, followed the published Change erasure guide to the Data custody procedure, and compared the procedure with administrator receipts and existing restore coverage.

The Change erasure guide now names the two separate Settings actions. **Retained change** clears one event and its local copies while the source credential remains available to the administrator through the protected reveal route. **Change integration** is the action for removing a source and its credentials. The guide links directly to the incident, member and integration custody section of Data custody, where readers can find each category’s retained data and configured retention, local receipt semantics and instructions for requesting external deletion. The Change guide retains the bounded capacity and explicit erasure policy.

The emitted Worker browser sweep exercises the same Settings path and follows the link to its exact anchor. It compares the Change guide’s receipt states and action names with the protected response and Settings options. At the destination it verifies category-specific custody and retention alongside the incident deletion count, member credential deletion and integration credential deletion. For all three categories the protected receipts report local `complete` and standby `not-reconciled`. The affected member's recipient entry remains `not-requested`. The guide directs the reader to ask providers and recipients separately, record their responses and contact holders of offline copies. The journey asserts at desktop width with guide captures at 1440 and 390. The four selected captures mask illustrative addresses.

The clause records only this published documentation observation. OC-040 stays PARTIAL. Counts before and after are 26 DONE, 41 PARTIAL and 34 MISSING, for 101 clauses. The Status table, acceptance points, inherited duties and existing failure, send-race, journal and schedule-gap assertions were preserved. Runtime code and paging controls are identical to the branch base.

## Proof and remaining work

- **Selected requirement under acceptance 1.** `tests/product-browser.mjs:743` (changeAndSigningBrowser), especially lines 777–821, 862–870 and 935–984. Settings → Archive produced the protected responses, and the served Change erasure link opened the specified Data custody section. The incident receipt counted one deleted incident, the member receipt counted one deleted password credential, and the integration receipt counted one deleted intake credential. Local completion, standby status and the external recipient entry agreed with the documentation.
- **Existing local refusal and restore evidence under acceptances 1 and 2.** `tests/activation.mjs:1377` (change-event), lines 1427–1516 (incident and integration) and lines 1517–1602 (member). The existing journey exercises authorized erasure, refusal and rollback, integration ID or credential replay refusal, member session revocation, archive and journal checks, and an explicit schedule gap without reassignment. `tests/transfer.mjs:828` (incident, member and integration portability), including lines 844–858, verifies refusal of older and inconsistent archives, the current import’s erased subject state and its preserved fences.
- **Held remainder.** Acceptance 1 still needs standby and external-copy closure. Acceptance 2 still needs an all-sites success gate. Standby reconciliation belongs to OC-028. Linked Auth owner erasure, actual recipient or provider deletion, offline copy deletion, uncertain external outcomes, automatic expiry and additional categories remain outside this round. No policy default was needed.

PROBE OC-040 1: Settings → Archive synthetic change, incident, integration and member receipt readback and Change erasure guide link -> distinct event and source actions, the source credential retained for single-event erasure, Data custody anchor reached with category and configured retention detail, local complete and standby not-reconciled, and the member's external recipient deletion not-requested.

## Applicable riders

| Rider | Result |
| --- | --- |
| 1 | Selected documentation behavior exercised through served guides and administrator HTTP receipts in the existing Settings sweep. The full acceptance outcomes remain partial. |
| 2 | Populated local scenarios and meaningful results. The preserved activation and transfer journeys exercise allowed and refused erasure and restore. |
| 3 | The push plan includes the Settings sweep, activation and transfer lanes. The verification receipt records the Actions run observed for the exact candidate. |
| 4 | Browser, activation and transfer checks were scheduled from the committed candidate. The verification receipt records actual exits. |
| 5 | The Base duties remain cited in the clause. This round adds no inheritance claim. |
| 6 | Document write and check passed locally. The lander owns generated views and the Status judgment. |
| 7 | Acceptance text and Status cells match main byte for byte. |
| 8 | The existing activation journeys preserve administrator, linked-owner and stale or failed write refusals. The browser proof uses a real administrator session and protected responses. |
| 9 | The guide distinguishes local completion, unreconciled standby and separately requested external deletion. Remote deletion and legal custody outcomes stay open. |
| 10 | Existing policy applies. No new policy was adopted. |
| 11 | The guarded lander owns exact-main equality, the complete publication scan and the candidate’s main-only Run site. |

The pre-publication diff check found no added email values or GitHub references. Existing desktop overflow, axe and hydration checks passed in the Settings sweep. The touched guide content uses the existing typography and labelled text link and introduces no icon-only controls or layout changes. The local generated-view check passed with the generated output present. The tracked views were restored from main and the source lock was generated and checked afterward.

The first main update created a temporary local autostash before the repository hook was installed. The fleet hook was active for the published commit, and candidate history inspection found one fleet-authored and fleet-committed commit with no trailers.

PROBE OC-040 2: rer import of the older installation archive with the later erasure journal -> exit 4 and empty target tables. Current archive import -> the incident and integration remain absent, the member remains anonymous and the retained erasure fences match.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none

CLAIM OC-040 PARTIAL points=none tests=tests/product-browser.mjs#changeAndSigningBrowser; tests/activation.mjs#activation; tests/transfer.mjs#managed installation transfer

GAP OC-040: OC-028 standby reconciliation, external-copy closure and all-sites custody success remain held. Linked Auth owner erasure, provider and recipient deletion, offline copies, unclear external outcomes, automatic expiry and additional categories stay outside this slice.

## Candidate custody and CI

The product push advertised `cloud/sd-oncall-c-f329` at `ffe8f4820deb0da19e3dd216c1eeffe027830000`, based on `513ec690f92432d5e78f67c1f23374d56954ddf7`. The pinned Node build, Settings browser sweep, activation, transfer, typecheck and first-party check all exited 0. Base Verify 44942410761 and base Run site 44942410760 completed successfully.

Exact-SHA push Verify 44943535818 completed with a failure conclusion. Build, every shard and full-push-proof passed. Job 136965827365 failed its only check, generated contract documents. The exact committed tree reproduced that command locally with 0 prose errors and only the expected `ACCEPTANCE.md: generated content differs; run contract-docs write.` The generated view passed locally after regeneration. Job 136970301564’s archive showed a successful build and shards, with its coverage guard failing on the contract-docs dependency. The brief’s generated-view exception applies. The guarded lander still owns the publication scan, regenerated views and the candidate’s main-only Run site.

`gh run view 44943535818 --repo just-every/run-oncall --job 136965827365 --log-failed` exited 1 with `failed to get run log: zip: not a valid zip file`. The command supplied no HTTP status. The job metadata and exact local reproduction identify the failed generator step.
