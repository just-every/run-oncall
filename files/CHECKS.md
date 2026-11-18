# Exact candidate check receipt

Candidate `0f2dd0e8ba15aa28423a09282025134578694ea1`, based on `ec20de7b42e527cd205b7c42c2dde493948eca7f`. All times are UTC.

Toolchain: Node 22.20.0, pnpm 10.12.4, Chromium 154.0.8037.57 built on Debian GNU/Linux 13 (trixie).

## Local commands

- `npx -y @runeditrun/rer build`
- `pnpm run typecheck`
- `pnpm exec rer check --profile first-party`
- Focused invocation of `agedActionEvidenceRetention` using Node's file module import.
- `ONCALL_RUNTIME_PART=agents node tests/runtime.mjs`
- `ONCALL_CHROMIUM_PATH=/usr/bin/chromium node tests/agent-door-browser.mjs`
- `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check`
- `node src/base/contract-docs.mjs check`

## Recorded exit results

```text
build PASS 0f2dd0e8ba15aa28423a09282025134578694ea1 2026-11-18T03:27:04Z
typecheck PASS 0f2dd0e8ba15aa28423a09282025134578694ea1 2026-11-18T03:27:09Z
first-party PASS 0f2dd0e8ba15aa28423a09282025134578694ea1 2026-11-18T03:27:10Z
focused PASS 0f2dd0e8ba15aa28423a09282025134578694ea1 2026-11-18T03:27:25Z
shared-flow PASS 0f2dd0e8ba15aa28423a09282025134578694ea1 2026-11-18T03:39:16Z
browser PASS 0f2dd0e8ba15aa28423a09282025134578694ea1 2026-11-18T03:47:39Z
source-lock PASS 0f2dd0e8ba15aa28423a09282025134578694ea1 2026-11-18T03:47:40Z
contract-docs PASS 0f2dd0e8ba15aa28423a09282025134578694ea1 2026-11-18T03:47:40Z
```

## Shared Worker and D1 flow

```text
PROBE BASE-AGENT-012 acceptance 1 autonomous evidence-policy completion at T+86400000ms: original key and arguments with fresh authority -> equal stored result and original receipt where present, unchanged completed action, approval, terminal call and expiry, native revisions, timeline, audit and paging. One linked replay attempt and zero outbound requests.
PROBE BASE-AGENT-012 acceptance 1 autonomous evidence-policy completion at T+86401000ms: original key and arguments with fresh authority -> equal stored result and original receipt where present, unchanged completed action, approval, terminal call and expiry, native revisions, timeline, audit and paging. One linked replay attempt and zero outbound requests.
PROBE BASE-AGENT-012 acceptance 1 held evidence-policy completion at T+86400000ms: original key and arguments with fresh authority -> equal stored result and original receipt where present, unchanged completed action, approval, terminal call and expiry, native revisions, timeline, audit and paging. One linked replay attempt and zero outbound requests.
PROBE BASE-AGENT-012 acceptance 1 held evidence-policy completion at T+86401000ms: original key and arguments with fresh authority -> equal stored result and original receipt where present, unchanged completed action, approval, terminal call and expiry, native revisions, timeline, audit and paging. One linked replay attempt and zero outbound requests.
Runtime agents completed (709.3s)
```

## Browser proof

```text
Browser proof follow-up-evidence-retained-autonomous 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-retained-autonomous 390: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-retained-held 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-retained-held 390: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-retained-executed 1440: fits=true serious/critical=0 undersized-controls=0
Browser proof follow-up-evidence-retained-executed 390: fits=true serious/critical=0 undersized-controls=0
PROBE BASE-AGENT-012 aged evidence completion browser autonomous: protected review material equals MCP result; saved P2 Complete and Completes with evidence plus retained evidence link at 1440 and 390; original sponsor approval not needed; zero evidence requests
PROBE BASE-AGENT-012 aged evidence completion browser held: protected review material equals MCP result; saved P2 Complete and Completes with evidence plus retained evidence link at 1440 and 390; original sponsor approval executed once; zero evidence requests
```

The six PNG files under `browser/` show the autonomous and held review panels and the held executed approval at 1440 px and 390 px.

## Product branch receipt

The history from `origin/main` to the candidate contains one commit and zero merge commits. The author and committer are both `Run Edit Run fleet <fleet@runeditrun.com>`. The commit has no trailers. The fleet guard created the branch on its first attempt and confirmed the remote head.

```text
PUSH_OK branch=cloud/sd-oncall-c-f264-lin-1
REMOTE_READBACK 0f2dd0e8ba15aa28423a09282025134578694ea1	refs/heads/cloud/sd-oncall-c-f264-lin-1
```

## GitHub Actions receipt

Observed 2026-11-18T04:03:29Z. Four REST calls including discovery.

```json
{"conclusion": "success", "head_sha": "0f2dd0e8ba15aa28423a09282025134578694ea1", "html_url": "https://github.com/just-every/run-oncall/actions/runs/44232903750", "id": 44232903750, "status": "completed"}
```
