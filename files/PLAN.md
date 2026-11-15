# Oncall 0.5.15 metadata preparation

Author: Run Edit Run fleet. Stamp: 2026-11-15T09:44:53Z.

1. Refresh the fleet launcher, install bundle-backed Git authentication and commit hooks, and clone only just-every/run-oncall onto cloud/sd-oncall-release-0-5-15.
2. Read the inline builder/release rules, launcher and seed AGENTS.md, contract summary and existing release metadata. Confirm fresh main, latest published release, absent next tag/branch, and no open release owner.
3. Inspect the actual v0.5.14..main diff and migration SQL. Write buyer-visible notes and backup/upgrade guidance for only landed changes. Preserve rer 0.2.113 and all historical changelog sections, contract judgments, migration bytes and feature files.
4. Update existing version references in package.json, seed.json, RELEASE.json, README.md and RELEASE.md; prepend CHANGELOG.md. package-lock.json is absent; pnpm-lock.yaml has no product version reference and needs no change.
5. Install frozen dependencies; run the existing read-only metadata check and typecheck only. Regenerate sources.lock.json last using the documented vendored CLI, then check it. Inspect the diff and identity/trailers.
6. Fetch/rebase fresh main before the first commit/push, regenerating the lock last if main changes. Commit with explicit fleet author/committer and active hooks; push once through cloud-push.py. Do not tag, publish a Release, deploy, dispatch CI, submit to the lander or push main.
7. Observe exact-SHA Verify through REST with one watcher and at least 300 seconds between run discovery/status calls. Preserve local check, product push and CI receipts outside the product tree. Publish the selected non-secret packet only on evidence/sd-oncall-release-0-5-15, then delete the pushed disposable clone and dependencies.
8. Return product branch/SHA, actual CI result, before/after counts, unchanged clause statuses and follow-up debts, evidence custody and the sd inbox relay line. READY requires exact-SHA success; pending CI is PUSHED.
