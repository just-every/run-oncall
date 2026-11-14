# gr-mt-oncall-code-8 maintenance result

Status: **no-change**. Repository: `just-every/run-oncall`. Product branch checked out: `cloud/gr-mt-oncall-code-8`. Exact HEAD and freshly fetched `origin/main`: `4d1fc62d4d2b8bf90008ac87bbaa626bc1a5494b`.

## Decision

No change: current default-branch SavedExportHelp renders fixed guidance as React text and vendor only as a relative href attribute; the reported DOM-text-to-HTML flow does not exist at the supplied location.

This is a source-backed no-change disposition for the supplied current-default-branch location, not a statement that the inaccessible GitHub alert has been closed. The same component was present without an HTML sink when introduced by `0a9f514fe620de7fd3c3ded75e5568914b9f5895`; main later changed only its migration-readiness paragraph in `44405d744a99d1acdaf0c3e203d544056042e440`. All available file-history entries are recorded in `source-history.txt`. No unsafe HTML reinterpretation was found, so there is no corrective product commit to publish or land.

## Plan and completed work

1. Configure fleet Git identity, refresh the launcher, read its AGENTS.md, install the decrypted-bundle Git helper and push guard, and clone the declared repository with full history. Create only the named cloud product branch. Read AGENTS.md, CLAUDE.md, and the relevant contract and generated acceptance material. No TESTING.md is shipped.
2. Trace the supplied CodeQL location through the actual file-source selection, React state, ExportHelp routing, guide lookup, text children and link attribute. Inspect the component's file history and search the move-in sources for HTML sinks.
3. Establish whether a small security fix is needed. Current source contains no DOM-to-HTML operation, so preserve the existing product and use the brief's permitted no-change disposition.
4. Install dependencies with the pinned pnpm 10.12.4, use pinned Node 22.20.0 for checks, run the typecheck and a supplementary direct-component browser render probe at 1440, then confirm the tracked tree is clean and identical to freshly fetched main.
5. Save the exact required maintenance result and complete non-secret receipts outside the product checkout. Publish only the explicitly selected packet through the separate evidence transport. No product commit, product push, PR, merge to main, deployment or alert dismissal is performed.

## Source trace

- `src/move-in/ConnectStep.tsx:20`: the File source select passes `event.target.value`, with options generated from the five fixed `vendorNames` entries.
- `src/move-in/MoveIn.tsx:115`: `fileVendor` is the React `setVendor` state setter.
- `src/move-in/ConnectStep.tsx:22`: the selected vendor is passed to ExportHelp.
- `src/move-in/ExportHelp.tsx:17`: saved-response vendors render SavedExportHelp.
- `src/move-in/SavedExportHelp.tsx:9-10`: the vendor selects a compile-time guide. Ordinary unknown vendor strings render nothing.
- Lines 11, 14 and 16 render the name, shape and limitation strings as React children; there is no HTML parsing API or `dangerouslySetInnerHTML`.
- The reported line 19 supplies a relative `/docs/move-in#<vendor>-saved-responses` string to a React `href` attribute. It never reads DOM text or treats it as HTML. Guide documentation URLs are fixed HTTPS literals.
- Searching the move-in sources found no `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `createContextualFragment`, `parseFromString`, `textContent`, `innerText` or `dangerouslySetInnerHTML` flow. Source digest and line-level trace are in `source-trace.json`.

## Checks and evidence

- `pnpm install --frozen-lockfile`: passed; no tracked changes. The provided toolchain initially selected the VM's newer Node for dependency installation; Node 22.20.0 was then installed and explicitly put first on PATH for both checks.
- `pnpm exec tsc --noEmit`, Node 22.20.0 / pnpm 10.12.4: passed, exit 0, no diagnostics (`typecheck.log`).
- `cloud_run node /tmp/rer-saved-export-probe.mjs`: passed. The actual SavedExportHelp TSX was transpiled and rendered with the installed React 19.2.8, then inspected in headless `/usr/bin/chromium` with `--no-sandbox`. All three saved-response guides expand with the expected source and vendor-documentation links and guidance; no active HTML nodes appear; unknown and markup-bearing vendor inputs render nothing; zero outbound requests. Assertions ran at 1440 only. This is supplementary component evidence, not a full application journey. No UI change requires before/after browser screenshots.
- `git fetch origin main`, `git rev-parse HEAD origin/main`, `git diff --exit-code origin/main --`, and `git status --porcelain`: main equals HEAD, no candidate commits and clean tracked tree.
- Five reads of `gh api repos/just-every/run-oncall/code-scanning/alerts/17`, with the injected credential refreshed and re-read between attempts and bounded delays 15, 45, 90, 150 seconds: all denied HTTP 403, `Resource not accessible by integration`. The actual non-secret responses are in `alert-api-receipt.json`. GitHub API calls used: 5 of 10. No other credential was sought.
- No full suite, build, rer setup, product publication scan, product push or branch CI run was needed for this no-change disposition. CI run IDs: none. PR: none. No claim of green branch Verify or product READY/PUSHED custody is made.

## Before / after and clauses

- Changed product files: 0 → 0; new product commits: 0 → 0; new test registrations: 0 → 0; saved-response guides preserved: 3 → 3.
- Existing generated contract summary remains 26 done / 41 partial / 34 missing, total 101, before and after. This is the repository's recorded summary, not a new judgment.
- Clause status changes: none. OC-038 remains PARTIAL. No contract, generated acceptance/claims view, source lock or summary was edited; no acceptance completion is claimed.
- Alert 17's live state and analyzed SHA remain unverified because the integration cannot read code-scanning alerts. Default: a person with that access reviews the source trace against the original alert and dismisses it only if appropriate. This permission limitation does not turn an absent current-source flow into a product change.

## Custody

Required maintenance result: `/home/agent/rer-consolidation/work/maint/gr-mt-oncall-code-8/result.json`. The same actual JSON is selected as `result.json` in this packet. Product clone is retained at `/home/agent/rer-consolidation/work/maint/gr-mt-oncall-code-8/repo` for the maintenance return; it is clean and has no unpublished product work. The explicit cloud maintenance return takes precedence over the older generic clone-deletion guidance.

The evidence transport is report-only, uses fleet identity and no co-author trailers, and does not change the product checkout/head/index. Its exact EVIDENCE ref/head will be returned in the terminal response after publication. Evidence publication is not a landing or acceptance signal.

Evidence preflight note: the first attempt stopped before any remote push because a supplemental identity-audit local fetch tried to materialize promised historical blobs from the partial clone. The audit now reads the existing local commit objects through a temporary object alternate. `evidence-preflight-receipt.json` records the actual failure and correction; the product checkout was unchanged.
