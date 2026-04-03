# ⚙️ 配置说明

## 配置文件

配置文件位于 `config/config.toml`：

```toml
[log]
level = "debug"          # 日志级别: debug, info, warn, error
output = "Console"       # 输出方式: Console, File
output_path = "./logs/"  # 日志文件路径

[web]
host = "0.0.0.0"        # 监听地址
port = 8080             # 监听端口

[repo]
wpl_rule_repo = "../wp-rule/models/wpl"  # WPL 规则库路径
oml_rule_repo = "../wp-rule/models/oml"  # OML 规则库路径
```

## 配置项说明

### 日志配置 [log]

- **level**: 日志级别
  - `debug`: 调试信息（最详细）
  - `info`: 一般信息
  - `warn`: 警告信息
  - `error`: 错误信息（最简洁）

- **output**: 日志输出方式
  - `Console`: 输出到控制台
  - `File`: 输出到文件

- **output_path**: 日志文件存储路径（仅当 output = "File" 时有效）

### Web 服务配置 [web]

- **host**: 服务监听地址
  - `0.0.0.0`: 监听所有网络接口
  - `127.0.0.1`: 仅本地访问
  - 特定 IP: 监听指定网络接口

- **port**: 服务监听端口
  - 默认: `8080`
  - 范围: 1-65535

### 规则库配置 [repo]

- **wpl_rule_repo**: WPL 规则库路径
  - 支持绝对路径: `/path/to/wpl`
  - 支持相对路径: `../wp-rule/models/wpl`

- **oml_rule_repo**: OML 规则库路径
  - 支持绝对路径: `/path/to/oml`
  - 支持相对路径: `../wp-rule/models/oml`

## 📁 规则库配置

### 使用软链接

如果团队成员的规则库路径不同，建议使用软链接避免配置冲突：

```bash
# 创建软链接
ln -sf /your/path/to/warp-rules/models/wpl ../wp-rule/models/wpl
ln -sf /your/path/to/warp-rules/models/oml ../wp-rule/models/oml
```

[← 返回主文档](../README.md)
