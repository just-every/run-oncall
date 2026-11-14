# Metadata repair plan

1. Set fleet identity, refresh launcher, install bundle-only Git authentication and commit hooks.
2. Clone only just-every/run-oncall shallow with blob filtering; read launcher and seed instructions and the inline release rules.
3. Confirm main has version 0.5.14 and previousVersion 0.5.12, public v0.5.13 Release/tag exists, and v0.5.14 Release/tag is absent. Stop on a different tuple or release peer.
4. Change only RELEASE.json previousVersion to 0.5.13, preserving every other byte and all identifiers. Add no tests and change no clause status.
5. Install frozen dependencies; run affected metadata validation and typecheck. Regenerate sources.lock.json last only if required, with the documented tool, then check it.
6. Fetch and rebase current main before the first product push. Inspect all candidate identities and messages. Push the named cloud branch once using cloud-push.py.
7. Discover and poll exact-SHA Verify through REST within the ten-call budget, no dispatch or rerun, at least 300 seconds between calls for each run.
8. Save the actual non-secret report and receipts, publish selected evidence files only to the evidence ref, and delete the clean pushed clone and dependencies.

No producer invocation, tag, signing, deployment, PR, main push or release publication is authorized. Paging stays OFF. Publication scan and landing remain with the fleet.
