# Oncall bulk results: final candidate

Repository: just-every/run-oncall
Branch: cloud/main-oncall-bulk-results-titles-1-c1
Final head: 9118b95b704efba6235e81c3ff1352ed84038650
Integrated main: 31813dc (full SHA in final-receipt.json)
PR: none; the fleet owns landing from the named branch.

## Result

Every incident in the 50-item bulk result is named by its retained title, with service/environment context for repeated titles. Counts distinguish succeeded, skipped and refused outcomes. Refusals explain the recovery step. Copy details retains diagnostic identities and titled outcomes. Long results scroll within the panel and long titles wrap on the phone.

A causal bulk receipt defect exposed by this round is fixed: unchanged incident priority, urgency or assignment now retains an explicit no-change receipt, displayed as skipped. It does not create an attributed success without a timeline entry. The existing archive attribution validator and erasure implementation remain intact.

## Plan executed

1. Configured fleet identity, refreshed the launcher, installed the bundle-reading credential helper, push guard and preserving commit hook, and cloned full history. Read launcher/repository rules and contract.
2. Read the prior Verify attempt and failed browser job once. Squashed the original bulk-results branch onto main without conflicts, preserving contract files and current tests, and regenerated the source lock.
3. Committed the net change, built the production Worker, typechecked, and ran the existing bulk journey. Inspected result panels at 1440 and 390. Pushed the first real candidate through the guard.
4. Ran the existing changeAndSigningBrowser on the candidate and main. Both isolated flows reached completion and incident erasure returned 200. Then retained bulk state before the erasure prefix on both heads to test the shared-state hypothesis: main returned 200; the candidate returned 400. Recorded the actual error and repaired its bulk receipt cause.
5. Preserved the published commit, added the corrective commit, and merged updated main according to the cloud preservation rule. Resolved no product conflicts; retained main's contract and generated views whole, ran contract regeneration/check, restored views, and regenerated/checked the lock last.
6. Rebuilt/typechecked the final head; ran the existing bulk journey followed by the erasure flow through the formerly failing assertion, and the existing HTTP bulk and storm groups. Checked every candidate commit's author, committer and trailers, clean tree, contract identity and diff. Pushed the final head through the guard and verified the advertised remote SHA.
7. Collected non-secret report, receipts and changed-screen proof outside the product repository. Exact-SHA Verify is watched through REST within the ten-call budget. Evidence is published only to the declared evidence ref; the fleet retains the publication scan and landing gates.

## Erasure diagnosis

Prior Verify 43143362718 attempt 2 failed again in browser job 130950510773 at tests/product-browser.mjs:369, changeAndSigningBrowser: 400 instead of 200. That repeat did not establish an intermittent failure.

The isolated candidate change/signing flow passed and its incident erasure returned 200. The same function on main also reached its completion marker with incident erasure 200. The retained-state comparison was decisive: main's existing bulk journey followed by the erasure prefix passed with exit 0 and 200; the original candidate failed with 400 and `Invalid bulk outcome reference or attribution`.

The new same-priority browser case correctly asserts that no incident change occurs. The domain leaves the incident and timeline unchanged, but the bulk API stored a successful result for the new operation anyway. Archive validation correctly requires every successful incident result to have that operation's attributed timeline entry. Erasure validates retained state, so this invalid pre-existing receipt blocked erasing an unrelated new incident.

The fix runs after authority, revision and domain checks. For unchanged assignment/priority/urgency, it retains a false result with an explicit no-change reason; BulkResults classifies that result as skipped. No incident data or timeline is changed. Existing replay and unchanged-state assertions are preserved. The fixed comparison and final merged-head comparison both pass with erasure 200 and exactly one incident deleted. No erasure code, validator, test registration or acceptance status was changed.

The external probe uses existing test functions and real emitted-Worker HTTP/browser doors. Its combined mode runs the existing bulk journey, then changeAndSigningBrowser through the formerly failing incident-erasure assertion and deletion readback, stopping before later unrelated signing/docs work. An early evidence listener had a cleanup error while reading a failing response; the corrected diagnostic probe records the actual 400 body and closes its Worker/browser. This harness is evidence-only and never committed to product.

## Validation and counts

Final head checks passed:
- production build and pnpm typecheck;
- source lock check (ok=true) and contract generator check (0 errors, 0 warnings);
- triageBulkBrowser at 1440, including existing snooze/merge, refresh fencing, alert-only closure, workflow, replay, stale isolation and unchanged-priority assertions;
- combined bulk-then-incident-erasure prefix, HTTP 200 and one deletion;
- ONCALL_TRIAGE_PART=bulk and ONCALL_TRIAGE_PART=storm public-door integration groups.

The 50-result storm shows 50 succeeded / 0 skipped / 0 refused. Mixed results show 1 succeeded / 1 skipped / 1 refused. All 50 titles, later-page items, repeated-title service context, shared timeline operation identity, copied details and unchanged replay are asserted. Result panels are captured at 1440 and 390; assertions run at 1440. No full local verify was run; exact-SHA branch Verify is the full wall.

Before -> after: named results 0/50 -> 50/50; new test registrations 0; status totals unchanged at 25 DONE, 42 PARTIAL, 34 MISSING, 101 total. OC-079 remains PARTIAL. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are byte-identical to integrated origin/main. No clause Status, Gap or Evidence cell is edited.

Toolchain: Node 24.19.0, pnpm 10.12.4; the prescribed shim retained the newer VM Node and pnpm emitted the package's Node 22.20.0 engine warning. CI uses the repository pin. Browsers use /usr/bin/chromium with --no-sandbox; no owner browser/profile is used.

## Product custody and history

The first clean squash commit is c025c99d0a783177fa4ed2c66949a70b47f25a8a. Its exact-SHA Verify 43149820551 was last observed in progress and is superseded by the final candidate. After retained-state proof found the cause, corrective commit 4c91727a279adeb9c367c9e1c3e8356630bd31de fixed bulk no-op receipts. Main advanced while the save was published, so merge commit 9118b95b704efba6235e81c3ff1352ed84038650 integrates it. Thus the initial one-commit/no-merge objective held at the first push; the authorized causal fix and mandatory post-publication merge produce three candidate commits including one merge. No published history is rewritten or force-pushed.

Both product pushes succeeded on their first guard attempt. Every candidate author and committer is Run Edit Run fleet <fleet@runeditrun.com>; trailers are absent. No skip marker appears on the final head. Product diff against integrated main: seven files, 194 insertions, 25 deletions. No proof/evidence files are in the product tree. The cloud cannot run the fleet Mac publication scan; that remains a landing gate.

## Exact-SHA Verify

Final candidate run: 43151163890
URL: https://github.com/just-every/run-oncall/actions/runs/43151163890
SHA: 9118b95b704efba6235e81c3ff1352ed84038650
Completed with conclusion success on the exact final SHA. Actual REST response: final-ci-poll-3.json; summarized receipt: ci-receipt.json. Nine of ten budgeted GitHub invocations were used. No failure is waived on this final run.

CLAIM OC-079 PARTIAL points=1,2,5 tests=tests/product-browser-journey.mjs#triageBulkBrowser

GAP OC-079: Upper-bound execution of every bulk action, bundled phone/SMS delivery, native-device and provider proof remain outside this round. Main's existing judgments are retained.

No product blocker remains in local touched checks. Product READY/PUSHED custody and evidence publication are separate; neither evidence transport nor a local receipt grants landing or production authority.

## Reproduce the retained-state probe

With dependencies installed and the exact candidate built, copy packet/probe.mjs to /tmp/oncall-probes/probe.mjs, create /tmp/oncall-probes/node_modules as a link to the checkout's node_modules, and run from the checkout root through cloud_run:

`node /tmp/oncall-probes/probe.mjs bulk-then-change final-candidate`

The harness creates its own synthetic owner and Worker, uses no external account or held key, launches /usr/bin/chromium, captures bulk proof, logs the incident-erasure status/body, and closes its browser and Worker. Separate mode `change` executes the complete existing changeAndSigningBrowser; mode `bulk` executes triageBulkBrowser alone. No test implementation or erasure assertion is weakened in the product checkout.

## Final outcome

Exact-SHA Verify 43151163890 completed successfully on 9118b95b704efba6235e81c3ff1352ed84038650. Local touched checks all passed and both guarded product pushes succeeded. No unresolved product blocker remains. The fleet still owns its publication scan, final landing and release. Evidence publication uses only refs/heads/evidence/main-oncall-bulk-results-titles-1-c1 and the pushed clone is removed after the evidence transfer is verified.
