# Oncall stranger-34 linear carry

Author: Run Edit Run fleet · 2026-11-15

## Scope and plan

Repository: just-every/run-oncall. Product branch: cloud/main-oncall-stranger34-trips-1-c1. The complete plan is in PLAN.md. This round carries the six commits ending at 9174c4202cc42fd7c8516853bb041327ebffac02, whose base is d8357c8e, onto current main 44ca722b6a5dde173b5253df7b5e0eab762df459 as one linear commit. No prior branch is changed, no release is cut, and no main push is made.

## Carry and conflict decisions

The squash applies without conflicts. All 17 carried files other than the regenerated lock match the original published candidate byte for byte. README.md remains main's complete file, retaining both its v0.5.15 release line and the combined no-Node installer command. CHANGELOG.md, RELEASE.json, RELEASE.md, package.json and seed.json remain main's complete files. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are byte-identical to main. No manual generated-view or source-lock resolution occurs.

The gr changes retained are Team sign-in steps and copy button after member creation, installer-only explicit setup and hosting guidance, the Move-in requirement for a real provider key with a file alternative, and alert titles in the bulk workflow comparison. README installer copy already agrees with current main, so no README edit is needed. The prior round's final hosting revision is retained: keep the local checkout and use a separate hosted checkout, because deployment does not upload local records. The remaining destructive local recipe writes an export and checks that it is nonempty before reset, connected by && so a failed export or check prevents reset. The next command documents import. No remote hosting or deployment is attempted.

## Five trip results retained

1. HMAC reference: docs/incidents.md uses OpenSSL and shell tools. The existing Events-source journey runs the displayed recipe through a PATH without Node, npx or a package manager, with a trailing newline in the event file, and verifies accepted signed ingress.
2. Covered shifts: the rota dialog filters overlapping cover from requestable shifts, falls back to a usable shift and gives removal/review/apply instructions when cover blocks a request. The existing schedule journey proves the refusal, a real uncovered-alternative request and unchanged stored cover. Storage and override validation are untouched.
3. Fresh restore: docs/data.md installs/fetches with the installed rer command; npx is a labelled alternative for an existing Node 22+ installation. The private archive is copied into exports before import. This carry reviews the inherited instructions; it does not perform a new installation-transfer or hosted restore.
4. Erasure docs: docs/data.md and docs/changes.md point to Settings → Archive → Erase someone's data, distinguishing the displayed-name UI confirmation from the ID-based HTTP body.
5. Readable erasure: import journals render a human label for erased-artifact custody and the success message names the erased category with an eight-character receipt reference. The existing Move-in journey checks no full digest or UUID reaches the workspace, confirms the short reference, and checks retained journal output again after reload. Erasure records and effects are untouched.

## Counts and claims

Before → after: 17 → 17 registered public-flow invocations in scripts/verify-shards.json. Existing journeys are extended by the carried change; this carry adds or removes no registration or assertion. Clause counts stay 26 done / 41 partial / 34 missing, total 101. Published: 19 / 3 / 0; target: 7 / 38 / 34. No clause Status, Gap, Evidence or acceptance text changes, and no new DONE or CLAIM line is made. No original report or CLAIM line is included in the supplied references; no original evidence ref was present among the clone's remote refs.

## Local verification and limits

Setup completed through cloud_run npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive, including the production build and 68 migrations. Typecheck passed. Focused existing browser legs cover the touched Events-source/HMAC, Move-in and schedule behavior; exact commands and outcomes are recorded in RECEIPT.json and their complete non-secret terminal outputs are selected in this packet. They use /usr/bin/chromium with --no-sandbox and close their browsers and local Workers. Assertions are at 1440 for the changed behavior and the existing journey code captures its changed screens at 1440/390; no separate screenshot session was added. The full local rer verify suite is not run, as instructed. Installed edition-authoring 1.1.0 regenerates sources.lock.json last and its check passes. Contract-doc generation check passes. The cloud adaptation delegates publication scanning and landing browser proof to the fleet Mac; this report does not claim those gates ran here.

## Product custody and CI

Product commit: 98d633ee7d20ebbb1d68842eaab998bbdffb284b. Its sole parent is main 44ca722b6a5dde173b5253df7b5e0eab762df459. There is one candidate commit and no merge commit. The final candidate has no skip-ci marker or co-author trailer. The prescribed full-range author/committer/trailer inspection passed and the preservation guard pushed the branch successfully on attempt 1. Git fetch and rebase confirmed main remained current before publication. Product-push and identity-audit outputs are included.

Exact-SHA Verify run: 43717600735, https://github.com/just-every/run-oncall/actions/runs/43717600735. The single REST watcher observed completed/success on the exact candidate SHA at 2026-11-15T13:30:54.319945+00:00. It made five GitHub API calls total: one discovery and four run observations, each at least 300 seconds apart. No failed-job log, rerun, PR or unrelated API call was needed. No PR is required by this repository's supplied landing rules and none was created. Evidence publication is report-only and does not establish acceptance or landing.


## Terminal result

READY candidate: cloud/main-oncall-stranger34-trips-1-c1 at 98d633ee7d20ebbb1d68842eaab998bbdffb284b. All local touched checks and the full exact-SHA Verify pass. No conflicts, clause-status changes, new claims, additional product changes or product blockers. The fleet retains responsibility for its independent publication scan, landing and any final browser proof; green branch CI is not a landing claim. The pushed clone will be removed after successful report-only evidence publication and read-only remote-ref confirmation, retaining this packet and product provenance outside the clone.
