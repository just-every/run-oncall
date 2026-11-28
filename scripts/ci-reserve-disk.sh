#!/usr/bin/env bash
set -euo pipefail

# Leave room above the 15 GiB guard for the dependency and browser installs.
for unused_sdk in /usr/local/lib/android /usr/share/dotnet /opt/ghc /usr/local/.ghcup /opt/hostedtoolcache/CodeQL; do
  free_kib=$(df -Pk . | awk 'END { print $4 }')
  if [ "$free_kib" -ge "$((20 * 1024 * 1024))" ]; then break; fi
  sudo rm -rf -- "$unused_sdk"
done
df -h . /tmp
