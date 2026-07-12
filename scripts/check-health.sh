#!/usr/bin/env bash
# Optional code-health gate for maintainers.
#
# Runs a fast lint/complexity gate via an internal code-health harness if it
# is available on this machine, and skips cleanly otherwise. Contributors
# don't need it: the public test suite lives in test/smoke.mjs.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

for root in "$HOME/repos" "$HOME/workspace"; do
  harness="$root/code-health-ops"
  if [ -d "$harness/core" ]; then
    cd "$harness"
    exec python3 -m core.check "$REPO_DIR" --langs js --min-grade C "$@"
  fi
done

echo "check-health: code-health harness not found, skipping (optional gate)."
exit 0
