# Oncall local validation receipt

Product HEAD d043b91abfe1b99baf3bad37a178811e91dfe71e
Branch cloud/sd-oncall-c-f273-lin-2
Origin advertised this exact head at 2026-11-18T11:35:53Z.
The candidate range has one commit and zero merges. Commit identity, trailer review, whitespace check and changed-line hygiene check passed.

| Check | Result |
| --- | --- |
| `pnpm exec rer check --profile first-party` | Pass |
| `cloud_run npx -y @runeditrun/rer build` | Pass |
| `pnpm run typecheck` | Pass |
| `node src/base/contract-docs.mjs check` | Pass |
| `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check` | Pass |
| `cloud_run node -e "import('./tests/oncall-agent-action-evidence-replay.mjs').then(({focusedActionEvidenceReplay}) => focusedActionEvidenceReplay())"` | Pass |
| `cloud_run env ONCALL_RUNTIME_PART=agents node tests/runtime.mjs` | Pass |
| `ONCALL_CHROMIUM_PATH=/usr/bin/chromium cloud_run node tests/agent-door-browser.mjs` | Pass |

The replay, runtime and browser used Node 22.20.0. The browser used system Chromium 154.0.8037.57 with headless and no-sandbox settings. The changed journey asserts at 1440 pixels and captures the same pages at 1440 and 390.

## Worker proof excerpts

```text
PROBE BASE-AGENT-012 acceptance 4 autonomous optional revision oncall.actions.submit: current required revision with stale expected_revision -> isError revision_conflict, exact parent current_revision 3 in metadata and text, no private result or native effect; fresh corrected call completes one P2 follow-up with agent submission and acceptance attribution autonomously; zero outbound requests
PROBE BASE-AGENT-012 acceptance 4 autonomous required revision oncall.actions.submit: stale required revision with expected_revision absent -> isError revision_conflict, exact parent current_revision 3 in metadata and text, no private result or native effect; fresh corrected call completes one P2 follow-up with agent submission and acceptance attribution autonomously; zero outbound requests
PROBE BASE-AGENT-012 acceptance 4 held optional revision oncall.actions.submit: current required revision with stale expected_revision -> isError revision_conflict, exact parent current_revision 3 in metadata and text, no private result or native effect; fresh corrected call completes one P2 follow-up with agent submission and acceptance attribution after exact sponsor approval; zero outbound requests
PROBE BASE-AGENT-012 acceptance 4 held required revision oncall.actions.submit: stale required revision with expected_revision absent -> isError revision_conflict, exact parent current_revision 3 in metadata and text, no private result or native effect; fresh corrected call completes one P2 follow-up with agent submission and acceptance attribution after exact sponsor approval; zero outbound requests
PROBE BASE-AGENT-003 4 autonomous: first completed P2 evidence submission link -> full incident matches completed MCP write and protected native state; autonomous read without approval; original write outcome and receipt, native records, revisions, mutation audit and paging preserved; zero outbound requests
PROBE BASE-AGENT-003 4 held: first completed P2 evidence submission link -> full incident matches completed MCP write and protected native state; separate sponsor approval withholds content until exact authorization; original write outcome and receipt, native records, revisions, mutation audit and paging preserved; zero outbound requests
Runtime agents completed (511.8s)
```

## Signed-in browser proof excerpts

```text
Browser proof follow-up-evidence-optional-revision-pending 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-optional-revision-pending 390: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-optional-revision-held 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-optional-revision-held 390: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-optional-revision-executed 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-optional-revision-executed 390: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-required-revision-pending 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-required-revision-pending 390: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-required-revision-held 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-required-revision-held 390: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-required-revision-executed 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-required-revision-executed 390: fits=true serious/critical=0 undersized-controls=0
PROBE BASE-AGENT-012 evidence completion browser held optional revision correction: protected review material equals MCP result; saved P2 Complete and Completes with evidence plus retained evidence link at 1440 and 390; original sponsor approval executed once; zero evidence requests
PROBE BASE-AGENT-012 evidence completion browser held required revision correction: protected review material equals MCP result; saved P2 Complete and Completes with evidence plus retained evidence link at 1440 and 390; original sponsor approval executed once; zero evidence requests
PASS agent door browser: native incident/review/responders, linked/pending/error people, pending/executed/paused approval, Agents and guide; assertions at 1440, browser proof at 1440/390 with overflow, 44px controls and axe measurements
```

## Browser captures

| File | Pixel dimensions | SHA-256 |
| --- | --- | --- |
| browser/agent-door-follow-up-evidence-optional-revision-pending-1440.png | 1440 × 1000 | 1ba469012053006fb34d9f6b5420197db4cb1f9ec6794e40582e74fa38cf46a9 |
| browser/agent-door-follow-up-evidence-optional-revision-pending-390.png | 390 × 1000 | 9a0d3e0e463541b473a53f84dea8afdf5e9516e3ed0f0d3b5587cca1c5e222fc |
| browser/agent-door-follow-up-evidence-optional-revision-executed-1440.png | 1440 × 1000 | 8a06d3051fe5785eae855843284711228b2f2c130d88280921c4f563112f500d |
| browser/agent-door-follow-up-evidence-optional-revision-executed-390.png | 390 × 1000 | 50711c31613f5a216fc8f975a9ac74c56ab44a86ad8cbd985850aeba1be1fc8b |
| browser/agent-door-follow-up-evidence-optional-revision-held-1440.png | 1440 × 1260 | ba0930487dbfc3e5fc5218c68880a8de079c481c9502a4d6fbfe90380212b969 |
| browser/agent-door-follow-up-evidence-optional-revision-held-390.png | 390 × 1286 | f03b56ff74df1bc19680086c2287ff3391b65b7dc85d821ff928a0d79c65313a |
| browser/agent-door-follow-up-evidence-required-revision-pending-1440.png | 1440 × 1000 | ed68ab3994938598f6b69ceb8b8d0a8d06bb01abd2630a3b3c08e0c682f59e11 |
| browser/agent-door-follow-up-evidence-required-revision-pending-390.png | 390 × 1000 | 97dbfd52172b53ad31cb4427fedfc71ae2a07cb4db344a90461f255fcae7ff31 |
| browser/agent-door-follow-up-evidence-required-revision-executed-1440.png | 1440 × 1000 | aa3061fe5f1e5a32b75f3e1950cc6cf34938fde1ea76aadfd5304415187ba15a |
| browser/agent-door-follow-up-evidence-required-revision-executed-390.png | 390 × 1000 | e0f3df0dc71cefa828285062c621df1126bd450102b8e7c326b9b718be08c781 |
| browser/agent-door-follow-up-evidence-required-revision-held-1440.png | 1440 × 1385 | 0ef7026d6f6b5d9daf3f9276bb94b732ad8070b6b72f88f67ba0810caf3a47fa |
| browser/agent-door-follow-up-evidence-required-revision-held-390.png | 390 × 1411 | 2ee1d7f56efdacb617612acd78ac65e94132b82905fc360e41c0d6d63387879e |

Recorded by Run Edit Run fleet at 2026-11-18T11:36:59Z.
