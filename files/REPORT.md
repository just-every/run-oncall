# gr-mt-oncall-code-7 result

Disposition: **no-change**. Both reported regexes are already fixed in the current default-branch source. This is verification of an existing fix, not a false-positive dismissal.

Repository: just-every/run-oncall
Product branch: cloud/gr-mt-oncall-code-7 (local only; no new product commits)
HEAD / origin/main: 8adae6c836f2fabda29e8a091b052450410c8ca5
Clone: /home/agent/rer-consolidation/work/maint/gr-mt-oncall-code-7/repo
Result: /home/agent/rer-consolidation/work/maint/gr-mt-oncall-code-7/result.json
PR: none. CI run IDs: none. No READY/PUSHED product custody is claimed.

## Plan and completed work

1. Set fleet Git identity, read and refresh the launcher, install the decrypted-bundle Git helper and cloud tooling, and clone only the declared repository with full available history.
2. Read AGENTS.md, CLAUDE.md, CONTRACT.md, ACCEPTANCE.md and the inline builder rules; inspect both reported locations and their history before changing code.
3. Verify the earlier repairs are ancestors of current main and inspect current public mail entry points and their bounds.
4. Exercise mail serialization and inbound MIME normalization through their exported public module APIs using synthetic in-memory messages. Include ordinary supported addresses, folded and repeated headers, hostile suffixes and over-budget inputs.
5. Refresh the launcher and retry denied alert reads using the requested 15/45/90/150-second backoff and the same injected credential source. Keep alert closure unverified if the account cannot read code-scanning alerts.
6. Fetch main again, confirm unchanged clean product provenance, write the exact maintenance result, and publish only explicitly selected non-secret report files to evidence/gr-mt-oncall-code-7.

## Findings at the reported locations

- Alert #3, src/modules/mail/src/core/validation.mjs:53: the old `^(?:(.*?)\s*<([^<>]+)>|([^<>]+))$` expression is absent. Commit 12d7521ad0eaf40f2e77fce624f45bbbe90e0388 removed its ambiguous quantifiers. Current parsing, from c74afdf560b73bcdc8ccf7a3440f876bfa0f6c39, uses trim, endsWith, lastIndexOf, slices and delimiter checks. The 998-character bound is applied before parsing. Mailbox validation retains the existing conservative subset and display-name checks.
- Alert #4, src/modules/mail/src/inbound/headers.mjs:22: the old header regex combining `[ \t]*` and `(.*)` is absent. The same earlier repair switched to finding the first colon; current code validates only the name using a single anchored character-class repetition and trims the remainder. Its regexp no longer has overlapping whitespace/body quantifiers. For Cloudflare MIME, normalizeInbound bounds rawSize and readStream bounds actual bytes before entity/parseHeaders. This existing caller-supplied maxRawBytes limit was verified through the public door.
- Both fix commits are ancestors of origin/main. The fetched main and local branch point to the same SHA. No source, source lock, generated view, contract clause or product test was changed.

## Verification

Command: `. /tmp/rer-cloud-toolchain.sh; cloud_run node <packet>/mail-regression.test.mjs <checkout>`.
Actual toolchain: Node v24.19.0 and pnpm 10.12.4; the supplied shim left the newer installed Node in place; the repository declares Node 22.20.0.

Result: 2 tests passed, 0 failed, 0 skipped. See mail-regression.log and validation-receipt.json. These are evidence probes outside the product checkout, not additional product test registrations.

- Mail serialization: bare, named, quoted, Unicode display names, surrounding whitespace and long supported display names preserve expected parsed addresses and recipients. Ambiguous delimiters, missing closes, header injection, disallowed display separators and 100,000-character input are refused.
- Inbound MIME: ordinary, folded, repeated custom headers and 16,000 separator spaces preserve from/to/subject/body. Invalid name spacing, missing colon, bare CR, duplicate singleton and a long whitespace prefix followed by a forbidden line separator are refused. Over-budget raw mail is refused, including a proof that an oversized declared rawSize is rejected before the stream is read.
- Git ancestry and clean-tree checks passed; source-provenance.json records exact source blobs and SHA-256 hashes. historical-fix.diff records the already-landed targeted repair.
- Typecheck, dependency/application setup, full suite, browser proof and candidate Verify were not run: there are no source or UI changes. No new CodeQL scan was triggered. A passing prior or unrelated workflow is not claimed.

## Counts and clause status

Reported target regexes still requiring repair in the checked source: 0 before / 0 after this run (both were already fixed). Alert-record open/closed counts are unknown; source verification does not prove GitHub alert closure.
Product files changed: 0 before / 0 after. Product commits: 0. Product tests added/deleted: 0/0. Evidence probes: 2 passed.
Contract summary unchanged: Done 26 → 26, Partial 41 → 41, Missing 34 → 34, Total 101 → 101. No clause status, gap, evidence cell or acceptance point was edited or claimed.

## Limitations and defaults

GitHub commands `gh api repos/just-every/run-oncall/code-scanning/alerts/3` and `/4` returned `Resource not accessible by integration (HTTP 403)`. All five attempts for each alert returned HTTP 403 (10 GitHub calls total); bounded recovery is complete. The actual retry receipt is alert-api-receipt.json. No alternate credential was sought. The next authorized CodeQL scan/owner read must confirm alert closure; this account cannot do so. No scan closure or false-positive conclusion is asserted.

Default adopted: take the brief's explicit no-change disposition when the current default branch already contains the fix. No empty product commit, product push, PR, generated-document write or landing action is needed. No product publication scan was run because no product candidate was created or published. Report-only evidence transfer remains separate from product custody and acceptance.

All actual report artifacts are kept in the packet directory outside the product checkout. The clone and result.json are retained for the fleet's maintenance result return. No provider keys, environment values, credentials, held-out gate material or symlinks are selected for evidence publication.
