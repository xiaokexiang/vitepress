---
sort: 21
---
# ReplicaSet
:::warning 概念
- 一种用于维护一组 Pod 副本的控制器。它确保指定数量的 Pod 始终在集群中运行，并在需要时进行自动扩展或缩减。
- 相比ReplicationController可以匹配多个标签（env=dev，app=kubia），可以使用通配符进行匹配（env=*）
:::

### 创建

```yaml
apiVersion: apps/v1 # 属于的版本号
kind: ReplicaSet
metadata:
  name: kubia-replicaset
spec:
  replicas: 3
  selector:
    matchLabels: # 基于matchLabels选择器
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

> 如果节点上已经存在三个`app=kubia`的Pod，那么创建ReplicaSet后会将这个三个Pod纳入管理。

### 查看

```  shell
# 创建replicaSet
kubectl apply -f kubia-replicaset.yaml
# 默认情况下如果存在label标签相同的pod会被加入rs的管理
kubectl get pods
# 查看rs
kubectl get rs
# 查看指定rs详情
kubectl describe rs kubia-replicaset
# 删除rs但不删除pod
kubectl delete rs kubia-replicaset --cascade=false
```

### 标签选择器

```yaml
apiVersion: apps/v1 # 属于的版本号
kind: ReplicaSet
metadata:
  name: kubia-replicaset
spec:
  replicas: 3
  selector:
    matchExpressions: # 基于matchLabels选择器
      - key: app
        operator: In # 除了In，还有NotIn、Exists、DoesNotExist
        values:
          - kubia
```