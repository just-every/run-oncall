# Exact-SHA CI receipt

Repository just-every/run-oncall
Branch cloud/sd-oncall-c-f292-lin-1
Candidate f4042c24eb5429651be0c04d099bb37aba27abaf

Workflow Verify
Run 44513836996
Created 2026-11-19T11:19:52Z
Last observed 2026-11-19 11:35:19 UTC
Workflow status completed
Workflow conclusion failure

[Workflow run](https://github.com/just-every/run-oncall/actions/runs/44513836996)

| Job | ID | Conclusion | Elapsed |
| --- | ---: | --- | --- |
| plan | 135524618446 | success | 0m19s |
| contract-docs | 135524807503 | failure | 0m23s |
| build | 135524807609 | success | 1m56s |
| light | 135524809672 | skipped | 0m00s |
| shards (runtime) | 135525831556 | success | 8m29s |
| shards (triage) | 135525831578 | success | 10m23s |
| shards (intake) | 135525831607 | success | 9m14s |
| shards (hosted) | 135525831618 | success | 12m11s |
| shards (transfer) | 135525831627 | success | 9m43s |
| shards (browser) | 135525831692 | success | 8m18s |
| shards (agents) | 135525831747 | success | 12m14s |
| shards (changes) | 135525831784 | success | 9m09s |
| full-push-proof | 135532164753 | success | 0m03s |
| nightly-proof | 135532167040 | skipped | 0m00s |
| verify | 135532204478 | failure | 0m02s |

- contract-docs, step `Check the generated contract documents`, failure after 0m01s.
- verify, step `Require the selected coverage and its proof`, failure after 0m00s.

All eight shards and the build passed. The hosted shard finished in 12m11s. The only root failure was the expected generated ACCEPTANCE.md difference. The aggregate verify job failed on that contract-docs result. The cloud exception applies because the local generator write and check, source lock, first-party check, production build, typecheck and focused browser all passed.

## Failed-step archive excerpts

```text
Contract prose: 0 errors, 0 warnings.
ACCEPTANCE.md: generated content differs; run contract-docs write.
  PLAN: success
  CONTRACT_DOCS: failure
  BUILD: success
  SHARDS: success
```
