---
sort: 40
---
# TLS网关

##  TLS多主机网关

###  TLS配置

```bash
$ cat <<EOF > ./istio.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    meshMTLS:
      minProtocolVersion: TLSV1_3
EOF
$ istioctl install -f ./istio.yaml
```

> 上述步骤会配置最低版本的tls为tls1.3，且istioctl会重新安装profile=default的组件，即ingress-gateway和istiod

###  基于NodePort访问

```bash
# 因为没有外部LoadBalancer，直接使用NodePort访问
# 因为使用Kind，我预先只暴露了30000-30020区间的端口，所以这里需要手动指定下NodePort端口用于集群外部访问（非必要）
$ kubectl -n istio-system patch svc istio-ingressgateway --type='json' -p='[
  {"op":"replace","path":"/spec/ports/1/nodePort","value":30000},
  {"op":"replace","path":"/spec/ports/2/nodePort","value":30003}
]'
# 指定环境变量
$ export INGRESS_NAME=istio-ingressgateway
$ export INGRESS_NS=istio-system
$ export INGRESS_PORT=$(kubectl -n "${INGRESS_NS}" get service "${INGRESS_NAME}" -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
$ export SECURE_INGRESS_PORT=$(kubectl -n "${INGRESS_NS}" get service "${INGRESS_NAME}" -o jsonpath='{.spec.ports[?(@.name=="https")].nodePort}')
$ export TCP_INGRESS_PORT=$(kubectl -n "${INGRESS_NS}" get service "${INGRESS_NAME}" -o jsonpath='{.spec.ports[?(@.name=="tcp")].nodePort}')
$ export INGRESS_HOST=$(kubectl get po -l istio=ingressgateway -n "${INGRESS_NS}" -o jsonpath='{.items[0].status.hostIP}')
```

> 因为Kind是基于docker部署的，所以这里的INGRESS_HOST会输出docker ip，如果集群外部访问，也可以使用节点ip。

###  生成域名证书

```bash
# 生成根证书example.com和私钥
$ mkdir example_certs1
$ openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -subj '/O=example Inc./CN=example.com' -keyout example_certs1/example.com.key -out example_certs1/example.com.crt

# 生成证书httpbin.example.com和私钥
$ openssl req -out example_certs1/httpbin.example.com.csr -newkey rsa:2048 -nodes -keyout
$ example_certs1/httpbin.example.com.key -subj "/CN=httpbin.example.com/O=httpbin organization"
openssl x509 -req -sha256 -days 365 -CA example_certs1/example.com.crt -CAkey example_certs1/example.com.key -set_serial 0 -in example_certs1/httpbin.example.com.csr -out example_certs1/httpbin.example.com.crt

# 生成证书helloworld.example.com和私钥
$ openssl req -out example_certs1/helloworld.example.com.csr -newkey rsa:2048 -nodes -keyout $ example_certs1/helloworld.example.com.key -subj "/CN=helloworld.example.com/O=helloworld organization"
openssl x509 -req -sha256 -days 365 -CA example_certs1/example.com.crt -CAkey example_certs1/example.com.key -set_serial 1 -in example_certs1/helloworld.example.com.csr -out example_certs1/helloworld.example.com.crt

# 生成客户端client.example.com证书和私钥
$ openssl req -out example_certs1/client.example.com.csr -newkey rsa:2048 -nodes -keyout example_certs1/client.example.com.key -subj "/CN=client.example.com/O=client organization"
$ openssl x509 -req -sha256 -days 365 -CA example_certs1/example.com.crt -CAkey example_certs1/example.com.key -set_serial 1 -in example_certs1/client.example.com.csr -out example_certs1/client.example.com.crt
```

###  生成TLS凭证

```bash
# 供httpbin.example.com使用
$ kubectl create -n istio-system secret tls httpbin-secret \
  --key=example_certs1/httpbin.example.com.key \
  --cert=example_certs1/httpbin.example.com.crt
# 供helloworld.example.com使用
$ kubectl create -n istio-system secret tls helloworld-secret \
  --key=example_certs1/helloworld.example.com.key \
  --cert=example_certs1/helloworld.example.com.crt
```

> gateway的TLS证书可以通过Secret的方式绑定，这里通过命令生成在istio-system命名空间下TLS类型的Secret。

###  配置服务和Service

```bash
# 创建基于httpbin和helloworld的deploy&svc
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
---
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

> - [httpbin](https://httpbin.org/)是内嵌多个接口，用来测试HTTP请求和调试的服务。
> - `helloworld`用来返回当前处理的pod名称和版本号。

###  配置网关和虚拟服务

```bash
$ kubectl -n test apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: custom-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE 
        credentialName: httpbin-secret
      hosts:
        - "httpbin.example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "httpbin.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: custom-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https-httpbin
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: httpbin-secret
      hosts:
        - "httpbin.example.com"
    - port:
        number: 443
        name: https-helloworld
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: helloworld-secret
      hosts:
        - "helloworld.example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "httpbin.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: httpbin
spec:
  hosts:
    - "httpbin.example.com"
  gateways:
    - custom-gateway
  http:
    - match:
        - uri:
            prefix: /status
        - uri:
            prefix: /delay
        - uri:
            prefix: /ip
      route:
        - destination:
            port:
              number: 80
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
    - custom-gateway
  http:
    - match:
        - uri:
            exact: /hello
      route:
        - destination:
            port:
              number: 5000
            host: helloworld
EOF
```

> - TLS证书默认在`istio-system`命令空间下寻找（改成其他ns即使使用`ns/secret-name`仍会出现无法访问的情况，暂未找到原因）。
>
> - gateway和virtualService通过hosts和gateways字段绑定。
> - gateway中支持不同的域名监听相同的端口，但需定义不同的name用于区分。
> - 不同的域名，最好由不同的`virtualService`分开管理，若不同文件出现相同域名时，按照`文件名字母排序`合并规则，前面的会被覆盖。

###  测试

```bash
# 基于http访问网关
$ curl --resolve "httpbin.example.com:$INGRESS_PORT:$INGRESS_HOST" "http://httpbin.example.com:$INGRESS_PORT/status/418"
# 基于https访问网关
$ curl --resolve "httpbin.example.com:$SECURE_INGRESS_PORT:$INGRESS_HOST" --cacert example_certs1/example.com.crt "https://httpbin.example.com:$SECURE_INGRESS_PORT/status/418"
# 基于https访问helloworld.example.com
$ curl --resolve "helloworld.example.com:$SECURE_INGRESS_PORT:$INGRESS_HOST" "http://helloworld.example.com:$SECURE_INGRESS_PORT/hello"
# 返回如下即为成功
    -=[ teapot ]=-

       _...._
     .'  _ _ `.
    | ."` ^ `". _,
    \_;`"---"`|//
      |       ;/
      \_     _/
```

> 1. --resolve用于执行DNS解析，避免修改/etc/hosts
> 2. --cacert用于https访问时指定CA证书的地址用于验证，可以不指定，使用`-k`跳过证书验证。
> 2. 通过`kubectl -n istio-system get po -l istio=ingressgateway  | awk 'NR == 2{print $1}' | xargs istioctl proxy-config listener -n istio-system`查看当前Envoy的代理情况
>
> ```bash
> ADDRESSES PORT  MATCH                    DESTINATION
> 0.0.0.0   8080  ALL                      Route: http.8080
> 0.0.0.0   8443  SNI: httpbin.example.com Cluster: outbound|443||nginx-service.test.svc.cluster.local
> 0.0.0.0   15021 ALL                      Inline Route: /healthz/ready*
> 0.0.0.0   15090 ALL                      Inline Route: /stats/prometheus*
> ```
>
> SNI（Server Name Indication）是一种在TLS和SSL协议中的扩展，用于在`单个IP地址上支持多个域名的加密通信`。在没有SNI的情况下，一个IP地址只能关联一个SSL/TLS证书，因此只能支持一个域名。有了SNI，服务器可以根据客户端请求的域名动态选择相应的证书进行通信。

##  TLS双向网关

> 双向TLS，它在通信的两端都使用证书进行身份验证，确保通信的安全性。双向TLS也被称为`客户端身份验证`，因为在传统的单向TLS中，只有服务器需要提供证书进行身份验证，而客户端则不需要。[> 详情点击](https://help.aliyun.com/zh/api-gateway/user-guide/mutual-tls-authentication)

```bash
# 生成证书Secret
$ kubectl create -n istio-system secret generic httpbin-mutual-secret \
  --from-file=tls.key=example_certs1/httpbin.example.com.key \
  --from-file=tls.crt=example_certs1/httpbin.example.com.crt \
  --from-file=ca.crt=example_certs1/example.com.crt
```

> 服务器使用CA证书来验证其客户端，我们必须使用名称`ca.crt`来持有 CA 证书。

###  配置网关和虚拟服务

```bash
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
---
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
            prefix: /status
        - uri:
            prefix: /delay
        - uri:
            prefix: /ip
      route:
        - destination:
            port:
              number: 80
            host: httpbin
EOF
```

###  测试

```bash
$ curl --resolve "httpbin.example.com:$SECURE_INGRESS_PORT:$INGRESS_HOST" \
--cacert example_certs1/example.com.crt \
--cert example_certs1/client.example.com.crt \
--key example_certs1/client.example.com.key \
"https://httpbin.example.com:$SECURE_INGRESS_PORT/status/418"
```

> 自签证书必须要指定client证书的位置。

##  TLS透传网关

> 通常用于`直接将TLS流量传递给后端服务`，而不在istio中进行解密。这种模式提供了一种`端到端`的加密传输方式，使istio不参与到TLS握手的解密和再加密过程中。

###  生成证书凭证

```bash
$ kubectl -n test create configmap nginx-tls-config \
--from-file=tls.crt=example_certs1/httpbin.example.com.crt \
--from-file=tls.key=example_certs1/httpbin.example.com.key
```

###  配置服务和Service

```bash
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
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 2
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
---
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

###  配置网关和虚拟服务

```bash
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
---
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

###  测试

```bash
# 基于http访问
$ curl --resolve "httpbin.example.com:$INGRESS_PORT:$INGRESS_HOST" "http://httpbin.example.com:$INGRESS_PORT"
# 基于https访问
$ curl --resolve "httpbin.example.com:$SECURE_INGRESS_PORT:$INGRESS_HOST" --cacert example_certs1/example.com.crt "https://httpbin.example.com:$SECURE_INGRESS_PORT"
```

---
