#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/wp-labs/tree-sitter-oml.git"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_DIR="${PROJECT_ROOT}/public/tree-sitter"
EDITOR_DIR="${PUBLIC_DIR}/languages/oml/editor"

if ! command -v git >/dev/null 2>&1; then
  echo "缺少 git，无法准备 OML 资源。" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1 && ! command -v pnpm >/dev/null 2>&1; then
  echo "缺少 npm/pnpm，无法准备 OML 资源。" >&2
  exit 1
fi

TEMP_DIR="$(mktemp -d)"
REPO_DIR="${TEMP_DIR}/tree-sitter-oml"

echo "准备 OML 资源：${REPO_DIR}"
git clone "${REPO_URL}" "${REPO_DIR}"

pushd "${REPO_DIR}" >/dev/null
if ! npx -p tree-sitter-cli@0.22.6 tree-sitter build --wasm; then
  echo "本地 tree-sitter-cli 不可用" >&2
fi
popd >/dev/null

mkdir -p "${EDITOR_DIR}"

cp "${REPO_DIR}/tree-sitter-oml.wasm" "${EDITOR_DIR}/tree-sitter-oml.wasm"
cp "${REPO_DIR}/queries/highlights.scm" "${EDITOR_DIR}/highlights.scm"

echo "OML 资源已写入：${PUBLIC_DIR}"
