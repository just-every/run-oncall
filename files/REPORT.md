# Oncall rer 0.2.113 source-lock repair

Task: main-oncall-rer-0213-1-c1
Repository: just-every/run-oncall
Product branch: cloud/main-oncall-rer-0213-1-c1
Product head: 551efe44531c876c101ec928b5a93f857976e132
Base main: 4fa65b7023d8443bdea2e1aed9e46ca4a2467b56
Original adoption: 4fea74eb96a0ed32ab4e0d8d195312835c053513
PR: none; this seed uses fleet landing after exact-SHA branch Verify and the Mac publication scan.

## Result

One commit applies the original adoption delta to current main. The resulting tree differs from the original adoption tree only in sources.lock.json: eight lines record the two added upstream source files. No merge commit or skip-CI marker. Package and frozen lockfile pin @runeditrun/rer 0.2.113 exactly. All 247 recorded Base copy origins name c2efb501cbc148c2aee4d5e1107ebdba81469006.

The original lock omitted src/modules/agent-door/policy-event.ts and src/modules/operator-auth/dev/invited.mjs because they were not included in its tracked-file inventory. Its toolchain digest already matched the installed package. The source inventory is 1667 -> 1669 files. Regenerating through the frozen installed package after staging the added files repairs it; sources.lock.json was never hand-edited.

CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain byte-identical to origin/main. Full-target clause counts: 26 done / 41 partial / 34 missing / 101 total before and after. No clause status changes or claim lines. No tests added, removed, skipped or weakened, and no product, copy or test changes beyond the original adoption delta.

## Preserved seed adaptations

DIVERGENCE.md is absent from both current main and the original adoption commit. Existing base-copies.json is the available adaptation record. The original adoption tree is preserved for every file except the repaired source lock, including these adaptations:

- .github/workflows/run-demo.yml
- .github/workflows/run-site.yml
- .github/workflows/verify-nightly.yml
- .github/workflows/verify.yml
- migrations/core/0147_agent_door.sql
- src/modules/agent-door/ADOPTING.md
- src/modules/agent-door/conformance/discovery.mjs
- src/modules/agent-door/page-style.ts
- src/modules/agent-door/pages.ts

## Local validation

- Fresh clone, clean `pnpm install --frozen-lockfile`: passed; installed rer 0.2.113. Repeated frozen install before final lock generation: passed.
- `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs changes`: exposed exactly the two missing source entries. Final changes report has empty files and metadata.
- `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock`: generated the lock last, through the installed package.
- CI's exact command, `node node_modules/@runeditrun/rer/edition-authoring/cli.mjs check`: passed before commit and on the committed head.
- `pnpm run typecheck`: passed before commit; repeated after the fresh-main integration.
- `node src/base/contract-docs.mjs check`: passed.
- Initial shell checks used Node 24.19.0 and pinned pnpm 10.12.4. To match CI exactly, node_modules was then removed and a clean frozen install, typecheck and the exact CI source-lock check all passed under project Node 22.20.0, with no tracked changes. The public CLI probes also selected project Node 22.20.0.
- No full local rer verify, browser work or release cut was performed, as requested.
- Candidate commit author/committer are Run Edit Run fleet <fleet@runeditrun.com>; full candidate messages and all reachable candidate commits were inspected. No trailers. Fleet hooks remained active.
- Product push succeeded through cloud-push.py on its first attempt. Remote ref readback matches the full product head. Worktree is clean.

## Stranger CLI probes

Probes used the installed 0.2.113 package, a separate scratch HOME for rer commands and an explicit non-secret environment allowlist, with no provider or GitHub credentials. Setup and temporary runtime processes were run under cloud_run's subreaper. No cloud-account operation was performed. Setup/export raw output and the synthetic archive remain outside the public packet because they can contain local installer custody data.

`npx -y @runeditrun/rer setup --owner-email fleet@runeditrun.com --non-interactive`: exit 0; 67 migrations and owner setup completed, temporary app stopped.

`npx -y @runeditrun/rer deploy --environment production --dry-run`: exit 0. Excerpt:

> Would deploy:
>   Worker: oncall-production
>   D1 database: oncall-production-db (67 declared migrations)
>   Cloudflare token permissions: Workers Scripts: Edit, D1: Edit
> deploy: local dry run complete; no credentials were needed, no Cloudflare requests were made and nothing was changed remotely.

`npx -y @runeditrun/rer export --output exports/installation.rer`: exit 0.

`npx -y @runeditrun/rer import --input exports/installation.rer --yes`: expected refusal, exit 4. Excerpt:

> Restore refused (target_not_empty): this installation already contains people or data. Import restores into an empty installation. Use a fresh installation, or to replace this installation's data, keep a copy with rer export --output exports/before-restore.rer, then run rer reset --yes and rer import --input exports/installation.rer --yes again.

The refusal does not expose the internal agent_door_agents table name. No reset or destructive restore was run.

## Landing and evidence

Product and evidence custody are separate. The full publication scan runs on the fleet Mac under this cloud brief; no Mac scripts were invoked here. Only the named product branch was pushed, never main, and no earlier branch was modified. Report files are explicitly selected for the separate evidence ref. Local reports are retained outside the product clone. No blocker remains. The exact-SHA Verify result is recorded below.


## Exact-SHA Verify result

Verify run 43467859063 completed successfully on 551efe44531c876c101ec928b5a93f857976e132. URL: https://github.com/just-every/run-oncall/actions/runs/43467859063

Five REST calls were used: one exact-SHA discovery and four status requests, each at least 300 seconds apart. No rerun or failed-job log call was needed. The product branch is READY for the fleet's independent landing gates; it has not been landed by this run. No PR was created or required by this seed's rules. The actual API responses are preserved in ci-watch.jsonl and ci-latest.json.

The plan is complete: original delta reapplied to fresh main, installed-package lock regenerated, clean frozen dependency install and touched checks passed, public CLI probes completed, one product commit pushed, and its exact-SHA Verify passed. Packet transfer targets only refs/heads/evidence/main-oncall-rer-0213-1-c1; the terminal EVIDENCE line supplies its exact transport head. The scratch checkout and local installer custody will be deleted after evidence publication and remote-ref verification; the packet remains outside that checkout.
