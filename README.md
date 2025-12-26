# wp-editor

Wp Editor 是一个独立运行的 WEB 系统，专门用于日志解析和数据转换。它提供了完整的日志解析、数据转换和项目管理功能。

## 功能特性

- **日志解析**: 支持 WPL (Warp Parse Language) 规则，可解析多种格式的日志
- **数据转换**: 支持 OML (Object Mapping Language) 规则，将解析后的数据转换为指定格式
- **实时预览**: 支持实时解析和转换结果预览
- **规则编辑**: 内置 Monaco Editor，支持语法高亮和智能提示

## 技术栈

### 后端
- **语言**: Rust (Edition 2024)
- **Web 框架**: Actix Web 4.4
- **核心引擎**: warp-flow
- **异步运行时**: Tokio

### 前端
- **框架**: React 19.0.0
- **构建工具**: Vite 6.3.5
- **UI 组件**: Ant Design 5.24.9
- **编辑器**: Monaco Editor 0.52.2

## 快速开始

### 环境要求
- Rust 1.70+
- Node.js 20+
- Cargo 包管理器

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd wp-editor
```

2. **构建后端**
```bash
cargo build
```

3. **运行服务**
```bash
# 运行后端服务
cargo run

```

### 配置说明

配置文件位于 `config/config.toml`:

```toml
[log]
level = "info,ctrl=info,launch=info"
output = "Console"
output_path = "./logs/"

[web]
host = "0.0.0.0"
port = 8080
```

## 使用指南

### 1. 编写 WPL 规则
WPL (Warp Parse Language) 用于定义日志解析规则:

```wpl
package /example/simple {
    rule nginx {
        (ip:sip,_^2,time:recv_time<[,]>,http/request",http/status,digit,chars",http/agent",_")
    }
}
```

### 2. 编写 OML 规则
OML (Object Mapping Language) 用于定义数据转换规则:

```oml
name : /oml/example/simple 
rule :
    /example/simple*
---
recv_time  = take() ;
occur_time = Now::time() ;
src_ip     = take(option:[src-ip,sip,source-ip] );
```

### 3. 测试解析
- 在解析器页面输入示例日志
- 系统将实时显示解析结果
- 支持单条日志和批量日志解析

## API 文档

### 基础接口
- `GET /api/hello` - 健康检查
- `GET /api/version` - 获取版本信息

### 核心功能接口
- `POST /api/parse-logs` - 解析日志
- `POST /api/convert-record` - 转换数据

## 项目结构

```
wp-editor/
├── .github/          # GitHub Actions 工作流配置
├── _gal/             # 内部工具配置,使用gflow更新版本依赖
├── config/           # 配置文件
│   └── config.toml
├── crates/           # 子 crate
│   └── migrations/   # 数据库迁移
├── src/              # 后端源码
│   ├── api/          # API 接口实现
│   │   ├── debug.rs
│   │   ├── knowledge.rs
│   │   └── mod.rs
│   ├── db/           # 数据库操作
│   │   ├── knowledge_config.rs
│   │   ├── mod.rs
│   │   └── pool.rs
│   ├── server/       # 服务器配置
│   │   ├── app.rs
│   │   ├── mod.rs
│   │   └── setting.rs
│   ├── utils/        # 工具函数
│   │   ├── knowledge.rs
│   │   ├── mod.rs
│   │   ├── oml.rs
│   │   └── wpl.rs
│   ├── error.rs
│   ├── lib.rs
│   └── main.rs
├── tests/            # 测试代码
│   ├── api/          # API 测试
│   └── utils/        # 工具测试
├── web/              # 前端源码
│   ├── dist/         # 构建输出
│   ├── public/       # 静态资源
│   ├── src/          # 前端源码
│   │   ├── configs/  # 配置
│   │   ├── services/ # API 服务
│   │   ├── styles/   # 样式
│   │   ├── test/     # 前端测试
│   │   ├── utils/    # 前端工具
│   │   ├── views/    # 页面组件
│   │   │   ├── components/ # 通用组件
│   │   │   └── pages/      # 页面
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── Cargo.lock
├── Cargo.toml
├── Dockerfile
├── README.md
└── build.rs
```

## 开发指南

### 后端开发
- 使用 `cargo test` 运行测试
- 使用 `cargo clippy` 检查代码质量
- 遵循 Rust 代码规范

### 前端开发
- 使用 `npm run lint` 检查代码质量
- 使用 `npm run build` 构建生产版本
- 遵循 React 18+ 最佳实践

## 部署

### Docker 部署
```bash
docker build -t wp-editor .
docker run -p 8080:8080 wp-editor
```

### 直接部署
1. 构建后端: `cargo build --release`
2. 运行: `./target/release/wp-editor`

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持

如有问题或建议，请提交 Issue 或联系开发团队。

## 详细文档

更多详细信息请查看 [doc/README.md](doc/README.md) 文档。
