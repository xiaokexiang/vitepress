---
sort: 26
---
# Ingress
::: warning 为什么需要Ingress
相比每个LoadBalancer服务都需要自己的负载均衡器以及独有的公网IP地址。Ingress只需要一个公网IP就能够为许多服务提供访问，Ingress会根据客户端的请求的主机名和路径转发到对应的服务。
创建一个Ingress资源，可以通过一个IP地址公开多个服务。
![](https://fn.leejay.top:9000/images/2025/01/21/0fae77ec-b91c-4860-af8a-44d57bdf0c20.png)
:::

### 安装ingress控制器

执行下述命令，等待ingress控制器安装，如下图所示即为成功。
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
```

![ingress-controller](https://fn.leejay.top:9000/images/2025/01/21/9eb28781-530f-4862-89a5-66a95369a894.png)

### 创建ingress服务

在部署ingress服务之前，我们需要先部署service服务，设置type为`ClusterIP`，确保通过ServiceIP + Port能够正常访问Pod。

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  labels:
    app.kubernetes.io/component: controller
  name: nginx-example
  annotations:
    ingressclass.kubernetes.io/is-default-class: "true" # 未指定ingressClassName字段的Ingress默认分配这个IngressClass.
spec:
  controller: k8s.io/ingress-nginx
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-ingress
  namespace: helloworld
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2 # 用于替换(.*) http://www.helloworld.com:31166/nginx -> nginx-service:8088/ 用于重写请求
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, PUT, POST, DELETE, PATCH, OPTIONS" # 跨域相关
    nginx.ingress.kubernetes.io/default-backend: nginx-service # 指定默认后端
    nginx.ingress.kubernetes.io/limit-rps: "1" # 限制一个ip每秒一次请求，超出返回503
    nginx.ingress.kubernetes.io/server-snippet: | # 根据agent判断，若是手机端访问重定向到百度
        set $agentflag 0;

        if ($http_user_agent ~* "(Mobile)" ){
          set $agentflag 1;
        }

        if ( $agentflag = 1 ) {
          return 301 https://baidu.com;
        }

spec:
  ingressClassName: nginx-example # 对 IngressClass 资源的引用。 IngressClass 资源包含额外的配置，其中包括应当实现该类的控制器名称。
  rules:
  - host: www.helloworld.com # 域名
    http:
      paths:
      - path: "/nginx(/|$)(.*)" # 路由匹配
        pathType: Prefix
        backend:
          service:
            name: nginx-service # service名称
            port:
              number: 8088 # service port
```

> 点击查看[annotations](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations)文档

![ingress2](https://fn.leejay.top:9000/images/2025/01/21/74cc80c3-f0b1-4f30-b6c5-3d91f6fa1661.png)

执行`kubectl -n helloworld describe ingress nginx-ingress`查看ingress具体信息

![ingress3](https://fn.leejay.top:9000/images/2025/01/21/60446016-67d6-4731-a672-2e8113213374.png)

最后我们需要在本地电脑配置hosts: #{IP} www.helloworld.com，然后访问`www.helloworld.com:#{ingress-nginx-controller-svc-port}/nginx/`来测试ingress是否生效。

## 配置TLS认证

```shell
# 生成证书
openssl genrsa -out tls.key 2048
openssl req -new -x509 -key tls.key -out tls.cert -days 360 -subj /CN=kubia.example.com
# 生成secret
kubectl create secret tls tls-secret --cert=tls.cert --key=tls.key
```

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
        name: kubia
        namespace: ingress-nginx
spec: 
        tls: # 配置证书
        - hosts:
          - kubia.example.com
          secretName: tls-secret
        rules:
        - host: kubia.example.com
          http:
                paths:
                - path: /
                  backend: 
                        serviceName: kubia
                        servicePort: 80
```
