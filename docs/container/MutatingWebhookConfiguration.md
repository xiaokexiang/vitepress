# MutatingWebhookConfiguration

> <a src="https://kubernetes.io/zh-cn/docs/reference/kubernetes-api/extend-resources/mutating-webhook-configuration-v1/">MutatingWebhookConfiguration</a> 是 Kubernetes 的一种动态 Admission Webhook，用于在资源对象被创建或更新时**修改请求对象**。  
> 它在对象写入 etcd 前拦截 API 请求，可以自动注入字段、添加默认值或修改特定配置，从而实现自动化管理和安全策略。

## Certs

因为apiserver会向webhook发送一个`HTTPS`的请求，所以必须需要提前生成证书，其中`ca.crt`需要base64编译后使用。`tls.key`和`tls.crt`需要给webhook服务部署使用。

```bash
#!/bin/bash
set -e

# 参数：域名
DOMAIN="$1"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain>"
  exit 1
fi

OUT_DIR="./tls"
mkdir -p "$OUT_DIR"

CA_KEY="$OUT_DIR/ca.key"
CA_CERT="$OUT_DIR/ca.crt"
TLS_KEY="$OUT_DIR/tls.key"
TLS_CERT="$OUT_DIR/tls.crt"

# 生成 CA
echo "[*] Generating CA..."
openssl genrsa -out "$CA_KEY" 4096
openssl req -x509 -new -nodes -key "$CA_KEY" -subj "/CN=$DOMAIN-CA" -days 36500 -out "$CA_CERT"

# 生成服务器私钥和 CSR
echo "[*] Generating server key and CSR..."
openssl genrsa -out "$TLS_KEY" 4096
openssl req -new -key "$TLS_KEY" -subj "/CN=$DOMAIN" -out "$OUT_DIR/tls.csr"

# 生成 server 证书
echo "[*] Signing server certificate with CA..."
cat > "$OUT_DIR/openssl.cnf" <<EOF
[ v3_ext ]
subjectAltName = DNS:$DOMAIN
EOF

openssl x509 -req -in "$OUT_DIR/tls.csr" -CA "$CA_CERT" -CAkey "$CA_KEY" -CAcreateserial \
    -out "$TLS_CERT" -days 36500 -extfile "$OUT_DIR/openssl.cnf" -extensions v3_ext

# 输出 CA base64
echo "[*] Base64 encoded CA certificate:"
cat "$CA_CERT" | base64 | tr -d '\n'
echo -e "\n"

# 提示如何创建 K8s Secret
echo "[*] 可以用以下命令创建 Kubernetes Secret:"
echo "kubectl -n default create secret tls caddy-webhook-tls \\"
echo "  --cert=$TLS_CERT \\"
echo "  --key=$TLS_KEY"

# 清理中间文件
rm -f "$OUT_DIR/tls.csr" "$OUT_DIR/openssl.cnf" "$OUT_DIR/ca.srl" "$OUT_DIR/.srl"

echo "[*] Done! Files in $OUT_DIR:"
echo "  $TLS_KEY"
echo "  $TLS_CERT"
echo "  $CA_CERT"
```

## Webhook

:::code-group
```go[标签注入]
package main

import (
	"crypto/tls"
	"encoding/json"
	admissionv1 "k8s.io/api/admission/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"log"
	"net/http"
	"time"
)

func mutate(w http.ResponseWriter, r *http.Request) {
	var review admissionv1.AdmissionReview
	if err := json.NewDecoder(r.Body).Decode(&review); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	log.Printf("review: Kind=%s, Namespace=%s, Name=%s",
		review.Request.Kind.Kind,
		review.Request.Namespace,
		review.Request.Name)

	pod := corev1.Pod{}
	if err := json.Unmarshal(review.Request.Object.Raw, &pod); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if pod.Labels == nil {
		pod.Labels = map[string]string{}
	}
	pod.Labels["mutated"] = "true"     // 给pod添加标签
	patch := []map[string]interface{}{ // 基于patch更新
		{
			"op":    "add",
			"path":  "/metadata/labels",
			"value": pod.Labels,
		},
	}
	patchBytes, err := json.Marshal(patch)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	admissionResponse := admissionv1.AdmissionReview{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "admission.k8s.io/v1",
			Kind:       "AdmissionReview",
		},
		Response: &admissionv1.AdmissionResponse{
			UID:       review.Request.UID,
			Allowed:   true,
			Patch:     patchBytes,
			PatchType: func() *admissionv1.PatchType { pt := admissionv1.PatchTypeJSONPatch; return &pt }(),
		},
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(admissionResponse)
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/mutate", mutate)

	server := &http.Server{
		Addr:         ":8843",
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		TLSConfig: &tls.Config{
			MinVersion: tls.VersionTLS12,
		},
	}
	log.Println("Webhook listen on: https://0.0.0.0:8843/mutate")
	if err := server.ListenAndServeTLS("./tls/tls.crt", "./tls/tls.key"); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}
```

```dockerfile[镜像编译]
FROM docker.leejay.top/golang:1.24.5-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod caddy-webhook.go ./
RUN go env -w GOPROXY=https://goproxy.cn,direct && go mod tidy
RUN go build caddy-webhook.go

FROM docker.leejay.top/alpine:3.18
WORKDIR /app
COPY --from=builder /app/caddy-webhook .
EXPOSE 8080
CMD ["./caddy-webhook"]
```
```yaml[服务部署]
apiVersion: apps/v1
kind: Deployment
metadata:
  name: caddy-webhook
  labels:
    app: caddy-webhook
spec:
  replicas: 1
  selector:
    matchLabels:
      app: caddy-webhook
  template:
    metadata:
      name: caddy-webhook
      labels:
        app: caddy-webhook
    spec:
      containers:
        - name: caddy-webhook
          image: abcsys.cn:5000/go/caddy-webhook # webhook编译的服务镜像
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8843
          volumeMounts:
            - name: caddy-webhook
              mountPath: /app/tls
              readOnly: true
      restartPolicy: Always
      volumes:
        - name: caddy-webhook
          secret:
            secretName: caddy-webhook-tls

---
apiVersion: v1
kind: Service
metadata:
  name: caddy-webhook
  namespace: default
spec:
  selector:
    app: caddy-webhook
  ports:
    - protocol: TCP
      port: 443
      targetPort: 8843
  type: ClusterIP
---
apiVersion: v1
kind: Secret
metadata:
  name: caddy-webhook-tls
  namespace: default
type: kubernetes.io/tls
data:
  tls.crt: <tls.crt>
  tls.key: <tls.key>
```
:::

## Mwc

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: caddy-inject
webhooks:
  - name: caddy.inject.kubernetes.io
    sideEffects: None # 是否有副作用
    failurePolicy: Fail # 调用webhook失败会抛出错误
    admissionReviewVersions:
      - "v1" # 传递给webhook的资源对象版本
    clientConfig:
      # url和service属性只能二选一
      # url: https://caddy-webhook:8843/mutate # 回调的域名是caddy-webhook
      service:
        name: caddy-webhook # apiserver回调的域名是caddy-webhook.default.svc
        namespace: default
        port: 443 # svc port default 443
        path: /mutate
      caBundle: <caBundle>
    rules: # 匹配符合的版本和操作
      - apiGroups: [""]
        apiVersions: [ "v1" ]
        operations: [ "CREATE", "UPDATE" ]
        resources: [ "pods" ]
    namespaceSelector: {} # 匹配ns
    objectSelector: # 匹配符合标签的资源对象
      matchExpressions:
        - key: app
          operator: In
          values:
            - caddy-inject
```

> - 在包含标签`app=caddy-inject`的`pods`对象`创建或更新`的时候，会传递`admissionReview-v1`到`https://caddy-webhook:8843/mutate`，如果调用失败会抛出异常。
> - caBundle：将用于验证 Webhook 的服务证书。即webhook的tls证书对应的`ca.crt`文件base64后的值。
> - 请注意不同的回调方式，对应的域名也不同，service的方式回调的是`caddy-webhook.default.svc`，对应的证书也需要匹配。

## 测试

全部部署完毕后，我们只需要创建一个包含标签`app=caddy-inject`的pod，就会回调webhook服务，给pod加入一个`mutated=true`的标签。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-test
  namespace: default
  labels:
    app: caddy-inject
spec:
  containers:
    - name: nginx-test
      image: abcsys.cn:5000/public/nginx
      imagePullPolicy: IfNotPresent
  restartPolicy: Always
```

## 附录

### 本地调试

若需要apiserver请求本地的webhook服务，且没有域名的话，建议直接修改apiserver的域名解析，映射本地IP。

```yaml{9-13}
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
  labels:
    component: kube-apiserver
    tier: control-plane
spec: // [!code focus]
  hostAliases: // [!code focus]
  - ip: 10.50.8.44 // [!code focus]
    hostnames: // [!code focus]
    - "caddy-webhook" // [!code focus]
```

同时修改mwc的配置。

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: caddy-inject
webhooks:
  - name: caddy.inject.kubernetes.io
    sideEffects: None # 是否有副作用
    failurePolicy: Fail # 调用webhook失败会抛出错误
    admissionReviewVersions:
      - "v1" # 传递给webhook的资源对象版本
    clientConfig:
       url: https://caddy-webhook:8843/mutate # 回调的域名是caddy-webhook # [!code ++]
       service: # [!code --]
         name: caddy-webhook # apiserver回调的域名是caddy-webhook.default.svc # [!code --]
         namespace: default # [!code --]
         port: 443 # svc port default 443 # [!code --]
         path: /mutate # [!code --]
```

