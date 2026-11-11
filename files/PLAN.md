# Incident header and persistent save feedback carry-forward

Repository: just-every/run-oncall
Branch: cloud/main-oncall-incident-saves-1-c1
Original product commit: cf4615eae88e98457dcb118ddfcadd8363f379c4

1. Set fleet identity, refresh only the authorized launcher bundle, install credential helper/push guard and repository-preserving commit hooks.
2. Clone full filtered history; confirm current main includes agedReplayRetention's relative wall-clock fix (051a9936).
3. Create the named branch at the original product commit and merge current origin/main. Preserve main's newer contract and tests; make only merge-required changes. Regenerate/check source lock last; generated views remain main's whole files.
4. Set up pinned dependencies, reinstall fleet hooks, then commit the merge with fleet author and committer and no AI co-author trailer.
5. Run typecheck, relevant source/contract checks, changed API reports journey, incident-saves browser journey, and main's merged agent journeys. Capture only changed screens at 1440/390 outside the product tree. Add no tests.
6. Fetch and merge updated main if needed, regenerate/check lock if necessary, verify all candidate identities and trailers including side parents, then push only the named product branch with cloud-push.py.
7. Discover and watch exact-SHA Verify through REST with one watcher and at most one call per 300 seconds per run. Respect the ten-call budget. Rerun failed shard jobs once if needed; fix only scoped failures.
8. Save complete non-secret reports and receipts in this packet, publish explicitly selected files to the separate evidence ref, remove the pushed clone, and return CLAIM, POST and READY/PUSHED provenance.

OC-036 remains PARTIAL, points=none. No clause judgments or generated views will be committed. No full local suite. Base's full publication scan belongs to the fleet Mac after cloud publication.
