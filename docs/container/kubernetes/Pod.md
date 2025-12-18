---
sort: 15
---
# Pod
::: warning Pod
- 一个Pod是一组紧密相关的容器（k8s中的基本部署单元），它们总是`一起运行在同一个工作节点上（或同一个Linux命名空间中）`。
- `每个Pod就相当于一个独立的逻辑机器`，拥有自己的IP、主机名、进程等，运行一个应用程序，可以是单个进程的运行在单个容器中，也可以是`每个进程都运行在自己的容器中`。
:::

![](https://image.leejay.top/2025/01/21/9f9902e3-8a56-46c4-9775-6f12d2a06285.png)

> 1. 同一个Pod内的多个容器共享相同的Linux命名空间，拥有相同的IP、主机名、网络接口等。
> 2. 同一个Pod内的容器不能出现相同的端口号，可以通过`localhost`地址进行互相访问。
> 3. 默认情况下容器间的目录互相隔离，但是可以通过`Volume`实现文件目录共享。

### Pod创建

#### 基于命令创建Pod

```shell
# 创建名为kubia的pod
kubectl run kubia --image=xiaokexiang/kubia --port 8080
# 获取default的pods列表（显示更详细信息）
kubectl get pods -o wide 
```
:::details Pod内容器数量该如何选择？

![](https://image.leejay.top/2025/01/21/86d0096a-2aaa-449f-a577-c1abd2147029.png)

> 1. 一个容器中不应该包含多个进程，Pod也不需要包含多个容器，多个Pod也不需要部署在同一台工作节点上。
> 2. Pod内是否包含多个容器取决于这些容器代表的是一个整体还是相互独立的组件。
:::

#### 基于Yaml构建Pod

```shell
# 查看已有pod的yaml
kubectl get pod kubia -o yaml
# 查看yaml中字段含义
kubectl explain pods
kubectl explain pod.spec
...
```

```yaml
apiVersion: v1 # 描述遵循V1版本的Api
kind: Pod # 描述一个pod
metadata: # 用于描述名称、命令空间、标签等其他容器信息
   name: kubia  # pod的名称
spec: # pod内容的实际说明，pod的容器、卷和其他数据
  containers:
  - image: xiaokexiang/kubia # 创建容器需要的镜像
    name: kubia # 容器的名称
    ports:
    - containerPort: 8080 # 应用监听的端口号
      protocol: TCP # 应用监听的协议
```

### Pod基本命令

```shell
# 基于yaml创建pod，无法更新
kubectl create -f kubia.yaml
# 当yaml修改时，apply可以更新
kubectl apply -f kubia.yaml
# 获取pod的yaml或json格式的配置
kubectl get pod kubia -o yaml/json
# 查看pod日志，默认pod删除日志也会被清空
kubectl logs -f kubia
# 查看多容器pod的日志,查看多容器pod中名为abc容器的日志
kubectl logs -f kubia -c abc
# 查看pod的spec中字段含义
kubectl explains pod.spec
# 通过yaml或json格式参看pod的配置信息
kubectl -n <namespace> get pod <podName> -o <yaml|json>
# 查看pod日志
kubectl -n <namespace> logs -f <podName>
kubectl -n <namespace> delete pod <podName>
# 强制删除pod，不再等待kubelet的确认消息
kubectl -n <namespace> delete pod <podName> --grace-period=0 --force
# 不通过service实现本地端口访问pod端口
kubectl -n <namespace> port-forward <podName> <本地端口>:<pod端口>
```

### Pod与容器的生命周期

| 值        | 描述                                                         |
| --------- | ------------------------------------------------------------ |
| Pending   | Pod 已被 Kubernetes 系统接受，但有一个或者多个容器尚未创建亦未运行。此阶段包括等待 Pod 被调度的时间和通过网络下载镜像的时间。 |
| Running   | Pod 已经绑定到了某个节点，Pod 中所有的容器都已被创建。至少有一个容器仍在运行，或者正处于启动或重启状态。 |
| Succeeded | Pod 中的所有容器都已成功终止，并且不会再重启。               |
| Failed    | Pod 中的所有容器都已终止，并且至少有一个容器是因为失败终止。也就是说，容器以非 0 状态退出或者被系统终止。 |
| Unknows   | 因为某些原因无法取得 Pod 的状态。这种情况通常是因为与 Pod 所在主机通信失败。 |

### Pod的参数

#### imagePullPolicy

镜像的拉取策略
- Never: 只会在本地镜像中查找
- IfNotPresent: 本地镜像没有才会去远端拉取
- Always: 一直从远端拉取

#### [restartPolicy](https://kubernetes.io/zh-cn/docs/concepts/workloads/pods/pod-lifecycle/#restart-policy)
容器的重启策略，适用于pod中的所有容器，默认值是Always
- Always: 只要容器不在运行状态，就会自动重启容器
- OnFailure: 只有在容器异常时才会自动重启容器（多容器需要都进入异常后，pod才会转为Failed）
- Never: 从来不重启容器

#### [探针](https://kubernetes.io/zh-cn/docs/concepts/workloads/pods/pod-lifecycle/)
- livenessProbe:
  指示容器是否正在运行，如果失败，kubelet会杀死容器并根据`重启策略`决定。
- readinessProbe:
  指示容器是否准备好为请求提供服务。如果就绪态探测失败， 端点控制器将从与 Pod 匹配的所有服务的端点列表中删除该 Pod 的 IP 地址。
- startupProbe:
  指示容器中的应用是否已经启动。如果提供了启动探针，则所有其他探针都会被 禁用，直到此探针成功为止。如果启动探测失败，`kubelet` 将杀死容器，而容器依其[重启策略](#restartPolicy)进行重启。
#### [Pod拓扑分布约束](https://kubernetes.io/zh-cn/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- maxSkew
  描述Pod分布不均的程度（必须大于0），取决于`whenUnsatisfiable`的取值：
  当`DoNotSchedule`时，此值用于限制目标拓扑域中匹配的pod数与全局最小值的差值。
  当`ScheduleAnyway`，调度器会更为偏向能够降低偏差值的拓扑域。
- topologyKey
  节点标签的键，如果`两个节点使用相同的键并具有相同的标签值`，那么这两个节点被视为同一个拓扑域。
- whenUnsatisfiable
  - DoNotSchedule:（默认）告诉调度器不要调度。
  - ScheduleAnyway: 告诉调度器仍然继续调度，只是根据如何能将偏差最小化来对 节点进行排序。

### Pod的节点调度

#### nodeSelector

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod2
  labels:
    app: pod2
spec:
  nodeSelector:
    hello: world # 会被调度到含有此标签的节点上
```

> kubectl get nodes --show-labels 中包含`hello=world`标签的节点，pod才会被调度上去。

#### 亲和与反亲和

与nodeSelector类似，可以根据节点上的标签来约束 Pod 可以调度到哪些节点上。

>  亲和：将pod放在符合条件的node上运行，反亲和: 不要将多个Pod放在同一个节点上。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod2
  labels:
    app: pod2
spec:
  affinity: 
    nodeAffinity: # node亲和性， podAntiAffinity反亲和
      requiredDuringSchedulingIgnoredDuringExecution: # 调度器只有在规则被满足的时候才能执行调度
        nodeSelectorTerms:
          - matchExpressions:
              - key: kubernetes.io/os
                operator: In
                values:
                  - linux
      preferredDuringSchedulingIgnoredDuringExecution:  # 调度器会尝试寻找满足对应规则的节点。如果找不到匹配的节点，调度器仍然会调度该 Pod。
        - weight: 1
          preference:
            matchExpressions:
              - key: another-node-label-key
                operator: In
                values:
                  - another-node-label-value
```
> 1. `requiredDuringSchedulingIgnoredDuringExecution`： 调度器只有在规则被满足的时候才能执行调度。
> 2. `preferredDuringSchedulingIgnoredDuringExecution`： 调度器会尝试寻找满足对应规则的节点。如果找不到匹配的节点，调度器仍然会调度该Pod。
> 3. 如果在kubernetes调度pod的过程中发生了变更，Pod仍将继续运行。
> 4. 如果同时指定了`nodeSelector`和`nodeAffinity`那么两者都需要满足才能调度Pod。
> 5. 指定了多个与 `nodeAffinity` 类型关联的 `nodeSelectorTerms`， 只要其中一个 `nodeSelectorTerms` 满足的话，Pod 就可以被调度到节点上。
> 6. 指定了多个与同一 `nodeSelectorTerms` 关联的 `matchExpressions`， 则只有当所有 `matchExpressions` 都满足时 Pod 才可以被调度到节点上。

#### nodeName

优先级高于nodeSelector，如果nodeName的值不存在，那么Pod无法运行，如果指定了存在的node，那么Pod只会被调度到此node上。

#### 污点与容忍度

`节点亲和性`是Pod的一种属性，它使Pod能吸引到一类特定的节点，`污点（Taint）`则相反，它使节点能够排斥一类特定的 Pod。
`容忍度（Toleration）`是应用于 Pod 上的。容忍度允许调度器调度带有对应污点的节点。 容忍度允许调度但并不保证调度（作为其功能的一部分，调度器也会[评估其他参数](https://kubernetes.io/zh-cn/docs/concepts/scheduling-eviction/pod-priority-preemption/)）。
`污点和容忍度`相互配合，可以用来避免 Pod 被分配到不合适的节点上。 每个节点上都可以应用一个或多个污点，对于那些不包含`对应节点污点属性（容忍度）`的Pod，是不会被该节点接受的。

```shell
# 给节点添加一个污点 给节点node1增加一个污点，它的键名是 key1，键值是 value1，效果是 NoSchedule。 
# 这表示只有拥有和这个污点相匹配的容忍度的 Pod 才能够被分配到 node1 这个节点。
kubectl taint nodes node1 key1=value1:NoSchedule
# 移除节点的污点
kubectl taint nodes node1 key1=value1:NoSchedule-
# 查看节点的污点属性
kubectl describe node <nodeName> | grep Taints -A 10
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod2
  labels:
    app: pod2
spec:
  nodeSelector:
    hello: world # 会被调度到含有此标签的节点上
  tolerations: # 容忍度，pod不会被调度到不包含key1污点的节点
    - key: "key1"
      operator: "Equal" # 默认为Equal,Equal需要指定value
      effect: "NoSchedule" # NoExecute/NoSchedule
      value: value1
    - key: "key2"
      operator: "Exists" # 如果是Exists，则不需要指定value
      effect: "NoExecute" # 当pod容忍度与node污点不匹配的时候会驱逐pod
      tolerationSeconds: 3600 # Pod继续运行3600s后才会被驱逐（前提是污点还在）
  
```
> 1. NoSchedule：新的不能容忍的pod一定不会被调度，原有的pod不受影响。NoExecute：新的不能容忍的pod不仅不会被调度，还会驱逐老的Pod。
> 2. operator为Equal时需要指定value，若为Exists则无需指定value。
> 3. 若node上有多个污点，那么pod需要都能容忍这些污点才能调度到node上。
> 4. NoExecute与tolerationSeconds搭配使用，tolerationSeconds秒后才会驱逐pod。

### Pod的健康检查

#### liveness

可以为`pod内的每个容器都单独指定存活探针`，如果探测失败，那么k8s会定期执行探针并重新启动容器。
可以通过`HTTP（状态码）`、`TCP（建立连接）`、`EXEC探针（容器内执行命令）`进行容器探测。
```yaml
apiVersion: v1
kind: Pod
metadata:
	name: kubia-liveness
spec:
	containers:
	- image: luksa/kubia-unhealthy
	  name: kubia
      livenessProbe: #http存活探针
          httpGet: 
              path: /   # 请求路径
              port: 8080   #请求端口
          initialDelaySeconds: 15 # 探针在启动后等待15s再探测
```

> 此镜像在五次GET请求后会返回500的错误状态码，k8s检测到后`会自动创建新的容器（而不是重启原来的容器）`。
>
> 通过`kubectl desribe pod kubia-liveness`查看容器运行的情况。
>
> ![](https://image.leejay.top/2025/01/21/1d7a7456-dff3-4a52-853a-c13d1ad8b80d.png)

#### Readnesses

就绪探针定期调用，用来确定特定的Pod是否能接收客户端请求。与存活探针类似，具有`Exec探针`、`HTTP GET探针`、`TCP Socket探针`三种方式。如果就绪探针检查的Pod没有准备就绪，那么是不会被加入到`svc`服务中的。

> Q：存活探针与就绪探针的区别？
>
> A：就绪探针下，如果容器未通过准备检查，那么`不会被终止或重新启动`。存活探针会杀死异常的容器并启动新的正常容器来保证Pod正常工作。就绪探针确保只有准备好处理请求的Pod才可以接受请求。如果就绪探测失败，就会`从服务中移除该Pod`。

![](https://image.leejay.top/2025/01/21/e1398cb7-fb91-4820-ad6a-93c5b35ada1b.png)

```yaml
apiVersion: v1
kind: ReplicationController
metadata:
	name: kubia-replication
spec:
	replicas: 3
	selector:
		app: kubia
	template:
		metadata:
			labels:
				app: kubia
		spec:
			containers:
			- name: kubia
			  image: xiaokexiang/kubia
			  readinessProbe: #默认10s检查一次
			  	exec:
			  		command:
			  		- ls
			  		- /var/ready # 基于EXEC的容器的就绪探针
			  ports:
			  - containerPort: 8080
```

> 使用就绪探针，可以使Pod异常时，从所有的SVC中移除。

