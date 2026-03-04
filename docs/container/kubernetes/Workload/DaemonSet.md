---
sort: 38
---

# DaemonSet

::: warning 概念

- 相比 ReplicaSet 将 `副本随机分配在各个节点上`，DaemonSet 可以 `在每个节点上只运行一个 Pod 副本`。它没有期望副本（replicas）的概念，因为它的工作是确保一个 Pod 匹配它的选择器并在每个节点上运行
- 如果节点下线，那么 DaemonSet 不会在其他地方重新创建 Pod，但是 `当一个新的节点加入集群时，它会立刻部署一个新的 Pod 的实例`。若无意中删除一个节点上的 Pod，那么 DaemonSet 会重新部署一个新的 Pod
- DaemonSet 一般用于 `管理系统服务`，即使节点配置了不可调度，DaemonSet 也会部署 Pod 到此节点。需要注意的是：`DaemonSet 不会将 Pod 部署在 master 节点上`

:::

## 创建 DaemonSet

```yaml
apiVersion: apps/v1
kind: DaemonSet       # 设置 DaemonSet 类型
metadata:
  name: ssd-monitor
spec:
  selector:           # 指定标签选择器
    matchLabels:
      app: ssd-monitor
  template:
    metadata:
      labels:
        app: ssd-monitor
    spec:
      nodeSelector:   # 这些 Pod 只能部署到 disk=ssd 的 node 节点上
        disk: ssd
      containers:
        - name: main
          image: luksa/ssd-monitor
```

::: details DaemonSet 默认容忍度

![](https://image.leejay.top/2025/01/21/fe463d9a-a241-4a4e-8429-c4fc2baa960e.png)

DaemonSet 会默认添加如下容忍度：

| 污点                                      | 效果       | 版本  | 说明                                                         |
| ----------------------------------------- | ---------- | ----- | ------------------------------------------------------------ |
| `node.kubernetes.io/not-ready`            | NoExecute  | 1.13+ | 当出现类似网络断开的情况导致节点问题时，DaemonSet Pod 不会被逐出 |
| `node.kubernetes.io/unreachable`          | NoExecute  | 1.13+ | 当出现类似于网络断开的情况导致节点问题时，DaemonSet Pod 不会被逐出 |
| `node.kubernetes.io/disk-pressure`        | NoSchedule | 1.8+  | DaemonSet Pod 被默认调度器调度时能够容忍磁盘压力属性         |
| `node.kubernetes.io/memory-pressure`      | NoSchedule | 1.8+  | DaemonSet Pod 被默认调度器调度时能够容忍内存压力属性         |
| `node.kubernetes.io/unschedulable`        | NoSchedule | 1.12+ | DaemonSet Pod 能够容忍默认调度器所设置的 `unschedulable` 属性 |
| `node.kubernetes.io/network-unavailable`  | NoSchedule | 1.12+ | DaemonSet 在使用宿主网络时，能够容忍默认调度器所设置的 `network-unavailable` 属性 |

> 换个角度：也就是节点出现如上污点时，DaemonSet 能够被调度或不被驱逐

:::

### 模拟节点标签不匹配

```shell
# 先将节点设置 label：disk=ssd
kubectl label node k8s-node1 disk=ssd

# 创建 daemonset
kubectl apply -f ssd-monitor-daemonset.yaml

# 我们修改 node 的标签为 disk=hdd，ds 管理的 pod 会被删除
kubectl label nodes k8s-node1 disk=hdd --overwrite
```

> ![](https://image.leejay.top/2025/01/21/1befb798-bd53-431c-b3ab-da5c47ccc506.png)
> ![](https://image.leejay.top/2025/01/21/c6ae99cb-a36d-4df6-9a4f-b142460535a6.png)
