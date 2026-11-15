# sd-oncall-run1-faults-2

Repository: just-every/run-oncall
Branch: cloud/sd-oncall-run1-faults-2

## Plan

1. Configure fleet identity, injected-bundle Git helper, guarded push, and commit-message hook; clone the declared repository without shallow history and preserve current main.
2. Reproduce all four defects against an emitted local Worker with synthetic people, services, an alert source and a rota; observe the screens at 1440 and 390 and retain non-secret observations.
3. Add encrypted key readback custody and a current-admin, non-cacheable reveal action whose audit commits before the key response. Keep rotation/revocation and ordinary reads redacted. Retain held digest-only keys unchanged and explain that their first rotation enables readback.
4. Expose each person's recorded contacts and notification rules on their team record. Permit self/admin changes with revision checks; keep other members read-only and paging OFF.
5. Retain PagerDuty service-to-policy source references on one policy; explicitly adopt several existing workspace services against one native rota and policy, with atomic rollback and source revision/authority fences. Preserve all existing import refusals, inactive custody and assertions.
6. Add bounded two-week schedule history navigation, including retained past overrides. Keep historical coverage described as evaluation of the saved rota, rather than a reconstruction of every past revision.
7. Extend the existing browser journey, run affected checks and typecheck, inspect changed screens at both widths, regenerate/check the source lock, audit all candidate identities/trailers and push the named cloud branch through the guard.
8. Discover and monitor exact-SHA Verify using REST within the ten-call budget. Publish this report, actual receipts, and non-secret screenshots only to the evidence branch and return provenance/POST lines.

## Baseline

Main contract totals: Core 25 DONE / 35 PARTIAL / 24 MISSING; Agent surface 1 / 6 / 10; Full target 26 / 41 / 34 (101). No Status, Gap or Evidence cells will change; no DONE claim or gate claim is made.

The initial public-door reproduction is in reproduction.json. The source page had no reveal action, the team page exposed neither recorded contacts nor rules, policy creation refused a second service against the same rota with `Policy schedule/service mapping invalid`, and the rota page exposed no previous-page control. Six baseline screenshots cover the three changed screen families at 1440 and 390. The synthetic Worker observed zero outbound requests.

## Constraints and limits

No business harness, hosted instance, platform pin, release metadata, production account, main branch or PR is changed. One additive migration is strictly needed for encrypted key readback: it adds nullable ciphertext fields and preserves existing digests, signed custody and identities. Previously held digest-only secrets are mathematically unrecoverable and require one owner-controlled rotation; no old credential is silently invalidated.

All report material is synthetic. Key inputs are masked in retained browser proof; no credential, environment dump, or private gate material belongs in this packet. Product changes and report transport remain separate.

## Results

All four reported defects are fixed in the candidate and pass the focused emitted-Worker/browser regression. Product head: `d8357c8e671651b9e2f2021eaf32d705a3360fd0`. Intermediate save: `335c4610dd0b5774d6bd5ea1a59cbd1adcf1e540`. All four product pushes succeeded on their first guarded attempt. Main remains `b30412d15c5049718e9b19d307cfb3348e08079c`; no merge/rewrite or PR was needed.

### Behavior and before/after observations

- Key readback: no reveal endpoint/control before; now the current admin can repeatedly view/copy the same native bearer/signed, compatible, change or routed source key. Reads are non-cacheable and commit permanent audit before returning the key. Anonymous, expired, revoked, viewer and responder requests are refused. Audit-storage failure returns no key. Keys are encrypted at rest, excluded from ordinary state/archive/audit and masked in retained screenshots. An outside HTTP sender successfully uses a revealed key; rotation invalidates the previous one. Revocation and admin changes clear displayed credentials.
- Person records: no contacts/rules display before; now each team member's card exposes recorded email/phone/SMS destinations and rule contact, urgency and delay. Self and admin edits use the existing revisioned API; other members read only. Stakeholders remain excluded. These settings are unverified records, with no sender.
- Sharing: the baseline native policy door rejected the second service's use of a rota with HTTP 400. PagerDuty policy mapping now retains both source-service references on one imported policy. The test imports one policy and one rota, then explicitly adopts two workspace service bindings into one native policy and one native rota. Both services' accepted alerts use that rota. Invalid/missing/stale mappings and an injected policy-storage failure publish no rota/policy. A one-step source policy completes after step 1 without inventing a second notification. Existing unsupported repeats and different-rota adoption targets remain refused/paused.
- Past coverage: no previous-page control before; now the rota page moves backward/forward in 14-day windows, showing previous resolved shifts and overlapping retained cover overrides, and can return to the current window. The resolver remains bounded to 2000–2100 and keeps the existing preview limits.

Open judged defects in the synthetic regression: **4 → 0** (four fixed locally). Shared-import result: **2 service references → 1 policy / 1 rota**, with no per-service copies. Existing contract totals remain **26 DONE / 41 PARTIAL / 34 MISSING, total 101**. Core remains 25/35/24; Agent surface 1/6/10. **No contract Status, Gap or Evidence cell changed, and no DONE/gate claim is made.**

### Verification

Passed: the existing full import-door journey; runtime core/held upgrades; typecheck; production build; owner-fault regression; existing Events source recovery/test-event journey; contract document check; source lock regeneration/check; and whitespace/identity checks. The held upgrade proves all 121 prior application tables and 31 held rows survive unchanged in their original columns. No existing assertion was removed: the snapshot now explicitly projects every pre-upgrade column, and nullable readback defaults receive additional assertions. No new test file or pin test was added.

The five changed page families (native key reveal, routed key reveal, person settings, shared adoption and historical coverage), plus native and routed creation states, were inspected at **1440 and 390**. The creation screens no longer incorrectly say that these source keys cannot be read back; the regression creates each key, leaves/dismisses creation, then reveals the same value again. New functional/overflow/accessibility assertions run at 1440; phone images are visual proof. Zero serious/critical accessibility findings and zero outbound requests were observed in the focused fault journey. Existing test-event assertions still prove compatible recovery, retained in-memory keys, authentication/allowance diagnosis, refused-request immutability and native signed/bearer external sending.

The actual structured receipts are `verification-receipt.json`, `owner-faults-receipt.json`, `test-event-receipt.json`, `publication-receipt.json`, `reproduction.json`, and `ci-receipt.json`. Complete synthetic screenshots are explicitly selected beside them. Local build/test observations precede the final source commit; exact-SHA CI is the committed-candidate check.

### CI and custody

The first candidate's Verify run **43689675709** on `a6e983e5745201257bc97c7bd64280d364883ed6` completed **failure**. Build, hosted, agents, intake, triage, runtime, browser and changes succeeded; transfer failed and aggregate Verify failed with it. Each failed job archive was read exactly once with `gh run view --job ... --log-failed`. The transfer assertion at `tests/transfer.mjs:628` reported `invalid_policy_module`, export exit 4 instead of 0. Native Node reproduction found `ERR_MODULE_NOT_FOUND` for an extensionless escalation import in the new notification model. The correction merges `servicePolicy` into the existing explicit `../escalation.ts` import.

Corrected commit **f3896cc239e600139d93674c4885028e5d9ffa53** passed the complete fresh-clone transfer journey, including CLI export/import, exact history, credential exclusion, rollback, inactive agent/status/notification authority, durable erasure fences and no replay. `transfer-receipt.json` is the actual maintained-journey receipt, including every CLI exit/expected-exit pair. Final commit **d8357c8e671651b9e2f2021eaf32d705a3360fd0** adds only correct creation-screen credential wording and the native/routed creation → leave → reveal browser regression. Typecheck, build, source lock/check, contract check and the expanded browser regression all passed for that source.

Nine of the ten permitted GitHub calls have been used, including one initial mistyped-SHA discovery that found no runs and the two once-per-job diagnostic archive reads. One final REST discovery is reserved for the corrected exact head after the workflow has had time to finish. **The corrected workflow has not yet been observed; no READY is claimed at this point.** The final state will be appended below and recorded in `ci-receipt.json`. Prior-head green shards are not treated as green evidence for this head.

The preserved diagnostics are `ci-prior-run-receipt.json`, `ci-prior-run-jobs.json` and `ci-failure-receipt.json`; raw environment-bearing job headers are not selected into this public packet. Evidence publication targets only `refs/heads/evidence/sd-oncall-run1-faults-2` and does not signal product readiness or landing.

### Limits and clause claims

Previously held digest-only secrets require one explicit rotation; existing credentials are never silently invalidated. Shared adoption binds existing workspace services/people and does not automatically consolidate pre-existing copies. Supported policy adoption uses one or two steps targeting the same rota; unsupported semantics stay paused/refused. History evaluates the current saved rota, current membership eligibility and retained overrides, not every earlier edit or an attested record of who actually worked a shift. No external paging, delivery, hosted acceptance, real export, company-instance operation or independent gate result is claimed.

Touched clause work is reported as PARTIAL with points=none: OC-003, OC-011, OC-015, OC-019, OC-020, OC-021, OC-022, OC-026, OC-027, OC-033, OC-038 and OC-042. These are bounded work claims; stored clause judgments and summary counts are unchanged.
