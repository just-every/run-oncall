# Oncall incident header and persistent save feedback

Tag: main-oncall-incident-saves-1-c1
Repository: just-every/run-oncall
Branch: cloud/main-oncall-incident-saves-1-c1
Candidate: b094e12602a77d199f94ee85aab3cba4418e82ce
Original product: cf4615eae88e98457dcb118ddfcadd8363f379c4
Main merged: 1e8f35e (full identity is in merge-receipt.json)
PR: none; this brief returns the branch to the fleet lander.

## Plan and implementation

The complete plan is PLAN.md. Confirmed main's 051a9936 clock fix before preparing any product push. agedReplayRetention starts at the current whole hour instead of 4 November. Created the requested branch at the original product commit and merged current origin/main without rebase or force. The merge was conflict-free. A fresh pre-push fetch/merge reported Already up to date.

No additional product behavior was added in this carry-forward. The nine-file diff from current main preserves the original incident header filtering/wrapping, persistent Saved states for service and review fields, and accepted-review-only incident timeline behavior, with its maintained HTTP and browser assertions. Main's newer clock and Commander replay tests are retained whole. CONTRACT.md and both generated views are byte-identical to main. Contract write reported zero documents changed; generator check passed. The source lock was regenerated last and its check passed before the merge commit.

## Local results

- Non-interactive rer setup completed and claimed the local synthetic owner.
- Explicit rer build, typecheck and first-party rer check passed.
- The selected reports journey passed, including permanent audit attribution on review drafts, zero draft timeline noise, explicit accepted snapshots, stale/unauthorized refusal, and archive/restart retention.
- The selected incident-saves browser journey passed. All twelve captures were visually reviewed at 1440 and 390; see browser-review.md and screens/.
- Main's merged native agent flow passed in 253.97 seconds. It executes agedReplayRetention and both Commander/Scribe response-loss recovery functions. Loading oncall-agent-role-replay.mjs separately is only a module smoke check, not separate behavioral proof.
- No tests were added by this carry-forward. Verification selections remain 16 before/after and push shards remain 7. The seed cap remains 200; this report does not equate script selections with total behavioral registrations.
- Contract counts before/after: 22 done / 45 partial / 34 missing. OC-036 remains partial; no Status, Gap or Evidence edits and no acceptance-point promotion.
- Candidate diff scan passed credential-shape and injected-value exclusion. The full Base publication scan is unavailable in this cloud and remains a fleet Mac landing gate.

## Claim and limits

CLAIM OC-036 PARTIAL points=none tests=tests/triage.mjs#reports; tests/member-coordination-browser.mjs#incidentSaves

GAP OC-036: This is bounded incident/review feedback and accepted-timeline work. Automatic reminders/escalation, recurring review, hypotheses/chat context and remote ticket synchronization remain missing as main's contract states.

No deployment or main push was performed. Paging remains OFF. Exact-SHA Verify and push custody are recorded separately in the final product receipt; evidence publication alone does not claim product READY, acceptance or landing.

## Publication status

The product branch push succeeded on its first attempt and remote custody was read back at the exact candidate SHA. Verify 43104700847 completed SUCCESS on b094e12602a77d199f94ee85aab3cba4418e82ce. The single REST watcher made four GitHub API calls, at least 301 seconds apart. No rerun or failure-log call was needed. No product blockers remain. The complete actual terminal observation is ci-latest.json and product-receipt.json.

Verify URL: https://github.com/just-every/run-oncall/actions/runs/43104700847

Product custody: READY branch=cloud/main-oncall-incident-saves-1-c1 head=b094e12602a77d199f94ee85aab3cba4418e82ce

Evidence is published only to refs/heads/evidence/main-oncall-incident-saves-1-c1. All selected files are regular, non-secret report, receipt, log or browser-proof files; no environment file, credential, private held-out material or product ref is part of the report-only tree. The clone is removed only after successful evidence publication and remote ref readback. Fleet Mac publication scanning and landing remain separate from this READY result.
