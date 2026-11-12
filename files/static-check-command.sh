set -e
node src/base/contract-docs.mjs check
node scripts/edition-authoring/cli.mjs check > /tmp/oncall-source-check.log
printf 'Edition source lock check passed.\n'
pnpm run typecheck
git diff --exit-code origin/main HEAD -- CONTRACT.md ACCEPTANCE.md docs/CLAIMS.md
git diff --check origin/main HEAD
printf 'Contract files match main; diff whitespace check passed.\n'
