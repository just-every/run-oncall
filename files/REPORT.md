# sd-oncall-dependency-projection-1 — native service response projection

Date: 6 November 2026 UTC. Repository: just-every/run-oncall. Product branch: cloud/sd-oncall-dependency-projection-1.

## Result

Fresh main `8e02f6674fad992d1a972cfd567a47144296e5a0` reproduces the independently reported existing privacy defect through the emitted production Worker, real MCP wrapper and native D1. A real native service account can read A but not B. A depends on B in native storage. The scoped read returns `dependencies: []` and a fresh projected ETag. A schema-valid successful `oncall.services.update` rename, omitting dependencies, returns B's private identity. An identical-key retry returns the same leaking recorded success.

The correction computes the success object from the same current-grant dependency projection already used for its ETag and for `services.read`. Native command execution, stored service, audit, persistence, URI/resource output and projected ETag semantics remain in place. Newly recorded outcomes and their identical-key replays contain that projected result. No shared Base or replay machinery changes are required for this reproduced trigger.

Changed product files: `src/agent-door/service-tools.ts` and its generated `sources.lock.json` entry only. No directly required projection dependency outside service-tools.ts changed. No contract, generated view, test, migration, workflow, package pin, UI, provider, homepage or release change. No f204 branch or change was imported. This urgent pre-existing disclosure fix is independent of the BASE-AGENT-012 diagnostic campaign and is not a FIX verdict or lifetime reset for it.

## Native before/after proof

`PLAN.md` contains the full execution plan. `dependency-probe.mjs` is a small external one-off probe, kept out of the product tree. The same probe bytes run on source main and the corrected build. Services and dependency edges enter only through `/api/command`; real local MCP grants enter through `/api/automation/clients`. The probe does not edit application data with SQL, use a mock adapter, call a real provider or require an external account. Runtime fixture SQL is limited to the existing harness applying the released migrations.

The ordinary native owner bootstrap and Business policy fixture are the repository's existing `agentRuntime`. The probe creates no permanent registration. Each policy/visibility case reads the service and fresh projected ETag, submits a rename without dependencies, and checks the initial success and identical-key replay. It checks the whole returned MCP success wire representation for the private dependency ID as well as the dependency field.

Seven cases run on both sources: autonomous/scoped, autonomous/authorized, held standard review/scoped, held standard review/authorized, explicit approval/scoped, explicit approval/authorized, and selective mixed visible/hidden dependencies. Authorized means the same real service account grant includes A and B; the scoped grant includes A alone. The mixed grant includes A and C with A depending on both B and C, proving visible C survives projection. The explicit approval case also approves read operations through the native read continuation door, and proves the held mutation changes no native service before human approval.

Main exits 1 with 14 privacy assertion failures; the corrected build exits 0 with zero. These 14 failures include typed dependency and whole-response checks of the same disclosure; they are not 14 distinct defects. Both runs preserve the positive controls:

- Authorized callers see B in read, success and replay.
- Scoped reads omit B; after correction, scoped success and replay omit it too.
- Mixed visibility retains C and omits B after correction.
- Native storage retains the original dependency edges. Each rename changes only the intended name, with exactly one workspace revision.
- Success ETags equal a fresh ordinary read's projected ETag.
- Identical-key replay returns equal structured content and changes no native state.
- Native application audit records the service client; the agent audit retains the agent, native sponsor and linked replay attempt. Review and approval receipts retain their existing policy custody.
- Foreign and nonexistent targets remain `not_found` with no structured result. Stale ETags and forbidden dependency writes cannot change native services, including at approval execution.
- Zero outbound requests occur in the probe.

`main-probe.json`, `head-probe.json`, their actual logs and `comparison.receipt.json` retain source hashes, emitted Worker hashes and complete observations. `probe-preparation.json` and its log record an initial probe-development exit 2: an explicit approval policy also holds reads. The external probe was corrected to use the existing native approval continuation; no application change was made for that fixture issue. The final identical probe then ran on main before the product edit.

Commands and actual exits are retained in the receipt files. The main command was `cloud_run timeout 300 node ../packet/dependency-probe.mjs ../packet/main-probe.json` (exit 1). The corrected command substitutes `head-probe.json` (exit 0). Both use the exact same script. Setup succeeded using `cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive`; its raw output is excluded because local owner-entry links can be private. The production build succeeded via `cloud_run npx -y @runeditrun/rer build`.

## Judgments and limits

CONTRACT.md remains byte-for-byte equal to current main, preserving its entire Status table, full Gap/Evidence cells, provenance and newer assertions. BASE-AGENT-012 remains MISSING. Counts remain 17 DONE, 50 PARTIAL, 34 MISSING, 101 total (published 12/10/0; target 5/40/34). Clause status changes: none. Permanent test registrations added, deleted, skipped or weakened: zero.

This evidence covers the existing bounded native success and its newly recorded replay result under the current grant. It does not claim a repair of historical cached results created by earlier versions, general grant-change replay semantics, broader Base replay/approval/erasure custody, diagnostic coverage, the full 24-hour bar, provider delivery, independent standby, publication scans or landing. Those remain independently owned; no shared vendor code was changed speculatively. Paging stays OFF.

No full local suite, CI dispatch/rerun, publication scan, deployment, landing, main push or private held-out gate occurred. The cloud branch and evidence transport are separate. The Mac fleet owns its independent affected technical gate, final publication scan, merged generation and exact-final Verify before landing.

## Product custody and local checks

Final product head: `75e47a564a641e16b29f607899424397cfbc901b`. Refreshed main: `8e02f6674fad992d1a972cfd567a47144296e5a0`. First real commit pushed immediately through the fleet cloud guard (attempt 1, exit 0); all candidate author/committer identities and complete messages/trailers inspected. No Co-Authored-By trailer. No prior published history rewritten. No PR was created; repository rules use the fleet branch lander.

The two generated contract views were restored whole from origin/main and are unchanged. Contract write/check and edition lock write/check each exited 0. The source lock was regenerated last before committing and changes only the service-tools.ts SHA-256. All declared contract documents remain byte-for-byte equal to current main, as recorded in `product.receipt.json`.

Local checks all exited 0: the identical external privacy probe; `pnpm run typecheck`; existing `node tests/oncall-agent-flow.mjs`; existing `env ONCALL_RUNTIME_PART=core node tests/runtime.mjs`; declared contract generator write/check; declared edition lock write/check. Actual commands, durations, logs and source hashes are in individual receipt files. The existing targeted agent flow and core native flow ran against the corrected working source whose digest exactly matches the committed file; their initial source_head field names the then-current main commit and does not claim a committed candidate. After commit, an additional production rebuild and identical native probe on the exact final head both exited 0 (`final-build.receipt.json`, `final-probe.receipt.json`, `final-probe.json`). No additional broad test rerun occurred.

Exact-SHA Verify run: `42170494933`, https://github.com/just-every/run-oncall/actions/runs/42170494933 . Initial REST observation: queued. One watcher observes this exact head at intervals of at least 300 seconds within the ten-call budget. Final CI custody is appended below after completion.

## Terminal CI result and return

Verify run `42170494933` completed with `success` on the exact final SHA `75e47a564a641e16b29f607899424397cfbc901b`. This is an actual workflow success, without the generated-view exception. REST discovery and three subsequent observations used four GitHub calls, with every observation interval at least 301 seconds. `ci-final.receipt.json`, `ci-status-2.json`, `ci-status-3.json`, `ci-status-4.json` and `github-calls.json` retain the actual result and call ledger. No dispatch, rerun, failed-job log read or PR operation occurred.

Product custody: READY for the fleet's independent gates. Blockers: none. The exact product ref/head was independently verified with Git after the guarded push. Full report/probe/receipt publication uses only the separate report-only evidence ref, and neither evidence publication nor this builder result claims acceptance or landing.

Dated SD relay: 2026-11-06 sd-oncall-dependency-projection-1 — existing native service response disclosure reproduced on main and corrected; service-tools.ts plus its source lock only; seven native visibility/policy cases, 14 disclosure checks to zero; native agent/core and typecheck pass; exact-SHA Verify 42170494933 success; clause changes none; counts 17 DONE / 50 PARTIAL / 34 MISSING unchanged; BASE-AGENT-012 remains MISSING with complete prior judgments; head 75e47a564a641e16b29f607899424397cfbc901b.
