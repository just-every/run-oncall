# Verification receipt

Round sd-oncall-c-f270 · 18 November 2026

Product branch `cloud/sd-oncall-c-f270`

Product head `7b506110e8e8f38a8a87c6e0ba01f8da93f2cb83`

Base main `d88d44c4e8dedd1bf69682d3d2abcf4116dad3c4`

Node 22.20.0, pnpm 10.12.4 and system Chromium 154.0.8037.57.

## Contract and source lock

    Wrote 0 contract documents.
    Contract prose: 0 errors, 0 warnings.
    Contract documents are current.

Generator write and check exited 0. The views were restored from the tracked main ref. Pinned edition-authoring lock and check exited 0. No migration changed.


MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none.

## Agent runtime lane

`ONCALL_VERIFY_PREBUILT=1 ONCALL_VERIFY_LANE=agents node tests/verify.mjs` exited 0 at precursor `dc85018623c7fb2cecc96d92441f45878628c699`. A diff to the product head was empty outside the browser link selector and its source lock hash. The runtime source, fixture and build inputs are identical.

    PROBE BASE-AGENT-012 acceptance 2 autonomous oncall.actions.submit: completed MCP stream destroyed at headers with unread body; D1 terminal original and one owned due-dated P2 evidence follow-up with done=true with agent submission and acceptance attribution before recovery; new RPC id returns original outcome and executed approval receipt where present; one native audit commit and revision increment; custody unchanged apart from linked replay-attempt audit and capacity bookkeeping; zero outbound requests and no evidence fetch
    PROBE BASE-AGENT-012 acceptance 2 held oncall.actions.submit: completed MCP stream destroyed at headers with unread body; D1 terminal original and one owned due-dated P2 evidence follow-up with done=true with agent submission and acceptance attribution before recovery; new RPC id returns original outcome and executed approval receipt where present; one native audit commit and revision increment; custody unchanged apart from linked replay-attempt audit and capacity bookkeeping; zero outbound requests and no evidence fetch
    Runtime agents completed (471.9s)
    Journey completed: tests/runtime.mjs {"ONCALL_RUNTIME_PART":"agents"} (472.8s)
    Oncall verification passed: agents

## Exact-head build and focused observation


`node scripts/verify-oncall-build.mjs` exited 0. The command ran the first-party check, built the production Worker and ran `tsc --noEmit` with the exact-head build receipt.

The file-based Node harness imported and ran `focusedActionSubmitResponseLoss` from `tests/oncall-agent-action-submit-response-loss.mjs` on the candidate. Exit 0.

    PROBE BASE-AGENT-012 acceptance 2 autonomous oncall.actions.submit: completed MCP stream destroyed at headers with unread body; D1 terminal original and one owned due-dated P1 human-review follow-up with done=false with agent submission and no human acceptance before recovery; new RPC id returns original outcome and executed approval receipt where present; one native audit commit and revision increment; custody unchanged apart from linked replay-attempt audit and capacity bookkeeping; zero outbound requests and no evidence fetch
    PROBE BASE-AGENT-012 acceptance 2 held oncall.actions.submit: completed MCP stream destroyed at headers with unread body; D1 terminal original and one owned due-dated P1 human-review follow-up with done=false with agent submission and no human acceptance before recovery; new RPC id returns original outcome and executed approval receipt where present; one native audit commit and revision increment; custody unchanged apart from linked replay-attempt audit and capacity bookkeeping; zero outbound requests and no evidence fetch
    PROBE BASE-AGENT-012 acceptance 2 autonomous oncall.actions.submit: completed MCP stream destroyed at headers with unread body; D1 terminal original and one owned due-dated P2 evidence follow-up with done=true with agent submission and acceptance attribution before recovery; new RPC id returns original outcome and executed approval receipt where present; one native audit commit and revision increment; custody unchanged apart from linked replay-attempt audit and capacity bookkeeping; zero outbound requests and no evidence fetch
    PROBE BASE-AGENT-012 acceptance 2 held oncall.actions.submit: completed MCP stream destroyed at headers with unread body; D1 terminal original and one owned due-dated P2 evidence follow-up with done=true with agent submission and acceptance attribution before recovery; new RPC id returns original outcome and executed approval receipt where present; one native audit commit and revision increment; custody unchanged apart from linked replay-attempt audit and capacity bookkeeping; zero outbound requests and no evidence fetch

## Exact-head agent browser lane


`ONCALL_VERIFY_PREBUILT=1 ONCALL_VERIFY_LANE=agent-browser ONCALL_CHROMIUM_PATH=/usr/bin/chromium node tests/verify.mjs` exited 0. The existing journey completed the signed-in sponsor step, validated the exact saved revision and summary hash, and asserted the stored evidence link at 1440 px. The proof captured both policy modes and the held approval screens at 1440 and 390 px.

    Browser proof follow-up-complete-loss-autonomous 1440: fits=true serious/critical=0 undersized-controls=0
    Browser proof follow-up-complete-loss-autonomous 390: fits=true serious/critical=0 undersized-controls=0
    Browser proof follow-up-complete-loss-pending 1440: fits=true serious/critical=0 undersized-controls=0
    Browser proof follow-up-complete-loss-pending 390: fits=true serious/critical=0 undersized-controls=0
    Browser proof follow-up-complete-loss-executed 1440: fits=true serious/critical=0 undersized-controls=0
    Browser proof follow-up-complete-loss-executed 390: fits=true serious/critical=0 undersized-controls=0
    Browser proof follow-up-complete-loss-held 1440: fits=true serious/critical=0 undersized-controls=0
    Browser proof follow-up-complete-loss-held 390: fits=true serious/critical=0 undersized-controls=0
    PASS agent door browser: native incident/review/responders, linked/pending/error people, pending/executed/paused approval, Agents and guide; assertions at 1440, browser proof at 1440/390 with overflow, 44px controls and axe measurements
    Journey completed: tests/agent-door-browser.mjs (308.7s)
    Oncall verification passed: agent-browser

## Product push


The guarded push exited 0 on its first attempt. A Git remote ref read confirmed the candidate SHA. All commits in the candidate range used the fleet author and committer identity with no trailers. The contract and generated-view diffs were empty.


## Exact-head agent runtime rerun and CLI bootstrap


`ONCALL_VERIFY_PREBUILT=1 ONCALL_VERIFY_LANE=agents node tests/verify.mjs` exited 0 on the final candidate.

    PROBE BASE-AGENT-012 acceptance 2 autonomous oncall.actions.submit: completed MCP stream destroyed at headers with unread body; D1 terminal original and one owned due-dated P2 evidence follow-up with done=true with agent submission and acceptance attribution before recovery; new RPC id returns original outcome and executed approval receipt where present; one native audit commit and revision increment; custody unchanged apart from linked replay-attempt audit and capacity bookkeeping; zero outbound requests and no evidence fetch
    PROBE BASE-AGENT-012 acceptance 2 held oncall.actions.submit: completed MCP stream destroyed at headers with unread body; D1 terminal original and one owned due-dated P2 evidence follow-up with done=true with agent submission and acceptance attribution before recovery; new RPC id returns original outcome and executed approval receipt where present; one native audit commit and revision increment; custody unchanged apart from linked replay-attempt audit and capacity bookkeeping; zero outbound requests and no evidence fetch
    Runtime agents completed (465.9s)
    Journey completed: tests/runtime.mjs {"ONCALL_RUNTIME_PART":"agents"} (467.0s)
    Oncall verification passed: agents

The standalone `rer verify` wrapper exited 1 during its Playwright Chromium download, before any application test. The direct runtime and browser Verify lanes both passed, and push Verify completed successfully on the exact SHA. The browser journey used the cloud VM system Chromium.


The attached [CI.json](CI.json) records the push Verify run and conclusion. The complete publication scan, guarded main update and Run site remain for the lander.
