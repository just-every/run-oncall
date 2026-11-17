# Missed acknowledgment results

Author: Run Edit Run fleet. Date: 2026-11-17 UTC.

Product: just-every/run-oncall, branch cloud/sd-oncall-missed-ack-1, head `2f02a12bc54cd0d48c46132b331239ae6562d876`. Pushed successfully; no PR created. Fresh main `fb54c79d904d66342f166910d64996aa399bddf9` was replayed before publication, with no conflict. Main and all default branches were untouched.

The initial acknowledgment timeout now starts when a response policy automatically declares an incident. The existing scheduled transaction records a single durable missed response, a retained timeline entry and a response obligation for the primary responder at the due time. It does not acknowledge, change the incident lead, or send a page. A late acknowledgment, including one before the next scheduled sweep, retains the miss. An on-time acknowledgment, source recovery or turning the timeout off stops the pending initial deadline. Existing snooze and post-acknowledgment re-trigger behavior remains covered by the original deadline journey.

The incident and linked alert now show when acknowledgment is due or missed. On call lists missed responses for open incidents; Reviews retains missed responses for review, including later acknowledged incidents. The service guide gained one short paragraph.

## Before and after

The owner walk used Example Operations: Settings > Services > acknowledgment timeout 1 (saved), Response > Declare an incident (published), then the integration's Trigger test event with a new alert key. The emitted Worker ran through its normal HTTP and UI routes; only the platform clock was controlled, and its real scheduled handler was triggered at the one-minute boundary. This is local synthetic proof, not hosted delivery evidence.

At each of 1440 and 390, initial deadlines went from 0 to 1, fired missed-response records from 0 to 1, and screens showing the miss from 0/4 to 4/4 (incident, alert, On call and Reviews). All eight changed-screen captures after the fix have no horizontal overflow. The committed source was rebuilt and its browser proof repeated after publication. Before/after JSON, twenty screenshots (settings plus four result screens at both widths), the browser driver and actual terminal logs are included.

## Checks

Typecheck, production build, the focused missed-response HTTP journey, the existing OC-058 deadline regression block plus its new extension, contract-document freshness, source-lock regeneration/check, staged diff hygiene, all-candidate identity/trailer inspection and post-push remote SHA verification passed. The focused extension observed zero outbound requests; paging jobs, receipts and callbacks did not change. It covers never-early expiry, repeated intake, restart, audit rollback, concurrent/double sweeps, delayed coverage lookup, late and on-time acknowledgment, source recovery, missing coverage, timeout disabled and accepted archive restore. No assertion was deleted, weakened or skipped. The complete local suite was left to branch Verify as instructed.

The first focused fixture attempt exceeded its synthetic session lifetime while advancing two days. The corrected fixture uses a short real rota cover interval to distinguish due-time coverage from sweep-time coverage, and passes. One mistyped initial CI discovery returned no runs and was discarded; exact-SHA discovery found Verify run 44088634695. The API ledger includes every invocation.

## Counts and scope

17 files changed, 161 insertions and 27 deletions. The existing deadline HTTP registration was extended through tests/missed-ack-flow.mjs; no new Verify registration was added. Configured verification journey invocations remain 20, across the same 14 script paths. These are configured invocations, not an invented whole-repository assertion count. Contract totals remain 26 done / 41 partial / 34 missing = 101, with no status, gap, evidence or acceptance change. Generated acceptance views and release metadata were not edited. sources.lock.json was regenerated last after staging both new files, then checked with the pinned tool.

No contract clause claimed; these are owner-journey fixes (DIRECT 87).

## CI and custody

Verify run 44088634695 on `2f02a12bc54cd0d48c46132b331239ae6562d876` is pending at report preparation. A single REST watcher waits at least 300 seconds between requests and retains actual exact-SHA results in ci-status.jsonl and ci-final.json. RECEIPT.json will carry the terminal state before evidence publication. Product push custody and evidence publication are separate. The full publication scan, independent gates and landing remain with the fleet Mac; no Base clone, refresh, self-submit, tag or default-branch push was used.

See PLAN.md for the complete work plan and RECEIPT.json for machine-readable provenance and check commands. Evidence is selected explicitly from this packet and published only to evidence/sd-oncall-missed-ack-1.

Observed outside scope: GitHub push diagnostics report 12 existing default-branch dependency advisories (10 moderate, 2 low). These were not changed in this timeout fix.

Recovery copy: `/home/agent/rer-consolidation/work/sd-oncall-missed-ack-1/product.bundle`, SHA-256 `c5f76a66c50325e86d305cc4248e8b903eb19bc6eb7b3cd3420a8d7a42bd618f`; git bundle verify passed. The bundle stays outside the product clone and is not part of the public evidence tree.

CI transport update: the 13:11 UTC REST status request failed with `gh: Bad credentials (HTTP 401)`. No terminal Verify result is inferred. The prescribed launcher refresh and Git setup completed; subsequent status reads honor the five-minute per-run cadence and re-read only the decrypted fleet bundle.
