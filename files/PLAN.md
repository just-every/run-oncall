# Oncall 0.5.10 metadata candidate plan

UTC start: 2026-11-12T12:18Z.
Repository: just-every/run-oncall. Product branch: cloud/sd-oncall-release-0-5-10.

1. Refresh the fleet launcher, install bundle-only Git authentication and the cloud push guard, and preserve fleet identity and co-author cleanup hooks.
2. Clone shallow and filtered, read repository rules and the inline release rules, confirm current main is green and 0.5.10 has no tag/release/live peer.
3. Fetch the v0.5.9 tag and enough main history to inspect its actual metadata and every subsequent product diff. Prepare accurate public notes with no contract identifiers or internal test claims.
4. Update only existing release version references: package.json, seed.json, RELEASE.json, RELEASE.md, README.md and CHANGELOG.md. There is no package-lock.json in this pnpm checkout; do not create one. Keep pnpm-lock.yaml and the published rer 0.2.108 pin unchanged.
5. Run fleet toolchain setup and the metadata validation plus typecheck only. No application/tests/contract/homepage edits, full local suite, browser proof or release publication.
6. Fetch/rebase main before the first candidate commit/push; resolve any real drift within lease. Regenerate sources.lock.json last with the documented command, then check it.
7. Commit with explicit fleet author/committer and hooks enabled. Inspect every candidate identity and trailer, push only the named cloud branch using the fleet guard, and discover/poll exact-SHA Verify through REST within the ten-call budget and 300-second cadence.
8. Record complete non-secret results and receipts in this packet, publish explicitly selected files only to evidence/sd-oncall-release-0-5-10, and delete the product clone/dependencies after successful preservation. Do not tag, sign, publish a GitHub release, modify main or invoke a full-history publication scanner here; the guarded Mac lander owns those steps.
