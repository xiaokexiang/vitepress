---
sort: 25
---
# Service

::: warning 概念
为一组功能相同的Pod`提供单一不变的接入点的资源`。到达服务IP和端口的请求将被转发到属于该服务内的的容器的IP和端口。
:::

Pod的存在是短暂的，一个Pod可能在任何时候消失，新生成的Pod和原有的Pod具有不同的IP地址，当服务被创建时，会得到一个静态的IP，客户端通过这个IP连接到服务，而不是直接连接Pod。

![](https://images.leejay.top:9000/images/2025/01/21/e44d3c49-e8ad-45fa-bc47-e7bef0d1b6d1.png)

### 代理模式

> 在 Kubernetes 集群中，每个 Node 运行一个 `kube-proxy` 进程。`kube-proxy`负责为 Service 实现了一种 VIP（虚拟 IP）的形式。

#### userspace

1. kube-proxy监视控制平面对`Service`对象和`Endpoints`对象的添加和移除操作。
2. 每个Service的创建都会在Node上打开一个随机端口，任何请求都会被kube-proxy代理到Serivce的后端Pods中的某个Pod上（由SessionAffinity决定，默认为Round-Robin：轮替模式）。
3. 配置iptables规则，用于捕获达到该Service的clusterIP和Port的请求。并重定向到代理端口，再通过代理端口请求到对应的后端Pod。

![userspace](https://images.leejay.top:9000/images/2025/01/21/09638a8c-a202-4e67-a90f-ddbb0be9b64f.png)

> 这种模式需要在内核态（iptables）和用户态（kube-proxy）之间来回切换，所以存在较大的性能损耗。

#### iptables

1. kube-proxy监视控制平面对`Service`对象和`Endpoints`对象的添加和移除操作。
2. 每个 Service，它会配置iptables规则，从而捕获到达该Service的`clusterIP`和Port的请求，并将请求重定向到Serivce的后端Pods中的某个Pod上

（默认随机选择一个后端）

3. 此模式下如果所选的第一个pod没有相应，则连接失败，这与userspace模式下的自动切换为其他pod并重试不同。iptables模式下建议使用`探针`保证kube-proxy看到的都是正常的后端，避免流量被kube-proxy发送到已知已失败的Pod。

![iptables](https://images.leejay.top:9000/images/2025/01/21/fc3d46ac-eceb-457f-89fa-060c79ff31a2.png)

#### IPVS

1. kube-proxy监视控制平面对`Service`对象和`Endpoints`对象的添加和移除操作。
2. 调用 `netlink` 接口相应地创建 IPVS 规则， 并定期将 IPVS 规则与 Kubernetes 服务和端点同步。
3. 确保 IPVS 状态与所需状态匹配。访问服务时，IPVS 将流量定向到后端 Pod 之一。

4. 与iptables类似，ipvs基于netfilter 的 hook 功能，但使用哈希表作为底层数据结构并在内核空间中工作。这意味着ipvs可以更快地重定向流量，并且在同步代理规则时具有更好的性能。（与iptables的区别在于`请求流量的调度功能由ipvs实现`，其他仍由iptables实现）
5. ipvs为负载均衡算法提供了更多选项，如，rr轮询，lc最小连接数，dh目标哈希，sh源哈希，sed最短期望延迟，nq不排队调度。

![ipvs](https://images.leejay.top:9000/images/2025/01/21/356b4910-fe06-4b91-ad9e-c889b534a6ba.png)

### Service创建

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
        - containerPort: 80 # pod的容器端口
          name: http-web-svc # 端口定义,可以被targetPort引用
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
    app: my-app # 会代理符合此标签的pod,service不设置选择标签,那么需要手动创建ep
  ports:
    - name: name-of-service-port
      protocol: TCP
      port: 8081 # svc端口
      targetPort: http-web-svc # pod暴露的端口

```
> 1. service(8081) -> endpoints(80) ——> pod(80)。
> 2. 如果service不指定选择标签，那么不会创建endpoints对象，则需要手动创建。
> 2. 若endpoints包含的端点数量超过1000，会将endpoints对象数量截断到1000。

#### 单端口

```yaml
apiVersion: v1
kind: Service
metadata:
	name: kubia
spec:
	ports:
	- port: 80 # 服务可用端口
	  targetPort: 8080 # 服务转发到容器的端口
	selector:
		app: kubia # app=kubia的pod都属于该服务
```

#### 多端口

```yaml
# 直接在yaml中配置Service的多port
apiVersion: v1
kind: Service
metadata:
	name: kubia
spec:
	ports:
	- name: http
	  port: 80 # 服务可用端口
	  targetPort: 8080 # 服务转发到容器的端口
	- name: https
	  port: 443
	  targetPort: 8443
	selector:
		app: kubia # app=kubia的pod都属于该服务
```

> `不同的端口在一个容器中只能适用于一个标签选择器`，若想分别对应不同的，需要多个容器。

```yaml
# 基于pod的yaml在service进行多port配置
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
	  targetPort: http # Pod中的名称
	- name: https
	  port: 443
	  targetPort: https # Pod中的名称
```


```shell
# 将pod暴露成服务，po即pod的缩写
kubectl expose po kubia --type=LoadBalancer --name kubia-http
# 基于yaml创建service
kubectl apply -f kubia
# 查看服务 svc即service的缩写
kubectl get svc
# 集群内的服务访问（--表示k8s命令的结束）
kubectl exec kubia -- curl -s http://10.106.78.175
```

> ![](https://images.leejay.top:9000/images/2025/01/21/2fe89f7c-8010-4be3-8d9e-8acad420e320.png)
>
> 也可以从Node节点上进行访问或创建Pod进行访问。
>
> ![](https://images.leejay.top:9000/images/2025/01/21/4cdfd9c4-69f6-4657-b0ee-958f18b5cd62.png)

### 服务发现

#### 环境变量

当Service创建后，kubelet会自动给管理的Pod添加如下环境变量（Service创建需先于Pod）

```shell
{SERVICE_NAME}_SERVICE_HOST=${SERVICE_IP}
{SERVICE_PORT}_SERVICE_PORT=${SERVICE_PORT}
```

#### DNS

集群中的CoreDNS监控kubernetes API中的新服务，并为每个服务创建一组DNS记录，如果在整个集群中都启用了 DNS，则所有 Pod 都应该能够通过其 DNS 名称自动解析服务。

若在`helloworld`namespace下存在一个名为`hello-service`的nginx服务，它通过8080端口可以访问到Pod上的80端口（简单的nginx服务），那么进入Pod容器内部，通过`curl hello-service.helloworld:8080`则可以访问到hello-serive服务。

### 无头服务（headless）

有时不需要或不想要负载均衡，以及单独的 Service IP。 遇到这种情况，可以通过指定 Cluster IP（`spec.clusterIP`）的值为 `"None"` 来创建 `Headless` Service。

对于无头 `Services` 并不会分配 Cluster IP，`kube-proxy`不会处理它们， 而且平台也不会为它们进行负载均衡和路由。 DNS 如何实现自动配置，依赖于 Service 是否定义了选择算符。

> 无头服务与普通服务的区别: 无头服务（不分配clusterIP，不会被kube-proxy处理，也不会进行负载均衡和路由）可以通过解析service的dns，得到所有Pod的地址和DNS。普通服务只能解析service的dns得到service的clusterIP。

![deploy-sts](https://images.leejay.top:9000/images/2025/01/21/05a599df-2523-42c9-8235-ff9bc5c8e1b3.png)

> statefulset下的pod中，进行DNS查询会返回所有pod的地址和DNS，Pod都会有域名，可以互相访问。而deployment下的pod中则会返回service的clusterIP地址，具体访问哪个pod由iptables或者ipvs决定。

### 服务亲和性

默认情况下服务代理通常将每个连接随机指向选中的后端Pod中的一个。如果我们希望客户端的所有请求都指向同一个客户端，配置服务`亲和性`可以实现该功能。

```yaml
apiVersion: v1
kind: Service
metadata:
	name: kubia
spec:
	sessionAffinity: ClientIP # 此参数会导致每次都请求同一个Pod（默认是None）
	ports:
	- port: 80 # 服务可用端口
	  targetPort: 8080 # 服务转发到容器的端口
	selector:
		app: kubia # app=kubia的pod都属于该服务
```

> 请求该Service，都会指向同一个Pod。

###  服务对外暴露

将服务类型设置成NodePort（每个集群节点都会在节点上打开一个端口），该端口接受到的流量重定向到基础服务。

```yaml
apiVersion: v1
kind: Service
metadata:
	name: kubia-nodeport
spec:
	type: NodePort  # 为NodePort设置集群IP端口号
	ports:
	- port: 80 # 服务集群IP的端口号
	  targetPort: 8080 # Pod的目标端口号
      nodePort: 30123 # 通过集群节点的30123端口可以访问
    selector:
    	app: kubia
```

> 用户可以通过`$CLUSTER-IP:80`、`$MASTER-IP:30123`或`$NODE-IP:30123`进行访问。

## EndPoint

Pod与Service进行通讯是需要通过`EndPoint`来实现的，我们创建Service时可以不指定`标签选择器`，这样Service不知道我们需要管理哪些Pod，所以需要我们手动创建EndPoint

```yaml
# 创建不带Pod选择器的服务
apiVersion: v1
kind: Service
metadata:
	name: external-service # 这个名字必须与service配置名相同
spec:
	ports:
	- port: 80 # 只指定port不指定选择器

apiVersion: v1
kind: Endpoints
metadata:
	name: external-service # 这个名字必须与service配置名相同
subsets:
	- addresses:
	  - ip: 11.11.11.11 #服务将连接重定向到endpoint的ip地址
	  - ip: 22.22.22.22
	  ports:
	  - port: 80 # endpoint的目标端口
```

![](https://images.leejay.top:9000/images/2025/01/21/67713595-b0f4-4665-9eea-d667b110fe6f.png)