# Changelog

本文件记录所有重要变更，格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.18.0] - 2026-04-30

### Changed

- 版本更新至 1.18.0
- 升级 wp-motor 依赖至 v1.20.7
- 同步刷新 `Cargo.lock` 中的相关依赖版本，收敛依赖栈并移除旧的 `mysql`、`mysql_async`、`tokio-postgres` 依赖链

## [1.19.3] - 2026-05-07

### Changed

- 更新logo资源，替换 `favicon.png`、`home.png`、`index.png` 的展示素材。
- 同步刷新 `web/public/assets/images` 与 `web/dist/assets/images` 中对应图片，确保源码资源与构建产物保持一致。

## [1.19.2] - 2026-05-05

### Changed

- 升级错误与 WP 依赖主线：`orion-error 0.8`、`wp-motor v1.21.11`、`wp-lang 0.3`。
- 调整 alpha 环境 `systemd` 服务配置，`ExecStart` 与 `WorkingDirectory` 改为直接指向 `${WORK_DIR}` 下的 `wp-editor` 与工作目录，简化部署路径约束


## [1.17.2-alpha] - 2026-04-23

### Changed

- 版本号统一为 `1.17.2` / `v1.17.2-alpha`（同步更新 `Cargo.toml`、`Cargo.lock`、`version.txt`、`dist/install-manifest-alpha.json`）
- 升级 wp-motor 相关依赖至 v1.21.4
- 补齐 `1.17.2-alpha` 的中英文变更记录

## [1.17.0-alpha] - 2026-04-16

### Changed

- 升级 wp-motor 依赖至 v1.20.3
- 同步 `Cargo.lock` 中 wp-motor 相关依赖的版本与源码引用
- 同步 `wp-lang` 锁定版本至 `0.1.10`

## [1.16.0-beta] - 2026-04-16

### Added

- 新增 `/metrics` Prometheus 指标暴露端点

### Changed

- 合并 `alpha` 分支变更到 `beta`
- 升级 wp-motor 依赖至 v1.19.16
- 恢复 `Cargo.lock` 并同步 beta 版本的依赖锁定结果
- 更新 beta 发布清单 `dist/install-manifest-beta.json`，发布版本调整为 `v1.16.0-beta`
- 更新 WPL Tree-sitter 高亮查询与 `tree-sitter-wpl.wasm` 资源，适配新的语法节点
- 将 OML 转换与示例加载链路调整为异步实现，覆盖 `debug_transform`、`debug_examples`、`oml_examples` 与 `convert_record`

### Fixed

- 适配 `OMLCodeError`、`WparseReason`、`FieldQueryCache` 等上游 API 变更
- 修复 OML 示例目录递归加载与错误透传问题
- 修复 `/metrics` 请求日志过滤，避免干扰常规接口日志

## [1.15.4-alpha] - 2026-04-08

### Changed

- 版本号统一为 `1.15.4` / `v1.15.4-alpha`（同步更新 `Cargo.toml`、`version.txt`、`dist/install-manifest-alpha.json`）
- 恢复 `web/package-lock.json` 并调整忽略规则，确保前端依赖锁定结果随版本发布

## [1.15.3-alpha] - 2026-04-08

### Added

- 新增 `/metrics` Prometheus 指标暴露端点

### Changed

- 为 Actix HTTP 指标设置稳定的指标名称
- 调整访问日志过滤规则，排除 `/metrics`
- 调整锁文件提交策略，移除 `Cargo.lock` 与 `web/package-lock.json`

## [1.15.2-alpha] - 2026-04-07

### Changed

- 版本号统一为 `1.15.2` / `v1.15.2-alpha`（同步更新 `Cargo.toml`、`Cargo.lock`、`version.txt`、`dist/install-manifest-alpha.json`）
- 重构 README 并更新发布流程说明，收敛为单文件双语文档
- 优化前端构建拆包与开发态依赖预构建策略，减少刷新时碎片化请求
- 为静态资源补充分级缓存策略，区分入口页、哈希资源与其他静态文件

### Fixed

- `/api/*` 未匹配路由改为返回 JSON 404，避免回退到前端页面

### Performance

- 自动启用 gzip/deflate 压缩，降低前端资源传输体积

### Removed

- 移除独立 `README.en.md`

## [1.15.1-alpha] - 2026-04-03

### Changed

- 版本号统一为 `1.15.1` / `v1.15.1-alpha`（同步更新 `Cargo.toml`、`Cargo.lock`、`version.txt`、`dist/install-manifest-alpha.json`）

### Fixed

- 更新 `Cargo.lock`，同步依赖锁定结果

## [1.15.0-alpha] - 2026-04-03

### Changed

- 版本号统一为 `1.15.0` / `v1.15.0-alpha`（同步更新 `Cargo.toml`、`Cargo.lock`、`version.txt`、`dist/install-manifest-alpha.json`）
- 升级 wp-motor 依赖至 v1.19.16
- `wp-lang`、`wp-knowledge` 改为独立版本依赖，适配上游包拆分
- 将 OML 转换与示例加载链路调整为异步实现，覆盖 `debug_transform`、`debug_examples`、`oml_examples` 与 `convert_record`

### Fixed

- 修复 OML 示例目录递归加载时的错误透传与 `Future` 处理问题
- 适配 `OMLCodeError`、`WparseReason` 等导入路径变化
- 将相关集成测试与示例测试切换为异步用例并补齐 `await`

## [1.14.2] - 2026-04-07

### Changed

- 版本更新至 1.14.2
- 重构 README 并更新发布流程说明，收敛为单文件双语文档
- 优化前端构建拆包与开发态依赖预构建策略，减少刷新时碎片化请求
- 为静态资源补充分级缓存策略，区分入口页、哈希资源与其他静态文件

### Fixed

- `/api/*` 未匹配路由改为返回 JSON 404，避免回退到前端页面

### Performance

- 自动启用 gzip/deflate 压缩，降低前端资源传输体积

### Removed

- 移除独立 `README.en.md`

## [1.14.2-beta] - 2026-04-07

### Changed

- 版本号统一为 `1.14.2` / `v1.14.2-beta`（同步更新 `Cargo.toml`、`Cargo.lock`、`version.txt`、`dist/install-manifest-beta.json`）
- 重构 README 并更新发布流程说明，收敛为单文件双语文档
- 优化前端构建拆包与开发态依赖预构建策略，减少刷新时碎片化请求
- 为静态资源补充分级缓存策略，区分入口页、哈希资源与其他静态文件

### Fixed

- `/api/*` 未匹配路由改为返回 JSON 404，避免回退到前端页面

### Performance

- 自动启用 gzip/deflate 压缩，降低前端资源传输体积

### Removed

- 移除独立 `README.en.md`

## [1.14.1] - 2026-04-03

### Changed

- 版本更新至 1.14.1
- 微调 `README.md` 与 `README.en.md` 文案
- 更新正式发布清单 `dist/install-manifest.json`

### Fixed

- 更新 `Cargo.lock`，同步依赖锁定结果

## [1.14.1-beta] - 2026-04-03

### Changed

- 版本号统一为 `1.14.1` / `v1.14.1-beta`（同步更新 `Cargo.toml`、`Cargo.lock`、`version.txt`、`dist/install-manifest-beta.json`）

### Fixed

- 更新 `Cargo.lock`，同步依赖锁定结果

## [1.14.0] - 2026-04-03

### Added

- 新增 `CONTRIBUTING.md`，补充贡献指南与协作说明

### Changed

- 版本更新至 1.14.0
- 许可证由 Elastic License 2.0 调整为 Apache 2.0
- 重构 README，补充双语说明并对齐中英文内容
- 更新正式发布清单 `dist/install-manifest.json`

### Removed

- 删除 README 中的 Test Coverage badge、使用指南与 API 文档章节

## [1.14.0-beta] - 2026-04-01

### Added

- 代码编辑器新增一键复制/粘贴能力

### Changed

- 版本号统一为 `1.14.0` / `v1.14.0-beta`（同步更新 `Cargo.toml`、`Cargo.lock`、`version.txt`、`dist/install-manifest-beta.json`）
- 升级 wp-motor 依赖至 v1.18.3

### Fixed

- 修复编辑器 `Tab` 键行为异常
- 新增 `Shift+Tab` 反向缩进支持

## [1.13.0-alpha] - 2026-03-12

### Changed

- 更新 wp-motor 依赖至 v1.19.16
- 版本号统一为 `1.13.0` / `v1.13.0-alpha`（同步更新 `Cargo.toml`、`Cargo.lock`、`version.txt`）
- 更新 alpha 发布清单 `dist/install-manifest-alpha.json`，将发布版本标识由 `v1.14.0-alpha` 调整为 `v1.13.0-alpha`
- 更新安装包文件名映射，覆盖以下制品：
  - `wp-editor-v1.13.0-alpha-aarch64-apple-darwin.tar.gz`
  - `wp-editor-v1.13.0-alpha-aarch64-unknown-linux-gnu.tar.gz`
  - `wp-editor-v1.13.0-alpha-x86_64-unknown-linux-gnu.tar.gz`
- 调整 `debug_examples` 与 `debug_transform` 的异步调用链，补齐 `await`

### Fixed

- 修复 `oml_examples` 目录递归时将 `Future` 当作 `Result` 使用的问题
- 修复 OML 解析错误未透传的问题（`oml_parse(...).await?`）
- 修复 `oml_parse` 入参借用方式（使用稳定的 `parse_input` 绑定）
- 适配相关测试中的异步调用，将 OML 相关用例改为异步测试并补齐 `await`

## [1.13.0] - 2026-03-08

### Changed

- 版本更新至 1.13.0
- 升级 wp-motor 依赖至 v1.18.0
- 升级 `wp-connector-api`、`wp-parse-api`、`wp-error`、`wp-specs`、`wp-conf-base`、`wp-log`

### Fixed

- 修复依赖升级后的编译错误：统一 `orion-error` 至 `0.6`
- 适配 `RawData` 导入路径变更（`wp_model_core::raw::RawData`）
- 适配 `UvsReason::DataError` 新枚举形态，修复错误匹配逻辑

## [1.12.2] - 2026-03-05

### Changed

- 版本更新至 1.12.2
- 升级 wp-motor 依赖至 v1.17.8
- 优化 OML Tree-sitter 高亮：函数关键字识别、参数纯文本区与回退高亮

## [1.12.1-alpha] - 2026-03-04

### Changed

- 版本更新至 1.12.1-alpha
- 升级 wp-motor 依赖版本
- WPL 格式化逻辑依赖 tree-sitter
- OML 格式化逻辑调整
- WPL 语法高亮改为依赖 tree-sitter-wpl 仓库
- OML 语法高亮改为依赖 tree-sitter-oml 仓库

## [1.12.0-alpha] - 2026-02-26

### Changed

- 版本更新至 1.12.0-alpha
- 优化错误消息的格式化展示
- 示例修改状态展示优化
- 引擎语法补全规则与示例同步更新
- 升级 wp-motor 依赖至 v1.17.2-alpha

## [1.11.0] - 2026-02-12

### Added

- 日志/WPL/OML 独立实例池，互不影响
- 实例默认命名支持按类型与语言切换（日志/WPL/OML）
- 工作区支持多日志、多 WPL、多 OML 的自由组合

### Changed

- 示例库与工作区彻底隔离，切换不再覆盖数据
- 示例库交互恢复为点击示例自动填充并解析
- 日志/WPL/OML 标题区实例列表与操作按钮布局优化
- 实例列表样式与删除按钮精简，适配高密度显示
- “添加实例”按钮与日志区操作按钮视觉对齐

## [1.10.2] - 2026-02-11

### Added

- 为工作区模式添加默认模板：WPL 解析规则和 OML 转换规则
- WPL 默认模板：`package /path/ { rule name { () } }`
- OML 默认模板：`name : /examplerule : /path/name/*\n---\n* = take();`

### Changed

- 优化工作区初始化逻辑，进入界面时默认选中工作区模式
- 改进用户体验，提供开箱即用的规则模板

## [1.8.0-alpha] - 2026-01-29

### Changed

- 版本更新至 1.8.0-alpha
- 更新社区二维码图片
- 升级wp-motor依赖版本至v1.11.1-alpha
- 更新相关依赖包版本

## [1.7.1-alpha] - 2026-01-27

### Changed

- 版本更新至 1.7.1-alpha
- 优化调试页面 JSON 模式长行显示，避免内容撑开容器

## [1.7.0-alpha] - 2026-01-26

### Added

- 新增功能和特性

### Changed

- 版本更新至 1.7.0-alpha

### Fixed

- 修复相关问题

## [1.6.3-alpha] - 2026-01-23

### Changed

- 版本更新至 1.6.3-alpha

## [1.6.2-alpha] - 2026-01-21

### Added

- 添加 shadow-rs 依赖用于构建信息追踪

### Changed

- 更新 wp-engine 依赖至 v1.10.1 版本
- 重构代码编辑器组件，重新组织 CodeMirror 配置
- 优化自定义主题和 OML/WPL 语法补全
- 重新构建前端资源包

### Fixed

- 修复 OML 语法高亮失效的问题
- 修复规则库不存在时的错误处理
- 修复单元测试问题

### Removed

- 移除 ^2 语法支持

## [1.6.1-alpha] - 2026-01-20

### Changed

- 前端性能优化：移除 6 个未使用的依赖（echarts、prismjs、refractor、react-diff-view、@ant-design/pro-components、@seed-fe/logger）
- 优化构建配置：使用 esbuild 替代 terser，构建速度提升 30-50%
- 优化代码分割策略：实现细粒度的按需加载，减少首屏加载体积
- 优化 HTML 配置：添加 DNS 预连接，禁用不必要的格式检测

### Performance

- 依赖体积减少约 10MB
- 构建时间缩短至 ~3.2 秒
- 首屏加载体积优化（gzip 后约 320KB）
- 解决循环依赖问题

## [1.6.0-alpha] - 2026-01-20

### Added

- 添加代码编辑器智能语法补全功能
- 添加 OML 语法补全支持和示例表格
- 添加中英文双语补全提示表格

### Changed

- 优化代码编辑器组件的补全体验
- 改进调试接口和错误处理

### Fixed

- 修复代码编辑器相关问题

## [1.5.0] - 2026-01-17

### Added

- 添加单元测试覆盖率 CI
- 添加智能括号跳过功能并改进示例列表用户体验
- 实现三分支策略的依赖管理和发布流程

### Changed

- 升级依赖版本至 1.10.0-alpha 并更新相关包
- 转换和解析接口以消除重复标题
- 优化调试页面的表格显示和数据处理逻辑
- 更新阅读文档

### Fixed

- 修复表格模式底部行结果显示的遮挡问题
- 优化结果显示表格格式数组展示
- 修复规则示例的灵活自适应设计
- 修复示例库中包含斜杠的解析规则逻辑错误
- 修复发布工作流中的项目名称和链接引用

### Removed

- 移除 Docker 镜像构建和发布流程，简化 CI/CD 配置
- 移除 Cargo 配置
