# wpgen CLI

wpgen 是 WarpParse 数据生成器，用于基于 WPL 规则或样本文件生成测试数据。

## 命令概览

```
wpgen <COMMAND>

Commands:
  rule    Generate data by rule/基于规则生成数据
  sample  Generate data from sample files/基于样本文件生成数据
  conf    Configuration commands/配置相关命令
  data    Data management commands/数据管理相关命令
```

## 子命令详解

### rule - 基于规则生成

基于 WPL 规则生成测试数据，支持规则验证和性能分析。

```bash
wpgen rule [OPTIONS]
```

| 参数 | 短选项 | 长选项 | 默认值 | 说明 |
|------|--------|--------|--------|------|
| work_root | `-w` | `--work-root` | `.` | 工作根目录 |
| wpl_dir | - | `--wpl` | - | WPL 规则目录覆盖 |
| conf_name | `-c` | `--conf` | `wpgen.toml` | 配置文件名 |
| stat_print | `-p` | `--print_stat` | false | 周期打印统计信息 |
| line_cnt | `-n` | - | - | 总行数覆盖 |
| speed | `-s` | - | - | 生成速度（行/秒）覆盖 |
| stat_sec | - | `--stat` | 1 | 统计输出间隔（秒） |

### sample - 基于样本生成

基于样本文件（sample.dat）生成测试数据。

```bash
wpgen sample [OPTIONS]
```

参数与 `rule` 子命令相同。

### conf - 配置管理

```bash
wpgen conf <SUBCOMMAND>

Subcommands:
  init   初始化生成器配置（conf/wpgen.toml）
  clean  清理生成器配置
  check  检查配置有效性
```

| 参数 | 短选项 | 长选项 | 默认值 | 说明 |
|------|--------|--------|--------|------|
| work_root | `-w` | `--work-root` | `.` | 工作根目录 |

### data - 数据管理

```bash
wpgen data <SUBCOMMAND>

Subcommands:
  clean  Clean generated output data according to wpgen config/根据 wpgen 配置清理已生成输出数据
  check  Not supported; reserved for future/暂不支持；保留供未来使用
```

| 参数 | 短选项 | 长选项 | 默认值 | 说明 |
|------|--------|--------|--------|------|
| work_root | `-w` | `--work-root` | `.` | 工作根目录 |
| conf_name | `-c` | `--conf` | `wpgen.toml` | 配置文件名 |
| local | - | `--local` | true | 仅清理本地输出（不触达远端） |

## 运行语义

### count（总产出条数）

启动时按 `parallel` 精确均分到每个 worker，余数前置分配。各 worker 跑完本地任务量即退出，总量严格等于 `count`。

### speed（全局速率）

- `speed = 0`：无限制（不等待）
- `speed > 0`：每 worker 速率为 `floor(speed / parallel)`

### parallel（并行数）

生成 worker 的并行数。对 `blackhole_sink` 消费端也会并行，其它 sink 默认单消费者。

## 使用示例

```bash
# 配置初始化
wpgen conf init -w .
wpgen conf check -w .

# 基于规则生成 10000 条数据
wpgen sample -w . -n 10000 -p

# 自定义规则目录和生成速度
wpgen sample --work-root /project \
    --wpl /custom/rules \
    -c custom.toml \
    -s 1000 \
    --stat 2 \
    -p

# 基于样本文件生成
wpgen sample -w . -n 50000 -s 5000 --stat 5 -p

# 清理生成的数据
wpgen data clean -w . -c wpgen.toml --local
```

## 常见问题
**Q：产出不足预期？**

A：`count` 被精确分配给每个 worker。检查日志中 `limit : …` 是否符合预期。

## 配置文件

默认配置文件路径：`conf/wpgen.toml`

主要配置项：

```toml
[generator]
count = 10000      # 总生成条数
speed = 1000       # 生成速度（行/秒），0 表示无限制
parallel = 4       # 并行 worker 数

[output]
# 输出配置...
```

生成文件通常位于 `./data/in_dat/`，可在配置中调整目标路径。
