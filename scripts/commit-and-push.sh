#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  cat >&2 <<'USAGE'
Usage: ./scripts/commit-and-push.sh "commit message" [REMOTE_URL] [BRANCH_NAME] [REMOTE_NAME]

Examples:
  ./scripts/commit-and-push.sh "feat: sync workspace" https://github.com/user/repo.git
  ./scripts/commit-and-push.sh "chore: update docs" "" main upstream
USAGE
  exit 1
fi

COMMIT_MESSAGE="$1"
REMOTE_URL="${2:-}"
BRANCH_NAME="${3:-$(git rev-parse --abbrev-ref HEAD)}"
REMOTE_NAME="${4:-origin}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "\033[31mError:\033[0m This script must be run inside a Git repository." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Staging all changes..."
git add -A

if git diff --cached --quiet --ignore-submodules; then
  echo "\033[33mWarning:\033[0m No changes to commit after staging. Aborting." >&2
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "${CURRENT_BRANCH}" != "${BRANCH_NAME}" ]]; then
  echo "\033[33mWarning:\033[0m You are on branch '${CURRENT_BRANCH}', but requested to push '${BRANCH_NAME}'." >&2
  echo "             Switching to '${BRANCH_NAME}' before committing." >&2
  git checkout "${BRANCH_NAME}"
fi

if git status --short | grep -q '^UU'; then
  echo "\033[31mError:\033[0m Unresolved merge conflicts detected. Resolve them before committing." >&2
  exit 1
fi

echo "Committing with message: ${COMMIT_MESSAGE}"
git commit -m "${COMMIT_MESSAGE}"

"${SCRIPT_DIR}/push-to-github.sh" "${REMOTE_URL}" "${BRANCH_NAME}" "${REMOTE_NAME}"
