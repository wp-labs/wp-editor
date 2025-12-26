# GettingStarted

本文基于 `wp-example/core/getting_started` 用例，梳理一次从初始化到运行、统计与校验的完整配置流程，适合首次接入与本地自测。

## 前置准备
- [下载 wparse](https://github.com/wp-labs/warp-parse/releases)
- copy到可执行路径下。如 /usr/local/bin 或 /${HOME}/bin

## 一、初始化工作目录
- 清理并初始化配置与模板
  ```bash
  wproj init --mode full
  wproj check 
  ```

执行完成后，工作目录将包含：
- `conf/wparse.toml` — 引擎主配置
- `conf/wpgen.toml` — 生成器配置
- `connectors/source.d/` — 源连接器模板（默认含文件源）
- `models/` 下的规则/WPL/OML
- `topology/` 下的规则/source/sink 模板
- `data/` 运行目录：`in_dat/`、`out_dat/`、`rescue/`、`logs/`

> getting_started 用例中已将日志目录统一为 `./logs/`，与脚本输出一致。

## 二、生成数据与清理
```bash
# 清理输出（文件型 sink、本地数据）
wproj data clean 
wpgen  data clean 

# 生成样本（示例 3000 行，3 秒统计间隔）
wpgen sample -n 3000 --stat 3
```

## 三、运行解析
```bash
# 批处理（-n 指定条数，-p 打印统计；失败时查看 ./logs/ 下日志）
wparse batch --stat 3 -p  
```

## 四、统计与校验
```bash
# 同时统计源与文件型 sink
wproj  data stat
```
脚本会完成预构建 → conf/data 初始化 → 样本生成 → 解析运行 → 统计与校验的整套流程。
