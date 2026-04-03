# 📡 API 文档

## 基础信息

**Base URL**: `http://localhost:8080/api`

**Content-Type**: `application/json`

## API 端点

### 版本信息

#### 获取版本信息

```http
GET /api/version
```

**响应示例:**

```json
{
  "version": "1.0.0",
  "wpl_version": "0.5.0",
  "oml_version": "0.3.0"
}
```

---

## 调试功能

### WPL 规则解析

```http
POST /api/debug/parse
```

**请求体:**

```json
{
  "rules": "package /nginx/access { rule access_log { ... } }",
  "logs": "192.168.1.1 - admin [2024-01-20] \"GET /api\" 200 1024"
}
```

**响应示例:**

```json
{
  "success": true,
  "fields": {
    "client_ip": "192.168.1.1",
    "user": "admin",
    "timestamp": "2024-01-20",
    "status": "200",
    "size": "1024"
  }
}
```

### OML 规则转换

```http
POST /api/debug/transform
```

**请求体:**

```json
{
  "rules": "name : /nginx/access/transform\nrule : /nginx/access*\n---\nsource_ip = take(option:[client_ip]) ;",
  "fields": {
    "client_ip": "192.168.1.1",
    "user": "admin"
  }
}
```

**响应示例:**

```json
{
  "success": true,
  "output": {
    "source_ip": "192.168.1.1"
  }
}
```

### 获取示例规则库

```http
GET /api/debug/examples
```

**响应示例:**

```json
{
  "examples": [
    {
      "name": "nginx_access",
      "wpl": "package /nginx/access { ... }",
      "oml": "name : /nginx/access/transform ...",
      "sample_log": "192.168.1.1 - admin ..."
    }
  ]
}
```

---

## 工具功能

### WPL 规则格式化

```http
POST /api/debug/wpl/format
```

**请求体:**

```json
{
  "rules": "package /nginx/access{rule access_log{(ip:client_ip)}}"
}
```

**响应示例:**

```json
{
  "formatted": "package /nginx/access {\n    rule access_log {\n        (ip:client_ip)\n    }\n}"
}
```

### OML 规则格式化

```http
POST /api/debug/oml/format
```

**请求体:**

```json
{
  "rules": "name:/nginx/access/transform\nrule:/nginx/access*\n---\nsource_ip=take(option:[client_ip]);"
}
```

**响应示例:**

```json
{
  "formatted": "name : /nginx/access/transform\n\nrule :\n    /nginx/access*\n---\nsource_ip = take(option:[client_ip]) ;"
}
```

### Base64 解码

```http
POST /api/debug/decode/base64
```

**请求体:**

```json
{
  "data": "SGVsbG8gV29ybGQ="
}
```

**响应示例:**

```json
{
  "decoded": "Hello World"
}
```

---

## 错误响应

所有 API 在出错时返回统一的错误格式：

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

**HTTP 状态码:**

- `200`: 成功
- `400`: 请求参数错误
- `500`: 服务器内部错误

---

## 请求示例

### cURL

```bash
# 获取版本信息
curl -X GET http://localhost:8080/api/version

# WPL 解析
curl -X POST http://localhost:8080/api/debug/parse \
  -H "Content-Type: application/json" \
  -d '{
    "rules": "package /nginx/access { rule access_log { (ip:client_ip) } }",
    "logs": "192.168.1.1"
  }'

# OML 转换
curl -X POST http://localhost:8080/api/debug/transform \
  -H "Content-Type: application/json" \
  -d '{
    "rules": "name : /nginx/access/transform\nrule : /nginx/access*\n---\nsource_ip = take(option:[client_ip]) ;",
    "fields": {"client_ip": "192.168.1.1"}
  }'
```

### JavaScript (Fetch)

```javascript
// 获取版本信息
const version = await fetch('http://localhost:8080/api/version')
  .then(res => res.json());

// WPL 解析
const parseResult = await fetch('http://localhost:8080/api/debug/parse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rules: 'package /nginx/access { ... }',
    logs: '192.168.1.1 ...'
  })
}).then(res => res.json());
```

[← 返回主文档](../README.md)
