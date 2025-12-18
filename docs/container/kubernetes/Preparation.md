---
sort: 10
---
# 知识准备
## 容器与虚拟机的区别

虚拟机（VM）是虚拟化底层计算机，每个VM不仅需要运行`操作系统的完整副本`，还需要运行操作系统需要运行的所有`硬件的虚拟副本`。这就意味着需要大量的硬件资源。

相比VM，容器只需要虚拟化`操作系统`。每个容器共享主机操作系统内核。相比VM功能类似，但是开销少很多。但是VM提供了完全隔离的环境。

容器内的进程是运行在宿主机的操作系统上的，而虚拟机内的进程是运行在不同的操作系统上的，但容器内的进程是与其他进程隔离的。、

![](https://image.leejay.top/2025/01/21/fa828129-2835-4a18-a08c-7bad38fce272.png)

> 1. VM内的指令执行流程：`VM程序指令 -> VM操作系统内核 -> 宿主机管理程序 -> 宿主机内核。 `
> 2. 容器会完全指定运行在宿主机上的同一个内核的系统调用，容器间是共享操作系统内核。

## 容器的隔离机制实现

### Linux命名空间

每个进程只能看到自己的系统视图（文件、进程、网络接口、主机名等）。进程不单单只属于一个命名空间，而是属于`每个类型`的一个命名空间。类型包括`Mount(mnt)`、`Process ID(pid)`、`NetWork(net)`、`Inter-process communication(ipd)`、`UTS`、`User ID(user)`。

### Linux控制组

基于`cgroups`实现，它是Linux内核功能，限制一个进程或一组进程的资源使用不超过被分配的量。

## Kubernetes基本概念

### Kubernetes Master & Node

![](https://image.leejay.top/2025/01/21/0272bc6e-0ca7-42ea-9607-721b999715b0.png)

### Kubernetes运行流程

![](https://image.leejay.top/2025/01/21/7ea5c966-fccd-4b0a-8de5-47079332dda3.png)

> 1. 在应用程序运行时，可以增加或减少副本数量。也可以交由kubernetes进行判断。
> 2. kubernetes可能需要在集群中迁移你的容器，比如运行的节点失败时、为其他容器腾空间从节点移除时。

## Kubernetes

### 部署

#### 基于minikube部署

- kubectl

```shell
export REGISTRY_MIRROR=https://registry.cn-hangzhou.aliyuncs.com
curl -sSL https://kuboard.cn/install-script/v1.19.x/install_kubelet.sh | sh -s 1.19.2
```

- MiniKube

```shell
# 拉取二进制包（基于阿里云镜像）
# https://developer.aliyun.com/article/221687
curl -Lo minikube https://kubernetes.oss-cn-hangzhou.aliyuncs.com/minikube/releases/v1.17.1/minikube-linux-amd64 && chmod +x minikube && sudo mv minikube /usr/local/bin/

# 创建用户（不能使用root启动）
adduser k8s
passwd k8s
sudo groupadd docker
# 添加到用户组
sudo usermod -aG docker k8s
// 激活用户组
newgrp docker

# 启动
minikube start
```

#### 基于kubeadm部署

<a href="./kubeadm部署.md">kubeadm部署</a>

```shell
# 查看node状态
kubectl get nodes
# 赋予node 角色信息
kubectl label nodes k8s-node1 node-role.kubernetes.io/node=
# 清除node 角色信息
kubectl label nodes k8s-node1 node-role.kubernetes.io/node-
```