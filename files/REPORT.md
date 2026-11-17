# Oncall installation fit

Author: Run Edit Run fleet. Date: 2026-11-17 UTC.
Repository: just-every/run-oncall.
Branch: cloud/sd-oncall-chargedesk-fit-1.
Candidate: 84b9d385449a77f5d8a63b7b05070eeb561c4ac7.

## Delivered behavior

The signed-in root title reads the saved installation identity and formats it as `<installation> · Oncall`. The desktop rail shows that installation below the product mark; the phone bar places it beside the mark. Settings retains the same identity. Missing/blank names and the default product name use plain Oncall. Existing development/demo labels remain in place. Fixtures use Example Operations.

Health adds top-level `buildVersion` from Vite's existing compiled package-version definition. Vite captures the checkout commit using Git, returning null if Git cannot identify it. `deployment.sourceSha` prefers the hosted deployment binding and otherwise uses that compiled commit. Existing payload fields, database probe, storage-failure HTTP 503, recovery and paging-off semantics are preserved. Only public build identity is added.

Local setup refuses `MAIL_PROVIDER=none` before saving branding or preparing runtime settings, with the field-specific correction to choose `MAIL_PROVIDER=development`. The option's label and help identify its hosted-only scope. Hosted `none` validation and deployment behavior remain valid. This uses the brief's refusal option and requires no Base or rer-pin change.

## Plan and completed local results

1. Read fresh main, seed rules, branding, signed-in shell, health and installer lifecycle.
2. Implement installation identity in titles and both shell layouts, with the product-only fallback.
3. Compile package version and checkout identity for additive health reporting, preserving hosted binding precedence.
4. Reject the hosted-only mail choice during local setup and document the correction.
5. Extend the existing managed installation and runtime journeys. The final candidate passes the COMPLETE transfer journey, including real public setup refusal/retry, corrected setup, runnable dev, stored-name and absent-name browser checks, native build/preview, compiled health identity, Business grants, imports, checkpoints, inactive restore and erasure fences. Build, typecheck and source-lock checks also pass. The source lock was regenerated last before the repair commit. Contract-document checks pass; their source and generated views were not changed.
6. Push and verify exact-branch custody, run the committed-source publication scan, obtain exact-SHA Verify, and publish this report packet independently of the product branch. Terminal CI is successful: Verify 44077621141 completed/success on the exact candidate SHA. ci-receipt.json records the actual response.

PLAN.md contains the original complete plan. repaired-proof-receipt.json, transfer-full.log, build-repaired.log, typecheck-repaired.log and lock-receipt.json contain the final-head local results. Browser assertions use 1440. The changed workspace and Settings screens were captured on the final candidate at 1440 and 390; their selected images and hashes are recorded in repaired-proof-receipt.json.

The runtime core journey separately passed actual storage outage/recovery, unchanged durable records, buildVersion and deployment identity, plus hosted-mode health and 18 public links, on identical product code. health-receipts.json and runtime-save.log retain the actual receipts, including explicit separation of local/hosted-mode checks from historical field evidence. Hosted mail-off also passed its existing public deploy dry run, native owner sign-in, private-route protection and zero-egress checks; see mail-off.log. These checks do not claim a new provider deployment or mail delivery.

## Corrections and CI history

Initial Verify 44070399922 passed build, contract documents and seven of eight shards. The new installation assertions passed, then the transfer shard refused a signed Business grant. The setup helper had changed the existing transfer fixture's owner email. The repair preserves the existing transfer owner email and the complete transfer rerun passes. Production authentication, grant validation and assertions were preserved. ci-initial-failure.json, ci-initial-jobs.json and ci-initial-transfer-failed.log retain the failure and diagnosis; the workflow environment block was omitted.

The optional hosted mail-off probe initially stopped on a missing Playwright cache, then caught the new docs-page inventory rule. The cache was installed and the health paragraph moved into the existing getting-started guide. The successful rerun and both earlier diagnostics are retained. No failing assertion was removed or weakened.

## Publication and custody

The final committed-source publication scan passes with pinned Gitleaks 8.30.1: complete, full history scanned, zero findings. publication-repaired.json is the actual result for 84b9d385449a77f5d8a63b7b05070eeb561c4ac7. It does not compare against a private environment file; the fleet retains its independent publication and landing gate. Earlier deadline and working-tree invocation diagnostics are retained separately. The official committed-source path excludes generated local setup keys, databases and build output from the publication tree.

The product commits are c089e522b479eca83b213e7d8e8c5d85032c6d1a (initial save with skip-CI marker), a60c7ec6a9288d902bfc02a70e0fce12d530891a (documentation/lock candidate), and 84b9d385449a77f5d8a63b7b05070eeb561c4ac7 (fixture correction/lock). The final candidate has no skip marker. Every candidate author and committer is the fleet identity, with no trailers. The cloud push guard succeeded and Git readback verifies the final branch SHA. Main was fetched and already included; no published history was rewritten. No PR, tag, release or main push was made.

Evidence uses only the separate evidence/sd-oncall-chargedesk-fit-1 ref. Its publication is report transport, independent of product READY, acceptance or landing. No credential, environment dump, private held-out gate file or symlink is selected.

## Scope, counts and claims

Production edits are limited to installation identity, health build identity, local setup refusal and their documentation/integration. Vite configuration is the necessary integration point for compiling the public checkout SHA. There is no version, release-metadata, rer-pin, Base-repository, contract-source or generated-view change.

Registered workflow journey entries: 20 before → 20 after. Contract status table: 26 done / 41 partial / 34 missing before and after, across 101 rows. Clause status changes: none. The installation and runtime journeys were extended; no journey registration or acceptance assertion was deleted.

No contract clause claimed; these are ChargeDesk paging follow-ups.

## Terminal result

READY product candidate: cloud/sd-oncall-chargedesk-fit-1 at 84b9d385449a77f5d8a63b7b05070eeb561c4ac7. Verify 44077621141 completed/success on that exact SHA: https://github.com/just-every/run-oncall/actions/runs/44077621141. The earlier failed run was 44070399922 and its fixture cause is repaired. Seven task-side GitHub calls were used. No product blocker remains. The product is pushed, not landed; acceptance and landing remain with the fleet. The task clone is removed only after evidence publication succeeds, and this packet remains outside it.
