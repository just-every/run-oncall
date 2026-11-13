# main-oncall-rer-0213-1-c1 plan

1. Configure fleet identity, launcher credentials and commit hooks; clone full-history just-every/run-oncall only.
2. Start at current origin/main and apply the original adoption delta without publishing a provisional commit. Preserve main's contracts and newer source. Inspect the installed edition tool's changes report and diagnose the original lock mismatch.
3. Install the frozen lockfile cleanly; regenerate sources.lock.json using node_modules/@runeditrun/rer/edition-authoring/cli.mjs, and run the exact CI check plus typecheck. Keep the pin at 0.2.113, Base origins at c2efb501cbc148c2aee4d5e1107ebdba81469006, and intentional seed adaptations.
4. Probe production deploy dry run without credentials and populated-import refusal. No UI work, full local verify, clause changes or acceptance claims.
5. Fetch/rebase current main before the one real commit, regenerate/check the source lock last, verify unchanged contract bytes and inspect all candidate commit identities/trailers. Push only cloud/main-oncall-rer-0213-1-c1 through cloud-push.py.
6. Watch exact-SHA Verify through REST at 300-second minimum intervals, within ten GitHub calls. Preserve actual non-secret reports/receipts outside the product checkout; publish explicitly selected files to evidence/main-oncall-rer-0213-1-c1. Return product provenance and lane POST.
