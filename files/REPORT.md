# gr-mt-oncall-code-6

Result: **no-change**. The requested code fix is already on current `main`.

Repository: `just-every/run-oncall`.
Local branch: `cloud/gr-mt-oncall-code-6`.
Reviewed HEAD and origin/main: `8adae6c836f2fabda29e8a091b052450410c8ca5`.
Product branch was not pushed; no new product commit or PR was created. No landing is needed for this no-change result.

## Plan and results

1. Set fleet identity, read launcher instructions and the inline builder rules, refresh the injected bundle, install fleet Git helpers, and clone the declared repository with full history. Completed. No other repository was cloned or modified.
2. Read AGENTS.md, CLAUDE.md, CONTRACT.md, ACCEPTANCE.md, the logout implementation and its protocol documentation. No TESTING.md is shipped. Install the requested commit hook and cloud toolchain. Completed.
3. Trace the two reported expressions through local Git history and compare current main. Completed: commit `fd84e75e555e3952ec98841b19a94a30ea3be462` already changed both expressions; ancestry check passes. See `prior-fix.patch` and `logout-reviewed.mjs`.
4. Check syntax and the repository's generated document/source-lock integrity without modifying product files. All checks pass; actual results are recorded in `review-receipt.json`.
5. Query both CodeQL alert records using only the refreshed injected credential, with bounded retries. GitHub returns HTTP 403, `Resource not accessible by integration`. Both alerts returned HTTP 403 on all five attempts each (10 GitHub calls total); refreshed the injected bundle and reinstalled fleet Git setup before each retry round, with 15/45/90/150-second backoff. The actual API receipt is retained. Alert closure is not confirmed.
6. Write the maintenance result and complete report packet outside the product repository, then publish only the evidence ref. Product custody remains separate from report publication.

## Source findings

The original expressions at the reported lines were `events.includes(FENCE_EVENT)`, where `events` was `Object.keys(c.events)`, an **array**. Array `includes` performs exact element equality; it is not string substring sanitization. These values are protocol event claim identifiers, not navigation destinations. Parsing or normalizing these identifiers as URLs would change the documented exact-key protocol.

The earlier fix defines `const fence=Object.hasOwn(c.events,FENCE_EVENT)` and supplies that boolean to both native `consumeLogout` and the SQL identity-fence branch. Current main retains that implementation. Unknown event names are rejected by the exact event allowlist before either consumer. The request URL is already parsed with `new URL(request.url)` and checked for exact origin, path, absence of query and POST method. There is no logout redirect in this file.

Therefore the reported code concern has already been addressed. This task makes no additional code changes and does not dismiss or alter any GitHub alerts.

## Changes and counts

- Changed product files: 0 before / 0 after.
- New product commits: 0.
- Reported historical fence-membership expressions: 2 in the original revision / 0 on reviewed main. Both current consumers share the exact-key boolean.
- Alert states/counts on GitHub: unknown; API access refused. No claim of 2 closed alerts.
- Contract counts unchanged: Core 25 done / 35 partial / 24 missing; Agent surface 1 done / 6 partial / 10 missing; total 26 done / 41 partial / 34 missing (101 clauses).
- Clause status changes: none. No CLAIM lines; this is maintenance investigation, with no clause promotion.
- Registered tests added/removed: 0 / 0. Test-budget count is unchanged and was not independently recounted for this no-change task.

## Verification

- `node --check src/modules/dependencies/logout.mjs`: PASS.
- `node src/base/contract-docs.mjs check`: PASS, zero prose errors/warnings; generated documents current.
- `node scripts/edition-authoring/cli.mjs check`: PASS, `ok: true`.
- `git merge-base --is-ancestor fd84e75e555e3952ec98841b19a94a30ea3be462 origin/main`: PASS.
- `git diff --exit-code` and `git status --porcelain=v1`: clean.
- Toolchain setup selected available Node v24.19.0 and pinned pnpm 10.12.4; package.json pins Node 22.20.0. No dependency install, build, typecheck, runtime suite or browser journey was needed for this no-change result. No UI was changed.
- New exact-SHA Verify run IDs: none. No product candidate was pushed, and no CI-green or READY claim is made.
- Publication scanner: not run; not shipped in the VM, and no product publication is attempted. Reports use the separately authorized evidence transport.

## Limitations and default

GitHub refused access to `/repos/just-every/run-oncall/code-scanning/alerts/13` and `/14` with HTTP 403. The injected integration cannot confirm closure or inspect the next scan; the fleet/owner should check these records with code-scanning read permission. This does not undo the verified no-change source result. Default: retain existing exact event-key semantics; do not introduce URL canonicalization or an unrelated redirect redesign.

Result files: `work/maint/gr-mt-oncall-code-6/result.json` and `work/gr-mt-oncall-code-6/packet/` under the fleet directory. The clone remains at `work/maint/gr-mt-oncall-code-6/repo` for the Mac worker; no unpublished product work is discarded.
