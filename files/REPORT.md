sd-oncall-c-f248: bounded BASE-AGENT-003 acceptance-2 proof

Repository: just-every/run-oncall
Branch: cloud/sd-oncall-c-f248
Candidate: 772967384968f665f6e8363fc1b1e3d00b6fae86
Observed main: f7b5b5ea71e955081501bebf81a4f967459c8e34
Product PR: none; the repository has a branch-push Verify entry point.
CI: Verify 43625299142 event=push status=completed conclusion=success head=772967384968f665f6e8363fc1b1e3d00b6fae86

Result and scope

The selected service-changes observation is implemented in the existing resourceParity journey. No production defect was demonstrated and no production source changed. The only product changes are tests/oncall-agent-resource-parity.mjs, its invocation at the end of tests/agent-door-browser.mjs, and generated sources.lock.json. The seven primary templates from f246 retain their complete body comparisons. A populated eighth template, oncall://services/{id}/changes, now receives the same administrator and viewer field-parity proof under autonomous and held company policies.

The contract judgment remains MISSING. No Status, Gap or Evidence cell, acceptance sentence, derived view, workflow, Base source or visual implementation is changed. Counts stay 26 DONE, 41 PARTIAL and 34 MISSING, 101 rows. Comparison cases increase from 28 to 32, eight resources times two roles times two policies. No new test file or registered journey was introduced; the existing runtime and browser invocations execute the extended journey. No assertion was deleted, skipped or moved behind a new width or branch condition. The old optional Recent changes visibility guard was strengthened to require the view.

Execution and results

PLAN.md records the complete execution plan. The baseline main and f246 predecessor are the shipped f7b5b5ea71e955081501bebf81a4f967459c8e34. Main's push Verify 43615772348 and Run site 43615772258 were observed completed and successful on that exact baseline. The candidate is branch-only; those runs are not candidate proof. A save, f264a37, was published with CI skipped, then a real final commit retained window and sponsor provenance without a skip marker. Main was fetched and merged after the save; no predecessor changes were discarded and no published history was rewritten.

- node src/base/contract-docs.mjs write: exit 0.
- node src/base/contract-docs.mjs check: exit 0.
- git checkout origin/main -- ACCEPTANCE.md docs/CLAIMS.md: exit 0.
- node scripts/edition-authoring/cli.mjs lock: exit 0.
- node scripts/edition-authoring/cli.mjs check: exit 0.
- pnpm run typecheck: exit 0.
- pnpm exec rer check --profile first-party: exit 0.
- git diff --exit-code: exit 0.
- git diff origin/main...HEAD -- CONTRACT.md: exit 0.
- cloud_run perl -e 'alarm 1200; exec @ARGV' -- env ONCALL_RUNTIME_PART=machines node tests/runtime.mjs: exit 0.
- cloud_run npx -y @runeditrun/rer build: exit 0.
- ONCALL_CHROMIUM_PATH=/usr/bin/chromium ONCALL_BROWSER_EVIDENCE=/home/agent/rer-consolidation/work/sd-oncall-c-f248/browser cloud_run perl -e 'alarm 1200; exec @ARGV' -- node tests/agent-door-browser.mjs: exit 0.

An initial development run failed in the newly added class assertion because decision rows also include rule and action metadata. The final assertion compares class and facts explicitly, while the existing disposition, action, revision and sponsor-approval assertions remain intact. This was a test expectation correction; no projection mismatch or production change was found. All subsequent final checks pass.

The machine invocation completed successfully in 499.4 seconds. It began while the published save was checked out and completed after the final receipt-only commit. The runtime entry and production bytes are identical across those commits; the parity helper's later dynamic import used the final helper. The final browser invocation runs on the exact candidate and repeats all 32 field comparisons, the policy and native-state checks, and the native views. CHECKS.json states the actual command and revision provenance. A full local rer verify was not run, following the touched-check rule; push Verify is the full CI gate. Explicit rer build, typecheck and first-party check pass. The isolated emitted Worker and native D1 are real; only the existing external network edge is replaced.

Fixed scenario and public doors

The observation is 2026-11-04T12:00:00.000Z. The exact native window is 2026-11-03T12:00:00.000Z through that observation, 24 hours, inclusive at both ends. Native command doors create Settlement database and Unrelated build worker services and attach only Settlement database as a direct dependency of Payments API. Native source-configuration and authenticated change-ingress doors admit eight records out of chronological order. Five must appear: current root release, a root rollback tied in time with a dependency migration, a root record one millisecond inside the lower bound, and a dependency record exactly on the lower bound. Three admitted records must be excluded: one millisecond before the window, one millisecond after observation, and an unrelated service at observation. All these services are within each role's native permitted service scope, so authority filtering cannot mask an incorrect dependency join. Ingress receipts supply stable record identities, never a reconstructed record body.

Actual active administrator and viewer sessions are established through native member creation and password sign-in before freezing platform time. Separately admitted agents are linked to those exact members with the same full permitted service scope and the existing read scopes. Each agent's complete resources/read JSON value is compared with its own sponsor session's protected GET /api/changes/recent?service=agent-service&at=2026-11-04T12%3A00%3A00.000Z&hours=24 response. No D1 reconstruction or production resource projector supplies expected fields. The unchanged nativeAccess implementation in src/agent-door/native.ts grants these linked Business sponsors all native services when there is no local service-account restriction; these distinct UUID agents use that full native scope. D1 is used only for preservation snapshots and the admitted-agent sponsor association.

The response has five envelope fields and five items with 17 fields each. Whole-object equality includes IDs, event identity, source, provider, service, kind, summary, author, occurred and accepted times, links, context, fingerprint, truncation, time basis, dependency flags, service names and ordering. Independently known admission inputs and returned IDs also check the native response's exact membership, boundaries and time-then-ID order, so two matching but empty or incorrectly joined projections cannot pass. resource-parity.json retains both full values for every role and policy case plus the explicit included and excluded identities, scopes, sponsor and agent IDs, native door and fixed window. It contains synthetic data only and no bearer or session material.

Existing standard and sensitive classes are retained: the sensitive measure counts the five populated authors. Autonomous reads complete under the current policy. Held reads with personal context withhold content until the exact signed-in sponsor approves the saved policy revision and summary hash through the existing approval door; retained executed approval records name that same member and agent. Standard-only existing resources retain their ordinary open review. No scopes, policy classes, approval implementation or production behavior are changed.

Native application records, revisions, all paging records and existing permanent audit remain unchanged. Required read decisions, reviews and approvals may retain their existing custody. The agent-only comparison admits only documented agent-door persistence audit with zero native family revision change. Browser reads separately admit only the existing urgency.request observations, again with no native family revision change, and keep every prior audit row. Every isolated resource case and the completed journey assert zero outbound requests.

Proof rubric for the selected point

- R1 MET: populated native root and dependency records plus permitted unrelated and outside-window decoys; protected native query returns exactly the five independently identified records. tests/oncall-agent-resource-parity.mjs, prepareRecentChanges at line 157 and assertRecentChanges at line 192.
- R2 MET: actual active administrator and viewer sessions, separately admitted sponsoring agents and the same full permitted scope; each protected response equals every resources/read field. resourceParity at lines 58, 74, 85, 92, 118 and 125; resource-parity.json has four service-changes cases.
- R3 MET: both company policies preserve existing scopes, standard and sensitive classes and the exact signed-in sponsor approval or existing review custody. resourceParity at lines 65, 95 and 100; tests/agent-door-runtime.mjs completeResource supplies the protected approval and retry.
- R4 MET: native records and revisions, paging and permanent audit preservation with zero outbound requests. resourceParity at lines 119 to 145, with the unchanged agentReadSnapshot and assertAgentReadUnchanged helpers.
- R5 MET: actual Recent changes screens with realistic root and dependency records at 1440 and 390. captureViews at line 207; desktop assertions compare the rendered response, order, authors, dependency service names and retained context. Browser proof uses real sponsor cookies and the fixed browser clock; screenshots are retained for both roles and both policies. The existing browser invocation now calls this same journey without an optional flag, at tests/agent-door-browser.mjs line 520.
- R6 MET: f246's seven primary comparisons remain and the original field and UTC month assertions are preserved. resourceParity cases at lines 78 to 86; 28 existing cases plus four service-changes cases all pass.

Acceptance-sentence accounting

- Acceptance 1, every record template: existing resourceJourney discovery proof in tests/oncall-agent-resources.mjs is preserved and the machine invocation passes it. No new complete target-surface claim is made.
- Acceptance 2, two-role UI fields: the selected existing service-changes template is now proved by resourceParity and the real native screens. The seven primary comparisons are preserved. Complete acceptance 2 remains unclaimed because private-team and scoped-ownership parity and the other nine additional templates are outside this assignment.
- Acceptance 3, identical missing and out-of-scope reads: existing resourceJourney refusal proof is preserved and passes through the machine invocation. No broader authority claim is added.
- Acceptance 4, write resource links: existing resourceJourney public-door write and readback proof is preserved and passes. Complete every-write-link coverage is not newly claimed.
- Acceptance 5, grant byte budgets: UNMET, unfinished copied Base work; body or request size limits are not substituted. No Base copy is changed.
- Acceptance 6, untrusted customer text: resourceParity requires the untrusted metadata on every record, and existing resourceJourney imported-text and native-fence distinctions are preserved and pass. No wider target-surface claim is added.

DONE-RIDERS accounting

1. Selected slice PASS through populated native HTTP, MCP and built views; whole clause UNMET because the retained parent outcomes remain. No DONE claim.
2. PASS for selected proof: nonempty records, exact expected inclusions and exclusions, whole native response equality; the unsafe authority, revoked credential and erased capture regressions also pass in the existing resourceJourney.
3. Verify 43625299142 event=push status=completed conclusion=success head=772967384968f665f6e8363fc1b1e3d00b6fae86. The runtime path is tests/runtime.mjs with ONCALL_RUNTIME_PART=machines, importing tests/oncall-agent-flow.mjs. The browser path is tests/product-browser.mjs importing tests/agent-door-browser.mjs, which calls resourceParity with browserProof true. Both are in push Verify.
4. PASS: final native browser proof and resource-parity.json are bound to the exact candidate; the machine run's receipt-only revision distinction is disclosed above. No asserted production or runtime entry bytes differ.
5. INSPECTED: no receiving clause or inherited duty text is edited or newly claimed.
6. Mechanical PASS: contract generator write and check pass; generated views are restored from origin/main and not committed. Main's MISSING judgment and all 101 rows remain. No unsupported evidence-cell judgment is written.
7. PASS: no acceptance text, clause IDs, rulings or coverage map changes.
8. PASS for selected read authority and exact sponsor approval, with existing revoked and erased refusal regressions retained. No new write authority or private-team inference.
9. PASS: synthetic isolated native proof only; no actual Business account, provider, paging, device, cutover or legal outcome is represented as proved.
10. PASS: no new custody, consent, spending or authority default is adopted.
11. PENDING GUARDED LANDING: main is f7b5b5ea71e955081501bebf81a4f967459c8e34, not 772967384968f665f6e8363fc1b1e3d00b6fae86. Candidate Verify is reported above. Candidate Run site and full-history publication scanning belong to the fleet after this branch handoff; nothing is counted as landed here.

Inherited duties and pre-ready self-check

- Native authority and D-1 custody: PASS for the selected read, exact sponsor approval, unchanged records and state-changing permanent audit. The existing resourceJourney also passes revoked scoped bearer 401, erased incident and handoff non-disclosure, and captured note replay not_found without resurrection.
- Native independence and D-2 boundary: PASS, paging remains OFF and the selected read and native-view journey creates no outbound requests, paging jobs or receipts. No account operation or delivery authority is inferred.
- D-3 scope: INSPECTED and preserved; no connector or egress is introduced. OC-045, OC-046, OC-048 and OC-049 authority holds and OC-023 team privacy remain unchanged.
- User-visible selected behavior has populated public-door and built-view assertions. No existing assertion was weakened; new UI assertions run at 1440 and both widths retain the view proof. Existing styles and Settings placement are preserved; no icon-only control or UI component is introduced. Visual inspection of the service screenshots confirms the populated root and dependency records. The pre-existing phone lookback input reaches slightly beyond its container; this is an existing styling observation outside this projection-only assignment.
- Source lock and generated documents: PASS as recorded in CHECKS.json. No migration changed, so ledger check is not applicable.
- Exact candidate publication-scan result: commit=772967384968f665f6e8363fc1b1e3d00b6fae86; status=NOT RUN IN CLOUD; complete=unestablished; historyScanned=unestablished; findings=unestablished. The scratch clone has full history, but the cloud handoff does not run the Mac publication scan. The fleet must require COMPLETE with zero findings and its exact-SHA landing gates. No cloud scan or Run site success is claimed.
- New fixture and receipt text contains no email-shaped value, provider-shaped credential or private session. Commit identity and all candidate trailers are checked before each push, including side parents. No OpenAI or Codex co-author trailer is present.

Held remainder and claims

CLAIM BASE-AGENT-003 PARTIAL points=2 tests=tests/oncall-agent-resource-parity.mjs#resourceParity; tests/agent-door-browser.mjs#resourceParity
GAP BASE-AGENT-003: Only the selected two-role service-changes observation is closed. Private-team and scoped-ownership parity, the other nine additional templates, grant byte budgets, complete every-write-link coverage and complete target-surface coverage remain unproved; the contract judgment stays MISSING.

BASE-AGENT-013 discovery, events, prompts, full harness and stranger-agent completion remain held, as do BASE-AGENT-006 and BASE-AGENT-008, SURFACE-004's ambiguous hold and Base replay seam, report and readiness ownership and every existing release prerequisite. The f228 BASE-AGENT-010 scope is not repeated. Signed fixture linkage supplies no actual Business federation proof. Model, investigation, ownership, remediation, recurrence and executor flows remain omitted. Paging stays OFF; provider authorization, A2P, timers, delivery, standby, devices and real-phone and cutover proof remain held. No new account, outbound, activation, release or landing authority is asserted.

Plan rows changed: none. Product blocker: none for this bounded selected point. Parent-clause gaps are retained explicitly. The actual report and receipts are transported only through the separate evidence ref, independently of product READY and landing custody.
