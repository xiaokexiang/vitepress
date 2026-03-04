---
sort: 30
lastUpdated: "2021-04-16T11:02:51+08:00"
---

# Docker

## Dockerfile

### 构建镜像

```javascript
const http = require('http');
const os = require('os');

console.log("Kubia server starting ...");
var handler = function(request, response) {
    console.log("Received request from " + request.connection.remoteAddress);
    response.writeHead(200);
    response.end("You've hit " + os.hostname() + "\n");
}
var www = http.createServer(handler);
www.listen(8080);
// 构建 nodejs 项目用于容器部署
```

#### 编写 Dockerfile

```dockerfile
FROM node:7                          # 基于什么镜像制作
ADD app.js /app.js                   # 将当前目录下的 app.js 移到容器根目录
ENTRYPOINT ["node", "app.js"]        # 启动容器时的执行命令
```

#### 镜像打包

```shell
docker build -t ${name} .
```

#### 进入容器内部

```shell
docker exec -it ${docker_name} bash
```

> 1. `-i` 表示标准输入流保持开放
> 2. `-t` 用于分配一个伪终端

### Docker 镜像推送

```shell
# 将本地镜像加自己账户名前缀的 tag
docker tag ${local_image} ${your_account_name}/${remote_image}
docker tag busybox xiaokexiang/busybox

# docker 账户登录
docker login

# 推送到远端
docker push xiaokexiang/busybox
```

### 命令对比

#### ADD & COPY

`两者都可以将宿主机的文件复制到容器内，ADD 具备自动解压的功能，而 COPY 只是复制功能。`

```dockerfile
FROM busybox
ADD hello.tar /
COPY hello.tar /
```

> - 使用 ADD 命令，镜像 build 后，在 `/` 目录下就会存在解压后的文件（**不会存在压缩包！**）
> - 使用 COPY 命令，镜像 build 后，在 `/` 目录下会存在压缩包

#### CMD & ENTRYPOINT

`两者都用于指定容器启动程序及参数，当存在 ENTRYPOINT 时，CMD 的内容会作为参数传递给 ENTRYPOINT。` 需要注意的是：我们执行 `docker run busybox echo hello` 指令中的 `echo hello` 就是 CMD 命令（默认覆盖 Dockerfile 中的 CMD 命令），只是它没有写在了 Dockerfile 中，而是显示的传入。

```dockerfile
FROM busybox
CMD ["ls", "-l"]
# ENTRYPOINT ["ls", "-l"]
```

> - 镜像 build 后，若执行 `docker run image -h`，那么会提示错误信息（因为覆盖了 `ls -l` 命令，执行的是 `-h`）。而将 CMD 换成 ENTRYPOINT 则不会（会拼接，执行 `ls -l -h`）。

#### ENV & ARG

`两者都用于设置环境变量，区别在于 ENV 无论是镜像构建时还是容器运行时，都可以使用。ARG 只是用于构建镜像时使用，容器运行时不会出现。`

```dockerfile
FROM busybox
ENV NAME="helloworld"
WORKDIR /
RUN touch $NAME  # 构建镜像时使用变量
CMD ["sh", "-c", "echo $NAME && ls"]
```

> - 如果此处不使用 `sh -c` 执行命令，那么并不会正确显示 ENV 变量
> - 如果在一行中执行多个命令，需要使用 `-c` 显示指定

### tini

tini（Tiny Init 的缩写）是一个轻量级的初始化系统，用于解决在容器环境中启动进程时可能遇到的一些问题。它设计用于替代传统的 init 系统，如 systemd 或 sysvinit，以提供更好的容器进程管理。

> - 一般来说，docker 容器启动时，容器内第一个启动的进程会被分配为 PID1，通常 PID1 的进程被视为 init 进程，init 进程负责启动和管理其他系统进程
> - 当 java 进程成为 PID1 时，会出现 JVM 无法正确处理 SIGTERM 信号来优雅的终止进程。`jstack <pid>` 命令也无法处理，因为无法处理 `SIGQUIT` 信号
> - tini 被设计为更好地处理信号，并能够确保它们正确地传递给 Java 进程，以便在容器停止时进行优雅的关闭

```dockerfile
FROM busybox
RUN wget -O /sbin/tini https://github.com/krallin/tini/releases/download/v0.19.0/tini-static-amd64
RUN chmod +x /sbin/tini
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sleep", "infinity"]
```

> top 查看 pid，tini 进程的 pid 为 1

## Docker Command

### MySQL

#### 不挂载启动

```shell
# 不使用挂载创建 mysql
docker run -itd -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 --name mysql5.7 mysql:5.7
```

#### 挂载宿主机目录启动

```shell
# 创建宿主机目录
mkdir -p /opt/mysql/{logs,conf.d,data}

# 拷贝默认配置文件到宿主机（借助上文的不挂载启动的 mysql 容器）
docker cp mysql:/etc/mysql/conf.d/. /opt/mysql/conf.d
docker cp mysql:/var/log/mysql/. /opt/mysql/logs

# 可以不拷贝自己创建配置文件
touch /opt/mysql/conf.d/my.cnf

# 执行挂载命令并启动
docker run -p 3306:3306 --name mysql \
  -v /opt/mysql/conf.d:/etc/mysql/conf.d \
  -v /opt/mysql/logs:/var/log/mysql \
  -v /opt/mysql/data:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -d mysql:5.7
```

> `mysql 5.7 或 8.0 版本` 都可以使用该命令。

::: details MySQL 相关命令

```shell
# 进入 mysql 控制台 root/123456，指定端口 3316 和 host 127.0.0.1
mysql -uroot -P 3316 -h 127.0.0.1 -p123456

# 创建远程用户 test/abcdefg
CREATE USER 'test'@'%' IDENTIFIED WITH mysql_native_password BY 'abcdefg';
GRANT ALL PRIVILEGES ON *.* TO 'test'@'%';

# 查看数据库，表，使用数据库
show databases;
use mysql;
show tables;

# 控制台内执行本地的 sql 文件
source /root/select.sql

# 控制台外备份数据库
mysqldump -u root -P 3316 -p dbname > /root/backup.sql
```

:::

### Nginx

#### 不挂载启动

```shell
docker run -itd --name nginx -p 80:80 -p 443:443 nginx
```

::: details 拷贝 Nginx 默认配置文件

```shell
# 将容器内的 conf.d 文件夹下的所有文件复制到宿主机上/opt/nginx/conf.d 文件夹下
docker cp nginx:/etc/nginx/conf.d/. /opt/nginx/conf.d

# 将容器内的 conf.d 文件夹（包含文件夹内的文件）复制到宿主机上/opt/nginx 目录下
docker cp nginx:/etc/nginx/conf.d /opt/nginx/
```

:::

#### 挂载宿主机目录启动

```shell
# 创建宿主机目录
mkdir -p /opt/nginx/{logs,conf.d,html}

# 拷贝默认配置文件到宿主机（借助上文的不挂载启动的 nginx 容器）
docker cp nginx:/etc/nginx/conf.d/. /opt/nginx/conf.d
docker cp nginx:/usr/share/nginx/html/. /opt/nginx/html

# 执行挂载命令并启动
docker run -it --name nginx \
  -v /opt/nginx/html:/usr/share/nginx/html \
  -v /opt/nginx/logs:/var/log/nginx \
  -v /opt/nginx/conf.d:/etc/nginx/conf.d \
  -p 80:80 -p 443:443 \
  -d nginx
```

> nginx 的配置文件可以通过 `nginx -t` 来进行校验。

### Kafka

```bash
# zookeeper
docker run -d --name zookeeper -p 2181:2181 -v /etc/localtime:/etc/localtime wurstmeister/zookeeper

# kafka
docker run -d --rm --name kafka_2.21 -p 9092:9092 \
  -e KAFKA_BROKER_ID=1 \
  -e ALLOW_PLAINTEXT_LISTENER=yes \
  -e KAFKA_CFG_ZOOKEEPER_CONNECT=10.50.8.23:2181 \
  -e KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://10.50.8.23:9092 \
  -e TZ="Asia/Shanghai" \
  bitnami/kafka:2.2.1

# kafdrop
docker run -d --rm --name kafdrop -p 9009:9000 \
  -e KAFKA_BROKERCONNECT=10.50.8.23:9092 \
  -e JVM_OPTS="-Xms32M -Xmx64M" \
  -e SERVER_SERVLET_CONTEXTPATH="/" \
  obsidiandynamics/kafdrop
```

## 多平台镜像构建

利用 Docker 的 buildx 插件实现多平台结构镜像的构建，使用前提：`内核版本 >= 4.8 & docker >= 19.03`。

### 定义构建器配置

```bash
cat <<EOF > config.toml
[registry."docker.io"]           # 配置 docker.io 的镜像代理
  mirrors = ["hub-mirrors.c.163.com"]
[registry."abcsys.cn:5000"]      # 配置自定义仓库的代理、支持 insecure 推送（私有仓库必备）
  mirrors = ["abcsys.cn:5000"]
  http = true
  insecure = true
[registry."jenkins.oem"]
  mirrors = ["jenkins.oem"]
  http = true
  insecure = true
EOF
```

### 创建构建器

```bash
# 查看已经存在的构建器
docker buildx ls

# 删除构建器
docker buildx rm -f custom-builder

# 创建构建器（会同步基于 moby/buildkit 的容器镜像），并将宿主机的 host 映射到这个容器中（私有仓库必备）
docker buildx create --use --name custom-builder --config=./config.toml --driver-opt network=host --buildkitd-flags '--allow-insecure-entitlement network.host'

# 将 custom-builder 作为默认构建器
docker buildx use custom-builder

# 启动构建器
docker buildx inspect --bootstrap custom-builder
```

### 构建多架构镜像

基于下面的命令创建所需文件：

```bash
# Dockerfile
cat <<EOF > Dockerfile
# 定义相关文件，用于展示容器所在系统的架构
FROM golang AS builder
WORKDIR /app
ADD . .
RUN go build -o hello .
FROM alpine
WORKDIR /app
COPY --from=builder /app/hello .
CMD ["./hello"]
EOF

# main.go
cat <<EOF > main.go
package main

import (
    "fmt"
    "runtime"
)

func main() {
    fmt.Printf("Hello, %s/%s!\n", runtime.GOOS, runtime.GOARCH)
}
EOF

# go.mod
cat <<EOF > go.mod
module hello
go 1.20
EOF
```

构建 amd64 和 arm64 双架构镜像：

```bash
# 构建 amd 和 arm 架构镜像并推送，因为默认是构建在缓存中的
docker buildx build --platform linux/arm64,linux/amd64 -t abcsys.cn:5000/public/hello-go . --push
```

查看远程仓库的镜像 manifest 信息：

```bash
docker buildx imagetools inspect abcsys.cn:5000/public/hello-go

# Name:      abcsys.cn:5000/public/hello-go:latest
# MediaType: application/vnd.docker.distribution.manifest.list.v2+json
# Digest:    sha256:faf291d4054f0e1958b77fc45786e18725e0180bf67a801dc1e1531dab430c0a
#
# Manifests:
#  Name:      abcsys.cn:5000/public/hello-go:latest@sha256:893411d11003ed93665b2c383400600d0bf0ea40c29f23e958d8932d3b3b4b89
#  MediaType: application/vnd.docker.distribution.manifest.v2+json
#  Platform:  linux/arm64
#
#  Name:      abcsys.cn:5000/public/hello-go:latest@sha256:860abc41643953f466ccc3c38fc4b927793039b188dcc9882794ac58583474e2
#  MediaType: application/vnd.docker.distribution.manifest.v2+json
#  Platform:  linux/amd64
```
