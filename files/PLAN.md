# Oncall v0.5.13 metadata plan

Recorded 2026-11-13T18:21:36Z.

1. Read the supplied fleet/release rules, launcher AGENTS.md, and seed AGENTS.md, CONTRACT.md and ACCEPTANCE.md. Install fleet identity, credential helper, push guard, commit hook and toolchain outside the product tree.
2. Establish current green main, latest public release and absence of a competing v0.5.13 tag/branch. Compare actual main with v0.5.12.
3. Update only existing current-version references, CHANGELOG.md and RELEASE.json. Preserve historical instructions, actual rer 0.2.113 pin, migration bytes, product/tests/contract/homepages and other owners' work.
4. Run release metadata readers and typecheck only. Refresh main and rebase before the first publication, regenerate the edition source lock last and check it with both the documented vendored and CI installed-package readers. Review the exact scoped diff and all candidate identities/trailers.
5. Commit with the required fleet environment and active hooks; push cloud/sd-oncall-release-0-5-13 through the cloud push guard at the first real commit. Never push main, tags, publish or deploy.
6. Discover exact-SHA Verify and poll by REST no more than once per 300 seconds, within ten GitHub calls. Save actual non-secret reports/receipts only in this packet, publish the separate evidence ref, and delete the successfully pushed product clone/dependencies at completion.

No new tests, full local suite, browser work or product acceptance claims are appropriate for this version-only lease. The fleet's Mac lander owns publication scanning, landing and later release production/signing/publication.
