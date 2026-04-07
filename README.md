
# 🚀 WP Editor

**Visual Debugging and Rule Editing Web Application for WPL/OML**

![Build & Test](https://github.com/wp-labs/wp-editor/actions/workflows/build-and-test.yml/badge.svg)![Release & Docker](https://github.com/wp-labs/wp-editor/actions/workflows/release.yml/badge.svg)![License: Elastic 2.0](https://img.shields.io/badge/License-Elastic%202.0-green.svg)![Rust Version](https://img.shields.io/badge/Rust-1.89+-orange.svg)![Node.js Version](https://img.shields.io/badge/Node.js-18+-green.svg)

[English](#🚀 WP Editor) | [中文](#🚀 WP Editor（中文）)

---

## 📖 Introduction

**WP Editor** is a modern web application based on the Warp Parse engine, designed for log parsing, field transformation, and result validation. It provides complete online debugging capabilities for WPL (Web Processing Language) parsing and OML (Output Mapping Language) transformation.

🌐 **Live Demo**: [https://editor.warpparse.ai/](https://editor.warpparse.ai/)

### 🏗️ Architecture Highlights

* **🦀 Rust Backend**: High-performance API service built with Actix Web
* **⚛️ React Frontend**: Modern user interface with multi-language support
* **📦 Single Binary Deployment**: Frontend resources embedded into server via `rust-embed`
* **🔧 Zero Configuration**: Ready to use out of the box

## ✨ Features

### 🔍 **Debugging Capabilities**

* **WPL Rule Parsing Debug** - Real-time log parsing with field results
* **OML Rule Transformation Debug** - Field transformation based on parsing results
* **Base64 Decoding** - Quick processing of encoded log data
* **Error Diagnostics** - Detailed error messages and debugging hints

### 🎨 **User Experience**

* **Code Editor** - CodeJar with syntax highlighting and line numbers
* **Multi-View Display** - Switch between table/JSON views with null value support
* **Rule Formatting** - One-click beautification for WPL/OML
* **Multi-Language Interface** - Seamless switching between Chinese and English

### 📚 **Example Library**

* **Rule Library Loading** - Load WPL/OML examples from local storage with automatic OML matching
* **Sample Data** - Bundled test log data
* **Quick Reproduction** - One-click loading of complete debugging scenarios

### 🔧 **Developer Friendly**

* **Version Information** - Real-time component version display
* **API Documentation** - Complete interface specifications
* **Hot Reload** - Real-time updates in development mode

## 📖 Usage Guide

Sample Log

```plaintext
180.57.30.148 - - [21/Jan/2025:01:40:02 +0800] "GET /nginx-logo.png HTTP/1.1" 500 368 "http://207.131.38.110/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36" "-"
```

### 🔍 WPL Parsing Debug

1. **Input Log Data** - Paste the log to be parsed in the left input box
2. **Write WPL Rules** - Write or select example rules in the rule editor
3. **Execute Parsing** - Click the "Parse" button to view results
4. **View Results** - Support both table and JSON view modes

**Example WPL Rule:**

```plaintext
package /raw/web {
    rule nginx {
        (
            ip:sip,
            2*_,
            chars:timestamp<[,]>,
            http/request",
            chars:status,
            chars:size,
            chars:referer",
            http/agent",
            _"
        )
    }
}
```

### 🔄 OML Transformation Debug

1. **Complete WPL Parsing** - The system will automatically carry over parsing results
2. **Write OML Rules** - Define field transformation and mapping logic
3. **Execute Transformation** - Click "Transform" to view transformed results
4. **Verify Output** - Check transformed fields and JSON output

**Example OML Rule:**

```plaintext
name : /lean/nginx
rule : /raw/web/*
---

* = take();
```

### 🛠️ Utilities

* **🎨 Rule Formatting**: One-click beautification for WPL/OML code
* **🔓 Base64 Decoding**: Quick decoding of encoded log data
* **👁️ Null Value Display**: Toggle display of empty fields
* **🌐 Language Switching**: Switch between Chinese and English interfaces

## 🤝 Contributing

We welcome all forms of contributions!

1. **🍴 Fork** the project
2. **🌿 Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **💾 Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **📤 Push** to the branch (`git push origin feature/AmazingFeature`)
5. **🔀 Create** a Pull Request

## 📄 License

This project is licensed under the **Elastic License 2.0** - see the [LICENSE](LICENSE) file for details.

---

## 📚 Documentation

* [API Documentation](docs/API.md)
* [Configuration](docs/CONFIGURATION.md)
* [Project Structure](docs/PROJECT_STRUCTURE.md)

---

**⭐ If this project helps you, please give us a Star!**

[🐛 Report Issues](https://github.com/wp-labs/wp-editor/issues) •  
[💡 Feature Requests](https://github.com/wp-labs/wp-editor/issues)

---

# 🚀 WP Editor（中文）

**面向 WPL/OML 的可视化调试与规则编辑 Web 应用**

![Build & Test](https://github.com/wp-labs/wp-editor/actions/workflows/build-and-test.yml/badge.svg)![Release & Docker](https://github.com/wp-labs/wp-editor/actions/workflows/release.yml/badge.svg)![License: Elastic 2.0](https://img.shields.io/badge/License-Elastic%202.0-green.svg)![Rust Version](https://img.shields.io/badge/Rust-1.89+-orange.svg)![Node.js Version](https://img.shields.io/badge/Node.js-18+-green.svg)

[English](#🚀 WP Editor) | [中文](#🚀 WP Editor（中文）)

---

## 📖 项目简介

**WP Editor** 是一个基于 Warp Parse 解析引擎的现代化 Web 应用，专为日志解析、字段转换和结果验证而设计。它提供了完整的 WPL（Web Processing Language）解析和 OML（Output Mapping Language）转换的在线调试能力。

🌐 **在线体验**: [https://editor.warpparse.ai/](https://editor.warpparse.ai/)

### 🏗️ 架构特点

* **🦀 Rust 后端**: 使用 Actix Web 构建高性能 API 服务
* **⚛️ React 前端**: 现代化的用户界面，支持多语言
* **📦 单二进制部署**: 通过 `rust-embed` 将前端资源打包进服务端
* **🔧 零配置启动**: 开箱即用，无需复杂配置

## ✨ 功能特性

### 🔍 **调试功能**

* **WPL 规则解析调试** - 实时解析日志并查看字段结果
* **OML 规则转换调试** - 基于解析结果执行字段转换
* **Base64 解码** - 快速处理编码日志数据
* **错误诊断** - 详细的错误信息和调试提示

### 🎨 **用户体验**

* **代码编辑器** - CodeJar + 语法高亮 + 行号显示
* **多视图展示** - 表格/JSON 切换，支持空值显示
* **规则格式化** - WPL/OML 一键美化
* **多语言界面** - 中英文无缝切换

### 📚 **示例库**

* **规则库加载** - 从本地读取 WPL/OML 示例，并自动根据WPL匹配相应的OML
* **样本数据** - 配套的测试日志数据
* **快速复现** - 一键加载完整的调试场景

### 🔧 **开发友好**

* **版本信息** - 实时显示组件版本
* **API 文档** - 完整的接口说明
* **热重载** - 开发模式下的实时更新

## 📖 使用指南

示例日志

```plaintext
180.57.30.148 - - [21/Jan/2025:01:40:02 +0800] "GET /nginx-logo.png HTTP/1.1" 500 368 "http://207.131.38.110/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36" "-"
```

### 🔍 WPL 解析调试

1. **输入日志数据** - 在左侧输入框粘贴待解析的日志
2. **编写 WPL 规则** - 在规则编辑器中编写或选择示例规则
3. **执行解析** - 点击"解析"按钮查看结果
4. **查看结果** - 支持表格和 JSON 两种视图模式

**示例 WPL 规则:**

```plaintext
package /raw/web {
    rule nginx {
        (
            ip:sip,
            2*_,
            chars:timestamp<[,]>,
            http/request",
            chars:status,
            chars:size,
            chars:referer",
            http/agent",
            _"
        )
    }
}
```

### 🔄 OML 转换调试

1. **完成 WPL 解析** - 系统会自动带出解析结果
2. **编写 OML 规则** - 定义字段转换和映射逻辑
3. **执行转换** - 点击"转换"查看转换后的结果
4. **验证输出** - 检查转换后的字段和 JSON 输出

**示例 OML 规则:**

```plaintext
name : /lean/nginx
rule : /raw/web/*
---

* = take();
```

### 🛠️ 实用工具

* **🎨 规则格式化**: 一键美化 WPL/OML 代码
* **🔓 Base64 解码**: 快速解码编码的日志数据
* **👁️ 空值显示**: 切换是否显示空字段
* **🌐 语言切换**: 中英文界面切换

## 🤝 贡献指南

我们欢迎所有形式的贡献！

1. **🍴 Fork** 项目
2. **🌿 创建** 特性分支 (`git checkout -b feature/AmazingFeature`)
3. **💾 提交** 更改 (`git commit -m 'Add some AmazingFeature'`)
4. **📤 推送** 分支 (`git push origin feature/AmazingFeature`)
5. **🔀 创建** Pull Request

## 📄 许可证

本项目采用 **Elastic License 2.0** 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📚 更多文档

* [API 文档](docs/API.md)
* [配置说明](docs/CONFIGURATION.md)
* [项目结构](docs/PROJECT_STRUCTURE.md)

**⭐ 如果这个项目对你有帮助，请给我们一个 Star！**

[🐛 报告问题](https://github.com/wp-labs/wp-editor/issues) •  
[💡 功能建议](https://github.com/wp-labs/wp-editor/issues)
