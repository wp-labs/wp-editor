# OML/WPL 格式化与高亮改造方案

> 参考项目：wp-station  
> 创建日期：2026-07-31  
> 状态：方案评审中  

---

## 一、现状对比分析

| 维度 | wp-editor（当前） | wp-station（参考） |
|------|------------------|-------------------|
| **高亮模块** | OML/WPL 各一套独立代码，逻辑高度重复 | 通用 `highlightExtension.js`，`createTreeSitterHighlightExtension(languageId)` 工厂函数 |
| **补全模块** | 补全数据硬编码在 JS 文件中，每语言约 500+ 行 | 补全数据从 JSON bundle 动态加载，通用 `createBundleCompletionSource(languageId, lang)` |
| **资产管理** | 手动 shell 脚本 clone 仓库并构建 wasm，放到扁平目录 | `assetRegistry.js` + manifest 驱动，按 `/languages/{id}/editor/` 组织 |
| **资源路径** | 扁平结构：`/tree-sitter/tree-sitter-oml.wasm`、`/tree-sitter/queries/highlights.scm` | 分层结构：`/tree-sitter/languages/{id}/editor/asset-manifest.json` |
| **后端格式化** | 自定义 Rust 实现（`oml_formatter.rs` 567 行、`wpl_formatter.rs` 848 行） | 直接复用 `tree_sitter_oml::OmlFormatter`、`tree_sitter_wpl::WplFormatter` |
| **build.rs** | 仅跑 `npm build`，不管 tree-sitter 资源 | 从 Cargo 依赖目录自动导出 tree-sitter 资产到 `web/public/` |

### 当前 wp-editor 前端文件结构

```
web/src/views/components/CodeEditor/
├── CodeEditor.jsx                # 主组件，手动 import 各语言模块
├── CodeEditor.module.css
├── index.jsx
├── editorTheme.js                # 编辑器基础主题（两个项目基本一致）
├── completionLabels.js           # 补全标签国际化
├── oml/
│   ├── omlTreeSitterHighlight.js # OML 高亮（300 行，含大量 fallback 逻辑）
│   ├── omlLanguage.js            # OML 补全源
│   ├── omlCompletionTable.js     # OML 补全数据（515 行硬编码）
│   └── omlCompletionTable.en.js  # OML 英文补全数据
└── wpl/
    ├── wplTreeSitterHighlight.js # WPL 高亮（131 行）
    ├── wplLanguage.js            # WPL 补全源
    ├── wplCompletionTable.js     # WPL 补全数据（684 行硬编码）
    └── wplCompletionTable.en.js  # WPL 英文补全数据
```

### wp-station 前端文件结构（参考目标）

```
web/src/views/components/CodeEditor/
├── CodeEditor.jsx                # 主组件，使用工厂函数按 languageId 注册
├── CodeEditor.module.css
├── index.jsx
├── editorTheme.js
└── treeSitter/
    ├── assetRegistry.js          # 通用资产管理（manifest 驱动）
    ├── highlightExtension.js     # 通用高亮扩展（createTreeSitterHighlightExtension）
    └── completionSource.js       # 通用补全源（createBundleCompletionSource）
```

---

## 二、改造目标

1. **消除重复**：高亮和补全逻辑统一为通用模块，按 `languageId` 参数化
2. **资产管理标准化**：引入 manifest 驱动的 asset registry，与 wp-station 保持一致
3. **后端简化**：用 tree-sitter crate 内置格式化器替换自定义实现，减少约 1400 行自定义代码
4. **构建自动化**：`build.rs` 自动从 Cargo 依赖导出 tree-sitter 资产，不再依赖手动 shell 脚本
5. **保持兼容**：渐进式改造，保留旧模块作为 fallback，不破坏现有功能

---

## 三、分阶段改造计划

### 阶段一：前端资产管理层改造

**目标**：建立 manifest 驱动的资源加载体系，这是整个改造的基础。

#### 3.1.1 新增 `web/src/views/components/CodeEditor/treeSitter/assetRegistry.js`

参考 wp-station `web/src/views/components/CodeEditor/treeSitter/assetRegistry.js`。

**职责**：
- `fetchLanguageManifest(languageId)` — 从 `/tree-sitter/languages/{languageId}/editor/asset-manifest.json` 加载语言清单
- `resolveLanguageAssetUrl(languageId, relativePath)` — 基于语言根路径解析完整资源 URL
- `fetchCompletionBundle(languageId)` — 加载补全 JSON bundle（如果 manifest 中有配置）
- 内置 `Map` 缓存层，避免重复请求
- 加载失败时清理对应缓存项，允许重试

**实现要点**：
```js
const toLanguageRoot = (languageId) => `/tree-sitter/languages/${languageId}/`;

// manifest 缓存
const manifestCache = new Map();
// bundle 缓存
const bundleCache = new Map();

export const fetchLanguageManifest = async (languageId) => { ... };
export const resolveLanguageAssetUrl = (languageId, relativePath) => { ... };
export const fetchCompletionBundle = async (languageId) => { ... };
```

#### 3.1.2 新增 `web/src/views/components/CodeEditor/treeSitter/highlightExtension.js`

参考 wp-station `web/src/views/components/CodeEditor/treeSitter/highlightExtension.js`。

**职责**：
- 导出 `createTreeSitterHighlightExtension(languageId)` 工厂函数
- 通过 `assetRegistry` 加载 parser wasm 和 highlights query
- `classForCapture(name)` 将 tree-sitter capture name 映射为 CSS 类名（如 `keyword` → `cm-oml-keyword`）
- 保留 `splitQueryBlocks` 容错机制（跳过与当前 parser 版本不兼容的 query block）
- 保留 `resourcesCache` 避免重复初始化 parser/language/query

**核心流程**：
```
createTreeSitterHighlightExtension(languageId)
  → loadLanguageResources(languageId)
    → initRuntime()                         // 初始化 web-tree-sitter runtime
    → fetchLanguageManifest(languageId)     // 获取语言清单
    → Language.load(parserWasmUrl)          // 加载 parser wasm
    → fetch(highlightsQueryUrl)             // 加载 highlights.scm
    → buildQuerySafely(language, queryText) // 容错构建 Query
  → ViewPlugin.fromClass 监听 docChanged
  → parser.parse → query.captures → Decoration.set
```

**与旧实现的差异**：
- 不再需要 `buildFallbackRanges` / `findPlainArgRanges` 等 OML 特有逻辑（如果 highlights.scm 查询文件质量足够）
- 如果仍需要这些 fallback，可作为可选的 `extraDecorators` 参数传入

#### 3.1.3 新增 `web/src/views/components/CodeEditor/treeSitter/completionSource.js`

参考 wp-station `web/src/views/components/CodeEditor/treeSitter/completionSource.js`。

**职责**：
- 导出 `createBundleCompletionSource(languageId, lang)` 工厂函数
- 从 `assetRegistry.fetchCompletionBundle` 加载补全数据
- `buildCompletionOptionsFromBundle(bundle, lang)` 将 JSON 数据转为 `snippetCompletion` 数组
- `getValidFor(languageId, bundle)` 返回用于匹配触发词的正则
- 支持多语言回退（`lang` → `zh-CN`）

#### 3.1.4 资产目录结构调整

**当前扁平结构**：
```
web/public/tree-sitter/
├── tree-sitter.wasm          # web-tree-sitter runtime
├── tree-sitter-oml.wasm      # OML parser
├── tree-sitter-wpl.wasm      # WPL parser
└── queries/
    ├── highlights.scm        # OML 高亮查询
    └── wpl-highlights.scm    # WPL 高亮查询
```

**改造后分层结构（与 wp-station 一致）**：
```
web/public/tree-sitter/
├── tree-sitter.wasm                     # web-tree-sitter runtime
└── languages/
    ├── index.json                        # 语言索引（供前端发现可用语言）
    ├── oml/
    │   └── editor/
    │       ├── asset-manifest.json       # 语言清单
    │       ├── tree-sitter-oml.wasm      # parser wasm
    │       ├── highlights.scm            # 高亮查询
    │       └── completions.json          # 补全数据（可选）
    └── wpl/
        └── editor/
            ├── asset-manifest.json
            ├── tree-sitter-wpl.wasm
            ├── highlights.scm
            └── completions.json          # 补全数据（可选）
```

**`asset-manifest.json` 格式**：
```json
{
  "language_id": "oml",
  "parser_wasm": "tree-sitter-oml.wasm",
  "highlights_query": "highlights.scm",
  "completion_bundle": "completions.json"
}
```

---

### 阶段二：补全数据外置化

**目标**：将硬编码的补全数据从 JS 文件迁移为 JSON 资源文件。

#### 3.2.1 新增 `web/public/tree-sitter/languages/oml/editor/completions.json`

从 `omlCompletionTable.js` 和 `omlCompletionTable.en.js` 提取数据，结构化格式：

```json
{
  "locales": {
    "zh-CN": [
      {
        "label": "read",
        "type": "function",
        "detail": "简单取值",
        "info": "示例：read(simple_chars)",
        "insert_text": "read(${Variable})"
      }
    ],
    "en-US": [
      {
        "label": "read",
        "type": "function",
        "detail": "Simple value read",
        "info": "Example: read(simple_chars)",
        "insert_text": "read(${Variable})"
      }
    ]
  },
  "valid_for": "[\\w/:\\[\\]]+|\\|"
}
```

#### 3.2.2 新增 `web/public/tree-sitter/languages/wpl/editor/completions.json`

从 `wplCompletionTable.js` 和 `wplCompletionTable.en.js` 提取数据：

```json
{
  "locales": {
    "zh-CN": [
      {
        "label": "peek_symbol",
        "type": "type",
        "detail": "预读匹配但不消费输入",
        "info": "示例：peek_symbol(peek_symbol)",
        "insert_text": "peek_symbol(${peek_symbol})"
      }
    ],
    "en-US": [...]
  },
  "valid_for": "[\\w/]+|\\|",
  "builtin_templates": [
    {
      "label": "package",
      "type": "keyword",
      "insert_text": "package /${path}/ {\n  \n}"
    },
    {
      "label": "rule",
      "type": "keyword",
      "insert_text": "rule ${name} {(\n  \n)}"
    }
  ]
}
```

**说明**：
- `type` 字段映射：WPL 中的 `kind` 字段统一改名为 `type`（与 CodeMirror 的 `Completion.type` 对应）
- package/rule 内置模板从 `wplLanguage.js` 中提取到 bundle 的 `builtin_templates` 数组中
- `insert_text` 使用 CodeMirror snippet 语法

#### 3.2.3 保留兼容层（过渡期）

保留原 `omlCompletionTable.js` / `wplCompletionTable.js` 文件不变。在 `assetRegistry.fetchCompletionBundle` 中实现 fallback 逻辑：

```js
export const fetchCompletionBundle = async (languageId) => {
  // 1. 先尝试加载远程 JSON bundle
  const manifest = await fetchLanguageManifest(languageId);
  if (manifest?.completion_bundle) {
    const response = await fetch(resolveLanguageAssetUrl(languageId, manifest.completion_bundle));
    if (response.ok) return response.json();
  }
  
  // 2. Fallback：使用本地硬编码数据
  if (languageId === 'oml') {
    return buildFallbackBundle(OML_COMPLETION_TABLE_ZH, OML_COMPLETION_TABLE_EN);
  }
  if (languageId === 'wpl') {
    return buildFallbackBundle(WPL_COMPLETION_TABLE_ZH, WPL_COMPLETION_TABLE_EN);
  }
  
  return null;
};
```

过渡期结束后（确认 JSON bundle 稳定可用），再删除硬编码的 JS 补全文件。

---

### 阶段三：CodeEditor 组件统一化

**目标**：用通用工厂函数替换语言特定的 import。

#### 3.3.1 修改 `web/src/views/components/CodeEditor/CodeEditor.jsx`

**改造前**（当前）：
```js
import { buildWplCompletionOptions, WPL_COMPLETION_VALID_FOR } from './wpl/wplLanguage';
import { wplHighlightExtension } from './wpl/wplTreeSitterHighlight';
import { buildOmlCompletionOptions, OML_COMPLETION_VALID_FOR } from './oml/omlLanguage';
import { omlHighlightExtension } from './oml/omlTreeSitterHighlight';

// 自定义 createCompletionSource 工厂
const createCompletionSource = (options, validFor) => (context) => { ... };

// 手动构建每种语言的补全选项
const wplCompletionOptions = useMemo(() => buildWplCompletionOptions(uiLanguage), [uiLanguage]);
const omlCompletionOptions = useMemo(() => buildOmlCompletionOptions(uiLanguage), [uiLanguage]);

// 在每个语言分支中使用专用函数
if (language === 'wpl') {
  extensions.splice(6, 0, wplHighlightExtension(), autocompletion({...}));
}
if (language === 'oml') {
  extensions.splice(6, 0, omlHighlightExtension(), autocompletion({...}));
}
```

**改造后**：
```js
import { createBundleCompletionSource } from './treeSitter/completionSource';
import { createTreeSitterHighlightExtension } from './treeSitter/highlightExtension';

// 通用补全源（useMemo 缓存）
const wplCompletionSource = useMemo(
  () => createBundleCompletionSource('wpl', uiLanguage),
  [uiLanguage],
);
const omlCompletionSource = useMemo(
  () => createBundleCompletionSource('oml', uiLanguage),
  [uiLanguage],
);

// 统一语言注册
if (language === 'wpl') {
  extensions.splice(6, 0,
    createTreeSitterHighlightExtension('wpl'),
    autocompletion({ override: [wplCompletionSource] }),
  );
}
if (language === 'oml') {
  extensions.splice(6, 0,
    createTreeSitterHighlightExtension('oml'),
    autocompletion({ override: [omlCompletionSource] }),
  );
}
```

**说明**：
- `createBundleCompletionSource` 内部处理了 bundle 加载、多语言选择、补全触发匹配等逻辑
- `createTreeSitterHighlightExtension` 内部处理了 parser 初始化、query 加载、高亮渲染等逻辑
- CodeEditor 组件不再需要了解每种语言的实现细节

#### 3.3.2 保留 `completionLabels.js`

当前仅用于 WPL 的 package/rule 内置模板（"包定义"、"规则定义"）。待 bundle 内置 templates 功能稳定后，可考虑移除此文件。

---

### 阶段四：后端格式化器简化

**目标**：删除自定义格式化实现（约 1400 行），直接复用 tree-sitter crate 提供的格式化器。

#### 3.4.1 修改 `src/utils/oml.rs`

**改造前**：
```rust
use crate::{error::AppError, utils::format::remove_annotations};
use wp_knowledge::cache::FieldQueryCache;
use wp_model_core::model::DataRecord;
use wp_oml::AsyncDataTransformer;
use wp_oml::parser::oml_parse;

pub async fn convert_record(oml: &str, record: DataRecord) -> Result<DataRecord, AppError> {
    let filter_oml = remove_annotations(oml);
    let model = oml_parse(&mut filter_oml.as_str(), "").await?;
    let mut cache = FieldQueryCache::with_capacity(10);
    let target = model.transform_ref_async(&record, &mut cache).await;
    Ok(target)
}
```

**改造后**（参考 wp-station `src/utils/oml/mod.rs`）：
```rust
//! OML 数据处理与格式化模块。
//!
//! 对外保留两类能力：
//! - 基于 OML 模型的 `DataRecord` 异步转换；
//! - OML 文本格式化（直接复用 tree-sitter-oml 提供的格式化器）。

mod transform;

pub use transform::convert_record;
pub use tree_sitter_oml::{OmlFormatError, OmlFormatter};
```

将转换逻辑提取到 `src/utils/oml/transform.rs`（子模块），格式化直接 re-export crate 的类型。

#### 3.4.2 修改 `src/utils/wpl.rs`

**改造后**（参考 wp-station `src/utils/wpl/mod.rs`）：
```rust
//! WPL 解析与格式化模块。
//!
//! 对外保留三类能力：
//! - WPL 规则校验与日志解析；
//! - `DataRecord` 到字段列表的转换；
//! - WPL 文本格式化（直接复用 tree-sitter-wpl 提供的格式化器）。

mod parse;

pub use parse::{ParsedField, record_to_fields, warp_check_record};
pub use tree_sitter_wpl::{WplFormatError, WplFormatter};
```

将解析逻辑提取到 `src/utils/wpl/parse.rs`（子模块）。

#### 3.4.3 删除文件

| 文件 | 行数 | 原因 |
|------|------|------|
| `src/utils/oml_formatter.rs` | 567 行 | 替换为 `tree_sitter_oml::OmlFormatter` |
| `src/utils/wpl_formatter.rs` | 848 行 | 替换为 `tree_sitter_wpl::WplFormatter` |

**注意**：删除前需确认 `tree_sitter_oml` 和 `tree_sitter_wpl` 的版本已包含格式化功能，且格式化输出与当前自定义实现兼容。建议先在测试环境对比两种实现的输出结果。

#### 3.4.4 检查 Cargo.toml 依赖

确认以下依赖版本满足需求：
```toml
tree-sitter-oml = "..."  # 需包含 OmlFormatter
tree-sitter-wpl = "..."  # 需包含 WplFormatter
```

---

### 阶段五：build.rs 自动化资产同步

**目标**：`build.rs` 自动从 Cargo 依赖中导出 tree-sitter 资产，替代手动 shell 脚本。

#### 3.5.1 新增 `src/utils/tree_sitter_sync_manifest.rs`

参考 wp-station `src/utils/tree_sitter_sync_manifest.rs`。

```rust
/// Tree-sitter 语言资产远程源定义。
#[derive(Clone, Copy, Debug)]
pub(crate) struct TreeSitterAssetSource {
    pub package_name: &'static str,
    pub manifest_relative: &'static str,
    pub local_override_root: Option<&'static str>,
}

pub(crate) const TREE_SITTER_ASSET_SOURCES: &[TreeSitterAssetSource] = &[
    TreeSitterAssetSource {
        package_name: "tree-sitter-wpl",
        manifest_relative: "editor/asset-manifest.json",
        local_override_root: Some("../wp-tree-sitter/tree-sitter-wpl"),
    },
    TreeSitterAssetSource {
        package_name: "tree-sitter-oml",
        manifest_relative: "editor/asset-manifest.json",
        local_override_root: Some("../wp-tree-sitter/tree-sitter-oml"),
    },
    // 可选：wfl/wfs/wfg
];
```

#### 3.5.2 新增 `src/utils/tree_sitter_assets.rs`

参考 wp-station `src/utils/tree_sitter_assets.rs`。

**核心职责**：
- `sync_tree_sitter_assets_for_dev_start()` — 开发态启动时同步 tree-sitter 语言资产到 `web/public/tree-sitter/languages/`
- `read_runtime_asset_from_public(request_path)` — 从 `web/public/` 读取静态资源字节（用于 actix-web 静态文件服务）
- 资产来源优先级：本地 override 仓库 > Cargo 依赖目录
- 同步失败不阻断服务启动（仅打印 warning）

**资产导出流程**：
```
cargo metadata → 获取所有 packages
  → 遍历 TREE_SITTER_ASSET_SOURCES
    → 查找本地 override 根目录（如 ../wp-tree-sitter/tree-sitter-oml）
    → 查找 Cargo 依赖包根目录（如 ~/.cargo/registry/.../tree-sitter-oml-*）
    → 读取 editor/asset-manifest.json
    → 复制 parser wasm + highlights query + completion bundle
      → web/public/tree-sitter/languages/{languageId}/editor/
    → 复制 web-tree-sitter runtime wasm
      → web/public/tree-sitter/tree-sitter.wasm
    → 写入 languages/index.json
```

#### 3.5.3 修改 `build.rs`

参考 wp-station `build.rs`。

**新增功能**：
1. `get_cargo_metadata()` — 已有，保留
2. `get_package_root()` — 从 metadata 定位依赖包根目录
3. `export_tree_sitter_assets()` — 遍历 `TREE_SITTER_ASSET_SOURCES`，复制资产到 `web/public/tree-sitter/languages/`
4. `export_web_tree_sitter_runtime()` — 复制 `web/node_modules/web-tree-sitter/web-tree-sitter.wasm` 到 `web/public/tree-sitter/tree-sitter.wasm`
5. `register_tree_sitter_inputs()` — 注册 `cargo:rerun-if-changed` 以支持增量构建
6. `ensure_frontend_tree_sitter_assets()` — 开发态确保 npm 依赖已安装 + 资产已导出

**改造要点**：
- 合并 `tree_sitter_sync_manifest` 和 `tree_sitter_assets` 的路径定义
- 在 `build.rs` 中使用 `#[path = "src/utils/tree_sitter_sync_manifest.rs"]` 引入共享常量
- 仅在非 release 构建时执行资产同步

#### 3.5.4 废弃 shell 脚本

- `web/scripts/prepare-oml-assets.sh` — 不再需要
- `web/scripts/prepare-wpl-assets.sh` — 不再需要

**修改 `web/package.json`**：
```json
{
  "scripts": {
    "dev": "vite",
    "predev": "",    // ← 移除 bash 脚本调用
    "prebuild": "",  // ← 移除 bash 脚本调用
    "build": "vite build",
    ...
  }
}
```

`predev` 和 `prebuild` 中的脚本调用可完全移除，因为 build.rs 已在 Cargo 构建阶段完成资产导出。

---

### 阶段六：高亮查询与主题优化

**目标**：确保高亮效果与 wp-station 保持一致。

#### 3.6.1 检查 highlights.scm 查询文件

确认 OML/WPL 各自的 `highlights.scm` 文件来源：
- 如果是通过 shell 脚本从 git repo clone 的旧版本，需更新为 crate 中嵌入的版本
- `build.rs` 导出流程会自动使用 crate 依赖中的最新版本

**可能存在的问题**：
- 旧 OML `highlights.scm` 可能缺少部分语法节点的捕获规则，因此当前代码有大量 `buildFallbackRanges` 正则 fallback
- 如果 crate 中的查询文件足够完善，fallback 逻辑可以移除或降级为可选

#### 3.6.2 editorTheme.js 对比

两个项目的 `editorTheme.js` 基本一致，仅定义编辑器基础样式（字体、行高、自动补全弹窗样式等），**无需改动**。

---

## 四、文件变更汇总

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| **新增** | `web/src/views/components/CodeEditor/treeSitter/assetRegistry.js` | 通用资产管理（manifest 驱动） |
| **新增** | `web/src/views/components/CodeEditor/treeSitter/highlightExtension.js` | 通用高亮扩展（工厂函数） |
| **新增** | `web/src/views/components/CodeEditor/treeSitter/completionSource.js` | 通用补全源（工厂函数） |
| **新增** | `web/public/tree-sitter/languages/oml/editor/completions.json` | OML 补全数据 |
| **新增** | `web/public/tree-sitter/languages/wpl/editor/completions.json` | WPL 补全数据 |
| **新增** | `src/utils/tree_sitter_sync_manifest.rs` | 语言资产源定义 |
| **新增** | `src/utils/tree_sitter_assets.rs` | 资产同步逻辑（build.rs + 运行时） |
| **修改** | `web/src/views/components/CodeEditor/CodeEditor.jsx` | 统一语言注册，用工厂函数替换专用 import |
| **修改** | `build.rs` | 新增 tree-sitter 资产自动化导出 |
| **修改** | `src/utils/oml.rs` | 改为 `pub use tree_sitter_oml::OmlFormatter`，转换逻辑提取到子模块 |
| **修改** | `src/utils/wpl.rs` | 改为 `pub use tree_sitter_wpl::WplFormatter`，解析逻辑提取到子模块 |
| **修改** | `web/package.json` | 移除 `predev`/`prebuild` 中的 shell 脚本调用 |
| **删除** | `src/utils/oml_formatter.rs` | 自定义 OML 格式化器（567 行），替换为 crate 实现 |
| **删除** | `src/utils/wpl_formatter.rs` | 自定义 WPL 格式化器（848 行），替换为 crate 实现 |
| **废弃** | `web/scripts/prepare-oml-assets.sh` | build.rs 接管 |
| **废弃** | `web/scripts/prepare-wpl-assets.sh` | build.rs 接管 |
| **保留（过渡期）** | `web/src/views/components/CodeEditor/oml/*` | 作为 fallback 保留 |
| **保留（过渡期）** | `web/src/views/components/CodeEditor/wpl/*` | 作为 fallback 保留 |

---

## 五、依赖项检查清单

改造前需要确认以下事项：

- [ ] **`tree_sitter_oml` 版本**：确认 crate 版本包含 `OmlFormatter` 和 `OmlFormatError`
- [ ] **`tree_sitter_wpl` 版本**：确认 crate 版本包含 `WplFormatter` 和 `WplFormatError`
- [ ] **`web-tree-sitter` 版本**：确认 `^0.25.0` 与 tree-sitter crate 编译的 wasm 版本兼容
- [ ] **格式化输出兼容性**：对比 crate 格式化器与当前自定义实现的输出结果
- [ ] **`highlights.scm` 完整性**：确认 crate 中的查询文件覆盖了所有语法高亮场景
- [ ] **CSS 高亮样式**：确认 `.cm-oml-*` 和 `.cm-wpl-*` 样式定义文件位置及完整性
- [ ] **补全数据完整性**：迁移到 JSON 后逐项对比，确保无遗漏
- [ ] **本地 override 路径**：确认 `wp-tree-sitter` 仓库的本地路径是否正确

---

## 六、风险与注意事项

1. **tree-sitter crate 格式化器差异**：需确认格式化输出与当前自定义实现一致，否则可能影响用户已保存的格式化结果。建议先在测试环境跑对比测试。

2. **补全 bundle 数据迁移**：当前补全数据中使用了 JS snippet 语法（如 `${Variable}`），迁移到 JSON 后需确保 `snippetCompletion` 仍能正确解析。

3. **WPL package/rule 内置模板**：这两个模板不属于标准补全项，需在 bundle 中以 `builtin_templates` 字段单独承载或在 `completionSource` 中特殊处理。

4. **web-tree-sitter 版本兼容**：不同版本的 `web-tree-sitter` 与 tree-sitter CLI 编译的 wasm 之间可能存在不兼容。需确保 npm 包版本与 crate 编译版本匹配。

5. **渐进式改造**：建议严格按阶段顺序执行，每个阶段完成后验证功能正常再进行下一阶段。特别是阶段一（asset registry）是整个改造的基础，必须优先确保稳定。

6. **回滚方案**：在每个阶段保留旧模块作为 fallback，如果新模块出现问题可以快速切回旧实现。
