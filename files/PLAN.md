# Oncall v0.5.14 metadata preparation plan

Recorded: 2026-11-14T04:58:18Z
Repository: just-every/run-oncall
Branch: cloud/sd-oncall-release-0-5-14
Base: 9e11ec73dc0f3ee12cba7e846a43ff63227d873f

1. Check exact-main Verify and Run site, latest non-draft Release, absent v0.5.14 tag and release writer before editing.
2. Read the actual v0.5.13..main diff, including migration paths, and derive user-visible notes from that diff.
3. Change only package/release metadata and existing current-version references. Preserve the exact rer 0.2.113 pin, older release history and all feature/contract work. Do not create the absent package-lock.json or change the unchanged pnpm lock.
4. Install frozen dependencies. Run the metadata checker and typecheck only; do not run the full local suite, browser journeys or build for this version-only change.
5. Fetch/rebase fresh main before the first push, regenerate sources.lock.json last with the documented edition-authoring CLI, and check it. Keep generated contract views untouched.
6. Commit with fleet author/committer and cleanup hooks. Inspect every candidate identity, trailer and full commit message. Push the named branch through the push guard immediately after the first real commit.
7. Observe the exact-SHA Verify using REST, one watcher and at least 300 seconds between reads per run, within ten GitHub calls. Do not dispatch/re-run CI, tag, publish, deploy or submit a landing.
8. Save a complete non-secret report and actual receipts, publish only those files to the evidence ref, and delete the successful scratch clone/dependencies. Report product readiness separately from evidence custody.

No target clauses or claim/status changes are authorized. Existing pending feature gates, installer proofs and paging limitations do not hold this metadata round.
