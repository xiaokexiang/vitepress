---
sort: 20
---
# Kind

::: warning
[kind](https://kind.sigs.k8s.io)（Kubernetes in Docker）是一个用于在本地机器上创建 Kubernetes 集群的工具。它使用 Docker 容器来模拟真实的 Kubernetes 节点，允许你在单个机器上轻松创建和管理 Kubernetes 环境。
> kind只适合本地开发和测试使用，不推荐`生产使用`。
:::


### 部署

> - 基于centos7.9部署kind-v0.18.0版本,[v0.20.0](https://github.com/kubernetes-sigs/kind/issues/3311)不支持centos7.9。
> - 需安装go1.16+版本，且需预先安装docker。

#### kubectl

```bash
# 下载1.29.0 kubectl客户端
curl -LO https://dl.k8s.io/release/1.29.0/bin/linux/amd64/kubectl && chmod +x kubectl && mv kubectl /usr/local/bin/
# 查看版本
kubectl version
```

#### kind

```bash
# 安装kind
go install sigs.k8s.io/kind@v0.18.0
# 查看kind是否安装
kind version
# 如果kind命令不识别，执行下面命令
cp /root/go/bin/kind /usr/local/bin/ && chmod +x /usr/local/bin/kind
```

### 安装

创建配置文件kind-config.yaml

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  apiServerAddress: "10.50.8.88" # 一般推荐127.0.0.1本地访问
  apiServerPort: 6443
kubeadmConfigPatches:
- |
  apiVersion: kubelet.config.k8s.io/v1beta1
  kind: KubeletConfiguration
  evictionHard:
    nodefs.available: "0%" # kubelet相关配置
nodes:
- role: control-plane # 只部署一个control节点
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true" # ingress部署在符合label的node上
  extraPortMappings:
  - containerPort: 80 # 后续ingress使用
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
```

>  因为kind是docker部署的，所以需要提前暴露些端口，但是没找到类似docker暴露端口区间的配置，目前只能手动添加。
:::details 脚本创建配置文件

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

### 使用

- 基于上文的配置文件，执行如下命令，创建名为k8s的本地集群。

```bash
# kind创建集群，允许多次，但需要注意集群名称和配置文件中的端口不能冲突
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

- 若存在多个集群（多次kind创建），那么可以通过如下命令显示和切换集群上下文

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

- 如需要删除kind创建的集群

```bash
# 查看当前kind创建的集群
kind get clusters
# 删除指定名称的集群
kind delete cluster --name=k8s2
# 显示如下表示成功
Deleting cluster "k8s2" ...
Deleted nodes: ["k8s2-control-plane"]
```

- 将镜像加载到kind集群的节点中

```bash
# 私有仓库的镜像需要手动load到节点中，公网的无须处理
kind load docker-image <your-registry/your-image:tag> --name=k8s
```
## 集成插件
### MetalLB

> 一个用于在Kubernetes集群中实现`负载均衡`的开源项目，通过`BGP三层协议`或`ARP二层协议`来动态地将服务IP地址分配给集群中的节点。

```bash
$ kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.7/config/manifests/metallb-native.yaml
$ kubectl wait --namespace metallb-system \
                --for=condition=ready pod \
                --selector=app=metallb \
                --timeout=90s
# 查看kind docker的cidr
$ docker network inspect -f '{{.IPAM.Config}}' kind
$ cat << EOF | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: example
  namespace: metallb-system
spec:
  addresses:
  - 172.18.2.200-172.18.2.250 # 由上文的cidr范围决定，构建ip地址池
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: empty
  namespace: metallb-system
EOF
# 查看istio的ingressgatewa svc，EXTERNAL-IP不再是PENDING状态
$ kubectl -n istio-system get svc -l istio=ingressgateway
# NAME                   TYPE           CLUSTER-IP     EXTERNAL-IP    PORT(S)                                     
# istio-ingressgateway   LoadBalancer   10.96.39.203   172.18.2.200   15021:31850/TCP,80:30000/TCP,443:30003/TCP   
```

> - 没有配置MetalLB前，ingressgateway的EXTERNAL-IP为`PENDING`状态，安装MetalLB后会分配指定的`IP池内`的IP给LoadBalancer服务。
>
> - 基于Kind部署的MetalLB分配的地址池其实仍是docker的CIDR，无法实现外部访问，外部访问仍需要基于NodePort。

基于MetalLB的访问测试

```bash
$ export INGRESS_NAME=istio-ingressgateway
$ export INGRESS_NS=istio-system
$ export INGRESS_HOST=$(kubectl -n "$INGRESS_NS" get service "$INGRESS_NAME" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
$ export INGRESS_PORT=$(kubectl -n "$INGRESS_NS" get service "$INGRESS_NAME" -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
$ export SECURE_INGRESS_PORT=$(kubectl -n "$INGRESS_NS" get service "$INGRESS_NAME" -o jsonpath='{.spec.ports[?(@.name=="https")].port}')
$ export TCP_INGRESS_PORT=$(kubectl -n "$INGRESS_NS" get service "$INGRESS_NAME" -o jsonpath='{.spec.ports[?(@.name=="tcp")].port}')
# http访问
$ curl --resolve "ttpbin.example.com:$INGRESS_PORT:$INGRESS_HOST" "http://httpbin.example.com:$INGRESS_PORT"
# https访问
$ curl --resolve "httpbin.example.com:$SECURE_INGRESS_PORT:$INGRESS_HOST" --cacert example_certs1/example.com.crt "https://httpbin.example.com:$SECURE_INGRESS_PORT"
```
### Ingress

```bash
# 安装控制器
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
# 测试功能
$ kubectl apply -f https://kind.sigs.k8s.io/examples/ingress/usage.yaml
$ curl localhost/foo/hostname
$ curl localhost/bar/hostname
```

> 如果控制器自身镜像无法下载，尝试以下镜像ID
>
> - docker.io/anjia0532/google-containers.ingress-nginx.controller:v1.9.4 
> - docker.io/anjia0532/google-containers.ingress-nginx.kube-webhook-certgen:v20231011-8b53cabe0

将ingress作为istio-ingressgateway的上层网关（不推荐）

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress
  namespace: istio-system # 不要修改
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2 # 替换请求路径
spec:
  ingressClassName: nginx
  rules:
    - host: httpbin.example.com
      http:
        paths:
          - path: /ingress(/|$)(.*) # 将/ingress/ip 替换为/ip
            pathType: ImplementationSpecific
            backend:
              service:
                name: istio-ingressgateway # 绑定istio网关的svc
                port:
                  number: 80
  tls:
    - hosts:
        - httpbin.example.com
      secretName: httpbin-secret # 支持https
```