---
sort: 20
---

# 命名空间（Namespace）

::: tip 概念

- namespace 提供了 `一个命名空间内的资源名称唯一，两个不同的命名空间允许有相同的资源名称` 的特性，提供了类似 `作用域` 的概念，每个命名空间内的相同资源互不影响
- 命名空间提供了 `隔离` 的概念，但网络隔离取决于 k8s 集群的网络方案（默认可以通过 NetworkPolicy 实现 Pod 隔离）。如果网络不隔离的话，通过 IP 不同命名空间的资源是可以互相访问的

:::

## 操作命令

```shell
# 获取所有的命名空间
kubectl get ns

# 查询指定命名空间下的 pod
kubectl get pods -n kube-system

# 创建 namespace: custom
kubectl create ns custom

# 创建指定 namespace 的 pod
kubectl apply -f kubia-custom.yaml -n custom

# 删除指定的命名空间（pod 也会被删除）
kubectl delete ns custom

# 删除当前命名空间下的所有 pod
kubectl delete pods --all

# 删除当前命名空间的几乎所有资源
kubectl delete all --all
```

## 切换命名空间

### 查看当前的 namespace

```shell
kubectl config view
```

### 添加 alias 用于快速切换 namespace

```shell
# 基于 alias 的命名空间切换，写入别名到.bashrc 配置
cat << EOF >> ~/.bashrc
alias kcd='kubectl config set-context $(kubectl config current-context) --namespace'
EOF
source ~/.bashrc

# 切换到 custom namespace
kcd custom
```

### 不使用 alias 切换

```shell
# 将当前 context 的 namespace 修改为 default
kubectl config set-context --current --namespace=default
```
