---
sort: 38
---
# DaemonSet
::: warning 概念
- 相比ReplicaSet将`副本随机分配在各个节点上`，DaemonSet可以`在每个节点上只运行一个Pod副本`。它没有期望副本（replicas）的概念，因为它的工作是确保一个Pod匹配它的选择器并在每个节点上运行。
- 如果节点下线，那么DaemonSet不会在其他地方重新创建Pod，但是`当一个新的节点加入集群时，它会立刻部署一个新的Pod的实例`。若无意中删除一个节点上的Pod，那么DaemonSet会重新部署一个新的Pod。
- DaemonSet一般用于`管理系统服务`，即使节点配置了不可调度，DaemonSet也会部署Pod到此节点。需要注意的是：`DaemonSet不会将Pod部署在master节点上`。
:::

### 创建DaemonSet

```yaml
apiVersion: apps/v1
kind: DaemonSet # 设置DaemonSet类型
metadata:
	name: ssd-monitor
spec:
	selector: # 指定标签选择器
		matchLabels:
			app: ssd-monitor
	template:
		metadata:
			labels:
				app: ssd-monitor
		spec:
			nodeSelector: # 这些Pod只能部署到disk=ssd的node节点上
				disk: ssd
			containers:
			- name: main
			  image: luksa/ssd-monitor
```
::: details
![](https://image.leejay.top/FkbSlaZKNoTvabGr9GyCuGNAwi0Z)

daemonSet会默认添加如下容忍度：

| `node.kubernetes.io/not-ready`           | NoExecute  | 1.13+ | 当出现类似网络断开的情况导致节点问题时，DaemonSet Pod 不会被逐出。 |
| ---------------------------------------- | ---------- | ----- | ------------------------------------------------------------ |
| `node.kubernetes.io/unreachable`         | NoExecute  | 1.13+ | 当出现类似于网络断开的情况导致节点问题时，DaemonSet Pod 不会被逐出。 |
| `node.kubernetes.io/disk-pressure`       | NoSchedule | 1.8+  | DaemonSet Pod 被默认调度器调度时能够容忍磁盘压力属性。       |
| `node.kubernetes.io/memory-pressure`     | NoSchedule | 1.8+  | DaemonSet Pod 被默认调度器调度时能够容忍内存压力属性。       |
| `node.kubernetes.io/unschedulable`       | NoSchedule | 1.12+ | DaemonSet Pod 能够容忍默认调度器所设置的 `unschedulable` 属性. |
| `node.kubernetes.io/network-unavailable` | NoSchedule | 1.12+ | DaemonSet 在使用宿主网络时，能够容忍默认调度器所设置的 `network-unavailable` 属性。 |

> 换个角度：也就是节点出现如上污点时，daemonSet能够被调度或不被驱逐。
:::


#### 模拟节点标签不匹配

```shell
# 先将节点设置label： disk=ssd
kubectl label node k8s-node1 disk=ssd
# 创建daemonset
kubectl apply -f ssd-monitor-daemonset.yaml
# 我们修改node的标签为disk=hdd，ds管理的pod会被删除
kubectl label nodes k8s-node1 disk=hdd --overwrite
```
> ![](https://image.leejay.top/FvaUT7VzitLYrU55lEbuWJNAyFrv)
> ![](https://image.leejay.top/FrNtnq91RiC-7jf0h33lVbICYBtz)