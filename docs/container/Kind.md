---
sort: 20
---

# Kind

::: warning Kind 简介

[kind](https://kind.sigs.k8s.io)（Kubernetes in Docker）是一个用于在本地机器上创建 Kubernetes 集群的工具。它使用 Docker 容器来模拟真实的 Kubernetes 节点，允许你在单个机器上轻松创建和管理 Kubernetes 环境。

**kind 只适合本地开发和测试使用，不推荐生产使用。**

:::

## 部署

> - 基于 CentOS 7.9 部署 kind-v0.18.0 版本，[v0.20.0](https://github.com/kubernetes-sigs/kind/issues/3311) 不支持 CentOS 7.9
> - 需安装 Go 1.16+ 版本，且需预先安装 Docker

### kubectl

```bash
# 下载 1.29.0 kubectl 客户端
curl -LO https://dl.k8s.io/release/1.29.0/bin/linux/amd64/kubectl && chmod +x kubectl && mv kubectl /usr/local/bin/

# 查看版本
kubectl version
```

### kind

```bash
# 安装 kind
go install sigs.k8s.io/kind@v0.18.0

# 查看 kind 是否安装
kind version

# 如果 kind 命令不识别，执行下面命令
cp /root/go/bin/kind /usr/local/bin/ && chmod +x /usr/local/bin/kind
```

## 安装

创建配置文件 `kind-config.yaml`：

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  apiServerAddress: "10.50.8.88"  # 一般推荐 127.0.0.1 本地访问
  apiServerPort: 6443
kubeadmConfigPatches:
  - |
    apiVersion: kubelet.config.k8s.io/v1beta1
    kind: KubeletConfiguration
    evictionHard:
      nodefs.available: "0%"  # kubelet 相关配置
nodes:
  - role: control-plane  # 只部署一个 control 节点
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"  # ingress 部署在符合 label 的 node 上
    extraPortMappings:
      - containerPort: 80  # 后续 ingress 使用
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
```

> 因为 kind 是 Docker 部署的，所以需要提前暴露些端口，但是没找到类似 Docker 暴露端口区间的配置，目前只能手动添加。

::: details 脚本创建配置文件

如果手动创建比较麻烦，也可以使用如下脚本自动创建，端口自定义修改即可。

```bash
#!/bin/bash
cat <<EOF > kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  apiServerAddress: "10.50.8.88"
  apiServerPort: 6443
kubeadmConfigPatches:
- |
  apiVersion: kubelet.config.k8s.io/v1beta1
  kind: KubeletConfiguration
  evictionHard:
    nodefs.available: "0%"
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
EOF

for ((port=30000; port<=30020; port++)); do
  cat <<EOF >> kind-config.yaml
  - containerPort: $port
    hostPort: $port
EOF
done
```

:::

## 使用

### 创建集群

基于上文的配置文件，执行如下命令，创建名为 k8s 的本地集群。

```bash
# kind 创建集群，允许多次，但需要注意集群名称和配置文件中的端口不能冲突
kind create cluster --config=kind-config.yaml --name k8s

# 执行结果如下即视为成功
Creating cluster "k8s" ...
 ✓ Ensuring node image (kindest/node:v1.26.3) 🖼
 ✓ Preparing nodes 📦
 ✓ Writing configuration 📜
 ✓ Starting control-plane 🕹️
 ✓ Installing CNI 🔌
 ✓ Installing StorageClass 💾
Set kubectl context to "kind-k8s"
You can now use your cluster with:

kubectl cluster-info --context kind-k8s

Have a nice day! 👋
```

### 切换集群上下文

若存在多个集群（多次 kind 创建），那么可以通过如下命令显示和切换集群上下文。

```bash
# 查看当前本地的上下文集群配置
kubectl config get-contexts

# *号表示当前集群上下文
CURRENT   NAME        CLUSTER     AUTHINFO    NAMESPACE
          kind-k8s    kind-k8s    kind-k8s
*         kind-k8s2   kind-k8s2   kind-k8s2

# 切换当前的集群配置
kubectl config use-context kind-k8s

# 再次查看，上下文已被切换
CURRENT   NAME        CLUSTER     AUTHINFO    NAMESPACE
*         kind-k8s    kind-k8s    kind-k8s
          kind-k8s2   kind-k8s2   kind-k8s2
```

### 删除集群

如需要删除 kind 创建的集群：

```bash
# 查看当前 kind 创建的集群
kind get clusters

# 删除指定名称的集群
kind delete cluster --name=k8s2

# 显示如下表示成功
Deleting cluster "k8s2" ...
Deleted nodes: ["k8s2-control-plane"]
```

### 加载镜像

将镜像加载到 kind 集群的节点中：

```bash
# 私有仓库的镜像需要手动 load 到节点中，公网的无须处理
kind load docker-image <your-registry/your-image:tag> --name=k8s
```

## 集成插件

### MetalLB

> 一个用于在 Kubernetes 集群中实现 `负载均衡` 的开源项目，通过 `BGP 三层协议` 或 `ARP 二层协议` 来动态地将服务 IP 地址分配给集群中的节点。

```bash
# 安装 MetalLB
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.7/config/manifests/metallb-native.yaml

# 等待 MetalLB 就绪
kubectl wait --namespace metallb-system \
              --for=condition=ready pod \
              --selector=app=metallb \
              --timeout=90s

# 查看 kind docker 的 cidr
docker network inspect -f '{{.IPAM.Config}}' kind

# 配置 IPAddressPool
cat <<EOF | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: example
  namespace: metallb-system
spec:
  addresses:
  - 172.18.2.200-172.18.2.250  # 由上文的 cidr 范围决定，构建 ip 地址池
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: empty
  namespace: metallb-system
EOF

# 查看 istio 的 ingress gateway svc，EXTERNAL-IP 不再是 PENDING 状态
kubectl -n istio-system get svc -l istio=ingressgateway

# NAME                   TYPE           CLUSTER-IP     EXTERNAL-IP    PORT(S)
# istio-ingressgateway   LoadBalancer   10.96.39.203   172.18.2.200   15021:31850/TCP,80:30000/TCP,443:30003/TCP
```

> 1. 没有配置 MetalLB 前，ingress gateway 的 EXTERNAL-IP 为 `PENDING` 状态，安装 MetalLB 后会分配指定的 `IP 池内` 的 IP 给 LoadBalancer 服务
> 2. 基于 Kind 部署的 MetalLB 分配的地址池其实仍是 Docker 的 CIDR，无法实现外部访问，外部访问仍需要基于 NodePort

#### 基于 MetalLB 的访问测试

```bash
export INGRESS_NAME=istio-ingressgateway
export INGRESS_NS=istio-system
export INGRESS_HOST=$(kubectl -n "$INGRESS_NS" get service "$INGRESS_NAME" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
export INGRESS_PORT=$(kubectl -n "$INGRESS_NS" get service "$INGRESS_NAME" -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
export SECURE_INGRESS_PORT=$(kubectl -n "$INGRESS_NS" get service "$INGRESS_NAME" -o jsonpath='{.spec.ports[?(@.name=="https")].port}')
export TCP_INGRESS_PORT=$(kubectl -n "$INGRESS_NS" get service "$INGRESS_NAME" -o jsonpath='{.spec.ports[?(@.name=="tcp")].port}')

# http 访问
curl --resolve "httpbin.example.com:$INGRESS_PORT:$INGRESS_HOST" "http://httpbin.example.com:$INGRESS_PORT"

# https 访问
curl --resolve "httpbin.example.com:$SECURE_INGRESS_PORT:$INGRESS_HOST" --cacert example_certs1/example.com.crt "https://httpbin.example.com:$SECURE_INGRESS_PORT"
```

### Ingress

```bash
# 安装控制器
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# 测试功能
kubectl apply -f https://kind.sigs.k8s.io/examples/ingress/usage.yaml
curl localhost/foo/hostname
curl localhost/bar/hostname
```

> 如果控制器自身镜像无法下载，尝试以下镜像 ID：
> - `docker.io/anjia0532/google-containers.ingress-nginx.controller:v1.9.4`
> - `docker.io/anjia0532/google-containers.ingress-nginx.kube-webhook-certgen:v20231011-8b53cabe0`

#### 将 ingress 作为 istio-ingressgateway 的上层网关（不推荐）

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress
  namespace: istio-system  # 不要修改
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2  # 替换请求路径
spec:
  ingressClassName: nginx
  rules:
    - host: httpbin.example.com
      http:
        paths:
          - path: /ingress(/|$)(.*)  # 将 /ingress/ip 替换为 /ip
            pathType: ImplementationSpecific
            backend:
              service:
                name: istio-ingressgateway  # 绑定 istio 网关的 svc
                port:
                  number: 80
  tls:
    - hosts:
        - httpbin.example.com
      secretName: httpbin-secret  # 支持 https
```
