---
sort: 36
---
# Deployment
::: warning 概念
- 用于部署应用程序并以`声明的方式`升级应用。当创建一个Deployment时，ReplicaSet也会随之创建，实际的Pod是由ReplicaSet创建和管理的。
- Deployment可以用于协调多个ReplicaSet来管理Pod，实现Pod的升级、扩容等功能。
:::
### 操作命令

| 方法                 | 作用                                                         |
| -------------------- | ------------------------------------------------------------ |
| **kubectl edit**     | 使用默认编辑器打开资源配置。`kubectl edit deployment kubia`  |
| **kubectl patch**    | 修改单个属性。`kubectl patch deployment Kubia -p '{"spec": {"minReadySeconds": 10}}'` |
| **kubectl apply**    | 通过完整的yaml或json文件修改对象。`kubectl apply -f kubia.yaml` |
| **kubectl replace**  | 替换原有yaml或json创建的对象。`kubectl replace -f kubia.yaml` |
| **kubectl set image** | 修改pod、rc、rs、deploymeny、ds、job内的镜像。`kubectl set image deployment kubia nodejs=luksa:v2` |

### 创建

```yaml
# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubia-deployment-v1
  labels:
    app: kubia
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kubia
  template:
    metadata:
      labels:
        app: kubia
    spec:
      containers:
      - name: nodejs
        image: luksa/kubia:v1
---
# service
apiVersion: v1
kind: Service
metadata:
  name: kubia
spec:
  sessionAffinity: ClientIP # 默认None
  type: LoadBalancer
  ports:
  - port: 80 # 服务可用端口
    targetPort: 8080 # 服务转发到容器的端口
  selector:
    app: kubia # app=kubia的pod都属于该服务
```

> `kubectl apply -f kubia-deployment-v1.yaml --record` 
>
> Deployment会负责创建一个ReplicaSet管理Pods，`--record`用于记录历史版本号。
>
> `kubectl rollout status deployment kubia-deployment-v1`查看升级状态。

### 升级

默认情况下是执行`滚动升级（RollingUpdate）`策略。还有`删除再创建（Recreate）`策略，一次删除全部旧的Pod再创建新的Pod。需要注意的是，只有我们`修改了Pod模板`才会导致Deployment的更新。

```shell
# 减缓滚动升级速度,patch命令修改Deployment的自有属性，不会触发Pod的任何更新
kubectl patch deployment kubia-deployment-v1 -p '{"spec": {"minReadySeconds": 10}}'
# 更新镜像为luksa:v2
kubectl set image deployment kubia-deployment-v1 nodejs=luksa/kubia:v2
# 循环请求服务（开窗口并行）
while true; do curl 10.110.71.58; sleep 2; done
```
> 执行滚动升级后，新的容器启动后会依次关闭旧的容器。
> ::: details 升级
> ![](https://fno.leejay.top:9000/images/2025/01/21/7a9af050-e033-4b45-866a-719d084955b3.png)
> :::
> ::: details 请求变化
> 另一边我们可以看到请求的响应由V1变为了V2。![](https://fno.leejay.top:9000/images/2025/01/21/c1a03dcb-fbf6-44ea-b2e6-f10d3c590ff6.png)
> :::

### 回滚

```shell
# 升级到v3版本用于后面回滚
kubectl set image deployment kubia-deployment-v1 nodejs=luksa/kubia:v3
# 回滚当前版本到上一个版本
kubectl rollout undo deployment kubia-deployment-v1
# 查看滚动升级历史
kubectl rollout history deployment kubia-deployment-v1
# 回滚到指定版本（history可以看到）
kubectl rollout undo deployment kubia-deployment-v1 --to-revision=1
# 暂停升级
kubectl rollout pause deployment kubia-deployment-v1
# 恢复升级
kubectl rollout resume deployment kubia-deployment-v1
```
> ::: details 回滚
> 如果在升级过程中运行回滚，那么会直接停止滚动升级。已创建的Pod会被老Pod替代。
> ![](https://fno.leejay.top:9000/images/2025/01/21/9f499cd6-3cd8-4cbc-a041-390388970171.png)
> :::
> 

#### 升级策略

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubia-deployment-v1
  labels:
    app: kubia
spec:
  minReadySeconds: 10  # Pod需要至少运行10s后才能视为可用（探针）
  strategy:
    rollingUpdate:
      maxSurge: 1 # 基于期望的副本数上Pod最多允许超过的数量（3+1）
      maxUnavailable: 0 # 最多不可以Pod数量
    type: RollingUpdate # 滚动升级
  replicas: 3
  selector:
    matchLabels:
      app: kubia
  template:
    metadata:
      labels:
        app: kubia
    spec:
      containers:
      - name: nodejs
        image: luksa/kubia:v1
```
::: danger 更新策略
![](https://fno.leejay.top:9000/images/2025/01/21/7fc2b8a7-b819-433c-8d9f-5b6e71d91e77.png)
- Recreate: 创建新的pod，等待成功运行后，再删除旧的pod（`需要更多的硬件资源`）。
- RollingUpdate: 创建新的pod，等待成功运行后，按照创建顺序删除旧的pod（又称为`滚动升级`）。
:::


#### 配置就绪探针

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubia-deployment-v1
  labels:
    app: kubia
spec:
  minReadySeconds: 10  # Pod需要至少运行10s后才能视为可用（用于就绪探针工作）
  progressDeadlineSeconds: 300 # 设置滚动升级超过5分钟就失败
  strategy:
    rollingUpdate:
      maxSurge: 1 # 基于期望的副本数上Pod最多允许超过的数量（3+1）
      maxUnavailable: 0 # 最多不可以Pod数量
    type: RollingUpdate # 滚动升级
  replicas: 3
  selector:
    matchLabels:
      app: kubia
  template:
    metadata:
      labels:
        app: kubia
    spec:
      containers:
      - name: nodejs
        image: luksa/kubia:v1
        readinessProbe: # 定义就绪探针每隔1s执行依次
          periodSeconds: 1
          httpGet:
            path: /  # 发送http get请求
            port: 8080
```

> 当Deployment进行Pod升级的时候，就绪探针每隔1s会发起一次请求，请求失败后被标记为`未就绪`。![](https://fno.leejay.top:9000/images/2025/01/21/b96ca7b6-67ee-4de2-adf8-43dd27879f42.png)
>
> Pod成功的有3个，没有ready的就是就绪探针探测不可用的Pod（升级失败）。
>
> 默认`10分钟`内不能完成滚动升级，就会视为失败。![](https://fno.leejay.top:9000/images/2025/01/21/07a86c99-9264-4649-be6c-3955c68f749d.png)

### 参数解析
| 参数                              | 含义                                                         | 默认值        |
| --------------------------------- | ------------------------------------------------------------ | ------------- |
| .spec.revisionHistoryLimit        | 指定保留此 Deployment 的多少个旧的ReplicaSet，设置为0则无法进行回滚 | 10            |
| .spec.template.spec.restartPolicy | 容器的重启策略（适用pod下的所有容器），在Deployment中只能为`Always` | Always        |
| .spec.strategy                    | 用新 Pods 替换旧 Pods 的策略：<br />1. Recreate（创建新的Pods前会杀死现有的pods）<br />2. RollingUpdate（滚动更新的方式更新Pods）<br />maxUnavailable：更新过程中不可用pod的个数上限，maxSurge：新旧pod总数量上限 | RollingUpdate |
| .spec.progressDeadlineSeconds     | Deployment失败后等待取得进展的秒数。                         | 无            |
| .spec.minReadySeconds             | 指定新创建的 Pod 在没有任意容器崩溃情况下的最小就绪（配合探针）时间 | 0             |
| .spec.paused                      | 用于暂停和恢复 Deployment 的字段（true/false）               | 无            |