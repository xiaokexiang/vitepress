---
sort: 65
---
# REST API
### 基于proxy访问

```shell
# 查看集群信息
kubectl cluster-info
# 开启代理
kubectl proxy
> Starting to serve on 127.0.0.1:8001

# 查看Kubernetes API
curl localhost:8001
# 在拥有svc服务的pod上访问
curl https://kubernetes -k
# 将CA证书写入环境变量
export CURL_CA_BUNDLE=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
# 为API服务器授权
# 1. 将token作为环境变量
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
# 2. curl访问
curl -H "Authorization: Bearer $TOKEN" https://kubernetes
```
#### 简化交互
```yaml
# 基于ambassador容器简化与API服务器的交互
apiVersion: v1
kind: Pod
metadata:
  name: curl-with-ambassador
spec:
  containers:
  - name: main
    image: tutum/curl
    command: ["sleep", "9999999"]
  - name: ambassador
    image: luksa/kubectl-proxy:1.6.2
```

### 基于token访问

:::details 生成token
```shell
#!/bin/bash
kubectl create sa management-admin -n kube-system 2>/dev/null
kubectl create clusterrolebinding management-admin --clusterrole=cluster-admin --serviceaccount=kube-system:management-admin 2>/dev/null
key=$(kubectl get sa management-admin -o=custom-columns=:.secrets[0].name -n kube-system | grep 'management')
token=$(kubectl -n kube-system get secret ${key} -o yaml | grep token: | awk '{print $2}' | base64 -d)
echo $token
```
:::

#### 访问集群

```bash
curl -XGET -k https://{cluster_ip}:6443/api -H 'Authorization: Bearer ${TOKEN}'
```

```json
{
    "kind": "APIVersions",
    "versions": [
        "v1"
    ],
    "serverAddressByClientCIDRs": [
        {
            "clientCIDR": "0.0.0.0/0",
            "serverAddress": "10.50.18.27:6443"
        }
    ]
}
```

### <a href="https://kubernetes.io/zh-cn/docs/reference/kubernetes-api/workload-resources/pod-v1/">api参考</a>


