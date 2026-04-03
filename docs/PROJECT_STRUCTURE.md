# 📁 项目结构

```
wp-editor/
├── 📁 config/                 # 配置文件
│   └── config.toml           # 主配置文件
│
├── 📁 crates/                 # Rust 子模块
│   └── migrations/            # 数据库迁移
│
├── 📁 docs/                   # 项目文档
│   ├── API.md                # API 文档
│   ├── CONFIGURATION.md      # 配置说明
│   ├── DEPLOYMENT.md         # 部署指南
│   ├── DEVELOPMENT.md        # 开发指南
│   ├── PROJECT_STRUCTURE.md  # 项目结构（本文档）
│   ├── QUICK_START.md        # 快速开始
│   └── TECH_STACK.md         # 技术栈
│
├── 📁 src/                    # Rust 后端源码
│   ├── api/                   # API 路由模块
│   │   ├── debug.rs          # 调试相关 API
│   │   ├── version.rs        # 版本信息 API
│   │   └── mod.rs            # API 模块入口
│   │
│   ├── db/                    # 数据库相关
│   │   ├── models.rs         # 数据模型
│   │   └── mod.rs            # 数据库模块入口
│   │
│   ├── server/                # 服务器配置
│   │   ├── config.rs         # 配置加载
│   │   └── mod.rs            # 服务器模块入口
│   │
│   ├── utils/                 # 工具函数
│   │   ├── wpl.rs            # WPL 解析工具
│   │   ├── oml.rs            # OML 转换工具
│   │   └── mod.rs            # 工具模块入口
│   │
│   ├── error.rs              # 错误处理
│   ├── lib.rs                # 库入口
│   └── main.rs               # 程序入口
│
├── 📁 web/                    # React 前端源码
│   ├── public/               # 静态资源
│   │   └── favicon.ico
│   │
│   ├── src/
│   │   ├── components/       # React 组件
│   │   │   ├── CodeEditor/   # 代码编辑器组件
│   │   │   ├── ResultView/   # 结果展示组件
│   │   │   └── Toolbar/      # 工具栏组件
│   │   │
│   │   ├── services/         # API 服务
│   │   │   ├── api.ts        # API 请求封装
│   │   │   └── types.ts      # TypeScript 类型定义
│   │   │
│   │   ├── views/            # 页面视图
│   │   │   ├── DebugView/    # 调试页面
│   │   │   └── HomeView/     # 首页
│   │   │
│   │   ├── locales/          # 国际化文件
│   │   │   ├── zh.json       # 中文
│   │   │   └── en.json       # 英文
│   │   │
│   │   ├── App.tsx           # 应用主组件
│   │   ├── main.tsx          # 前端入口
│   │   └── index.css         # 全局样式
│   │
│   ├── dist/                 # 构建输出（嵌入到 Rust 二进制）
│   ├── package.json          # npm 配置
│   ├── vite.config.ts        # Vite 配置
│   └── tsconfig.json         # TypeScript 配置
│
├── 📁 tests/                  # 测试文件
│   ├── api_tests.rs          # API 测试
│   ├── integration_tests.rs  # 集成测试
│   └── unit_tests.rs         # 单元测试
│
├── 📁 target/                 # Cargo 构建输出
│   ├── debug/                # 调试版本
│   └── release/              # 发布版本
│
├── 🦀 Cargo.toml             # Rust 项目配置
├── 🦀 Cargo.lock             # Rust 依赖锁定
├── 🔨 build.rs               # 构建脚本
├── 🐳 Dockerfile             # Docker 配置
├── 📖 README.md              # 项目说明
└── 📄 LICENSE                # 许可证
```

## 核心模块说明

### 后端 (src/)

- **api/**: RESTful API 路由和处理器
- **db/**: 数据库模型和操作（如需要）
- **server/**: 服务器配置和启动逻辑
- **utils/**: WPL/OML 解析、格式化等工具函数
- **error.rs**: 统一的错误处理

### 前端 (web/)

- **components/**: 可复用的 React 组件
- **services/**: API 调用和数据处理
- **views/**: 页面级组件
- **locales/**: 多语言翻译文件

### 配置 (config/)

- **config.toml**: 应用配置（日志、端口、规则库路径等）

### 文档 (docs/)

- 详细的技术文档和使用指南

### 测试 (tests/)

- 单元测试、集成测试、API 测试

## 构建产物

- **target/release/wp-editor**: 最终的可执行文件（包含嵌入的前端资源）
- **web/dist/**: 前端构建产物（通过 rust-embed 嵌入）

[← 返回主文档](../README.md)
