# Kube-ApiServer调试
## 前言

kube-apiserver 是 Kubernetes 控制平面的核心组件，负责处理所有 API 请求，并与 etcd 交互存储集群状态。由于其复杂的逻辑和高性能要求，在开发或问题排查时，能够高效地进行 Debug 调试至关重要。

本文旨在演示如何对 Kubernetes 的核心组件 **kube-apiserver** 进行本地调试和远程 Debug 调试。
## 准备

### 环境

| 组件                                                         | 版本                                   | 作用                                     |
| ------------------------------------------------------------ | -------------------------------------- | ---------------------------------------- |
| 环境                                                         | centos7（5.4.274-1.el7.elrepo.x86_64） | 编译kube-apiserver、集群部署及远程调试用 |
| go                                                           | go1.20.12 linux/amd64                  | 代码调试                                 |
| [delve](https://github.com/go-delve/delve/tree/master/Documentation/installation) | 1.21.2                                 | go debugger                              |
| docker-ce                                                    | 20.10.9                                | 集群部署                                 |

### 代码

```bash
# 设置ggoproxy
$ export GOPROXY=https://goproxy.io,direct 
# 下载kubernetes源码
$ git clone -b release-1.21.1 https://github.com/kubernetes/kubernetes.git
```

## 调试

### 本地部署集群调试

- 安装ETCD

```bash
# 进入代码目录
$ cd /opt/project/go/kubernetes
# 安装etcd
$ ./hack/install-etcd.sh
# 设置环境变量
$ export PATH="/opt/projects/go/kubernetes/third_party/etcd:${PATH}"
```

- 修改编译参数

```bash
# hack/golang.sh 去除-s -w 保留文件名，行号
$ goldflags="${GOLDFLAGS=-s -w -buildid=} $(kube::version::ldflags)" # [!code --]
$ goldflags="${GOLDFLAGS:-} $(kube::version::ldflags)" # [!code ++]
```

- 安装集群

```bash
make clean
# 守护进程的方式运行且禁止编译时做优化和内联
ENABLE_DAEMON=true DBG=1 ./hack/local-up-cluster.sh

# 出现如下信息表示启动成功
Local Kubernetes cluster is running.

Logs:
  /tmp/kube-apiserver.log
  /tmp/kube-controller-manager.log
  
  /tmp/kube-proxy.log
  /tmp/kube-scheduler.log
  /tmp/kubelet.log

To start using your cluster, run:

  export KUBECONFIG=/var/run/kubernetes/admin.kubeconfig
  cluster/kubectl.sh

Alternatively, you can write to the default kubeconfig:

  export KUBERNETES_PROVIDER=local

  cluster/kubectl.sh config set-cluster local --server=https://localhost:6443 --certificate-authority=/var/run/kubernetes/server-ca.crt
  cluster/kubectl.sh config set-credentials myself --client-key=/var/run/kubernetes/client-admin.key --client-certificate=/var/run/kubernetes/client-admin.crt
  cluster/kubectl.sh config set-context local --cluster=local --user=myself
  cluster/kubectl.sh config use-context local
  cluster/kubectl.sh
```
- 检查进程和集群
```bash
$ ps -a | grep kube
13128 pts/2    00:00:32 kube-apiserver
13541 pts/2    00:00:11 kube-controller
13543 pts/2    00:00:01 kube-scheduler
13825 pts/2    00:00:14 kubelet
16274 pts/2    00:00:00 kube-proxy

# 因为我本地有kt用于连接集群，所以需要指定下config路径
$ export KUBECONFIG=/var/run/kubernetes/admin.kubeconfig
$ ./cluster/kubectl.sh get node
NAME        STATUS   ROLES    AGE   VERSION
127.0.0.1   Ready    <none>   37m   v1.21.15-rc.0.4+2fef630dd216dd-dirty
```

- 记录apiserver启动参数

```bash
$ ps aux | grep apiserve
root     13128  4.6  1.0 1104416 334280 pts/2  Sl   15:15   1:01 /opt/projects/go/kubernetes/_output/local/bin/linux/amd64/kube-apiserver --authorization-mode=Node,RBAC  --cloud-provider= --cloud-config=   --v=3 --vmodule= --audit-policy-file=/tmp/kube-audit-policy-file --audit-log-path=/tmp/kube-apiserver-audit.log --authorization-webhook-config-file= --authentication-token-webhook-config-file= --cert-dir=/var/run/kubernetes --client-ca-file=/var/run/kubernetes/client-ca.crt --kubelet-client-certificate=/var/run/kubernetes/client-kube-apiserver.crt --kubelet-client-key=/var/run/kubernetes/client-kube-apiserver.key --service-account-key-file=/tmp/kube-serviceaccount.key --service-account-lookup=true --service-account-issuer=https://kubernetes.default.svc --service-account-jwks-uri=https://kubernetes.default.svc/openid/v1/jwks --service-account-signing-key-file=/tmp/kube-serviceaccount.key --enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,DefaultStorageClass,DefaultTolerationSeconds,Priority,MutatingAdmissionWebhook,ValidatingAdmissionWebhook,ResourceQuota --disable-admission-plugins= --admission-control-config-file= --bind-address=0.0.0.0 --secure-port=6443 --tls-cert-file=/var/run/kubernetes/serving-kube-apiserver.crt --tls-private-key-file=/var/run/kubernetes/serving-kube-apiserver.key --storage-backend=etcd3 --storage-media-type=application/vnd.kubernetes.protobuf --etcd-servers=http://127.0.0.1:2379 --service-cluster-ip-range=10.0.0.0/24 --feature-gates=AllAlpha=false --external-hostname=localhost --requestheader-username-headers=X-Remote-User --requestheader-group-headers=X-Remote-Group --requestheader-extra-headers-prefix=X-Remote-Extra- --requestheader-client-ca-file=/var/run/kubernetes/request-header-ca.crt --requestheader-allowed-names=system:auth-proxy --proxy-client-cert-file=/var/run/kubernetes/client-auth-proxy.crt --proxy-client-key-file=/var/run/kubernetes/client-auth-proxy.key --cors-allowed-origins=/127.0.0.1(:[0-9]+)?$,/localhost(:[0-9]+)?$
```
> apiserver的启动参数需要记录下来，后面dlv启动时候用

- 使用dlv启动apiserver
```bash
# 获取现有apiserver的进程号
$ ps -a | grep apiserver
$ kill -9 <PID>
# 使用dlv启动，exec后的是上文记录的apiserver的启动命令
$ dlv --listen=:2345 --headless=true --api-version=2 exec /opt/projects/go/kubernetes/_output/local/bin/linux/amd64/kube-apiserver -- --authorization-mode=Node,RBAC  --cloud-provider= --cloud-config=   --v=3 --vmodule= --audit-policy-file=/tmp/kube-audit-policy-file --audit-log-path=/tmp/kube-apiserver-audit.log --authorization-webhook-config-file= --authentication-token-webhook-config-file= --cert-dir=/var/run/kubernetes --client-ca-file=/var/run/kubernetes/client-ca.crt --kubelet-client-certificate=/var/run/kubernetes/client-kube-apiserver.crt --kubelet-client-key=/var/run/kubernetes/client-kube-apiserver.key --service-account-key-file=/tmp/kube-serviceaccount.key --service-account-lookup=true --service-account-issuer=https://kubernetes.default.svc --service-account-jwks-uri=https://kubernetes.default.svc/openid/v1/jwks --service-account-signing-key-file=/tmp/kube-serviceaccount.key --enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,DefaultStorageClass,DefaultTolerationSeconds,Priority,MutatingAdmissionWebhook,ValidatingAdmissionWebhook,ResourceQuota --disable-admission-plugins= --admission-control-config-file= --bind-address=0.0.0.0 --secure-port=6443 --tls-cert-file=/var/run/kubernetes/serving-kube-apiserver.crt --tls-private-key-file=/var/run/kubernetes/serving-kube-apiserver.key --storage-backend=etcd3 --storage-media-type=application/vnd.kubernetes.protobuf --etcd-servers=http://127.0.0.1:2379 --service-cluster-ip-range=10.0.0.0/24 --feature-gates=AllAlpha=false --external-hostname=localhost --requestheader-username-headers=X-Remote-User --requestheader-group-headers=X-Remote-Group --requestheader-extra-headers-prefix=X-Remote-Extra- --requestheader-client-ca-file=/var/run/kubernetes/request-header-ca.crt --requestheader-allowed-names=system:auth-proxy --proxy-client-cert-file=/var/run/kubernetes/client-auth-proxy.crt --proxy-client-key-file=/var/run/kubernetes/client-auth-proxy.key --cors-allowed-origins='/127.0.0.1(:[0-9]+)?$,/localhost(:[0-9]+)?$'

# 出现如下表示启动成功
API server listening at: [::]:2345
2025-05-22T16:14:17+08:00 warning layer=rpc Listening for remote connections (connections are not authenticated nor encrypted)

```
> 1. 因为我的终端是zsh，所以这里的正则我需要添加''避免解析问题
> 2. dlv --listen=:2345 --headless=true --api-version=2 exec `${apiserver path}` -- `${flags参数}`

- 使用goLand连接
![goLand](https://fn.leejay.top:9000/images/2025/05/22/5f35c3b9-eca8-4c65-a98c-87b03fa7f84f.jpeg)

> 查看dlv --listen=:2345启动的终端显示，显示apiserver的启动日志，且无报错即为正常。

### 远端集群调试

- 编译apiserver
```bash
$ cd /opt/project/go/kubernetes
# 编译apiserver
$ make kube-apiserver
# 复制apiserver到远端集群
$ scp _output/bin/kube-apiserver root@ip:/root/kube-apiserver
```
- 查看远端集群apiserver启动命令
```bash
$ ps aux | grep apiserver
root     3339334  8.0  3.9 1383460 633072 ?      Ssl  12:06  21:47 /usr/local/bin/kube-apiserver --v=8 --insecure-port=0 --service-cluster-ip-range=100.64.0.0/16 --service-account-key-file=/etc/kubernetes/pki/ca.pem --service-account-lookup --client-ca-file=/etc/kubernetes/pki/ca.pem --tls-cert-file=/etc/kubernetes/pki/apiserver.pem --tls-private-key-file=/etc/kubernetes/pki/apiserver-key.pem --secure-port=6443 --allow-privileged=true --advertise-address=10.50.8.27 --kubelet-client-certificate=/etc/kubernetes/pki/kubelet-client.pem --kubelet-client-key=/etc/kubernetes/pki/kubelet-client-key.pem --kubelet-certificate-authority=/etc/kubernetes/pki/ca.pem --profiling=false --audit-log-path=/var/log/apiserver/apiserveraudit.log --audit-log-maxage=30 --audit-log-maxbackup=10 --audit-log-maxsize=100 --audit-policy-file=/etc/kubernetes/audit-policy.yaml --tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256 --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname --default-not-ready-toleration-seconds=60 --default-unreachable-toleration-seconds=60 --feature-gates=RemoveSelfLink=false --feature-gates=BoundServiceAccountTokenVolume=false --service-account-issuer=https://kubernetes.default.svc.cluster.local --service-account-signing-key-file=/etc/kubernetes/pki/ca-key.pem --requestheader-client-ca-file=/etc/kubernetes/pki/ca.pem --proxy-client-cert-file=/etc/kubernetes/pki/apiserver.pem --proxy-client-key-file=/etc/kubernetes/pki/apiserver-key.pem --authorization-mode=Node,RBAC --etcd-cafile=/etc/etcd/ssl/ca.pem --etcd-certfile=/etc/etcd/ssl/client.pem --etcd-keyfile=/etc/etcd/ssl/client-key.pem --etcd-servers=https://10.50.8.27:2379

```

- 停止远端集群的apiserver
```bash
# 集群的apiserver在/etc/kubernetes/manifests目录下，由节点自动管理创建
$ mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/kube-apiserver.yaml
```

- dlv启动apiserver
```bash
dlv --listen=:2345 --headless=true --api-version=2 exec /root/kube-apiserver -- --v=8 --insecure-port=0 --service-cluster-ip-range=100.64.0.0/16 --service-account-key-file=/etc/kubernetes/pki/ca.pem --service-account-lookup --client-ca-file=/etc/kubernetes/pki/ca.pem --tls-cert-file=/etc/kubernetes/pki/apiserver.pem --tls-private-key-file=/etc/kubernetes/pki/apiserver-key.pem --secure-port=6443 --allow-privileged=true --advertise-address=10.50.8.27 --kubelet-client-certificate=/etc/kubernetes/pki/kubelet-client.pem --kubelet-client-key=/etc/kubernetes/pki/kubelet-client-key.pem --kubelet-certificate-authority=/etc/kubernetes/pki/ca.pem --profiling=false --audit-log-path=/var/log/apiserver/apiserveraudit.log --audit-log-maxage=30 --audit-log-maxbackup=10 --audit-log-maxsize=100 --audit-policy-file=/etc/kubernetes/audit-policy.yaml --tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256 --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname --default-not-ready-toleration-seconds=60 --default-unreachable-toleration-seconds=60 --feature-gates=RemoveSelfLink=false --feature-gates=BoundServiceAccountTokenVolume=false --service-account-issuer=https://kubernetes.default.svc.cluster.local --service-account-signing-key-file=/etc/kubernetes/pki/ca-key.pem --requestheader-client-ca-file=/etc/kubernetes/pki/ca.pem --proxy-client-cert-file=/etc/kubernetes/pki/apiserver.pem --proxy-client-key-file=/etc/kubernetes/pki/apiserver-key.pem --authorization-mode=Node,RBAC --etcd-cafile=/etc/etcd/ssl/ca.pem --etcd-certfile=/etc/etcd/ssl/client.pem --etcd-keyfile=/etc/etcd/ssl/client-key.pem --etcd-servers=https://10.50.8.27:2379
```
> 命令结构与前文一致，需要注意的是apiserver的文件路径，是你复制到远端集群的位置。

- goLand连接

![goLand](https://fn.leejay.top:9000/images/2025/05/22/5f35c3b9-eca8-4c65-a98c-87b03fa7f84f.jpeg)

#### 参考来源

- https://blog.haohtml.com/archives/34454/
- https://blog.csdn.net/a1369760658/article/details/135147441
- https://www.bilibili.com/video/BV1vS4y1q7cR
