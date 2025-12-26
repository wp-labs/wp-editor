# wprescue CLI
<!-- 角色：使用配置者 | 最近验证：2025-12-12 -->

wprescue 是数据恢复工具，用于从救援目录中恢复数据并按照项目配置的 Sink 路由输出到目标。

## 命令概览

```
wprescue <COMMAND>

Commands:
  batch   批处理模式（仅支持此模式）
```

**重要：** wprescue 仅支持 batch 模式。尝试使用 daemon 模式会显示错误并退出（退出码 2）。

## 命令行参数

```bash
wprescue batch [OPTIONS]
```

| 参数 | 短选项 | 长选项 | 默认值 | 说明 |
|------|--------|--------|--------|------|
| work_root | - | `--work-root` | `.` | 工作根目录 |
| stat_sec | - | `--stat` | - | 统计输出间隔（秒） |
| stat_print | `-p` | `--print_stat` | false | 周期打印统计信息 |

## 使用示例

```bash
# 基本恢复操作
wprescue batch --work-root /project

# 多线程加速恢复
wprescue batch --work-root /project \
    -w 8 \
    --parse-workers 8

# 限制恢复行数并输出统计
wprescue batch --work-root /project \
    -n 50000 \
    --stat 5 \
    -p

```

## 工作原理

1. 读取救援目录（`./data/rescue`）中的数据
2. 按照项目配置的 Sink 路由进行处理
3. 输出到目标位置
4. 处理完成后自动退出
