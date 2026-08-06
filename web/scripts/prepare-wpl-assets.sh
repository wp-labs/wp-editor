#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/wp-labs/tree-sitter-wpl.git"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_DIR="${PROJECT_ROOT}/public/tree-sitter"
EDITOR_DIR="${PUBLIC_DIR}/languages/wpl/editor"

if ! command -v git >/dev/null 2>&1; then
  echo "缺少 git，无法准备 WPL 资源。" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1 && ! command -v pnpm >/dev/null 2>&1; then
  echo "缺少 npm/pnpm，无法准备 WPL 资源。" >&2
  exit 1
fi

TEMP_DIR="$(mktemp -d)"
REPO_DIR="${TEMP_DIR}/tree-sitter-wpl"

echo "准备 WPL 资源：${REPO_DIR}"
git clone "${REPO_URL}" "${REPO_DIR}"

pushd "${REPO_DIR}" >/dev/null
if ! npx -p tree-sitter-cli@0.22.6 tree-sitter build --wasm; then
  echo "本地 tree-sitter-cli 不可用" >&2
fi
popd >/dev/null

mkdir -p "${EDITOR_DIR}"

cp "${REPO_DIR}/tree-sitter-wpl.wasm" "${EDITOR_DIR}/tree-sitter-wpl.wasm"
cp "${REPO_DIR}/queries/highlights.scm" "${EDITOR_DIR}/highlights.scm"

if [ ! -f "${PROJECT_ROOT}/node_modules/web-tree-sitter/tree-sitter.wasm" ]; then
  echo "缺少 web-tree-sitter/tree-sitter.wasm，请先安装依赖。" >&2
  exit 1
fi

cp "${PROJECT_ROOT}/node_modules/web-tree-sitter/tree-sitter.wasm" "${PUBLIC_DIR}/tree-sitter.wasm"

echo "WPL 资源已写入：${PUBLIC_DIR}"
