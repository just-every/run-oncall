# Oncall owner journeys

Tag `sd-oncall-design-owner-4` · repository `just-every/run-oncall`

No contract clause claimed; these are owner-journey design fixes (DIRECT 87).

## Replay and verification plan

1. Read the failed-job records for Verify 44130574848. Confirm the three source heads and take the already-repaired, green round 3 delta.
2. Apply the round to fresh main as a linear commit. Keep main's alert notification run registration and OC-061 stakeholder isolation coverage beside the owner assertions.
3. Build and test the emitted Worker through the four affected Verify shards. Check the contract views, release metadata, generated deployment specification and pinned source lock. Capture the changed browser screens at 1440 and 390.
4. Check main again immediately before the guarded product push. Read Verify for the candidate SHA and return the report, receipts and selected synthetic browser captures through the evidence ref.

## Source provenance

| Source | Head | Verify |
| --- | --- | --- |
| Owner round 1 | `24dfae3babb62b0789c25c1e36b59ac02fda8fe4` | 44130574848, failed |
| Owner round 2 | `c8f021a2f1781d0902213b0eca8b1b4b558c15e2` | Reported green by the brief |
| Owner round 3 | `588b45da0cdd4a0f09774688e48cce743552dbe2` | 44205374436, reported green by the brief |
| Starting main | `fd67732578ab13b03f883bbbe1dc9bbd70bc114f` | |
 
The prior jobs endpoint identified the failed browser, transfer, hosted and runtime jobs plus the Verify aggregator. Each prescribed `gh run view 44130574848 --repo just-every/run-oncall --job ID --log-failed` call exited 0 with zero bytes of output. The replay used the provided failure descriptions, the repaired source delta and local emitted-Worker tests to verify the intended behavior.

| Prior failed job | Job ID | Diagnosis from the brief and source |
| --- | ---: | --- |
| Browser | 134207650528 | Alert and urgency diagnostics moved into collapsed Details. |
| Transfer | 134207650579 | The file input became Choose backup file. |
| Hosted | 134207650591 | Alert grouping history uses a plain related-cycle status and disclosure. |
| Runtime | 134207650598 | Packaged recovery guidance must match the source policy and generated deployment specification. |
| Verify aggregator | 134215788589 | Required shard coverage failed. |

## Changed journeys and assertions

- **D10 · Backup.** The Archive page calls the download a full backup and uses a dated filename. The owner browser downloads and parses the backup, compares rotas and overrides with protected state, checks contact-method custody, uploads the same file through Restore a backup, confirms with REPLACE and verifies saved rotas and paging OFF after restore. The transfer and member restore journeys select Choose backup file and retain their original restore and refusal checks.
- **D11 · Phone numbers.** The owner browser saves four local, international and punctuated UK number forms, checks HTTP 200 and verifies the same country code and normalized subscriber number in protected readback.
- **D15 and D16 · Rota Check and grid.** The keyboard and schedule journeys target Coverage times and open Details before Days to check. They compare displayed assignments and dated coverage windows with protected previews, keep the narrow disclosure keyboard assertions, check Nobody on call in the review, check that timeline chips fit, and require later coverage gaps while excluding time before the rota starts. The calendar file journey selects Upload a calendar file, Time off starts and Time off ends, Add time off, and Your time off with its own-person picker. The original malformed file refusal, reviewed upload/apply, member authority and exact protected readback still run.
- **D17 · Alerts.** The response-policy journey checks the plain stopped and paging-off summary, confirms the mechanics start hidden, opens Details, and still verifies the stop reason, recovered notice, attempt cancellation and protected obligation. The bulk-close journey opens Details and Coordination history to check the retained human stop. The urgency journey checks collapsed policy version details, then opens them to verify the retained version. The hosted grouping journey checks one open related alert cycle and opens Related alerts and evidence. Main's separate alert notification run stays registered and runs with the core browser journey.
- **D17 · Integrations.** The keyboard and Events source journeys use Send alerts to this address, Copy alert address, How your tool proves it is you, Alert ID (same ID = same alert), Alert cycle, What to do and Details. They still check the actual address, clipboard, sample, source identity, persisted recovery and rejection paths. Settings checks the exact 1,000-change retention limit in the new sentence.
- **D17 · Reviews and readiness.** Response-report and agent parity checks use End date, Recovery reported by a person, Typical, Slowest 1 in 10, Slowest 1 in 20, completed and still open. They preserve exact UTC bounds, metrics, histogram, CSV and agent/native parity. Readiness and readable-names open Details before inspecting rows and release data, and readiness keeps the protected snapshot, no writes and zero outbound checks.
- **D19 · Restart and recovery.** README and seed-local command messages use the installed `~/.local/bin/rer` command. The recovery text agrees across `scripts/deployment-spec-policy.json`, `scripts/delivery/base/packaging.json` and the generated deployment specification.

## Clause counts

| Tier | Done before → after | Partial before → after | Missing before → after |
| --- | ---: | ---: | ---: |
| Core | 25 → 25 | 35 → 35 | 24 → 24 |
| Agent surface | 1 → 1 | 6 → 6 | 10 → 10 |
| Full target | 26 → 26 | 41 → 41 | 34 → 34 |

`CONTRACT.md`, `ACCEPTANCE.md`, `docs/CLAIMS.md`, `RELEASE.json` and migrations match main. Both contract generator commands passed. The package edition tool regenerated and checked `sources.lock.json` last. The checkout has no `validate:release` pnpm script. The pinned release source inspector passed on the committed candidate and confirmed version 0.5.18 across seed, package and release metadata, with zero clause changes and zero migrations.

## Local retry context

The first core browser shard passed against the replay's working tree. The first transfer attempt reached the fixture clone and stopped because a shallow blobless source lacked objects and Git's upload-pack disables lazy fetching. Hydrating the bounded ref window resolved that error, and the retry's fresh clone opened the committed candidate. The first hosted journey reached its local application checks and the later shard lanes refused the preparation receipt after the commit changed HEAD. The exact-candidate build replaced that receipt. The separate local receipt records the commands' dated outcomes.

## Candidate and main advance

Main advanced during local testing to `731bacf72abc4538e728628d85bf9d844d3b4da0`, which records and shows missed initial incident acknowledgments. The pre-push fetch and rebase kept its `AcknowledgmentStatus` and its new runtime flow. The only rebase conflict was the source lock. Its regenerated contents cover both changes. The replay also retains main's earlier Alert Notification Run and stakeholder isolation assertions.

The final candidate `8cde90725feb7a75b7dc75964e0cb636f208b86f` is one ordinary commit on that parent. The guarded push succeeded once at 2026-11-18T08:43:05Z, and a Git ref read confirmed the identical branch SHA. Release-source inspection passed again on the published candidate.

The earlier `ea2e47bbb9dd35bd7e9f5594eaa9b15d1ff57a7d` build supplied the local transfer, runtime and hosted shard evidence. The first full core browser pass used the replay worktree before that commit. The later exact-SHA browser runs use a fresh production build of the published candidate. See the dated local check receipt for each result.

## Verification result

- Build and typecheck passed on the published SHA, including first-party `rer check`. The rebuilt Worker and generated deployment specification left the committed tree clean.
- The exact-SHA browser core and settings lanes passed. They exercised backup and restore, phone normalization, rota Check and week grid, urgency disclosures, the retained alert notification run, related-alert history, integration setup, response reports and readiness. The paired captures and browser receipts record the visible behavior.
- Transfer, runtime and hosted passed before the rebase. The hosted lane included 9,765 agent-door conformance points, the product settings browser and the independent agent browser. The transfer receipt identifies its pre-rebase source.
- Two supplemental focused browser invocations stopped at argument validation because the part and journey flags were both set. The exact-SHA full browser lanes covered those journeys.
- Exact-SHA GitHub Verify **44269397943** completed with **success** at the 2026-11-18T08:59:27Z readback for `8cde90725feb7a75b7dc75964e0cb636f208b86f`. [Verify run](https://github.com/just-every/run-oncall/actions/runs/44269397943)
