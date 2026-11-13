# Oncall rer 0.2.113 adoption

Outcome: **BLOCKED**, branch cloud/main-oncall-rer-0213-1 at 4fea74eb96a0ed32ab4e0d8d195312835c053513.

Repository: just-every/run-oncall
Branch: cloud/main-oncall-rer-0213-1

## Plan

1. Configure the fleet identity, launcher credential helper and commit hooks; clone main into an isolated shallow checkout.
2. Read the seed instructions, contract and source manifest. Pin @runeditrun/rer to 0.2.113 with pnpm and update the lockfile.
3. Refresh Base from immutable release revision c2efb501cbc148c2aee4d5e1107ebdba81469006 through the GitHub API. Preserve and report any intentional seed overrides listed by DIVERGENCE.md. Change only adoption-required files.
4. Set up a local installation, run credential-free production deploy dry-run and export/import into the populated installation. Record actual output outside the product repository.
5. Run relevant changed-file checks and typecheck, without a full local verify or browser work. Update from main before the candidate; preserve newer main judgments. Regenerate and check the source lock last.
6. Commit with fleet identity and hooks, inspect all candidate identities and trailers, push only the named cloud branch with the cloud guard, then watch exact-SHA Verify within the GitHub API budget.
7. Publish the explicit non-secret report and receipts to evidence/main-oncall-rer-0213-1, report terminal product provenance and relay the lane inbox line. Delete the clone only after all work is safely published.

## Scope and claims

No clause status, gap or evidence edits are authorized. No DONE claim. No UI changes or browser proof required. No deployment or remote account operation is authorized by this task. Clause status counts before: Core 25 done / 35 partial / 24 missing (84); Agent surface 1 done / 6 partial / 10 missing (17).

## Results

- Dependency pin installed successfully with pnpm add --save-dev --save-exact @runeditrun/rer@0.2.113. Initial package diff: package.json and pnpm-lock.yaml only.
- DIVERGENCE.md is absent from the seed. base-copies.json supplies the acknowledged seed overrides.
- The initial documented --base-archive refresh refused safely because it cannot prove edition-migration ancestry. No source or copy records changed in that attempt (refresh.log).
- To run the requested --from-api door within ten real GitHub calls, source acquisition uses a task-local response cache outside the product checkout. Two immutable tarballs and their authenticated Git commit metadata were read with gh api. Each complete archive was reconstructed into its canonical Git tree, and its SHA-1 matched the tree identity in the API commit metadata before caching any blob/tree response. API reader blob SHA-1 checks remain active. All uncached ancestry comparisons still call gh api with the refreshed bundle credential. See source-acquisition.json. This changes no product tool code, Git identity or acceptance rule.
- Source acquisition used eight real gh calls, leaving two for exact-SHA Verify discovery/status. Cached local responses consume no GitHub requests.


## Preserved seed changes

The refresh identified two pre-existing tracked edits whose bytes differ from the recorded Base baseline. They were reviewed against the previous immutable Base source and acknowledged with the tool's adapt-base command, without editing either source file:

- src/modules/agent-door/page-style.ts: retain the seed's complete guided-policy document round trip.
- src/modules/agent-door/pages.ts: retain saved guided choices and the advanced editor fallback.

The seven previously acknowledged overrides are also preserved: .github/workflows/run-demo.yml, .github/workflows/run-site.yml, .github/workflows/verify-nightly.yml, .github/workflows/verify.yml, migrations/core/0147_agent_door.sql, src/modules/agent-door/ADOPTING.md, and src/modules/agent-door/conformance/discovery.mjs. The adaptation receipt compares their bytes against main.


## Refresh outcome

The requested rer refresh-base --ref c2efb501cbc148c2aee4d5e1107ebdba81469006 --from-api completed with exit 0. All 247 copy groups now record the release revision. Base and demo origin metadata in edition.json were advanced to that same immutable revision. No edition migration is owed, no copy was retired and no relocated or withheld source was reported.

The refresh preserved the seed-owned workflows and the released agent-door migration rather than overwriting them. It also reports pre-existing React/React DOM 19.2.8 versus Base 19.3.1 package differences; these pins remain outside this adoption's scope. The two upstream adaptation notices name migrations/core/0147_agent_door.sql and src/modules/agent-door/ADOPTING.md; their existing seed bytes remain intact. No additional product or test changes were authored.


## Product candidate and checks

Product branch: cloud/main-oncall-rer-0213-1
Product head: 4fea74eb96a0ed32ab4e0d8d195312835c053513
Base main: 4fa65b7023d8443bdea2e1aed9e46ca4a2467b56

The final adoption changes 31 files: exact rer pin and pnpm lock, Base copy record and origin metadata, 24 refreshed/added upstream files, source lock and two required source-baseline objects. Recorded copied-file count advanced from 857 to 859 across the same 247 copy groups. No seed product logic, copy or test was independently edited; all source byte changes came from refresh. No contract or generated-view edit. Test registrations added/removed: 0/0; vendored conformance updates are excluded under the test-count rule. Clause counts after remain Core 25 done / 35 partial / 24 missing (84), Agent surface 1 done / 6 partial / 10 missing (17).

Checks passed before the real candidate commit: unattended setup (67 migrations), local production deploy dry-run, typecheck, export (113 tables / 4 rows), populated-target import refusal (expected exit 4), first-party rer check, offline Base-copy SHA-256/acknowledgement check, current contract documents, vendored source-lock check, installed 0.2.113 source-lock check, and git diff --check. A credential-shaped-value scan of the staged diff passed. The full publication scan remains a fleet Mac lander gate, as instructed.

Identity inspection covered every candidate commit reachable from origin/main..HEAD: fleet author and committer, no trailers. The guarded product push succeeded on attempt 1. The final commit has no CI-skip marker. The checkout was clean after commit.

The first staging attempt rejected the two generated source-baseline files before staging. That command shell continued and published only the unchanged main SHA as the new cloud ref. No product commit was created in that attempt. The corrected command enabled immediate failure handling, allowed only the source-lock-referenced baseline objects after digest verification, merged current main (already up to date), regenerated the source lock and committed/pushed the real candidate without rewriting history. No product evidence files entered either product tree.

Exact-SHA Verify discovered: run 43455124052, https://github.com/just-every/run-oncall/actions/runs/43455124052, initially in_progress. At discovery, nine real GitHub invocations had been used (eight immutable source/ancestry reads and one exact-SHA run discovery), with one status call reserved for the same run. There was one watcher.

## CLI observations

`rer deploy --environment production --dry-run` exited 0 and reported:

    Would deploy:
      Worker: oncall-production
      D1 database: oncall-production-db (67 declared migrations)
      Cloudflare token permissions: Workers Scripts: Edit, D1: Edit
      Pending migrations: unknown until the hosted databases are checked.

It explicitly reported no credentials needed, no Cloudflare requests and no remote changes; target secrets and remote readiness were not checked.

`rer import --input exports/installation.rer --yes` exited 4 against the populated installation:

    Restore refused (target_not_empty): this installation already contains people or data. Import restores into an empty installation. Use a fresh installation, or to replace this installation's data, keep a copy with rer export --output exports/before-restore.rer, then run rer reset --yes and rer import --input exports/installation.rer --yes again.

No internal table name was present in the refusal. No reset was performed.


## Exact-head follow-up

The production deploy dry-run and populated import refusal were repeated on committed head 4fea74eb96a0ed32ab4e0d8d195312835c053513, with the same successful product-language outcomes. The checkout remains clean.

The optional affected core runtime journey was also run on that SHA under Node 22.20.0. Attempt 1 passed nine labelled assertions and then failed in the test Worker's restart, before its health probe: workerd could not bind the reused 127.0.0.1:36289 port (Address already in use), at tests/runtime.mjs:355 called by coordinationJourney at line 1374. The port was confirmed free afterwards. This was a local process/port failure, not a product assertion failure; the same journey was retried once without source changes. See runtime-core-first-attempt.json for the actual receipt and sanitized diagnostic.


The identical core runtime retry passed on the unchanged candidate in 132.11 seconds (127.0 seconds reported by the journey). It completed 12 labelled PASS groups covering held-data upgrades, credential custody, responder authority, incident lifecycle, routing replay, durable coordination/restart, readiness, atomic audit/state and archive/erasure guarantees. Its exact-SHA receipt is runtime-core-receipt.json. No tests or product source were changed to get this result.

No full local rer verify, browser journey, deployment, release cut or account operation was run. All started local Workers were stopped by their owning commands; no broad process-kill command was used. There is no product blocker currently observed. Final exact-SHA branch Verify is recorded in the terminal result below.


## Before / after

| Item | Before | Candidate |
| --- | --- | --- |
| Exact rer development dependency | 0.2.108 | 0.2.113 |
| Base/demo manifest origin | 398bdd222401a60ac2d0732454f6a947b3033029 | c2efb501cbc148c2aee4d5e1107ebdba81469006 |
| Base copy record revision | 73923a8d0a5e5a2cd7f0cb204ec97b227d73b4bf | c2efb501cbc148c2aee4d5e1107ebdba81469006 |
| Recorded copy groups / files | 247 / 857 | 247 / 859 |
| Core done / partial / missing | 25 / 35 / 24 | 25 / 35 / 24 |
| Agent done / partial / missing | 1 / 6 / 10 | 1 / 6 / 10 |
| Authored test registrations | No edits | No edits (+0 / -0) |

No target clause was assigned for promotion, and no CLAIM or DONE claim is made. There is no PR requirement in this seed's shipped rules or the brief; no PR was opened. Landing, full publication scan, the seed's next release and generated-view publication remain with the fleet.


## Terminal result

Product: BLOCKED branch=cloud/main-oncall-rer-0213-1 head=4fea74eb96a0ed32ab4e0d8d195312835c053513

Exact-SHA Verify run 43455124052: status=completed, conclusion=failure, head_sha=4fea74eb96a0ed32ab4e0d8d195312835c053513. https://github.com/just-every/run-oncall/actions/runs/43455124052

GitHub budget used: 10/10 invocations, with no duplicate watcher or short polling interval. The final REST result and actual call journal are included.

Blocker: exact-SHA Verify completed without success. The ten-call budget is exhausted, so failed-job diagnosis or rerun was not performed and no green claim is made.

The explicit report packet is published separately to refs/heads/evidence/main-oncall-rer-0213-1. Evidence publication does not signal product acceptance or landing. The fleet retains the publication scan, landing and next release. The product clone is eligible for deletion only after evidence publication succeeds and the clean product head is confirmed pushed.
