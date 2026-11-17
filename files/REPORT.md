# sd-oncall-c-f261-lin-1 plan and results

Author: Run Edit Run fleet; date: 2026-11-17 UTC.

Repository: just-every/run-oncall. Product branch: cloud/sd-oncall-c-f261-lin-1.
Base: 4988fbbe5e310410f02d3cfbd4ffc323bc967a6f.
Feeder: cloud/sd-oncall-c-f261, 0b1e46522288036dab1eab105aa5585c5c0042da.

Plan:
1. Refresh fleet bundle; install fleet Git authentication, identity and forwarding commit hooks. Clone only the declared product repository with depth 1 and blob filtering; deepen to identify common ancestry.
2. List commits absent from main. Reapply only aebb502c00a8856aac6b171af084fbea2fd6a99d (retention proof) and bba345b9f353918ed98690f1e9ea6a100fdd0a90 (audit attribution) as their net test changes in one ordinary commit. Exclude merge 0b1e465.
3. Resolve browser import conflict by retaining both main's actionSubmitNativeRevision and feeder's agedActionSubmitRetention. Preserve all other main assertions, including the native-revision browser case and its once-only approval assertion. Add retention assertions and proof on top. Do not edit CONTRACT.md or either generated view.
4. Install checkout dependencies using rer setup, repeat the commit-hook installation, build, typecheck and run rer check --profile first-party. Regenerate sources.lock.json last with the installed edition-authoring CLI and run its check.
5. Commit the four leased files. Prove agedActionSubmitRetention, oncall-agent-flow and agent-door-browser on that exact SHA. Browser proof uses system Chromium and shows changed screens at 1440 and 390, with assertions at 1440. Run one heavy process at a time. Preserve complete sanitized reports and receipts outside the product clone.
6. Check linear ancestry, unchanged contract/views, exact feeder comparison, candidate commit identities and all trailers; push only the named cloud branch through the fleet guard. Discover and poll exact-SHA Verify through gh REST, at most once per 300 seconds and within ten calls. Publish explicit evidence files to the separate evidence ref. Record claim without promoting the clause. Remove the product clone only after successful publication and verification, retaining packet evidence.

Scope: tests/oncall-agent-action-submit-retention.mjs (new), tests/oncall-agent-flow.mjs, tests/agent-door-browser.mjs and regenerated sources.lock.json. No product implementation or contract judgment changes.

CLAIM BASE-AGENT-012 PARTIAL points=1 tests=tests/oncall-agent-action-submit-retention.mjs#agedActionSubmitRetention
GAP BASE-AGENT-012: Remaining coverage, job-handle and authority gaps persist. Contract remains MISSING.

Recorded results follow.

## Candidate

Product head: 0f758adfe7e73cf994fb5e52379ad1757b3372a5. One ordinary commit, zero merge commits. The retention helper is byte-identical to feeder 0b1e465. Only four leased files differ from main. `ancestry.json` and `feeder-comparison.patch` explain every feeder-to-candidate difference: unrelated files equal fresh main; browser and flow preserve f260 native-revision additions; the lock describes their combined hashes. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md equal main byte for byte.

Counts: contract done 26 -> 26, partial 37 -> 37, missing 33 -> 33 (96 clauses). Existing Verify command registrations 20 -> 20, distinct registered journey files 14 -> 14. The new retention helper extends the existing HTTP and browser registrations; no standalone registration or unrelated behavior was added. The helper proves the same completed-submission retention behavior under autonomous and held policies at T+86400000ms and T+86401000ms.

Setup, build, typecheck, first-party check, contract-docs check, edition-authoring lock regeneration and lock check all passed. No Base refresh or Base clone was performed. No public publication scan can run in this cloud adaptation; the fleet Mac retains that landing gate.

Local command investigation: an initial focused runner used Node --input-type=module -e. Miniflare became ready but its synchronous D1 proxy worker did not return, including with the pinned Node. These startup attempts were interrupted by explicitly killing only their owned Node/workerd PIDs. A minimal file-based Miniflare+D1 probe passed. The focused check was corrected to execute an ordinary /tmp/run-retention.mjs file without inherited inline-module flags. No product or dependency source was altered; complete attempt outcomes remain in checks.jsonl.

## Retention proof boundaries

`agedActionSubmitRetention` prepares an ordinary owned, due-dated P1 human-review follow-up through the signed-in native coordination HTTP door. It submits the evidence URL through emitted MCP as the admitted agent. Autonomous execution and sensitive held execution are separate isolated native D1 runtimes. The held sponsor approves the saved revision and summary hash once at T.

At exactly T+24 hours and one second later, only the unchanged signed policy is renewed and a fresh token for the same person, agent, client, consent and scopes is issued. Identical tool arguments and idempotency key with a fresh JSON-RPC id retrieve the original structured outcome and saved receipt/review identity. The original terminal call and expiry do not slide. Assertions compare the full native effect snapshot, incident revision and timeline, attribution, permanent state-changing audit, approvals, reviews and paging. Only the linked replay-attempt audit, relay custody and capacity bookkeeping may advance. The submitted follow-up remains open awaiting human acceptance, and no evidence URL or external destination is fetched.

The browser case drives the actual sponsor control once at T and later reads the retained follow-up and original executed approval. Each changed screen is captured once at 1440 and 390 after the last boundary. Assertions use 1440; the 390 captures preserve the existing phone smoke/proof convention. Browser reads preserve native custody, repeat no approval POST, and fetch no submitted evidence.

Proof limits: simulated platform-clock boundaries through emitted Worker/native D1 are timing proof for the shipped submission slice. They are not claims of complete mutating-tool coverage, foreign-person job-handle refusal, long-work status, new execution authority, model/provider delivery, independent standby or physical-phone proof. The clause's existing MISSING judgment stays untouched.

Focused exact-SHA retention check: PASS, 11.55 seconds, all four policy/age observations. Broader `tests/oncall-agent-flow.mjs`: PASS on 0f758adfe7e73cf994fb5e52379ad1757b3372a5, 517.80 seconds. Its existing native-revision proof and the new retention helper both ran; the final native-human-review and sponsor-erasure assertions passed. Browser journey is executed separately on the same head.

Newer main commits explaining the feeder-to-candidate difference:

```text
4988fbb Reapply native submission revision refusal on current main
09f2821 Preserve the managed transfer fixture owner identity
2f6edae Document installation identity and local mail setup
6dfdd84 Show installation identity and keep local setup usable [skip ci]
```

Browser invocation including its independent resource-parity journey: PASS on the candidate, 328.47 seconds. Changed retained-result screens at both widths report fits=true, serious/critical=0 and undersized-controls=0. The six retention screenshots and eight main native-revision screenshots are selected as the directly relevant visual proof. All browser observations are retained in agent-browser.log. Main's native-revision browser case and once-only sponsor approval assertion are preserved and passed. The held follow-up screenshot was visually inspected at both widths.

Exact-SHA post-commit checks: typecheck PASS (3.71s), rer check --profile first-party PASS (1.41s), installed edition-authoring source-lock check PASS (0.47s). Final pre-push fetch still named 4988fbbe5e310410f02d3cfbd4ffc323bc967a6f; rebase was a no-op. Working tree clean; zero candidate merges; all candidate author and committer fields use the fleet identity; no trailers. One guarded product push succeeded on attempt 1. No PR was created and no default branch was pushed.

Exact-SHA Verify discovered: run 44144864021, https://github.com/just-every/run-oncall/actions/runs/44144864021. It is tracked with one REST watcher, at most one call per 300 seconds including discovery, under the ten-call budget. Its terminal result is recorded below before evidence publication.

## Publication custody

Git remote ref readback confirmed cloud/sd-oncall-c-f261-lin-1 at 0f758adfe7e73cf994fb5e52379ad1757b3372a5. All product provenance is in product-provenance.json. There are no live local Worker, Chromium or Node test processes. Four interrupted local runtime scratch directories were removed after all test processes ended. The tool-session reconnect occurred while the CI watcher was sleeping; it was resumed from persisted timestamps with one watcher and no extra REST call.

The public evidence selection contains the complete report, actual setup/build/check/test logs and receipts, ancestry and feeder comparisons, commit identity/trailer inspection, source-lock results, CI records and fourteen directly relevant PNGs: six retention views and eight preserved native-revision views. The complete invoked browser journey is recorded in agent-browser.log. Explicit file selection excludes credentials, environment dumps, private gate material and symlinks. Evidence is published only under evidence/sd-oncall-c-f261-lin-1, independent of the pushed product branch and its READY status. The fleet Mac retains publication scanning, landing and post-landing gates.

## Terminal result

READY product candidate: cloud/sd-oncall-c-f261-lin-1 at 0f758adfe7e73cf994fb5e52379ad1757b3372a5.

Exact-SHA Verify 44144864021 completed/success, observed 2026-11-17T18:30:04Z through the required REST endpoint. The watcher used five GitHub calls total (discovery plus four status observations) with at least 300 seconds between calls. No workflow was rerun or dispatched. No failing jobs or blocked log transports occurred.

Required local proof, remote product custody and exact-SHA Verify all passed. No blockers remain for this candidate. Contract status changes: none. BASE-AGENT-012 remains MISSING; the builder claim is PARTIAL, point 1, bounded to the shipped oncall.actions.submit retention slice. Done/partial/missing counts remain 26/37/33. Verify command registrations remain 20 and distinct registered journey files remain 14. The final head contains one ordinary commit and no merges. The fleet owns publication scanning, landing and its independent gates; this report does not claim main was updated.

Author: Run Edit Run fleet; 2026-11-17 UTC.
