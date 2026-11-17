# sd-oncall-oc031-1 — CloudWatch/SNS intake

Author: Run Edit Run fleet · 2026-11-17 UTC
Repository: just-every/run-oncall
Branch: cloud/sd-oncall-oc031-1
Candidate SHA: b7b365cc882699e2f4582ddb1727a8747977cea4
Verify: repaired candidate pushed; exact-SHA Verify pending. Previous failure and repair are recorded below.

## Scope and implementation

Implemented SNS in the existing routed integration credential model and HTTP admission mechanism. Administrators configure the exact AWS account, region/partition and SNS topic. Existing encrypted credential custody, audit-before-readback, routing rules, key rotation, revoke and inactive restore remain the management model. No AWS key is needed or used.

The HTTPS endpoint verifies SNS SignatureVersion 1/RSA-SHA1 and 2/RSA-SHA256 canonical messages. Certificates are fetched only from the configured regional AWS SNS HTTPS origin and bounded certificate path. Confirmation URLs are validated before any confirmation, bound to the signed topic and token, and fetched only after successful signature verification. The single outbound helper refuses redirects and has a five-second deadline and streamed 64 KiB response bound. UnsubscribeConfirmation is verified and recorded without another provider action.

Confirmation attempts commit an audited pending owner notice before the idempotent provider action. Failure/interruption stays visible; retries can safely repeat the signed confirmation token. Successful confirmation and its receipt are audited. Credential/session/revision guards fence durable writes and preserve revoked credentials' refusal.

Each authenticated SNS MessageId and canonical-content fingerprint joins the existing durable intake receipt ledger. Identical retries return the original receipt, conflicting reuse is refused, and signed messages outside the 24-hour past/five-minute future window are refused. Existing receipt capacity provides the storage bound. Stable account/region/alarm-name identity and latest source state time prevent older/equal observations from triggering or recovering an alert. ALARM triggers, OK recovers, and INSUFFICIENT_DATA remains a retained note with no lifecycle effect. Alarm name/ARN, description, reason, source timestamp (including CloudWatch compact timezone offsets), account, canonical/provider region and dimensions survive in the receipt context.

Complete SNS envelopes are bounded to 2 MiB. Inherited OC-059 requires credential-authenticated oversized/unparseable bodies to retain high-urgency incomplete custody with 202/truncation, no raw body, a hash/byte count and owner notice. They never trust partial alarm identity/state or fetch provider URLs. A complete forged signature, foreign topic/account/region or unsafe URL creates no intake state change. Retained alarm context is bounded to 256 KiB and 30 AWS dimensions, preserving their full bounded values.

The existing Settings → Routing form now offers Amazon SNS / CloudWatch with account/region/topic fields; sender setup shows status, last notification, audited endpoint reveal and failure/alternate-coverage guidance. Existing rotation and revoke controls apply. Browser assertions run at 1440; screenshots show creation and status at 1440 and 390 with the private endpoint masked.

## Plan and validation

The complete adopted plan is PLAN.md. Actual command receipts, final SHA provenance and CI results are in RECEIPT.json; stdout from relevant checks accompanies it. The focused test is tests/sns.mjs#snsJourney, registered by tests/intake.mjs. It generates a fresh RSA key and self-signed certificate locally and substitutes only the outbound AWS network edge. Application hostname trust has no test exception. Temporary private keys are removed and are absent from this packet.

Touched checks include typecheck, production build through cloud_run, existing intake and routing public Worker journeys, focused SNS/browser proof, generated-contract check, pinned source-lock regeneration/check, diff hygiene, and complete candidate identity/trailer inspection. The cloud adaptation leaves the complete publication scan to the fleet's landing machine; no claim of a cloud publication scan or landing is made. No full local verify or unrelated suite was run.

## Counts and clause judgment

Actual CONTRACT.md counts are unchanged: 26 done / 41 partial / 34 missing / 101 total, before and after. OC-031's source status, Gap and Evidence remain unchanged (missing). The builder claims an implemented partial flow for lander judgment; the builder does not edit those cells or the generated views. CI top-level journey registrations remain 20 → 20; the existing intake registration now calls one additional focused SNS public-door subjourney (0 → 1). No existing assertion was removed, skipped or weakened.

CLAIM OC-031 PARTIAL points=none tests=tests/sns.mjs#snsJourney
DEFAULT OC-031: Workspace administrators manage the integration through the existing routed-key authority and immutable account/region/topic binding; exact regional provider origins only, deny by default, audited idempotent subscription confirmation as the sole automatic external action, recorded owner/alternate-coverage notices and paging OFF.
GAP OC-031: Acceptance point 1 requires an authorized real AWS topic and real CloudWatch ALARM/OK/INSUFFICIENT_DATA transitions, duplicates/reordering and credential lifecycle; held under R-12. Real topic-policy least privilege and live provider delivery are unproven. External owner notification and alternate-route delivery remain unbuilt while paging is OFF. No numbered acceptance point is claimed.
EVIDENCE OC-031: tests/sns.mjs#snsJourney and its registration in tests/intake.mjs; actual stdout, screenshots and exact-SHA CI provenance in this packet. All AWS fixtures and delivery outcomes here are synthetic; none are real-account evidence.

No release metadata, version pin, tag, CONTRACT.md judgments or generated acceptance views were changed. Product and evidence publication are separate. No main push, PR, self-submission or landing was performed. Clones are deleted only after successful product/evidence publication and preservation of the actual packet.

## Exact-SHA CI failure and repair

Verify 44070724877 on bb4e179efaad0e3fa0372ed637fd0708f583d424 failed in transfer job 133997507381 at tests/transfer.mjs:633. The native `rer export` door returned `invalid_policy_module`. All other product shards, build and contract-docs passed. Aggregate job 134003258167 failed because that transfer shard failed. Each failed job archive was read once; sanitized excerpts are in ci-failure.txt, without the workflow environment dump.

The new intake model imported sns-config without a `.ts` extension, and sns-config imported the domain without its `.ts` extension. The Worker bundler resolved these imports, while native Node's portability-policy loader could not. Directly loading scripts/installer/archive-policy.mjs reproduced ERR_MODULE_NOT_FOUND. Both imports now use explicit `.ts` paths, matching the surrounding Node-reachable archive graph. The native policy module loads and the public pinned `rer export` command succeeds (113 tables, four local setup rows). Its actual stdout is export.stdout.txt; the archive itself is private local recovery data and is not in this packet. No portability assertion or provider test was weakened.

Repaired candidate: b7b365cc882699e2f4582ddb1727a8747977cea4. Typecheck, production build, source-lock regeneration/check and the exact-commit SNS/browser journey passed again. Four fleet-authored commits are preserved on the same branch; no published history was rewritten.
