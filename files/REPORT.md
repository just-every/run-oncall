# Oncall refusal explanations: current-main replay

Task: main-oncall-explain-refusals-1-fix1-c2. Repository: just-every/run-oncall. Product branch: cloud/main-oncall-explain-refusals-1-fix1-c2.

## Plan and implementation

See PLAN.md for the complete execution plan. The previous refusal-explanations branch was squashed onto current main rather than replaying its historical merge. Main at start was 4fed382945f688afdcceb15ae9df976135cdbb1e. The only squash conflict was sources.lock.json; main's copy was restored and the documented lock generator regenerated it after the replay. All eight UI source files match the prior round, while both browser journey files preserve main's newer changes alongside the refusal assertions.

The changes retain native field constraints, persistent inline errors and focus on the first invalid field; Status creation preserves refused drafts and shows the server reason; Set status explains the missing reason; rota coverage review and swap submission explain their disabled actions. The prior member-coordination refusal captures remain intact. No feature beyond this round was added.

CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are byte-identical to main. No clause Status, Gap or Evidence was edited. OC-009 remains partial and OC-022 remains done. Counts before/after: 23 done, 44 partial, 34 missing, 101 total. The configured verification command registrations remain 16 -> 16; no test registration was added, removed, skipped or weakened. This command count is not a count of every assertion or distinct contract behavior.

## Local validation

Fleet launcher, decrypted-bundle Git helper and preserving commit hooks were installed. The prescribed cloud toolchain ran setup with the fleet owner address. Typecheck, production build, generated contract freshness, documented source lock regeneration/check and changed-line credential-shaped-value inspection passed. The full publication scan is unavailable in cloud and remains a Mac landing gate.

The touched member and product browser scripts are run sequentially with /usr/bin/chromium and --no-sandbox. Assertions for this change run at 1440; changed refusal screenshots are captured at 1440 and 390. The complete member-coordination script passed. Existing focused readable-times and rota-timeline scripts passed. The complete product script failed later in the unchanged Events-source check, as detailed below. Exact-SHA Verify is pending.

## Claim and limits

CLAIM OC-009 PARTIAL points=none tests=tests/product-browser-journey.mjs#productSchedule

GAP OC-009: This bounded refusal-feedback replay does not prove every acceptance point or the named assistive-technology and conformance-report duties. No DONE claim is made.

No provider account operation, deployment, main push, PR or other repository write is authorized by this report. Evidence transport is separate from product readiness and does not certify acceptance or landing.

## Full product script failure outside this round

The complete member-coordination script passed (exit 0). The complete product script reached and passed the refusal, keyboard, rota, cover-review and swap checks, then failed much later in eventsSourceBrowser at tests/product-browser.mjs:633. It read the newly mounted Ingress URL while it was still relative, then new URL(url) threw ERR_INVALID_URL. RequestExample initially uses an empty origin and fills location.origin in useEffect; this assertion can run before that effect. Both tests/product-browser.mjs and src/integrations/RequestExample.tsx are unchanged from main. The failure is recorded, and no unrelated Events change or weakened assertion is added to this replay. Existing focused schedule and coordination commands are run separately for clean touched-flow exit results. Exact-SHA Verify remains the full wall.

## Product publication and preserved source

Product head: d563ad121bcc5508a89c85e908e823c910a11ac5. Base: 4fed382945f688afdcceb15ae9df976135cdbb1e. Tree: 13fe9bd3a2e0034a955515624c33a8d8cdd12394. Candidate commits: 0 -> 1; candidate merge commits: 0. The current-main fetch and rebase check found no drift. The one ordinary commit changes exactly the intended 11 files, with 164 insertions and 38 deletions. All locally tested changed-file hashes match the committed source. sources.lock.json was regenerated last and its check passed. All three contract documents remain byte-identical to main.

Every candidate author and committer is Run Edit Run fleet <fleet@runeditrun.com>; the candidate has no trailers and no skip-CI marker. The guarded named-branch push succeeded on attempt 1. No main push, force push, published-history rewrite or PR was performed. Product provenance and the actual guarded push receipt are included separately.

## Browser results

- Complete member-coordination browser: exit 0, including the three Status refusal states and existing hosted sign-in and automation legs.
- Complete product browser: exit 1 in unchanged Events-source URL hydration timing, after the intended refusal, schedule and keyboard checks had passed.
- Existing focused readable-times: exit 0, including keyboard coordination, swap, coverage and readiness in Australia/Brisbane with a New York rota.
- Existing focused rota-timeline: exit 0 at 1440 and 390, including the schedule, override and preview public doors.
- Ten original refusal captures were reviewed: five states at 1440 and 390. No unrelated proof is selected for evidence publication. The phone server-refusal viewport shows its first line at the lower edge; the desktop capture shows its complete text. This framing limitation does not change the passing server-refusal assertion at 1440.

## CI custody

A single REST watcher discovers and polls only d563ad121bcc5508a89c85e908e823c910a11ac5. The first successful API response could not be decoded after task-side URL sanitization damaged its JSON. The sanitizer was corrected to clean parsed strings while preserving structure. That call counts against the ten-call budget, and discovery retries observe the 300-second minimum. Verify run 43130282710 has been discovered on the exact candidate SHA and is in progress: https://github.com/just-every/run-oncall/actions/runs/43130282710. Two workflow API invocations have been used, including the discarded first response. No green result has yet been claimed.
