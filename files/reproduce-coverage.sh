#!/usr/bin/env bash
set -euo pipefail
test "$PLAN" = success
case "$PUSH_PROOF:$NIGHTLY_PROOF" in
  *failure*|*cancelled*) exit 1 ;;
esac
case "$COVERAGE" in
  reuse) test "$SKIP" = true && test "$BUILD" = skipped && test "$SHARDS" = skipped && test "$LIGHT" = skipped ;;
  light) test "$SKIP" = false && test "$LIGHT" = success && test "$BUILD" = skipped && test "$SHARDS" = skipped ;;
  full) test "$LIGHT" = skipped && { { test "$BUILD" = success && test "$SHARDS" = success; } || { test "$HAS_SHARDS" = false && test "$BUILD" = skipped && test "$SHARDS" = skipped; }; } ;;
  *) exit 1 ;;
esac
