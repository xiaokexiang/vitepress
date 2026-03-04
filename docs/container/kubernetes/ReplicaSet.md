---
sort: 21
---

# ReplicaSet

::: warning 概念

- 一种用于维护一组 Pod 副本的控制器。它确保指定数量的 Pod 始终在集群中运行，并在需要时进行自动扩展或缩减
- 相比 ReplicationController 可以匹配多个标签（`env=dev`，`app=kubia`），可以使用通配符进行匹配（`env=*`）

:::

## 创建

```yaml
apiVersion: apps/v1  # 属于的版本号
kind: ReplicaSet
metadata:
  name: kubia-replicaset
spec:
  replicas: 3
  selector:
    matchLabels:     # 基于 matchLabels 选择器
      app: kubia
  template:
    metadata:
      labels:
        app: kubia
    spec:
      containers:
        - name: kubia
          image: xiaokexiang/kubia
          ports:
            - containerPort: 8080
```

> 如果节点上已经存在三个 `app=kubia` 的 Pod，那么创建 ReplicaSet 后会将这三个 Pod 纳入管理

## 查看

```shell
# 创建 replicaSet
kubectl apply -f kubia-replicaset.yaml

# 默认情况下如果存在 label 标签相同的 pod 会被加入 rs 的管理
kubectl get pods

# 查看 rs
kubectl get rs

# 查看指定 rs 详情
kubectl describe rs kubia-replicaset

# 删除 rs 但不删除 pod
kubectl delete rs kubia-replicaset --cascade=false
```

## 标签选择器

```yaml
apiVersion: apps/v1  # 属于的版本号
kind: ReplicaSet
metadata:
  name: kubia-replicaset
spec:
  replicas: 3
  selector:
    matchExpressions:  # 基于 matchExpressions 选择器
      - key: app
        operator: In   # 除了 In，还有 NotIn、Exists、DoesNotExist
        values:
          - kubia
```
