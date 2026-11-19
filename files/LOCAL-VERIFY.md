# Local exact-SHA verification

Product HEAD 71c2f9235545e5392046cc2e155339faa9269e43

Main base d376e47b188ba8688ec7413341363fc7723c99dc

Run Edit Run fleet, 19 November 2026 UTC.

Toolchain Node 22.20.0, pnpm 10.12.4 and system Chromium.

| Command | Exit | Started UTC | Completed UTC |
| --- | --- | --- | --- |
| `node scripts/verify-ci.mjs --check-workflows` | 0 | 2026-11-19T12:35:57Z | 2026-11-19T12:35:57Z |
| `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check` | 0 | 2026-11-19T12:35:57Z | 2026-11-19T12:35:57Z |
| `pnpm run deps` | 0 | 2026-11-19T12:35:57Z | 2026-11-19T12:36:06Z |
| `node scripts/verify-oncall-build.mjs` | 0 | 2026-11-19T12:36:06Z | 2026-11-19T12:36:42Z |
| `node tests/agent-door-browser.mjs` | 0 | 2026-11-19T12:36:42Z | 2026-11-19T12:46:15Z |
| `ONCALL_RUNTIME_PART=agents node tests/runtime.mjs` | 0 | 2026-11-19T12:46:15Z | 2026-11-19T12:58:12Z |

## Ordered build commands

- `pnpm exec rer check --profile first-party`
- `pnpm run build`
- `pnpm run typecheck`

The contract generator write and check succeeded before restoring the generated views and regenerating the source lock. The committed-view check returned exit 1 with the following output.

```text
Contract prose: 0 errors, 0 warnings.
ACCEPTANCE.md: generated content differs; run contract-docs write.
```

The Base publication scan runs on the fleet lander. The product diff passed git diff --check and a local review of additions for common credential shapes.

## Focused probe output

### agent-browser

```text
PROBE BASE-AGENT-003 4 declaration autonomous: first completed MCP write link -> full incident equals the write and protected native state; direct autonomous read; zero approvals, unchanged write outcome and native custody, paging OFF, zero outbound requests
PROBE BASE-AGENT-003 4 declaration held: first completed MCP write link -> full incident equals the write and protected native state; separate open standard read review; zero approvals, unchanged write outcome and native custody, paging OFF, zero outbound requests
Browser proof alert-declaration-autonomous-person 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof alert-declaration-autonomous-person 390: fits=true serious/critical=0 undersized-controls=0
Browser proof alert-declaration-autonomous-agent 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof alert-declaration-autonomous-agent 390: fits=true serious/critical=0 undersized-controls=0
Browser proof alert-declaration-held-person 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof alert-declaration-held-person 390: fits=true serious/critical=0 undersized-controls=0
Browser proof alert-declaration-held-agent 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof alert-declaration-held-agent 390: fits=true serious/critical=0 undersized-controls=0
PROBE BASE-AGENT-003 4 declaration browser: returned incidents under both policies -> saved declaration, copied runbook and agent attribution shown at 1440 and 390; zero outbound requests
PROBE BASE-AGENT-002 5 acknowledgment autonomous: equivalent ordinary incidents -> acknowledged with matching Lead and Assignee, incident and workspace revisions +1 per action, one command.transition per door, distinct attribution and explicit agent named-member history, 0 open reviews, paging OFF and zero outbound requests
PROBE BASE-AGENT-002 5 acknowledgment held: equivalent ordinary incidents -> acknowledged with matching Lead and Assignee, incident and workspace revisions +1 per action, one command.transition per door, distinct attribution and explicit agent named-member history, 1 open reviews, paging OFF and zero outbound requests
Browser proof acknowledgment-autonomous-person 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof acknowledgment-autonomous-person 390: fits=true serious/critical=0 undersized-controls=0
Browser proof acknowledgment-autonomous-agent 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof acknowledgment-autonomous-agent 390: fits=true serious/critical=0 undersized-controls=0
Browser proof acknowledgment-held-person 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof acknowledgment-held-person 390: fits=true serious/critical=0 undersized-controls=0
Browser proof acknowledgment-held-agent 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof acknowledgment-held-agent 390: fits=true serious/critical=0 undersized-controls=0
PROBE BASE-AGENT-002 5 acknowledgment browser: real Acknowledge button and MCP in both policies; saved state, responsibility and attribution read at 1440 and 390; zero outbound requests
```

### agent-runtime

```text
PROBE BASE-AGENT-003 4 declaration autonomous: first completed MCP write link -> full incident equals the write and protected native state; direct autonomous read; zero approvals, unchanged write outcome and native custody, paging OFF, zero outbound requests
PROBE BASE-AGENT-003 4 declaration held: first completed MCP write link -> full incident equals the write and protected native state; separate open standard read review; zero approvals, unchanged write outcome and native custody, paging OFF, zero outbound requests
PROBE BASE-AGENT-002 5 acknowledgment autonomous: equivalent ordinary incidents -> acknowledged with matching Lead and Assignee, incident and workspace revisions +1 per action, one command.transition per door, distinct attribution and explicit agent named-member history, 0 open reviews, paging OFF and zero outbound requests
PROBE BASE-AGENT-002 5 acknowledgment held: equivalent ordinary incidents -> acknowledged with matching Lead and Assignee, incident and workspace revisions +1 per action, one command.transition per door, distinct attribution and explicit agent named-member history, 1 open reviews, paging OFF and zero outbound requests
```
