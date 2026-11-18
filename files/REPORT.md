# Oncall action-evidence replay on current main

Run `sd-oncall-c-f263-lin-1` · `just-every/run-oncall` · 17–18 November 2026 UTC  
Prepared by Run Edit Run fleet.

## Plan and disposition

1. Compare current main with the feeder branch. The merge base was `53b2694d100a30707210aafa41207ff4ee451c34`. The only feeder-side commits were `7d77358cfd4c7979d77553cf3c6b574bf2456957` (evidence completion replay and conflict) and `e70051e60c403f6bd99c992871751ee42d7963a0` (completed material and retained custody checks).
2. Replay the net test changes on a direct child of main. Import the standalone helper from the final feeder unchanged. In the HTTP journey, run it after the existing native-revision and response-loss probes. In the browser journey, append its isolated installation checks after the existing submission and response-loss checks. The existing retention probes remain in both journeys. The feeder's `docs/agents.md` entry was outside the test and lock lease and was left out.
3. Regenerate and check the source lock after staging the new helper. Verify that contract source and generated views match main, the candidate introduces zero merges, the comparison with the feeder accounts for main's new assertions and other base changes, and the lock differences cover the three replayed test files.
4. Build and re-prove the exact candidate with the focused helper, the regular runtime agent entry point, the full touched browser journey, typecheck, first-party check, and contract and lock checks. Capture the changed screens at 1440 and 390, with main assertions exercised through their regular entry points.
5. Publish the verified linear candidate through the guarded branch push. Discover and poll Verify by exact SHA. Return the report, check receipts and public synthetic browser proof on the dedicated evidence ref.

## Coverage and counts

The focused helper runs both autonomous and held policies through MCP on an emitted Worker backed by native D1. A P2 follow-up completes once under its evidence policy. The held path records the named sponsor's one approval. Exact retries with fresh JSON-RPC IDs return the stored result, and changing only the evidence URL returns `idempotency_conflict`. The original arguments still return the original result afterwards. The proof checks the incident, revisions, timeline, permanent audit, original outcome and expiry, approvals, reviews and paging custody. It checks the linked attempt audits and zero outbound requests.

The existing browser journey adds both completed review-material views and the held approval's pending and executed views. It checks that protected HTTP material agrees with the MCP outcome, that the evidence link is retained without being fetched, and that result retrieval does not issue another approval POST. Desktop assertions run at 1440. The proof captures both 1440 and 390.

The verification plan has 21 registered command entries before and after. The focused coverage extends one existing runtime journey and one existing browser journey. Contract totals stay 26 Done, 41 Partial and 34 Missing, for 101 clauses. BASE-AGENT-012 stays MISSING in the contract. The bounded claim covers points 1 and 3 for evidence-policy `oncall.actions.submit`; the remaining tool coverage, job-handle and authority gaps persist.

The Mac lander owns the exact-tree publication scan and landing.

CLAIM BASE-AGENT-012 PARTIAL points=1,3 tests=tests/oncall-agent-action-evidence-replay.mjs#actionEvidenceReplay; tests/agent-door-browser.mjs#focusedActionEvidenceReplay

GAP BASE-AGENT-012: Remaining coverage, job-handle and authority gaps persist. Contract remains MISSING.

## Local result and product custody

Product branch `cloud/sd-oncall-c-f263-lin-1` points to `ee04767ba115fc758347cef364eb033c8f300a51`, the single direct child of fetched main `76e7ed5eb83d6cf3dba8b591a10cf63028eb4f4a`. The product push succeeded on its first guarded attempt at 23:56 UTC, and a Git ref readback confirmed the full SHA.

The focused replay, agent runtime journey, agent browser journey, build, typecheck, first-party check, contract generator check and source-lock check all passed on the candidate. The runtime journey also passed the existing required native-revision, retention and dropped-result proofs. The eight changed browser captures showed the completed review material, held approval pending and held approval executed at both widths. All eight captures fit with zero serious or critical axe findings and zero measured undersized controls.

Preliminary standalone launches stalled because the invocation passed `--input-type=module` to Miniflare's CommonJS worker. The successful focused run used a dynamic import without that flag. The exact candidate used the checkout's pinned Node 22.20.0 and pnpm 10.12.4.

## Exact-SHA Verify

Verify run 44203618419 completed with conclusion **success** on 2026-11-18T00:11:48Z for the pushed commit. [Verify run](https://github.com/just-every/run-oncall/actions/runs/44203618419)
