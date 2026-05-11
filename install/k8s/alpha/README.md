# wp-editor alpha Helm Chart

该 chart 用于将 alpha 环境的 `wp-editor` 部署到 Kubernetes。它对齐 `dev-ops/alpha` 的运行布局：容器工作目录为 `/app`，应用配置挂载到 `/app/config/config.toml`，规则目录挂载到 `/app/wp-rule/models`。

## 前置条件

- 已配置可访问目标集群的 `kubectl`
- Helm 3
- 可拉取镜像 `ghcr.io/wp-labs/wp-editor:1.19.3-alpha`

## 安装

安装 release：

```bash
helm install editor ./install/k8s/alpha
```

升级已有 release：

```bash
helm upgrade editor ./install/k8s/alpha
```

本地渲染 Kubernetes manifests：

```bash
helm template editor ./install/k8s/alpha --debug
```

校验 chart：

```bash
helm lint ./install/k8s/alpha
```

## 运行时目录

该 chart 将容器工作目录设置为 `/app`。

生成的应用配置挂载到：

```text
/app/config/config.toml
```

规则目录挂载到：

```text
/app/wp-rule/models
```

这与应用配置中的相对路径匹配：

```toml
[repo]
wpl_rule_repo = "wp-rule/models/wpl"
oml_rule_repo = "wp-rule/models/oml"
```

`wpl_rule_repo` 由 chart 固定生成，不对外暴露为 value。其他配置字段可以通过 `values.yaml` 调整。

## 配置项

默认镜像：

```yaml
image:
  repository: ghcr.io/wp-labs/wp-editor
  tag: "1.19.3-alpha"
  pullPolicy: IfNotPresent
```

默认 Service：

```yaml
service:
  type: NodePort
  nodePort: 30428
  port: 8081
```

默认生成的 `config.toml` 来源于以下 values：

```yaml
config:
  mountPath: /app/config/config.toml
  subPath: config.toml
  log:
    level: debug
    output: Console
    outputPath: ./logs/
  web:
    host: 0.0.0.0
    port: 8081
  repo:
    omlRuleRepo: wp-rule/models/oml
```

覆盖示例：

```bash
helm upgrade --install editor ./install/k8s/alpha \
  --set config.log.level=info \
  --set config.web.port=8081 \
  --set service.port=8081
```

除非明确需要拆分容器内部监听端口和 Service 暴露端口，否则应保持 `config.web.port`、`service.port` 以及探针端口语义一致。

## 内置规则

默认情况下，chart 会从以下路径收集规则文件并生成 ConfigMap：

```text
wp-rule/models/**
```

模板使用 `.Files.Glob` 动态收集规则文件。只要在 `wp-rule/models` 下新增或删除规则文件，渲染出的 ConfigMap 就会随之变化，不需要手动维护文件清单。

由于 ConfigMap 的 key 是扁平字符串，chart 会把每个规则文件路径转换为扁平 key。例如：

```text
wp-rule/models/wpl/raw/nginx/parse.wpl
```

会转换为：

```text
wpl__raw__nginx__parse.wpl
```

Deployment 再通过 `configMap.items` 将该 key 映射回原始目录结构。因此容器内最终看到的是：

```text
/app/wp-rule/models/wpl/raw/nginx/parse.wpl
```

如果没有找到内置规则文件，Helm 渲染会直接失败，避免创建空的规则 ConfigMap。

## 外部规则 ConfigMap

如果规则由 chart 外部管理，可以使用 `rules.existingConfigMap`。

从本地规则目录创建 ConfigMap：

```bash
kubectl create configmap wp-editor-rules \
  --from-file=dev-ops/alpha/wp-rule/models \
  --dry-run=client -o yaml | kubectl apply -f -
```

安装或升级时引用外部 ConfigMap：

```bash
helm upgrade --install editor ./install/k8s/alpha \
  --set rules.existingConfigMap=wp-editor-rules
```

设置 `rules.existingConfigMap` 后，chart 不会创建内置规则 ConfigMap，也不会根据规则内容生成 `checksum/rules`。如果外部 ConfigMap 内容变化，而集群没有按预期刷新挂载文件，需要手动重启 Deployment。

## 配置更新与滚动发布

对于 chart 管理的配置和内置规则，Deployment 会带有 checksum 注解：

```yaml
checksum/config: ...
checksum/rules: ...
```

当生成的配置或内置规则文件变化时，checksum 会变化，从而触发 Deployment 滚动更新。

## 验证

查看本地渲染结果：

```bash
helm template editor ./install/k8s/alpha --debug
```

查看已安装资源：

```bash
kubectl get deploy editor-wp-editor
kubectl get svc editor-wp-editor
kubectl get cm editor-wp-editor-config -o yaml
kubectl get cm editor-wp-editor-rules -o yaml
```

查看滚动发布状态：

```bash
kubectl rollout status deploy/editor-wp-editor
```

未使用 NodePort 或 Ingress 时，可以通过端口转发本地访问：

```bash
kubectl port-forward deploy/editor-wp-editor 8081:8081
```
