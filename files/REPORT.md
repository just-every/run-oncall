# Oncall aged replay clock maintenance

Repository: just-every/run-oncall
Tag: main-oncall-aged-clock-1
Product branch: cloud/main-oncall-aged-clock-1
Product head: 051a993687882c63b472c8397946d52157ec4c0f
Base: 0dac089dba93dc1209c3a2317d5e7a4392d44c4e
PR: none; the named cloud branch is the fleet's landing candidate.

## Result and exact cause

Untouched main reproduced the reported failure in `cloud_run node tests/oncall-agent-flow.mjs`: `agedReplayRetention` failed while `initialize-agent-owner.mjs` created its first member, with `/api/members` returning 409 instead of 201. The response body was `{"error":"Workspace changed; reload"}`.

The exact rejecting check is the `oc_current_sessions` SQL view in `migrations/core/0106_relational_workspace.sql:25–29`: both the Oncall session expiry and its linked native operator session expiry must exceed `round((julianday('now')-2440587.5)*86400000)`. SQLite uses actual wall time here, independently of the injected Worker JavaScript clock.

`oaSessions().newSession` in `src/modules/operator-auth/accounts/oa.mjs:12–15` sets native session expiry from the injected JavaScript clock plus `config.sessionSeconds`. `src/modules/operator-auth/config.mjs:29` defaults that window to seven days (`7 * 86400` seconds). `nativeMember` in `src/native-member.ts:50` maps the native expiry into Oncall's `sessions` row. `sessionGuard` in `src/api.ts:131–133` uses the SQL view; `/api/members` at lines 515–546 passes that guard to `workspaceWrite` (`src/workspace-store.ts:64–69`). Its guarded workspace update changes zero rows once the session is absent from the view, and the handler returns 409.

The old fixture created the native session at 2026-11-04T12:00:00Z (1793793600000), so both expiries were 2026-11-11T12:00:00Z (1794398400000). The diagnostic probe observed SQLite at 1794406252077, an unrevoked session, and zero rows in `oc_current_sessions`. Thus the seven-day session expiry in the wall-clock SQL view, rather than duplicate member names or a workspace race, caused the 409. `diagnosis.json` retains only timestamps, counts and the error; session tokens, IDs, cookies and secrets were excluded.

## Product change

Only `tests/oncall-agent-flow.mjs:366–368` and its generated entry in `sources.lock.json` changed. `agedReplayRetention` now starts at `Math.floor(Date.now()/3600000)*3600000`, the current whole hour. Bootstrap stays less than one hour behind SQLite wall time and comfortably inside its seven-day session window. Whole-second JWT claims remain exact.

The platform clock still advances by exactly 24 hours and then 24 hours plus one second. The existing tests still perform native HTTP bootstrap, MCP incident declaration and note writes with real D1 custody, initial short-lived token expiry, same-policy renewal, fresh same-identity credentials, new JSON-RPC IDs, stored outcome replay, unchanged original expiry, no duplicate native effect or held review, linked attempt audit and zero outbound requests under both autonomous and held policies.

All 66 assertion call sites inside `agedReplayRetention` and all 743 in the changed file remain. No assertion, test registration, product code, contract clause, Status, Gap, Evidence or generated acceptance view changed. No DONE or CLAIM is made.

## Other fixed-clock search

The search covered every `.mjs` under `tests`, including `Date.UTC(20...)`, ISO literals, clock arguments and all `.time(...)` call sites and their variable origins. `clock-search.txt` records the relevant source lines.

- `tests/oncall-agent-flow.mjs` / `agedReplayRetention`: the sole fixed-date clock passed into `agentRuntime` before native bootstrap; fixed in this candidate.
- `tests/agent-door-browser.mjs:12–13,43–134`: fixed 2026-11-02 and 2026-11-04 UTC week boundaries. This already calls `agentRuntime({clock:null})`, issuing sessions at actual current time before freezing only measured calls, and returns to real time afterward. Its fixed calls do not age the session relative to SQLite. No expiry edge within 30 days; keep the independent weekly-cohort oracle.
- `tests/intake.mjs:313–314`: fixed 2026-10-30 email rate-window instant, injected after real-time setup/session issuance. Session expiry remains actual current time plus its normal window; the frozen past call time cannot make that session expire. No new calendar edge within 30 days.
- `tests/activation.mjs:550–584`: fixed March 2026 DST/default-calendar clock, injected after real-time setup. Reads compare resolved UTC coverage against the independent DST oracle and then restore the current clock; sessions stay freshly issued relative to SQLite. Other `Date.UTC` occurrences there are explicit query ranges, not bootstrap/platform clocks. No new edge within 30 days.
- `tests/triage.mjs:195` and `tests/response-report-fixture.mjs:10–52`: October 2030 fixture clocks. Their fixed bootstrap/session times remain ahead of SQLite throughout the requested 30-day horizon; the response-report fixture deliberately encodes a known New York rota and independent timestamp assertions. No change needed for this brief's horizon.
- Remaining clock movements derive from `Date.now()`, calculated schedule windows, deadlines or snooze records, or reset to real time. Other ISO literals represent historical records, source timestamps, scheduling/DST input or query ranges rather than setup-clock expiry windows.

No additional fixed fixture clock meets the brief's within-30-days failure condition, so no other test was changed.

## Validation and counts

- Baseline, untouched main: full `tests/oncall-agent-flow.mjs` exits 1 at the expected member bootstrap 409 (`baseline.log`).
- Corrected full changed file: `cloud_run node tests/oncall-agent-flow.mjs` exits 0 (`after.log`). This includes all existing aged replay assertions plus the rest of the native agent flow.
- Future-date proof: `cloud_run node --import /tmp/oncall-plus-30-days.mjs tests/oncall-agent-flow.mjs` exits 0 (`future-30-days.log`). The external harness offsets the test process's `Date.now()` by exactly 30 days and selects the existing `agedReplayRetention` invocation, excluding only the separate unpinned main-flow invocation after it. It changes no assertion or function body. Both existing policies and both elapsed-time checkpoints pass; fixture platform time and signed credentials follow that future start. The SQL clock remains actual wall time, so this also proves the bootstrap no longer depends on the old absolute instant. The full current-date file passed separately. The actual harness is included as `future-clock-harness.mjs`; no new test was committed.
- `cloud_run pnpm run typecheck`: exits 0 (`typecheck.log`). The supplied toolchain uses the VM's newer Node 24.19.0 with pnpm 10.12.4; pnpm reports the declared Node 22.20.0 engine warning. CI uses the repository's pinned Node.
- `node src/base/contract-docs.mjs check`: 0 errors, 0 warnings; documents current.
- `node scripts/edition-authoring/cli.mjs lock` followed by `check`: passed; the lock contains exactly the changed test file hash. Regenerated again last after fetch/rebase, producing no further diff.
- `git diff --check`: passed. Complete candidate author/committer and message/trailer inspection passed. Fleet author and committer, no trailers, no skip-CI marker.
- Before/after: changed-file assertions 743 → 743; aged-test assertions 66 → 66; `.mjs` test files 45 → 45; added/removed registrations 0/0. The file count is inventory, not an inflated registration total. This edit adds no registration against the 200-test cap and changes no flow grouping.
- Contract status counts unchanged: published 16 done / 6 partial / 0 missing (22); target and push further 6 / 39 / 34 (79); all 22 / 45 / 34 (101). Clause status changes: zero.

## Publication and custody

One product commit, 051a993687882c63b472c8397946d52157ec4c0f, was pushed successfully on the first guard attempt. `git fetch origin main` followed by `git rebase origin/main` found the branch current; no published history was rewritten. No merge or default-branch write occurred. No PR was required or created.

Verify run 43036726035 was discovered on exactly this SHA. The final CI receipt and GitHub call ledger are separate packet files. The run completed successfully on exactly 051a993687882c63b472c8397946d52157ec4c0f at the fourth API call (14:31:14 UTC). No rerun or repair was needed. The watcher uses one REST caller with a 300-second minimum between calls, including discovery, within the ten-call budget. The full Verify is the suite wall; success requires every selected shard, including intake.

The fleet Mac owns the publication scan and landing. That scan cannot run from this cloud task and is not claimed complete here. Product READY/PUSHED custody is independent of report-only evidence publication. The packet is selected explicitly and published only to `refs/heads/evidence/main-oncall-aged-clock-1`. Product branches contain no report, receipt, browser proof or credential file.

No blocker remains. Exact-SHA Verify is completed/success, with intake included in its required full shard wall. READY custody applies to the pushed product SHA. The successfully published checkout will be deleted immediately after report-only evidence publication; the packet remains outside it.

Final CI: https://github.com/just-every/run-oncall/actions/runs/43036726035

READY branch=cloud/main-oncall-aged-clock-1 head=051a993687882c63b472c8397946d52157ec4c0f
