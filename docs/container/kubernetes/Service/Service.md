---
sort: 25
---

# Service

::: warning 概念

为一组功能相同的 Pod `提供单一不变的接入点的资源`。到达服务 IP 和端口的请求将被转发到属于该服务内的容器的 IP 和端口。

:::

Pod 的存在是短暂的，一个 Pod 可能在任何时候消失。新生成的 Pod 和原有的 Pod 具有不同的 IP 地址，当服务被创建时，会得到一个静态的 IP，客户端通过这个 IP 连接到服务，而不是直接连接 Pod。

![](https://image.leejay.top/2025/01/21/e44d3c49-e8ad-45fa-bc47-e7bef0d1b6d1.png)

## 代理模式

> 在 Kubernetes 集群中，每个 Node 运行一个 `kube-proxy` 进程。`kube-proxy` 负责为 Service 实现了一种 VIP（虚拟 IP）的形式。

### userspace

1. kube-proxy 监视控制平面对 `Service` 对象和 `Endpoints` 对象的添加和移除操作
2. 每个 Service 的创建都会在 Node 上打开一个随机端口，任何请求都会被 kube-proxy 代理到 Service 的后端 Pods 中的某个 Pod 上（由 SessionAffinity 决定，默认为 Round-Robin：轮替模式）
3. 配置 iptables 规则，用于捕获到达该 Service 的 clusterIP 和 Port 的请求，并重定向到代理端口，再通过代理端口请求到对应的后端 Pod

![userspace](https://image.leejay.top/2025/01/21/09638a8c-a202-4e67-a90f-ddbb0be9b64f.png)

> 这种模式需要在内核态（iptables）和用户态（kube-proxy）之间来回切换，所以存在较大的性能损耗

### iptables

1. kube-proxy 监视控制平面对 `Service` 对象和 `Endpoints` 对象的添加和移除操作
2. 每个 Service，它会配置 iptables 规则，从而捕获到达该 Service 的 `clusterIP` 和 Port 的请求，并将请求重定向到 Service 的后端 Pods 中的某个 Pod 上（默认随机选择一个后端）
3. 此模式下如果所选的第一个 Pod 没有响应，则连接失败，这与 userspace 模式下的自动切换为其他 Pod 并重试不同。iptables 模式下建议使用 `探针` 保证 kube-proxy 看到的都是正常的后端，避免流量被 kube-proxy 发送到已知已失败的 Pod

![iptables](https://image.leejay.top/2025/01/21/fc3d46ac-eceb-457f-89fa-060c79ff31a2.png)

### IPVS

1. kube-proxy 监视控制平面对 `Service` 对象和 `Endpoints` 对象的添加和移除操作
2. 调用 `netlink` 接口相应地创建 IPVS 规则，并定期将 IPVS 规则与 Kubernetes 服务和端点同步
3. 确保 IPVS 状态与所需状态匹配。访问服务时，IPVS 将流量定向到后端 Pod 之一
4. 与 iptables 类似，ipvs 基于 netfilter 的 hook 功能，但使用哈希表作为底层数据结构并在内核空间中工作。这意味着 ipvs 可以更快地重定向流量，并且在同步代理规则时具有更好的性能（与 iptables 的区别在于 `请求流量的调度功能由 ipvs 实现`，其他仍由 iptables 实现）
5. ipvs 为负载均衡算法提供了更多选项，如：rr 轮询、lc 最小连接数、dh 目标哈希、sh 源哈希、sed 最短期望延迟、nq 不排队调度

![ipvs](https://image.leejay.top/2025/01/21/356b4910-fe06-4b91-ad9e-c889b534a6ba.png)

## Service 创建

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    app: my-app
spec:
  containers:
    - name: nginx
      image: nginx
      ports:
        - containerPort: 80      # pod 的容器端口
          name: http-web-svc     # 端口定义，可以被 targetPort 引用
      resources:
        limits:
          memory: 256Mi
          cpu: "1"
        requests:
          memory: 256Mi
          cpu: "0.2"
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: my-app  # 会代理符合此标签的 pod，service 不设置选择标签，则需要手动创建 ep
  ports:
    - name: name-of-service-port
      protocol: TCP
      port: 8081       # svc 端口
      targetPort: http-web-svc  # pod 暴露的端口
```

> 1. service(8081) -> endpoints(80) -> pod(80)
> 2. 如果 service 不指定选择标签，那么不会创建 endpoints 对象，则需要手动创建
> 3. 若 endpoints 包含的端点数量超过 1000，会将 endpoints 对象数量截断到 1000

### 单端口

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kubia
spec:
  ports:
    - port: 8080       # 服务可用端口
      targetPort: 8080 # 服务转发到容器的端口
  selector:
    app: kubia         # app=kubia 的 pod 都属于该服务
```

### 多端口

```yaml
# 直接在 yaml 中配置 Service 的多 port
apiVersion: v1
kind: Service
metadata:
  name: kubia
spec:
  ports:
    - name: http
      port: 80         # 服务可用端口
      targetPort: 8080 # 服务转发到容器的端口
    - name: https
      port: 443
      targetPort: 8443
  selector:
    app: kubia         # app=kubia 的 pod 都属于该服务
```

> `不同的端口在一个容器中只能适用于一个标签选择器`，若想分别对应不同的，需要多个容器

```yaml
# 基于 pod 的 yaml 在 service 进行多 port 配置
kind: Pod
spec:
  containers:
    ports:
      - name: http
        containerPort: 8080
      - name: https
        containerPort: 8443

kind: Service
spec:
  ports:
    - name: http
      port: 80
      targetPort: http  # Pod 中的名称
    - name: https
      port: 443
      targetPort: https # Pod 中的名称
```

```shell
# 将 pod 暴露成服务，po 即 pod 的缩写
kubectl expose po kubia --type=LoadBalancer --name kubia-http

# 基于 yaml 创建 service
kubectl apply -f kubia

# 查看服务，svc 即 service 的缩写
kubectl get svc

# 集群内的服务访问（-- 表示 k8s 命令的结束）
kubectl exec kubia -- curl -s http://10.106.78.175
```

> ![](https://image.leejay.top/2025/01/21/2fe89f7c-8010-4be3-8d9e-8acad420e320.png)
>
> 也可以从 Node 节点上进行访问或创建 Pod 进行访问
>
> ![](https://image.leejay.top/2025/01/21/4cdfd9c4-69f6-4657-b0ee-958f18b5cd62.png)

## 服务发现

### 环境变量

当 Service 创建后，kubelet 会自动给管理的 Pod 添加如下环境变量（Service 创建需先于 Pod）

```shell
{SERVICE_NAME}_SERVICE_HOST=${SERVICE_IP}
{SERVICE_NAME}_SERVICE_PORT=${SERVICE_PORT}
```

### DNS

集群中的 CoreDNS 监控 Kubernetes API 中的新服务，并为每个服务创建一组 DNS 记录。如果在整个集群中都启用了 DNS，则所有 Pod 都应该能够通过其 DNS 名称自动解析服务。

若在 `helloworld` namespace 下存在一个名为 `hello-service` 的 nginx 服务，它通过 8080 端口可以访问到 Pod 上的 80 端口（简单的 nginx 服务），那么进入 Pod 容器内部，通过 `curl hello-service.helloworld:8080` 则可以访问到 hello-service 服务。

## 无头服务（Headless）

有时不需要或不想要负载均衡，以及单独的 Service IP。遇到这种情况，可以通过指定 Cluster IP（`spec.clusterIP`）的值为 `"None"` 来创建 `Headless` Service。

对于无头 `Services` 并不会分配 Cluster IP，`kube-proxy` 不会处理它们，而且平台也不会为它们进行负载均衡和路由。DNS 如何实现自动配置，依赖于 Service 是否定义了选择算符。

> **无头服务与普通服务的区别：**
> - 无头服务：不分配 clusterIP，不会被 kube-proxy 处理，也不会进行负载均衡和路由；可以通过解析 service 的 DNS，得到所有 Pod 的地址和 DNS
> - 普通服务：只能解析 service 的 DNS 得到 service 的 clusterIP

![deploy-sts](https://image.leejay.top/2025/01/21/05a599df-2523-42c9-8235-ff9bc5c8e1b3.png)

> statefulset 下的 pod 中，进行 DNS 查询会返回所有 pod 的地址和 DNS，Pod 都会有域名，可以互相访问。而 deployment 下的 pod 中则会返回 service 的 clusterIP 地址，具体访问哪个 pod 由 iptables 或者 ipvs 决定。

## 服务亲和性

默认情况下服务代理通常将每个连接随机指向选中的后端 Pod 中的一个。如果我们希望客户端的所有请求都指向同一个后端，配置服务 `亲和性` 可以实现该功能。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kubia
spec:
  sessionAffinity: ClientIP  # 此参数会导致每次都请求同一个 Pod（默认是 None）
  ports:
    - port: 8080             # 服务可用端口
      targetPort: 8080       # 服务转发到容器的端口
  selector:
    app: kubia               # app=kubia 的 pod 都属于该服务
```

> 请求该 Service，都会指向同一个 Pod

## 服务对外暴露

将服务类型设置成 NodePort（每个集群节点都会在节点上打开一个端口），该端口接受到的流量重定向到基础服务。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kubia-nodeport
spec:
  type: NodePort     # 为 NodePort 设置集群 IP 端口号
  ports:
    - port: 80       # 服务集群 IP 的端口号
      targetPort: 8080  # Pod 的目标端口号
      nodePort: 30123   # 通过集群节点的 30123 端口可以访问
  selector:
    app: kubia
```

> 用户可以通过 `$CLUSTER-IP:80`、`$MASTER-IP:30123` 或 `$NODE-IP:30123` 进行访问

## EndPoint

Pod 与 Service 进行通讯是需要通过 `EndPoint` 来实现的。我们创建 Service 时可以不指定 `标签选择器`，这样 Service 不知道我们需要管理哪些 Pod，所以需要手动创建 EndPoint。

```yaml
# 创建不带 Pod 选择器的服务
apiVersion: v1
kind: Service
metadata:
  name: external-service  # 这个名字必须与 service 配置名相同
spec:
  ports:
    - port: 80           # 只指定 port 不指定选择器

---
apiVersion: v1
kind: Endpoints
metadata:
  name: external-service  # 这个名字必须与 service 配置名相同
subsets:
  - addresses:
      - ip: 11.11.11.11  # 服务将连接重定向到 endpoint 的 ip 地址
      - ip: 22.22.22.22
    ports:
      - port: 80         # endpoint 的目标端口
```

![](https://image.leejay.top/2025/01/21/67713595-b0f4-4665-9eea-d667b110fe6f.png)
