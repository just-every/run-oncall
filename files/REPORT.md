# main-oncall-lead-header-1 results

Repository: just-every/run-oncall
Branch: cloud/main-oncall-lead-header-1
Head: d5ab53018edde5a2a10b3d93473c80966eecf303
Base main: 10340960f5cc7a5e17734d65476817129dbab896
PR: none; repository instructions provide branch Verify and fleet landing, without a PR prerequisite.

## Result and root cause

Reproduced through the public incident page before editing product code: Dana Whitfield assigned Priya Shah as Lead, then pressed Acknowledge. The protected response and a reloaded incident changed Lead to Dana and Assignee to Dana. The timeline still recorded Priya's earlier assignment. Reproduction receipts and screenshots are in reproduction.json, reproduction.log, before-1440.png and before-390.png.

The single-incident lifecycle transition overwrote both `commander` and `assignee` during acknowledgment. The header correctly read these stored fields; it was not a stale display. The existing bulk acknowledgment already retained an explicit lead. The fix applies that same policy to the single-incident command: keep an existing lead, set the acknowledger as Assignee, and supply the acknowledger as Lead only when no Lead is assigned. Human and named-machine responder attribution continue using the existing command checks.

Lead directs the response team. Assignee owns the incident work. Their picker descriptions and the incident guide now explain those separate roles. The header keeps its existing Lead and Assignee controls. Incidents whose Lead was overwritten before this fix keep their saved values; choose the intended Lead using the existing picker. This round performs no historical backfill.

The timeline translates retained generated role changes into plain words, such as “Priya Shah is now lead. Previously Unassigned.” Its event heading says “People updated.” Commander is presented as lead; communications is presented as communications lead. This also improves older stored entries without rewriting history, reasons or authored notes. API history keeps its existing operational representation.

## Scope and validation

Extended the existing `incidentRolesBrowser` helper in the existing `incidentWorkflowBrowser` journey, moving acknowledgment after the public Lead choice. The test checks the command response, exact revision increment, retained assignment history and attributed transition, then reloads and verifies the complete incident through protected HTTP and both header controls. Existing Scribe/Communications assignment and transfer, Lead transfer, responder authority refusals, unchanged paging and zero outbound calls remain. The enclosing journey still checks template publication, checklist custody, merge/alias and split behavior.

- Production build: passed.
- Touched browser journey: passed, `ONCALL_PRODUCT_JOURNEY=roles node tests/product-browser.mjs`, Chromium at `/usr/bin/chromium` with `--no-sandbox`. Browser assertions run at 1440; changed screens captured at 1440 and 390. Existing overflow, hydration and serious/critical accessibility checks passed.
- Typecheck: passed, `pnpm run typecheck`.
- Contract document check: passed; source and generated view files untouched.
- Edition source lock: regenerated last with the documented lock command, then check passed.
- Whitespace check: passed.
- Exact-SHA Verify: completed/success, run 42982950595, https://github.com/just-every/run-oncall/actions/runs/42982950595, exact head d5ab53018edde5a2a10b3d93473c80966eecf303. Four REST calls were used, including discovery; all per-run status requests were at least 300 seconds apart.
- Full local suite: not run, as directed. Exact-SHA branch CI is the full wall.
- Publication scan: reserved for the fleet Mac gate as directed by the cloud adaptation; this cloud cannot run it. No publication or landing claim is made here.

## Counts and contract custody

Registered CI journey entries: 16 before, 16 after. New registrations: 0. The existing role journey was extended; no assertion or independent journey was deleted, skipped or weakened. The repository ships no comprehensive test registration counter or test-budget.json; the 16 count is CI journey entries, not an assertion that the complete seed has only 16 tests. The round requested no cap raise.

Contract summary rows: done 22 → 22, partial 45 → 45, missing 34 → 34. Clause status, Gap and Evidence changes: none. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are unchanged. This round proves the bounded lead/acknowledgment and native role-history flow, not every obligation of an entire acceptance point, so claims conservatively list points=none.

CLAIM OC-004 PARTIAL points=none tests=tests/product-browser-journey.mjs#incidentRolesBrowser
CLAIM OC-050 PARTIAL points=none tests=tests/product-browser-journey.mjs#incidentRolesBrowser
DEFAULT OC-004: Acknowledge assigns incident work to the acknowledger and preserves an explicitly selected Lead; an unassigned Lead becomes the acknowledger, matching the existing bulk command.
GAP OC-004: This focused regression does not by itself prove the acceptance point's complete admitted-alert, stale/concurrent-edit and recovery/resolution sequence; existing suite coverage remains for CI.
GAP OC-050: This round proves native Lead selection/transfer and Scribe/Communications role history, with retained authority checks. Backup paging, chat role flows and browser-closed automatic reminders remain outside scope and retain main's judgments.

## Delivery and retained packet

A single real product commit was pushed through the fleet guard. Candidate author and committer both use the fleet identity; the commit has no coauthor trailers or skip-CI marker. Main was fetched and the unpublished work rebased before publication; main had not advanced, and no conflict arose. The source lock was regenerated after this synchronization. No default branch, other product branch, other repository or inbox file was written. All report material lives outside the product clone and is selected explicitly for the evidence ref.

See PLAN.md for the full plan; product-receipt.json, product-push.log, browser-receipt.json, test-counts.json, clause-counts.json, lock-receipt.json and CI receipts for actual custody and checks. Source-lock.log contains the real generator/check output. Evidence publication is report transport only, not READY, acceptance or landing.

Product blockers: none. Exact-SHA Verify is green and product custody is READY. Evidence publication uses only refs/heads/evidence/main-oncall-lead-header-1. The terminal message carries its exact evidence head. The clone is deleted after successful evidence publication; actual packet files remain under the task work directory. No product landing or release is claimed.
