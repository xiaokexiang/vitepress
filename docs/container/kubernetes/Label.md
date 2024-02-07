---
sort: 16
---
# 标签（label）和注解（annotation）
## 标签
```yaml
apiVersion: v1 # 描述遵循V1版本的Api
kind: Pod # 描述一个pod
metadata: # 用于描述名称、命令空间、标签等其他容器信息
   name: kubia  # pod的名称
   labels: # 创建多个label
   	 creation_mode: manual
   	 env: prod
spec: # pod内容的实际说明，pod的容器、卷和其他数据
  containers:
  - image: xiaokexiang/kubia # 创建容器需要的镜像
    name: kubia # 容器的名称
    ports:
    - containerPort: 8080 # 应用监听的端口号
      protocol: TCP # 应用监听的协议
```

```shell
# 查看label标签
kubectl get pods --show-labels
# 查看creation_mode,env两个标签页
kubectl get pods -L creation_mode,env
# 给pod添加label标签 -> version: v1
kubectl label pod kubia version=v1
# 给已有的pod修改标签
kubectl label pod kubia env=dev --overwrite
# 列出env标签有值的pod
kubectl get pods -L env -l env
# 列出env标签值为dev的pod
kubectl get pods -L env -l env=dev
# 列出符合多个label标签条件的pod
kubectl get pods -L env -l env=dev,creation_mode=manual
# 列出不包含env标签的pod
kubectl get pods -L env -l '!env'
# 列出env标签值不为dev的pod(包含不存在env标签的值)
kubectl get pods -L env -l 'env!=dev'
# 列出env值 in (prod,env)的数据
kubectl get pods -L env -l 'env in (prod,dev)'
# 列出env值 not in (prod,env)的数据
kubectl get pods -L env -l 'env not in (prod,dev)'
# 删除指定标签的pod
kubectl delete pod -l env=dev
```

### 基于label的Pod调度

  ```shell
  # 给node添加label -> gpu=true
  kubectl label node k8s-node1 gpu=true
  # 查看gpu=true的node
  kubectl get node -L gpu -l gpu=true
  ```

  ```yaml
  apiVersion: v1 # 描述遵循V1版本的Api
  kind: Pod # 描述一个pod
  metadata: # 用于描述名称、命令空间、标签等其他容器信息
     name: kubia-gpu  # pod的名称
     labels:
        creation_mode: manual
        env: prod
  spec: # pod内容的实际说明，pod的容器、卷和其他数据
    nodeSelector:
      gpu: "true"  # 只将pod部署到gpu=true的pod上
    containers:
    - image: xiaokexiang/kubia # 创建容器需要的镜像
      name: kubia # 容器的名称
      ports:
      - containerPort: 8080 # 应用监听的端口号
        protocol: TCP # 应用监听的协议
  ```

## 注解

相比label而言，annotation不是为了保存标识信息而存在的，不能像label一样进行分组。主要是为了给api或者pod添加说明，且可以容纳更多的信息。

```shell
# 给pod添加注解
kubectl annotate pod kubia test/annotation="hello world"
# 查看pod的注解
kubectl describe pod kubia
```
