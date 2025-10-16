#!/usr/bin/env bash
set -euo pipefail

REMOTE_URL="${1:-}"
BRANCH_NAME="${2:-$(git rev-parse --abbrev-ref HEAD)}"
REMOTE_NAME="${3:-origin}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "\033[31mError:\033[0m This script must be executed inside a Git repository." >&2
  exit 1
fi

if ! git diff --quiet --ignore-submodules HEAD --; then
  echo "\033[33mWarning:\033[0m You still have uncommitted changes. Commit them before pushing." >&2
  exit 1
fi

if ! git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
  echo "\033[31mError:\033[0m Branch '${BRANCH_NAME}' does not exist locally." >&2
  exit 1
fi

if git remote get-url "${REMOTE_NAME}" >/dev/null 2>&1; then
  EXISTING_URL=$(git remote get-url "${REMOTE_NAME}")
  if [[ -n "${REMOTE_URL}" && "${REMOTE_URL}" != "${EXISTING_URL}" ]]; then
    echo "\033[33mWarning:\033[0m Remote '${REMOTE_NAME}' already points to '${EXISTING_URL}'." >&2
    echo "             To use a different repository, remove the remote first:" >&2
    echo "             git remote remove ${REMOTE_NAME}" >&2
    exit 1
  fi
else
  if [[ -z "${REMOTE_URL}" ]]; then
    echo "\033[31mError:\033[0m Remote '${REMOTE_NAME}' is not configured." >&2
    echo "        Pass your GitHub repository URL as the first argument." >&2
    echo "        Example: ./scripts/push-to-github.sh https://github.com/user/repo.git" >&2
    exit 1
  fi
  git remote add "${REMOTE_NAME}" "${REMOTE_URL}"
fi

echo "Pushing branch '${BRANCH_NAME}' to remote '${REMOTE_NAME}'..."
git push -u "${REMOTE_NAME}" "${BRANCH_NAME}"

echo "\033[32mSuccess!\033[0m Branch '${BRANCH_NAME}' is now available on '${REMOTE_NAME}'."
