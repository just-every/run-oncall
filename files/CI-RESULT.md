# Exact-SHA CI result

Repository: just-every/run-oncall
Head: 3df91c93581e6ce92acc300d652d5792a7ecdf47
Verify: 42194462386, event push, completed, conclusion failure
URL: https://github.com/just-every/run-oncall/actions/runs/42194462386

Build job 127814231983 succeeded through dependency installation. Its only failing step was Check the generated contract documents, command:

    node src/base/contract-docs.mjs check

Actual failure output:

    Contract prose: 0 errors, 0 warnings.
    ACCEPTANCE.md: generated content differs; run contract-docs write.
    Process completed with exit code 1.

The same exact command on the exact committed checkout returned exit 1 with the same output after restoring main's generated views. Generator write and check had passed before that required restore.

Aggregate job 127815095388 failed Require the selected coverage and its proof because the build was failure and shards were skipped. Its coverage was full; no runtime assertion ran in branch CI. Plan succeeded. All other jobs skipped. The full safe job and step receipt is ci-jobs.json.

This matches the explicit task exception for stale generated ACCEPTANCE.md or docs/CLAIMS.md. Neither generated file was edited or committed to repair CI. The fleet regenerates them after merging CONTRACT.md and reruns Verify on that landing commit. READY here invokes that exception; the recorded GitHub conclusion remains failure.

Calls: main run discovery, f204 discovery, f205 discovery, candidate discovery, candidate status after over 300 seconds, completed jobs, one failed-build archive, one failed-aggregate archive = 8. No dispatch, rerun or archive retry occurred.

Failed-job archive commands each succeeded once:

    gh run view 42194462386 --repo just-every/run-oncall --job 127814231983 --log-failed
    gh run view 42194462386 --repo just-every/run-oncall --job 127815095388 --log-failed

The archives' environment blocks are intentionally excluded from the public packet; the relevant command, actual complete error and causal job results are retained above.
