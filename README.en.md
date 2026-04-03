# 🚀 WP Editor

**Visual Debugging and Rule Editing Web Application for WPL/OML**

![Build & Test](https://github.com/wp-labs/wp-editor/actions/workflows/build-and-test.yml/badge.svg)![Release & Docker](https://github.com/wp-labs/wp-editor/actions/workflows/release.yml/badge.svg)![License: Elastic 2.0](https://img.shields.io/badge/License-Elastic%202.0-green.svg)![Rust Version](https://img.shields.io/badge/Rust-1.89+-orange.svg)![Node.js Version](https://img.shields.io/badge/Node.js-18+-green.svg)

[中文](README.md) | English

---

## 📖 Introduction

**WP Editor** is a modern web application based on the Warp Parse engine, designed for log parsing, field transformation, and result validation. It provides complete online debugging capabilities for WPL (Web Processing Language) parsing and OML (Output Mapping Language) transformation.

🌐 **Live Demo**: [https://editor.warpparse.ai/](https://editor.warpparse.ai/)

### 🏗️ Architecture Highlights

*   **🦀 Rust Backend**: High-performance API service built with Actix Web
*   **⚛️ React Frontend**: Modern user interface with multi-language support
*   **📦 Single Binary Deployment**: Frontend resources embedded into server via `rust-embed`
*   **🔧 Zero Configuration**: Ready to use out of the box

## ✨ Features

### 🔍 **Debugging Capabilities**

*   **WPL Rule Parsing Debug** - Real-time log parsing with field results
*   **OML Rule Transformation Debug** - Field transformation based on parsing results
*   **Base64 Decoding** - Quick processing of encoded log data
*   **Error Diagnostics** - Detailed error messages and debugging hints

### 🎨 **User Experience**

*   **Code Editor** - CodeJar with syntax highlighting and line numbers
*   **Multi-View Display** - Switch between table/JSON views with null value support
*   **Rule Formatting** - One-click beautification for WPL/OML
*   **Multi-Language Interface** - Seamless switching between Chinese and English

### 📚 **Example Library**

*   **Rule Library Loading** - Load WPL/OML examples from local storage with automatic OML matching
*   **Sample Data** - Bundled test log data
*   **Quick Reproduction** - One-click loading of complete debugging scenarios

### 🔧 **Developer Friendly**

*   **Version Information** - Real-time component version display
*   **API Documentation** - Complete interface specifications
*   **Hot Reload** - Real-time updates in development mode

## 📖 Usage Guide

Sample Log

```plaintext
180.57.30.148 - - [21/Jan/2025:01:40:02 +0800] "GET /nginx-logo.png HTTP/1.1" 500 368 "http://207.131.38.110/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36" "-"
```

### 🔍 WPL Parsing Debug

1.  **Input Log Data** - Paste the log to be parsed in the left input box
2.  **Write WPL Rules** - Write or select example rules in the rule editor
3.  **Execute Parsing** - Click the "Parse" button to view results
4.  **View Results** - Support both table and JSON view modes

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

1.  **Complete WPL Parsing** - The system will automatically carry over parsing results
2.  **Write OML Rules** - Define field transformation and mapping logic
3.  **Execute Transformation** - Click "Transform" to view transformed results
4.  **Verify Output** - Check transformed fields and JSON output

**Example OML Rule:**

```plaintext
name : /lean/nginx
rule : /raw/web/*
---

* = take();
```

### 🛠️ Utilities

*   **🎨 Rule Formatting**: One-click beautification for WPL/OML code
*   **🔓 Base64 Decoding**: Quick decoding of encoded log data
*   **👁️ Null Value Display**: Toggle display of empty fields
*   **🌐 Language Switching**: Switch between Chinese and English interfaces

## 🤝 Contributing

We welcome all forms of contributions!

1.  **🍴 Fork** the project
2.  **🌿 Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3.  **💾 Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4.  **📤 Push** to the branch (`git push origin feature/AmazingFeature`)
5.  **🔀 Create** a Pull Request

## 📄 License

This project is licensed under the **Elastic License 2.0** - see the [LICENSE](LICENSE) file for details.

---

## 📚 Documentation

*   [API Documentation](docs/API.md)
*   [Configuration](docs/CONFIGURATION.md)
*   [Project Structure](docs/PROJECT_STRUCTURE.md)

---

**⭐ If this project helps you, please give us a Star!**

[🐛 Report Issues](https://github.com/wp-labs/wp-editor/issues) •  
[💡 Feature Requests](https://github.com/wp-labs/wp-editor/issues)
