---
sort: 60
---
# DownwardAPI
::: warning 概念
将Pod的元数据（`事先无法知道的数据，ex Pod名`，Yaml中已定义的数据）通过`环境变量或文件`的方式给Pod内的容器调用。

![](https://image.leejay.top/2025/01/21/65522506-8f68-472d-b39e-1849d04128ec.png)

> Pod manifest是预先定义的数据，还有容器运行后才知道的数据，都交予downwardAPI进行暴露。

DownwardAPI可以传递：`Pod名称`、`PodIP`、`容器Requests资源`、`Pod的标签`等。[点击此处查看更多参数](https://kubernetes.io/zh-cn/docs/concepts/workloads/pods/downward-api/)
:::

### 基于环境变量暴露

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: downward
spec:
  containers:
  - name: main
    image: busybox
    command: ["sleep", "99999999"]
    resources:
      requests: # 限制cpu和内存大小
        cpu: 100m
        memory: 90Mi
      limits:
        cpu: 100m
        memory: 90Mi
    env:
    - name: POD_NAME
      valueFrom:
        fieldRef:
          fieldPath: metadata.name
    - name: POD_NAMESPACE
      valueFrom:
        fieldRef:
          fieldPath: metadata.namespace
	- name: POD_IP
      valueFrom:
        fieldRef:
          fieldPath: status.podIP
	- name: NODE_NAME
      valueFrom:
        fieldRef:
          fieldPath: spec.nodeName
	- name: SERVICE_ACCOUNT
      valueFrom:
        fieldRef:
          fieldPath: spec.serviceAccountName
	- name: CONTAINER_CPU_REQUEST_MILLICORES
      valueFrom:
        resourceFieldRef:
	      resource: requests.cpu
          divisor: 1m # 定义基数单位 
	- name: CONTAINER_MEMORY_LIMIT_KIBIBYTES
      valueFrom:
        resourceFieldRef:
	      resource: limits.memory
          divisor: 1Ki # 定义基数单位 
```

> 通过查看Pod的环境变量，确定DownwardAPI是否生效
>
> ```shell
> kubectl exec downward -- env
> ```
>
> ![](https://image.leejay.top/2025/01/21/c2336b1e-a8ef-419a-a81f-5b83e27498bc.png)

### 基于卷暴露

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: downward2
  labels:
    foo: bar
  annotations:
    key1: value1
    key2: |
      multi
      line
      value
spec:
  containers:
  - name: main
    image: busybox
    command: ["sleep", "99999999"]
    resources:
      requests: # 限制cpu和内存大小
        cpu: 100m
        memory: 90Mi
      limits:
        cpu: 100m
        memory: 90Mi
    volumeMounts:
    - name: downward
      mountPath: /etc/downward
  volumes:
  - name: downward
    downwardAPI:
      items:
        - path: "podName"
          fieldRef:
            fieldPath: metadata.name
        - path: "podNamespace"
          fieldRef:
            fieldPath: metadata.namespace
        - path: "labels"
          fieldRef:
            fieldPath: metadata.labels
        - path: "annotations"
          fieldRef:
            fieldPath: metadata.annotations
        - path: "containerCpuRequestMilliCores"
          resourceFieldRef:
            containerName: main
            resource: requests.cpu
            divisor: 1m # 定义基数单位 
        - path: "containerMemoryLimitBytes"
          resourceFieldRef:
            containerName: main
            resource: limits.memory
            divisor: 1Ki # 定义基数单位
```
> 进入容器查看是否生效
> ```bash 
> kubectl exec downward2 -- ls -lL /etc/downward
> ```
>
> ![](https://image.leejay.top/2025/01/21/4b6dfcd6-a459-48ff-8509-d99640cb6436.png)
