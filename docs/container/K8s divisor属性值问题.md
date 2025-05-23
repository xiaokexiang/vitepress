# k8s divisor属性值问题

## 问题

k8s的官网关于divisor的默认值记录如下，默认为1.

```txt
The first element specifies that in the container named client-container, the value of the limits.cpu field in the format specified by 1m should be published as a file named cpu_limit. The divisor field is optional and has the default value of 1. A divisor of 1 means cores for cpu resources, or bytes for memory resources.
```

但是在`v1.21.13`的集群中，基于如下的yaml创建pod，创建完成后查看pod的yaml显示divisor属性值为0，与文档不符合。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hello123
  namespace: default
spec:
  containers:
    - name: hello-container
      image: docker.leejay.top/busybox
      command: ["sh", "-c", "sleep 3600"]
      resources:
        requests:
          cpu: "100m"
        limits:
          cpu: "1"
      env:
        - name: hellocpu
          valueFrom:
            resourceFieldRef:
              resource: requests.cpu
```

## 解析

- curl请求

```bash
$ curl -L 'https://localhost:6443/api/v1/namespaces/default/pods' \
-H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IkoyMGtjbmRsVXI1M3dpWXFpcmdMYmh4cGV6ZjcyY250UUhUdXVpQWxEeVUifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJkZWZhdWx0Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZWNyZXQubmFtZSI6ImFkbWluLXNhLXRva2VuLXM1Y3E0Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6ImFkbWluLXNhIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQudWlkIjoiMDhmZGQ1NTktMWViNC00ZGYxLTlmY2UtZmViYTgxYTQxMTg3Iiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmRlZmF1bHQ6YWRtaW4tc2EifQ.gjaDDF3MCWE_nVW_cUlWcYyN_ZfT7Pd4XV3LkEXW_Ehb-7X4RaoeT8UAHhbFOmmHRTbNbLLH04P3tJlJxzoBVpbY0_Qi6ZSi4r-IjPUtyUppiOhBenafxEG52q8unSFinpACsglwhvl-PTBdwZLwkkHBouqAPj3zxAEVLPTC9D9bbH_PIpnpsLe8znRsl_VVAWzwyG3qE1ESHkraz76xqZ4Z7IKD1mclKinrcAwigffEUfpY-PabZymaUx_wZscciqdj5Kc62qXzWx0hTmeLEP6lGddTH2Sy9TgaH96npIAtZuQO0W4ZFsOVIs-YCXtTItzQ0iWv0QeISE_Qe7TZvA' \
-H 'Content-Type: application/yaml' \
-d '@/opt/projects/go/kubernetes/pod.yaml'
```

- 流程图

```mermaid
sequenceDiagram
    participant Kubelet as kubelet
    participant APIServer as kube-apiserver
    participant store.go # staging/src/k8s.io/apiserver/pkg/registry/generic/registry/store.go
    participant etcd3/store.go # staging/src/k8s.io/apiserver/pkg/storage/etcd3/store.go
    participant protobuf.go # staging/src/k8s.io/apiserver/pkg/storage/etcd3/store.gostaging/src/k8s.io/apimachinery/pkg/runtime/serializer/protobuf/protobuf.go
    participant quantity.go # staging/src/k8s.io/apimachinery/pkg/api/resource/quantity.go

    Kubelet->>APIServer: 创建pod
    APIServer->>store.go: Create()
    store.go->>etcd3/store.go: Create()
    etcd3/store.go->>protobuf.go: Encode()
    protobuf.go->>quantity.go: CanonicalizeBytes()
 
```

- 源码

```go
var (
	Zero = int64Amount{}

	// Used by quantity strings - treat as read only
	zeroBytes = []byte("0")
)
// Quantity的属性进行序列化
func (q *Quantity) CanonicalizeBytes(out []byte) (result, suffix []byte) {
	if q.IsZero() { // 判断quantity属性是否是空，即没有进行任何赋值的初始值
		return zeroBytes, nil //这里被复制为默认值"0"
	}
	...
}
// 将传入的字符串转为resource Quantity属性
func (q *Quantity) IsZero() bool {
	if q.d.Dec != nil {
		return q.d.Dec.Sign() == 0
	}
	return q.i.value == 0
}
```

> 源码分支为release-1.21

## 终述

在Pod创建的过程中，apiserver解析yaml的属性，在将其进行序列化转换准备存储到etcd的时候，将默认的divisor的属性值进行了修改，修改为了代码中定义的"0"。属性值为0和为1的效果相同。