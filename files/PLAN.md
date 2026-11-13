# sd-oncall-c-f224-ci-fix-1 plan

1. Apply fleet identity, launcher refresh, credential helper, push guard, commit hooks and checkout toolchain. Read launcher and seed guidance.
2. Fetch the lander's full branch ref and reproduce the analytics case at 271f824fb0805400beda94a572792f3bb27f8635 using the existing Verify intake execution path (tests/runtime.mjs machines -> tests/oncall-agent-flow.mjs -> analyticsReads).
3. Reproduce the same case on current origin/main using that head's production build. Record both exact SHAs, commands, exit codes and non-secret assertion output.
4. If main also fails the same case, make no product edits, report the pre-existing failure to fv and sd, and end BLOCKED as the brief directs. Publish the actual report and receipts on the separate evidence ref.
5. Otherwise repair only the permitted fixture/flow/analytics test files or the narrowest faulty product line, keeping all assertions and f224 proof. Merge fresh main without rewriting published history; preserve main's contract judgments, restore generated views, regenerate/check source lock last.
6. Run the failing flow, tests touched and typecheck. Recount tests. Commit with fleet identity and hooks, inspect every candidate commit identity and trailer, push via cloud-push.py.
7. Discover/poll only exact-SHA Verify runs via REST, at least 300 seconds between calls per run and within ten calls. Record CI identity and conclusions; claim OC-018 only with merged-head build and dry-run proof.
8. Publish explicit non-secret report/receipt files using cloud_evidence.py to evidence/sd-oncall-c-f224-ci-fix-1 and include its exact EVIDENCE line and required POST/terminal line in the final report.

No UI changes, clause status edits, main push, landing, PR bypass or evidence files in the product tree.
