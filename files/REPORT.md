# gr-mt-oncall-dep-4 dependency maintenance

Repository: just-every/run-oncall
Branch: cloud/gr-mt-oncall-dep-4
Commit: fc88b51136d08cb6de1d584a38e7fc015a648daa
Tree: 059d2f1979ceab4496b6e31167dd4701a9a237b8
Base: 4d1fc62d4d2b8bf90008ac87bbaa626bc1a5494b

## Plan and scope

The complete plan is in PLAN.md. Inspect the fresh main checkout and its pins; update only vulnerable resolutions; regenerate both pnpm lockfiles and source lock; run frozen installs, setup, build, typecheck and the focused existing runtime journey; scan the exact committed tree before any product publication; audit commit identity and use the guarded named-branch push; verify exact-SHA CI when budget permits; return the complete explicit report packet through the separate evidence branch. Product publication and evidence return remain separate.

## Changes

- package.json: raise the existing undici override from 7.29.1 to the first patched 7.30.1.
- pnpm-lock.yaml: regenerate with pnpm 10.12.4, resolving undici 7.30.1 and zod 4.6.7. Existing TanStack parent versions and ^4.5.4 zod ranges already admit the patched release, so no zod override is needed.
- src/modules/mail/package.json and pnpm-lock.yaml: apply the same undici override and regenerate the standalone lock. pnpm 10.12.4 also normalizes 16 libc metadata lines; no unrelated package versions change.
- sources.lock.json: regenerate last with the repository's documented edition-authoring lock command; only the four changed file digests change.
- Vite is already patched at 8.2.4 in package.json and the root lockfile on the starting main. Its manifest and lock resolution remain at 8.2.4.

The first pnpm command combined override replacement with a deep update and re-resolved unrelated transitives. That generated result was discarded before committing. Running the override lock install first, followed by the targeted transitive zod update, produced the final small diff. The saved lockfile comparison proves no unrelated package versions changed.

## Before and after

Three vulnerable lock resolutions become zero: root undici 7.29.1 to 7.30.1; mail undici 7.29.1 to 7.30.1; root zod 4.6.3 to 4.6.7. All three requested dependency families now meet the brief's patched-version requirements. Of the nine cited historical alerts, six Vite alerts were already addressed in main; the remaining three undici/zod lockfile occurrences are addressed here. This is version and lockfile evidence; GitHub alert closure itself was not queried.

No tests were added, deleted, skipped, weakened or changed. No application UI, migrations, contract text, clause statuses or generated contract views change. The 101 existing clauses remain 26 done, 41 partial and 34 missing (published: 19/3/0; target and push further: 7/38/34). No clause completion claim is made by this maintenance round.

## Local validation

Node 22.20.0 and pnpm 10.12.4 match the repository pins. All long-lived commands run through the provided cloud_run subreaper; one heavy job runs at a time.

- pnpm install --frozen-lockfile: PASS.
- pnpm --dir src/modules/mail install --frozen-lockfile: PASS. The standalone mail install reports its existing unapproved workerd build script; the root build and HTTP journey use the root-approved workerd dependency and pass.
- npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive: PASS; 67 local migrations, first owner claimed, temporary server stopped by setup. Setup output in the packet omits private links and sensitive lines.
- node src/base/contract-docs.mjs check: PASS, 0 errors and 0 warnings; contract views current.
- node scripts/edition-authoring/cli.mjs lock then check: PASS.
- npx -y @runeditrun/rer build: PASS; existing dynamic-import bundling warnings only.
- pnpm run typecheck: PASS.
- env ONCALL_RUNTIME_PART=core node tests/runtime.mjs: PASS on this exact commit. Existing emitted-Worker HTTP journey covers held-data upgrades, auth/roles, scoped and signed ingress, concurrent CAS, incident/recovery/runbook/review/follow-up, archive rollback and equality, restart, session invalidation, replay purity, health and 18 linked pages. Runtime provider references explicitly identify dated prior evidence; no live provider or paging run occurred here.
- git diff --check: PASS before commit; product checkout is clean afterward.

Complete build, typecheck, runtime and install logs and structured command receipts accompany this report. No full local suite or UI browser run was necessary for this dependency-only change. Push Verify is the full CI wall.

## Publication and CI

Base publication scan: COMPLETE/PASS with zero findings on the exact candidate commit and tree. Four pre-existing observations are classified separately by the scanner against the remote public main and are retained in the full actual report. Guarded product push: successful on the first attempt to cloud/gr-mt-oncall-dep-4. A fresh fetch and rebase check found no main drift; every candidate author/committer is Run Edit Run fleet <fleet@runeditrun.com>, with no trailers. Exact-SHA Verify completed successfully: run 43604217792, https://github.com/just-every/run-oncall/actions/runs/43604217792, head fc88b51136d08cb6de1d584a38e7fc015a648daa. Gitleaks 8.30.1 was fetched via GitHub REST and its archive SHA-256 verified against release metadata. The scanner from the pinned @runeditrun/rer@0.2.113 package runs on a clean detached worktree of this exact commit with the remote public main as baseline and environment-value checks enabled. Full actual scanner report and its receipt will be included. No scanner implementation or publication rule is changed.

No PR has been created. No main/default-branch push, force push, merge to main, deployment, paging or GitHub message is performed. Lane relay instructions are returned as final POST lines. Product READY status requires the exact candidate Verify; evidence publication does not establish readiness or landing.

The first scanner invocation completed with one destination.invalid finding because the command supplied --repository as a slug and omitted --project. Inspection of the scanner's destination validator showed that it expects --repository https://github.com/just-every/run-oncall and --project just-every/run-oncall. It reported no content or secret finding. The first full report and receipt are preserved as attempt-1-publication-scan.json and attempt-1-publication-receipt.json. The corrected invocation inspects the identical commit and tree; no code, identity metadata or scanner policy was changed to address this command error.

Product push: first attempt succeeded. Exact-SHA Verify run: 43604217792, https://github.com/just-every/run-oncall/actions/runs/43604217792. The single REST watcher polls at ten-minute intervals after discovery to preserve the ten-call budget. The push transport reported existing vulnerabilities on the current default branch; this report does not claim to remediate unrelated advisories or prove alert closure before landing.

## Terminal result

Exact-SHA Verify run 43604217792 is completed/success for fc88b51136d08cb6de1d584a38e7fc015a648daa; final REST observation: 2026-11-14T14:39:17.563027+00:00. Eight of ten GitHub API calls were used in total, including scanner visibility checks and CI discovery/status. No failed jobs required log reads, and no workflow was dispatched or rerun.

Product custody: cloud/gr-mt-oncall-dep-4 is pushed and its remote head was verified as fc88b51136d08cb6de1d584a38e7fc015a648daa. The exact commit and tree passed all required local checks, the complete Base publication scan with zero findings, and Verify. Product READY is supported. No PR was created; no repository instruction requires one for this maintenance branch. The Mac/fleet owns landing and reruns its own gates. This cloud did not land or deploy.

Clause changes: none. Status, Gap and Evidence judgments and all existing contract counts remain unchanged. No CLAIM lines apply because the brief names dependency upgrades rather than a target acceptance clause. Default: preserve patched Vite 8.2.4 already on main; select zod through the existing parent ranges; preserve all unrelated package versions and legacy prose. Gaps/blockers for this maintenance scope: none. No live provider, phone, paging, full-suite local or UI proof is claimed.

The dedicated publication worktree has been removed. Setup and runtime servers/workers stopped, and the CI watcher exited successfully. No app server, browser or Worker process remains running. Complete report, plan, receipts and non-secret actual logs remain in the task packet. The separate report-only evidence publication transfers this packet; its returned EVIDENCE line is reported in the terminal message independently of product READY. result.json is also saved at the maintenance task's required path outside the clone.

Required lane relay: POST lanes/gr/INBOX.md: gr-mt-oncall-dep-4; undici 7.29.1 -> 7.30.1 in both locks, zod 4.6.3 -> 4.6.7, Vite already 8.2.4; vulnerable lock resolutions 3 -> 0; clause/status changes none; head fc88b51136d08cb6de1d584a38e7fc015a648daa; Verify 43604217792 success; complete publication scan PASS, zero findings; READY on cloud/gr-mt-oncall-dep-4.
