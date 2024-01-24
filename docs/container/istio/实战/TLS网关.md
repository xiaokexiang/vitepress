---
sort: 40
---
# TLS网关

## 准备

### 配置TLS版本

:::tip

istio支持的最高版本为`1.3`

:::

```bash
$ istioctl install -f - <<EOF
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    meshMTLS:
      minProtocolVersion: TLSV1_3
EOF
```

### 生成域名证书

:::code-group

```bash[example.com]
# 生成根证书example.com和私钥
$ mkdir example_certs1
$ openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -subj '/O=example Inc./CN=example.com' -keyout example_certs1/example.com.key -out example_certs1/example.com.crt
```

```bash[httpbin.example.com]
# 生成证书httpbin.example.com和私钥
$ openssl req -out example_certs1/httpbin.example.com.csr -newkey rsa:2048 -nodes -keyout
example_certs1/httpbin.example.com.key -subj "/CN=httpbin.example.com/O=httpbin organization"
$ openssl x509 -req -sha256 -days 365 -CA example_certs1/example.com.crt -CAkey example_certs1/example.com.key -set_serial 0 -in example_certs1/httpbin.example.com.csr -out example_certs1/httpbin.example.com.crt
```

```bash[helloworld.example.com]
# 生成证书helloworld.example.com和私钥
$ openssl req -out example_certs1/helloworld.example.com.csr -newkey rsa:2048 -nodes -keyout example_certs1/helloworld.example.com.key -subj "/CN=helloworld.example.com/O=helloworld organization"
$ openssl x509 -req -sha256 -days 365 -CA example_certs1/example.com.crt -CAkey example_certs1/example.com.key -set_serial 1 -in example_certs1/helloworld.example.com.csr -out example_certs1/helloworld.example.com.crt
```

```bash[client.example.com]
# 生成客户端client.example.com证书和私钥
$ openssl req -out example_certs1/client.example.com.csr -newkey rsa:2048 -nodes -keyout example_certs1/client.example.com.key -subj "/CN=client.example.com/O=client organization"
$ openssl x509 -req -sha256 -days 365 -CA example_certs1/example.com.crt -CAkey example_certs1/example.com.key -set_serial 1 -in example_certs1/client.example.com.csr -out example_certs1/client.example.com.crt
```

:::

###  部署服务

:::code-group

```bash[httpbin]
$ kubectl -n test apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: httpbin
  labels:
    app: httpbin
spec:
  ports:
    - name: http
      port: 80
      targetPort: 8080
  selector:
    app: httpbin
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpbin
      version: v1
  template:
    metadata:
      labels:
        app: httpbin
        version: v1
    spec:
      containers:
        - image: docker.io/kong/httpbin
          imagePullPolicy: IfNotPresent
          name: httpbin
          command:
            - gunicorn
            - -b
            - 0.0.0.0:8080
            - httpbin:app
            - -k
            - gevent
          env:
            - name: WORKON_HOME
              value: /tmp
          ports:
            - containerPort: 8080
EOF
```

```bash[helloworld]
$ kubectl -n test apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: helloworld
  labels:
    app: helloworld
    service: helloworld
spec:
  ports:
    - port: 5000
      name: http
  selector:
    app: helloworld
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helloworld-v1
  labels:
    app: helloworld
    version: v1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: helloworld
      version: v1
  template:
    metadata:
      labels:
        app: helloworld
        version: v1
    spec:
      containers:
        - name: helloworld
          image: docker.io/istio/examples-helloworld-v1
          resources:
            requests:
              cpu: "100m"
          imagePullPolicy: IfNotPresent #Always
          ports:
            - containerPort: 5000
EOF
```

:::

> - [httpbin](https://httpbin.org/)是内嵌多个接口，用来测试HTTP请求和调试的服务。
> - `helloworld`用来返回当前处理的pod名称和版本号。

##  多主机网关

::: warning

在集群中使用一个网关服务，根据`主机名或域名`为多个不同的主机提供服务。其本质是通过`SNI`扩展来实现的。

> SNI（Server Name Indication）是一种在TLS和SSL协议中的扩展，用于在`单个IP地址上支持多个域名的加密通信`。在没有SNI的情况下，一个IP地址只能关联一个SSL/TLS证书，因此只能支持一个域名。有了SNI，服务器可以根据客户端请求的域名`动态`选择相应的证书进行通信。

:::

###  生成TLS凭证

通过创建TLS类型的Secret方式来将证书绑定到Gateway类型的网关。需要额外注意Secret的`命名空间`。

:::code-group

```bash[httpbin.example.com]
$ kubectl create -n istio-system secret tls httpbin-secret \
  --key=example_certs1/httpbin.example.com.key \
  --cert=example_certs1/httpbin.example.com.crt
```

```bash[helloworld.example.com]
$ kubectl create -n istio-system secret tls helloworld-secret \
  --key=example_certs1/helloworld.example.com.key \
  --cert=example_certs1/helloworld.example.com.crt
```

:::

###  部署网关和虚拟服务

:::code-group

```bash[Gateway]
$ kubectl -n test apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: sni-gateway
spec:
  selector:
    istio: ingressgateway # 绑定istio的ingressgateway
  servers:
    - port:
        number: 443
        name: https-httpbin
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: httpbin-secret # 绑定tls证书
      hosts:
        - "httpbin.example.com"
    - port:
        number: 443
        name: https-helloworld
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: helloworld-secret # 绑定tls证书
      hosts:
        - "helloworld.example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "httpbin.example.com"
EOF
```

```bash[VirtualService]
$ kubectl -n test apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: httpbin
spec:
  hosts:
    - "httpbin.example.com" # 指定监听的域名，包含http和https
  gateways:
    - sni-gateway # 绑定gateway的名称
  http:
    - match:
        - uri:
            prefix: / # 匹配/开头所有路径
      route:
        - destination:
            port:
              number: 80 # 对应svc端口
            host: httpbin
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: helloworld
spec:
  hosts:
    - "helloworld.example.com"
  gateways:
    - sni-gateway
  http:
    - match:
        - uri:
            exact: /hello # 只匹配/hello,其他路径不匹配
      route:
        - destination:
            port:
              number: 5000 # 对应svc的端口
            host: helloworld
EOF
```

:::

> - TLS证书默认在`istio-system`命令空间下寻找（改成其他ns即使用`ns/secret-name`仍会出现无法访问的情况，暂未找到原因）。
>
> - gateway和virtualService通过hosts和gateways字段绑定。gateway中支持不同的域名监听相同的端口，但需定义不同的name用于区分。
>
> - 不同的域名，最好由不同的`virtualService`分开管理，若不同文件出现相同域名时，按照`文件名字母排序`合并规则，前面的会被覆盖。

###  测试

分别测试下属域名能够访问

:::code-group

```bash[http://httpbin.example.com]
$ curl --resolve "httpbin.example.com:$INGRESS_PORT:$INGRESS_HOST" "http://httpbin.example.com:$INGRESS_PORT/status/418"
```

```bash[https://httpbin.example.com]
$ curl --resolve "httpbin.example.com:$SECURE_INGRESS_PORT:$INGRESS_HOST" --cacert example_certs1/example.com.crt "https://httpbin.example.com:$SECURE_INGRESS_PORT/status/418"
```

```bash[https://helloworld.example.com]
$ curl --resolve "helloworld.example.com:$SECURE_INGRESS_PORT:$INGRESS_HOST" --cacert example_certs1/example.com.crt  "https://helloworld.example.com:$SECURE_INGRESS_PORT/hello"
```

:::

:::tip

--resolve用于执行DNS解析，避免修改/etc/hosts

--cacert用于https访问时指定CA证书的地址用于验证，可以不指定，使用`-k`跳过证书验证。

:::

### 查看网关代理

```bash
$ kubectl -n istio-system get po -l istio=ingressgateway  | awk 'NR == 2{print $1}' | xargs istioctl proxy-config listener -n istio-system
```

显示结果如下

```bash{2-4}
ADDRESSES PORT  MATCH                       DESTINATION
0.0.0.0   8080  ALL                         Route: http.8080
0.0.0.0   8443  SNI: httpbin.example.com    Route: https.443.https-httpbin.sni-gateway.test
0.0.0.0   8443  SNI: helloworld.example.com Route: https.443.https-helloworld.sni-gateway.test
0.0.0.0   15021 ALL                         Inline Route: /healthz/ready*
0.0.0.0   15090 ALL                         Inline Route: /stats/prometheus*
```

> 明确的显示ingressgateway入口网关绑定的gateway资源分别指向哪些路由。

##  双向网关

:::tip

双向TLS，它在通信的两端都使用证书进行身份验证，确保通信的安全性。双向TLS也被称为`客户端身份验证`，因为在传统的单向TLS中，只有服务器需要提供证书进行身份验证，而客户端则不需要。[更多](https://help.aliyun.com/zh/api-gateway/user-guide/mutual-tls-authentication)

:::

### 生成TLS证书

```bash
$ kubectl create -n istio-system secret generic httpbin-mutual-secret \
  --from-file=tls.key=example_certs1/httpbin.example.com.key \
  --from-file=tls.crt=example_certs1/httpbin.example.com.crt \
  --from-file=ca.crt=example_certs1/example.com.crt
```

> 服务器使用CA证书来验证其客户端，我们必须使用名称`ca.crt`来指定CA证书。

###  部署网关和虚拟服务

:::code-group

```bash[Gateway]
$ kubectl -n test apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: manual-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: MUTUAL # 表示双向TLS
      credentialName: httpbin-mutual-secret
    hosts:
    - httpbin.example.com
EOF
```

```bash[VirtualService]
$ kubectl -n test apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: manual-httpbin
spec:
  hosts:
    - "httpbin.example.com"
  gateways:
    - manual-gateway
  http:
    - match:
        - uri:
            prefix: /
      route:
        - destination:
            port:
              number: 80
            host: httpbin
EOF
```

:::

###  测试

```bash
$ curl --resolve "httpbin.example.com:$SECURE_INGRESS_PORT:$INGRESS_HOST" \
--cacert example_certs1/example.com.crt \
--cert example_certs1/client.example.com.crt \
--key example_certs1/client.example.com.key \
"https://httpbin.example.com:$SECURE_INGRESS_PORT/status/418"
```

> 自签证书必须要指定client证书的位置。

##  透传网关

:::tip

通常用于`直接将TLS流量传递给后端服务`，而不在istio中进行解密。这种模式提供了一种`端到端`的加密传输方式，使istio不参与到TLS握手的解密和再加密过程中。

:::

###  生成证书凭证

```bash
$ kubectl -n test create configmap nginx-tls-config \
--from-file=tls.crt=example_certs1/httpbin.example.com.crt \
--from-file=tls.key=example_certs1/httpbin.example.com.key
```

###  部署服务

:::code-group

```bash[Deployment]
$ kubectl -n test apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx
          ports:
            - containerPort: 80
            - containerPort: 443
          volumeMounts:
            - name: nginx-tls
              mountPath: "/etc/nginx/certs"
              readOnly: true
            - name: nginx-config
              mountPath: "/etc/nginx/conf.d"
              readOnly: true
      volumes:
        - name: nginx-tls
          configMap:
            name: nginx-tls-config
        - name: nginx-config
          configMap:
            name: nginx-config
            items:
              - key: default.conf
                path: default.conf
EOF
```

```bash[Configmap]
$ kubectl -n test apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  default.conf: |
    server {
      listen 80;
      server_name httpbin.example.com;
  
      location / {
          root /usr/share/nginx/html;
          index index.html;
      }
    }
    server {
      listen 443 ssl;
      server_name httpbin.example.com;

      ssl_certificate /etc/nginx/certs/tls.crt;
      ssl_certificate_key /etc/nginx/certs/tls.key;
      location / {
          root /usr/share/nginx/html;
          index index.html;
      }
    }
EOF
```

```bash[Service]
$ kubectl -n test apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
    - protocol: TCP
      name: http
      port: 80
      targetPort: 80
    - protocol: TCP
      name: https
      port: 443
      targetPort: 443
  type: ClusterIP
EOF
```

:::

###  部署网关和虚拟服务

:::code-group

```bash[Gateway]
$ kubectl -n test apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: paasthrough-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https-httpbin
        protocol: TLS # 不是HTTPS
      tls:
        mode: PASSTHROUGH # tls类型为PASSTHROUGH
      hosts:
        - "httpbin.example.com"
    - port:
        number: 80
        name: http-httpbin
        protocol: HTTP
      hosts:
        - "httpbin.example.com"
EOF
```

```bash[VirtualService]
$ kubectl -n test apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: paasthrough-httpbin
spec:
  hosts:
    - "httpbin.example.com"
  gateways:
    - paasthrough-gateway
  tls: # 与protocol一致
    - match:
        - port: 443
          sniHosts:
            - "httpbin.example.com"
      route:
        - destination:
            host: nginx-service
            port:
              number: 443
  http:
    - match:
        - port: 80
      route:
        - destination:
            host: nginx-service
            port:
              number: 80
EOF
```

:::

###  测试

:::code-group

```bash[http://httpbin.example.com]
$ curl --resolve "httpbin.example.com:$INGRESS_PORT:$INGRESS_HOST" "http://httpbin.example.com:$INGRESS_PORT"
```

```bash[https://httpbin.example.com]
$ curl --resolve "httpbin.example.com:$SECURE_INGRESS_PORT:$INGRESS_HOST" --cacert example_certs1/example.com.crt "https://httpbin.example.com:$SECURE_INGRESS_PORT"
```

:::



---
