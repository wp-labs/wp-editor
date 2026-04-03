# 🚀 WP Editor

**面向 WPL/OML 的可视化调试与规则编辑 Web 应用**

![Build & Test](https://github.com/wp-labs/wp-editor/actions/workflows/build-and-test.yml/badge.svg)![Release & Docker](https://github.com/wp-labs/wp-editor/actions/workflows/release.yml/badge.svg)![License: Elastic 2.0](https://img.shields.io/badge/License-Elastic%202.0-green.svg)![Rust Version](https://img.shields.io/badge/Rust-1.89+-orange.svg)![Node.js Version](https://img.shields.io/badge/Node.js-18+-green.svg)

中文 | [English](README.en.md)

---

## 📖 项目简介

**WP Editor** 是一个基于 Warp Parse 解析引擎的现代化 Web 应用，专为日志解析、字段转换和结果验证而设计。它提供了完整的 WPL（Web Processing Language）解析和 OML（Output Mapping Language）转换的在线调试能力。

🌐 **在线体验**: [https://editor.warpparse.ai/](https://editor.warpparse.ai/)

### 🏗️ 架构特点

*   **🦀 Rust 后端**: 使用 Actix Web 构建高性能 API 服务
*   **⚛️ React 前端**: 现代化的用户界面，支持多语言
*   **📦 单二进制部署**: 通过 `rust-embed` 将前端资源打包进服务端
*   **🔧 零配置启动**: 开箱即用，无需复杂配置

## ✨ 功能特性

### 🔍 **调试功能**

*   **WPL 规则解析调试** - 实时解析日志并查看字段结果
*   **OML 规则转换调试** - 基于解析结果执行字段转换
*   **Base64 解码** - 快速处理编码日志数据
*   **错误诊断** - 详细的错误信息和调试提示

### 🎨 **用户体验**

*   **代码编辑器** - CodeJar + 语法高亮 + 行号显示
*   **多视图展示** - 表格/JSON 切换，支持空值显示
*   **规则格式化** - WPL/OML 一键美化
*   **多语言界面** - 中英文无缝切换

### 📚 **示例库**

*   **规则库加载** - 从本地读取 WPL/OML 示例，并自动根据WPL匹配相应的OML
*   **样本数据** - 配套的测试日志数据
*   **快速复现** - 一键加载完整的调试场景

### 🔧 **开发友好**

*   **版本信息** - 实时显示组件版本
*   **API 文档** - 完整的接口说明
*   **热重载** - 开发模式下的实时更新

### 🛠️ 实用工具

*   **🎨 规则格式化**: 一键美化 WPL/OML 代码
*   **🔓 Base64 解码**: 快速解码编码的日志数据
*   **🌐 语言切换**: 中英文界面切换

## 🤝 贡献指南

我们欢迎所有形式的贡献！

1.  **🍴 Fork** 项目
2.  **🌿 创建** 特性分支 (`git checkout -b feature/AmazingFeature`)
3.  **💾 提交** 更改 (`git commit -m 'Add some AmazingFeature'`)
4.  **📤 推送** 分支 (`git push origin feature/AmazingFeature`)
5.  **🔀 创建** Pull Request

## 📄 许可证

本项目采用 **Elastic License 2.0** 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📚 更多文档

*   [API 文档](docs/API.md)
*   [配置说明](docs/CONFIGURATION.md)
*   [项目结构](docs/PROJECT_STRUCTURE.md)

**⭐ 如果这个项目对你有帮助，请给我们一个 Star！**

[🐛 报告问题](https://github.com/wp-labs/wp-editor/issues) •  
[💡 功能建议](https://github.com/wp-labs/wp-editor/issues)
