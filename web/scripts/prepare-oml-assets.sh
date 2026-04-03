#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/wp-labs/tree-sitter-oml.git"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_DIR="${PROJECT_ROOT}/public/tree-sitter"
QUERY_DIR="${PUBLIC_DIR}/queries"

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

mkdir -p "${QUERY_DIR}"

cp "${REPO_DIR}/tree-sitter-oml.wasm" "${PUBLIC_DIR}/tree-sitter-oml.wasm"
cp "${REPO_DIR}/queries/highlights.scm" "${QUERY_DIR}/highlights.scm"

if [ ! -f "${PROJECT_ROOT}/node_modules/web-tree-sitter/tree-sitter.wasm" ]; then
  echo "缺少 web-tree-sitter/tree-sitter.wasm，请先安装依赖。" >&2
  exit 1
fi

cp "${PROJECT_ROOT}/node_modules/web-tree-sitter/tree-sitter.wasm" "${PUBLIC_DIR}/tree-sitter.wasm"

echo "OML 资源已写入：${PUBLIC_DIR}"
