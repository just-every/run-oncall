# Oncall 0.5.22 release metadata

Prepared by Run Edit Run fleet on 2026-11-21.

The product branch is `cloud/sd-oncall-release-0-5-22`. Its head is `9cbcf975224f7171dcd3813e6f54d4b29a0791ca` and its sole parent is the fresh main observed at the start of the round, `f0b093cc21691556860dc622a8932ab098cb0e72`. The previous release is `v0.5.21` at `33cafdc7750103f51ac4173c7b52c8dbcf1efbe0`. The product commit was published at 01:04:38 UTC on 21 November 2026.

## Plan and results

1. Freeze the observed main and check version availability. Git advertised v0.5.21 and no v0.5.22 tag. The GitHub endpoint for a v0.5.22 Release returned HTTP 404, and v0.5.21 was readable. Main was unchanged when fetched again before the commit.
2. Compare the published tag with main. The local archive changes record owner migration order, bridge compatible Platform archives into native checkout history and handle inventory storage during transfer. Explicit local persona sign-in links expire after 15 minutes, and local recovery guidance gives users a way to locate the CLI. The incident-update and changes-read class changes in CONTRACT.md align the inventory with discovery already implemented at v0.5.21. There is no corresponding agent implementation or discovery change in the source diff, so those rows are omitted from the public notes.
3. Bump package, seed and release metadata to 0.5.22 with previousVersion 0.5.21. The CHANGELOG section and publicReleaseNotes agree exactly. The current upgrade guidance carries forward local export, hosted D1 export with the original deploying credentials, backup verification, in-place update and empty-destination recovery. Earlier upgrade instructions and the known limits were preserved. The existing rer 0.2.126 pin and pnpm lockfile were reused.
4. Compare the migration trees. Added migrations are an empty list. All 68 v0.5.21 paths have identical Git blob IDs and modes at main and at the candidate. RELEASE.json records an empty migration list.
5. Regenerate the source lock with the installed 0.2.126 package and run its check. The lock changes only five metadata digests. Run the contract generator and check, the frozen pnpm install, the first-party rer check and TypeScript typecheck. The candidate has six changed files, all within the metadata lease. The clone has no release validator or release-history files, and this cut requires no history-file additions.
6. Push the single release candidate commit, confirm the advertised SHA, then compare every declared project file digest against that exact commit. The only declaration is setup.sha256 and it matches. GitHub Verify completed successfully on the exact published SHA.

The v0.5.21 GitHub Release attached `oncall-0.5.0-incident-1440.png`. Its tracked source remains at `.github/assets/release/oncall-0.5.0-incident-1440.png` with the same blob at the preceding tag, main, and candidate. The previous metadata contains no screenshot field, so the asset stays available under its existing path for the producer.

## Before and after

| Scope | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Core, before and after | 25 | 35 | 24 | 84 |
| Agent surface, before and after | 1 | 6 | 10 | 17 |
| Full target, before and after | 26 | 41 | 34 | 101 |

The preceding tag has the same counts. The candidate keeps the exact 106 tracked test files of its parent.

No contract clause claimed; this is release metadata.

The Mac lander owns the full publication scan. The release producer owns the immutable tag, GitHub Release, and screenshot attachment after landing.

## GitHub verification

Verify run 44847940384 completed successfully on the exact product head. The final status was read at 2026-11-21T01:25:32Z. [Verify run](https://github.com/just-every/run-oncall/actions/runs/44847940384)

The branch was pushed directly for fleet landing. GitHub listed no pull request for the branch.
