# Oncall newcomer recipes

Repository: just-every/run-oncall
Branch: cloud/main-oncall-recipes-toolchain-1
Product head: 8b21d6ea781a11d750e5434cb3d107b534d01215
Base: 809d67a8 (main unchanged at pre-publication fetch/rebase)
PR: none; this seed uses the fleet branch landing contract.

## Result

Events API HMAC now signs the exact timestamp/body bytes with OpenSSL and sends them with curl. All Change events samples now run as `sh send.sh`, using curl/OpenSSL and standard shell tools, for native bearer, native signed, GitHub, GitLab, Argo CD, Terraform Cloud and PagerDuty sources. The page and linked change guide name the tools and say no Node.js is required. GitLab decodes its Standard Webhooks secret before signing; PagerDuty's private routing key is JSON-escaped at runtime. Sample text never embeds the key. Receiver and signing verification code are unchanged.

The fresh-checkout hosting guide installs `rer`, puts its launcher on PATH, then uses `rer install` instead of npx. Its explicit setup recipe also uses installed `rer`. Legacy upgrade prose remains intact. No Base code, global Node installation, contract judgments, generated acceptance views or product evidence files changed.

## Plan and execution

The full original plan is retained in PLAN.md. Completed steps:
1. Applied fleet identities, launcher refresh, decrypted-bundle Git helper, commit hook, and the supplied cloud toolchain. Read launcher and seed AGENTS.md and the inline rules.
2. Installed the real public shell installer into an isolated scratch HOME, using only a scratch bin and system directories on PATH. It brought a private Node runtime and installed rer; `node` and `npx` remained unavailable to the calling shell.
3. Used the unchanged emitted Worker, real local D1, a new synthetic owner and the rendered Sample request fields to reproduce both sample failures from the original baseline build. The Events HMAC sample printed `node: not found`, received HTTP 401 and exited 22. Running the Change JavaScript file as documented exited 127 because node was missing. The old hosting npx command and node-version guide check likewise exited 127.
4. Changed only the two generated sample components, the getting-started/change guides and the existing browser journey. Replaced old wording pins with execution of the copied recipe, retention assertions and real receipt checks. A focused selector reuses the existing sender-setup leg; it adds no test registration.
5. Exercised all eight rendered sample variants with no Node/npx/package manager on the sender's PATH. Captured the changed source and guide screens at 1440 and 390. Signed bodies include ordinary apostrophes and non-ASCII service/repository/source names; the displayed shell quoting preserves exact bytes.
6. Exercised the fresh hosting `rer install` and unattended owner setup with the real installer-provided command and no global Node. The private Node 22 download initially failed to use this VM's required HTTPS proxy. A task-local Undici EnvHttpProxyAgent preload supplied cloud transport support; repeating the same guide commands succeeded. No global tools were changed. This preload is cloud infrastructure, not an Oncall dependency.
7. Fetched main and rebased with the required fleet identity. Main was unchanged. Generated the source lock last and passed its check and the contract-document check. Inspected all candidate identities/trailers and the diff for credential-shaped additions. Committed once and pushed once through the guard; first attempt succeeded. The Mac lander still owns the complete publication scan.
8. Exact-SHA Verify 43353936328 completed with the known main analyticsFixture 401/200 failure in intake. All other substantive jobs passed, including browser. It was not rerun or changed. The aggregate verify archive could not be decoded; its exact command and diagnostic are retained in CI-RESULT.md. There were 8/10 GitHub calls. Product custody is PUSHED, not READY; successful exact-SHA Verify remains the blocker. Full actual receipts are in CI-RESULT.md, ci-receipt.json, ci-watch.json, ci-jobs.json and the failed-job logs.

## Public-door proof

`before-recipes.json`, `guide-before.txt`, `after-recipes.json`, `guide-after.json` and the executed recipe-proof.mjs retain actual non-secret results. The report-only harness reads the rendered textareas and executes their contents unchanged. Its curl shim forwards the original arguments to the real system curl and records response headers; it does not fake network responses or replace application code.

| Displayed recipe | First HTTP response | Replay |
| --- | --- | --- |
| Events API HMAC | 201 | 200, same record |
| Change native bearer | 201 | 200, same record |
| Change native signed | 201 | 200, same record |
| Change GitHub | 201 | 200, same record |
| Change GitLab | 201 | 200, same record |
| Change Argo CD | 201 | 200, same record |
| Change Terraform Cloud | 201 | 200, same record |
| Change PagerDuty | 202 | 202, same record |

Every missing-key probe exits nonzero. Seven source modes retain exactly seven changes after replay. These are local receiver protocol receipts using synthetic provider-shaped payloads; they are not live provider delivery or hosted-account proof.

## Validation and counts

- `cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive`: passed.
- `cloud_run npx -y @runeditrun/rer build`: passed.
- `pnpm run typecheck`: passed.
- Existing `tests/product-browser.mjs`, focused `sender-setup`: passed; actual copied Change recipe executes in a tool-only PATH and is retained. Existing refused Alertmanager batch handling is still asserted.
- Existing `tests/product-browser.mjs`, focused `events-source`: passed; copied bearer and signed samples execute without Node; recovery, deduplication, identity refusal and retained history assertions remain. Browser proof is at 1440 and 390.
- Report-only full recipe matrix: 8/8 pass; first responses 7×201 and 1×202; all replay and missing-key checks pass.
- Source lock, generated contract documents, JavaScript syntax and `git diff --check`: passed.
- Generated recipe dependencies on global Node: 2 → 0. The two reproduced failing sample paths: 2 → 0. API receiver/signature changes: 0. New registrations: 0; existing CI lane command entries: 16 → 16. Clause status changes: 0; no DONE claim. Full target status counts remain 26 done / 41 partial / 34 missing (101 total), before and after.

The local browser tests are the touched journeys; no full local verify was run. Branch Verify is the full wall. The known analytics fixture session-clock failure belongs to main-oncall-session-clock-1 and was not changed or rerun here.

## Claims and limits

CLAIM OC-018 PARTIAL points=none tests=tests/product-browser.mjs#senderSetupBrowser
CLAIM OC-033 PARTIAL points=none tests=tests/product-browser.mjs#eventsSourceBrowser
CLAIM OC-065 PARTIAL points=none tests=tests/product-browser.mjs#senderSetupBrowser

These are bounded recipe improvements, not proof of every obligation in a complete clause acceptance point. CONTRACT.md Status, Gap and Evidence, ACCEPTANCE.md and docs/CLAIMS.md remain unchanged.

DEFAULT OC-033: Use system curl/OpenSSL and standard shell tools for newcomer request samples; keep private keys in ONCALL_SOURCE_KEY.
DEFAULT OC-065: Keep generated sample retry identity stable within the saved file; replays return the original change.
GAP OC-018: No real hosting-account operation was requested or performed in this round.
GAP OC-033: This round does not repeat provider email, revocation, malformed MIME or quota proof.
GAP OC-065: No live GitHub/GitLab/Argo/Terraform/PagerDuty sender or chat context is claimed.

Base needs no change for these recipes. If it wanted to make arbitrary existing `node`/`npx` documentation work after the installer, it would need an explicitly supported public runtime command or PATH shims for its private runtime, preserving pin selection and upgrade behavior. The latest installer observed here advertises `rer run --script`, while this checkout's pinned 0.2.108 runner lacks that option; using curl/OpenSSL avoids that version dependency.

No PR or main push was made. Evidence publication is separate from product readiness and landing.
