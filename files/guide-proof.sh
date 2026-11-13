#!/bin/bash
set -eu
real_git_config="$HOME/.gitconfig"
proof_root=/tmp/oncall-guide-proof
export HOME="$proof_root/home"
export PATH="$proof_root/bin"
export NODE_USE_ENV_PROXY=1
export NO_PROXY=localhost,127.0.0.1,::1
export no_proxy="$NO_PROXY"
export GIT_CONFIG_GLOBAL="$real_git_config"
if command -v node >/dev/null || command -v npx >/dev/null; then exit 21; fi
printf '%s\n' 'PASS before install: node and npx absent from PATH'
sh "$proof_root/install.sh"
export PATH="$HOME/.local/bin:$PATH"
rer --version
if command -v node >/dev/null || command -v npx >/dev/null; then exit 22; fi
printf '%s\n' 'PASS after install: rer on PATH, node and npx absent'
cd "$proof_root"
rer install just-every/run-oncall --dir oncall-hosted
cd oncall-hosted
git config user.name 'Run Edit Run fleet'
git config user.email fleet@runeditrun.com
python3 /tmp/fleet-cloud-hooks.py
rer setup --owner-email fleet@runeditrun.com --non-interactive
if command -v node >/dev/null || command -v npx >/dev/null; then exit 23; fi
curl --version
openssl version
printf '%s\n' 'PASS documented fresh-checkout install and setup with no global Node or npx'
