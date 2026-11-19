# Verify run 44596527018

Verify completed with conclusion cancelled for d06b4e0741f3f33d6acb7114e35dc1b54637d1c0.

Plan, build, contract-docs and seven of the eight shards succeeded. The transfer shard (job 135818557974) was cancelled during Run this shard after 15m16s. The branch workflow configures a 15-minute transfer job timeout. The final verify job (135827969876) failed its requirement for successful full coverage because SHARDS was cancelled. Its downloaded failed log confirmed BUILD=success, CONTRACT_DOCS=success, COVERAGE=full and SHARDS=cancelled.

The command gh run view 44596527018 --repo just-every/run-oncall --job 135818557974 --log returned exit 1 with stderr EOF after partial output. It supplied no HTTP status or HTTP response body and did not provide a complete transfer log. The job metadata records cancellation, and a failed transfer assertion could not be confirmed.

The candidate is published and remains blocked on successful exact-SHA Verify. The transfer timeout and the verification workflow are beyond the release-metadata lease.
