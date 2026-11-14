# Oncall v0.5.14 release metadata candidate

Recorded: 2026-11-14T05:02:16Z
Repository: just-every/run-oncall
Branch: cloud/sd-oncall-release-0-5-14
Candidate: 54e2434253aeb8510759b15e3589ae2643d02abd
Base: 9e11ec73dc0f3ee12cba7e846a43ff63227d873f
PR: none created; this seed uses the fleet's branch landing path.
Product branch push: successful on the first attempt; one real commit, no intermediate save.
Release state: metadata candidate only. No tag, signature, GitHub Release, deploy or self-submission was created.

## Plan and scope

The full plan is in PLAN.md. Check release ownership and exact-main CI; derive the notes from v0.5.13..main; update existing release/version references; run metadata checks and typecheck; fetch/rebase fresh main; regenerate and check the source lock last; inspect identities and push the named branch once; observe exact-SHA Verify; publish this report packet to the separate evidence ref; delete the scratch clone and dependencies after successful transfer.

Only these seven paths changed: package.json, seed.json, RELEASE.json, CHANGELOG.md, RELEASE.md, README.md and sources.lock.json. package-lock.json is absent and was not created. pnpm-lock.yaml stayed unchanged. No product source, tests, contract, generated views or homepage were edited. Existing historical upgrade instructions are preserved verbatim after the new 0.5.13-to-0.5.14 guidance. The actual @runeditrun/rer pin read from package.json remains 0.2.113.

## Preconditions and source delta

Main's exact-SHA Verify 43557707042 and Run site 43557707040 both completed successfully on the base SHA; Verify 43556264993 was also successful on that same SHA. The latest non-draft public Release was Oncall 0.5.13, published 2026-11-13T19:42:50Z, https://github.com/just-every/run-oncall/releases/tag/v0.5.13. Its annotated tag resolves to 8adae6c836f2fabda29e8a091b052450410c8ca5. No v0.5.14 tag or release branch and no competing open release PR were found before editing.

The actual diff contains eight commits and 41 changed files. release-diff-summary.txt records the full commit SHAs and paths/statistics. There are no migration-path changes. Notes cover the matching weekly gap/timeline window and current screen guidance, restored-owner name confirmation and repeat sign-in, commands using rer's supplied Node runtime, terminal-ready compatible intake samples, readable coordination/status summaries, correct default human review for follow-ups, and the Vite 8.2.4 launch-editor security fix. The notes identify the security fix in this deployed product without claiming that this metadata task deployed anything. RELEASE-NOTES.md holds the exact new CHANGELOG section, and its prose equals RELEASE.json publicReleaseNotes.

## Before and after

Version: 0.5.13 -> 0.5.14. rer pin: 0.2.113 -> 0.2.113. New migrations: 0; RELEASE.json migrations: [] -> []. breaking remains false. Contract changes: {} -> {}. Extension changes for the release delta: previous release's one entry -> zero current changes. No extension API change is claimed from display-only updates.

Clause statuses remain 26 done / 41 partial / 34 missing / 101 total. Core remains 25 / 35 / 24 / 84; Agent surface remains 1 / 6 / 10 / 17. No clause claims, promotions, demotions or acceptance edits. Tests added/modified/removed by this task: 0 / 0 / 0.

## Local results and custody

PASS: pnpm install --frozen-lockfile; pnpm exec rer check --profile first-party; pnpm run typecheck; release consistency and scope review; git diff --check; node scripts/edition-authoring/cli.mjs lock and check. Source lock regeneration was the final source write. Fetch/rebase kept the candidate on unchanged current main. Each author/committer and all candidate messages/trailers, including side parents, passed the required identity review; the sole commit has fleet identity and no trailers or CI skip markers. The fleet commit hook remained active after dependency installation. Product push used cloud-push.py and succeeded once.

The provided cloud toolchain retained VM Node 24.19.0 with pnpm 10.12.4. pnpm warned that package engines declares Node 22.20.0; the metadata check and typecheck passed. Full local verify, browser journeys and build were deliberately not run for this version-only lease. The fleet Mac owns the full publication scan and landing gates; no cloud publication scan or remote-host scan was run or claimed. validation-receipt.json and the actual logs hold commands, results and exact product provenance.

## Candidate CI

Verify 43559330559 completed successfully on exactly 54e2434253aeb8510759b15e3589ae2643d02abd, observed 2026-11-14T05:20:21Z: https://github.com/just-every/run-oncall/actions/runs/43559330559. Eight GitHub calls were used in total. One initial discovery failed (exit 1; its diagnostic was not retained); after launcher refresh and reapplication of the task-side Git helper, discovery and all subsequent reads succeeded. Discovery/read spacing was at least 300 seconds for this run. No workflow was dispatched or re-run. No green claim was borrowed from another SHA. The exact candidate is READY for the fleet's independent landing guards; this does not claim landing or release publication.

## Follow-up and limitations

The independent fleet must scan and land the exact candidate under its existing guards, then run main CI/site and the separately authorized immutable release procedure. There is no RELEASED claim. Pending feature rounds, real incumbent exports, installer/hosted proofs and live-provider gates are unchanged and do not hold this path-seed metadata round. Paging remains OFF; retain the existing pager. Release 2 paging and independent standby remain unbuilt. Git's push response reported 30 default-branch dependency advisories (14 high, 14 moderate, 2 low); this task did not audit or alter those existing advisories beyond documenting main's already-landed Vite fix.

## Evidence and cleanup

The complete selected non-secret report/receipt packet is published using the separate cloud_evidence.py entrypoint to refs/heads/evidence/sd-oncall-release-0-5-14. The terminal report carries the exact returned evidence ref/head receipt; that report-only ref is separate from product READY custody.

No secrets, environment dumps, private held-out gate material or symlinks are selected. Reports and receipts travel only on refs/heads/evidence/sd-oncall-release-0-5-14; the product tree contains no fleet evidence. Dependencies were removed at 2026-11-14T05:21:15Z. The scratch clone is retained only through evidence transport and is removed immediately after successful publication; the final terminal report confirms that cleanup. Reports and receipts remain under $HOME/rer-consolidation/work/sd-oncall-release-0-5-14/packet/.
