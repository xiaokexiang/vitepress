---
sort: 16
---

# 标签（Label）和注解（Annotation）

## 标签

```yaml
apiVersion: v1        # 描述遵循 V1 版本的 API
kind: Pod             # 描述一个 pod
metadata:             # 用于描述名称、命名空间、标签等其他容器信息
  name: kubia         # pod 的名称
  labels:             # 创建多个 label
    creation_mode: manual
    env: prod
spec:                 # pod 内容的实际说明，pod 的容器、卷和其他数据
  containers:
    - image: xiaokexiang/kubia  # 创建容器需要的镜像
      name: kubia               # 容器的名称
      ports:
        - containerPort: 8080   # 应用监听的端口号
          protocol: TCP         # 应用监听的协议
```

```shell
# 查看 label 标签
kubectl get pods --show-labels

# 查看 creation_mode、env 两个标签
kubectl get pods -L creation_mode,env

# 给 pod 添加 label -> version: v1
kubectl label pod kubia version=v1

# 给已有的 pod 修改标签
kubectl label pod kubia env=dev --overwrite

# 列出 env 标签有值的 pod
kubectl get pods -L env -l env

# 列出 env 标签值为 dev 的 pod
kubectl get pods -L env -l env=dev

# 列出符合多个 label 标签条件的 pod
kubectl get pods -L env -l env=dev,creation_mode=manual

# 列出不包含 env 标签的 pod
kubectl get pods -L env -l '!env'

# 列出 env 标签值不为 dev 的 pod（包含不存在 env 标签的值）
kubectl get pods -L env -l 'env!=dev'

# 列出 env 值 in (prod,dev) 的数据
kubectl get pods -L env -l 'env in (prod,dev)'

# 列出 env 值 not in (prod,dev) 的数据
kubectl get pods -L env -l 'env not in (prod,dev)'

# 删除指定标签的 pod
kubectl delete pod -l env=dev
```

### 基于 Label 的 Pod 调度

```shell
# 给 node 添加 label -> gpu=true
kubectl label node k8s-node1 gpu=true

# 查看 gpu=true 的 node
kubectl get node -L gpu -l gpu=true
```

```yaml
apiVersion: v1        # 描述遵循 V1 版本的 API
kind: Pod             # 描述一个 pod
metadata:             # 用于描述名称、命名空间、标签等其他容器信息
  name: kubia-gpu     # pod 的名称
  labels:
    creation_mode: manual
    env: prod
spec:                 # pod 内容的实际说明，pod 的容器、卷和其他数据
  nodeSelector:
    gpu: "true"       # 只将 pod 部署到 gpu=true 的 node 上
  containers:
    - image: xiaokexiang/kubia  # 创建容器需要的镜像
      name: kubia               # 容器的名称
      ports:
        - containerPort: 8080   # 应用监听的端口号
          protocol: TCP         # 应用监听的协议
```

## 注解

相比 label 而言，annotation 不是为了保存标识信息而存在的，不能像 label 一样进行分组。主要是为了给 API 或 Pod 添加说明，且可以容纳更多的信息。

```shell
# 给 pod 添加注解
kubectl annotate pod kubia test/annotation="hello world"

# 查看 pod 的注解
kubectl describe pod kubia
```
