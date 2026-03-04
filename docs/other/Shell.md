---
lastUpdated: "2020-12-29T18:29:04+08:00"
publish: false
---

# Shell 部署脚本

## 脚本说明

一个用于 Java 项目的自动化部署脚本，支持 git 拉取代码、Maven 构建、备份、启动、停止、重启和状态查询功能。

```shell
#!/bin/bash

# 配置项目路径和模块名称
__dir__=/www/server/code/service-platform
__web__=ruoyi-web
__admin__=ruoyi-admin
__app__=("$__web__" "$__admin__")

# 使用说明，用来提示输入参数
usage() {
    echo "Usage: sh deploy.sh [start|stop|restart|status]"
    exit 1
}

# 拉取最新代码
pull() {
    cd $__dir__
    git pull
    echo "git pull code success"
}

# 构建父工程
build_parent() {
    mvn clean install -Dmaven.test.skip=true -f $__dir__/pom.xml
}

# 构建子模块
build_module() {
    mvn clean package -Dmaven.test.skip=true -f $__dir__/$1/pom.xml
    echo "############# $1 Build success #############"
}

# 检查进程是否存在
is_exist() {
    pid=$(ps -ef | grep $1 | grep -v grep | awk '{print $2}')
    # 如果不存在返回 1，存在返回 0
    if [ -z "${pid}" ]; then
        return 1
    else
        return 0
    fi
}

# 备份旧版本
backup() {
    __jar__=$1-$2.jar
    mv $__dir__/$1/target/$1.jar $__dir__/backup/$__jar__
    echo "############# $1 backup to $__dir__/backup/$__jar__ #############"
}

# 启动服务
start() {
    pull
    mkdir -p $__dir__/{logs,backup}
    build_parent
    for name in ${__app__[@]}
    do
        __date__=$(date +"%Y%m%d%H%M%S")
        backup $name $__date__
        build_module $name
        is_exist $name
        if [ $? -eq "0" ]; then
            echo "${name} is running. pid=${pid}"
        else
            nohup java -jar $__dir__/$name/target/$name.jar --spring.profiles.active=druid >$__dir__/logs/$name$__date__.log 2>&1 &
            echo "${name} start success"
        fi
    done
}

# 停止服务
stop() {
    for name in ${__app__[@]}
    do
        is_exist $name
        if [ $? -eq "0" ]; then
            kill -9 $pid
            echo "kill ${name} success"
        else
            echo "${name} is not running"
        fi
    done
}

# 查看服务运行状态
status() {
    for name in ${__app__[@]}
    do
        is_exist $name
        if [ $? -eq "0" ]; then
            echo "${name} is running"
        else
            echo "${name} is not running"
        fi
    done
}

# 重启服务
restart() {
    stop
    start
}

# 根据输入参数，选择执行对应方法，不输入则执行使用说明
case "$1" in
    "start")
        start
        ;;
    "stop")
        stop
        ;;
    "status")
        status
        ;;
    "restart")
        restart
        ;;
    *)
        usage
        ;;
esac
```

## 使用方法

```shell
# 启动服务
sh deploy.sh start

# 停止服务
sh deploy.sh stop

# 查看服务状态
sh deploy.sh status

# 重启服务
sh deploy.sh restart
```

## 功能说明

- **start**: 拉取代码 → 构建父工程 → 备份旧版本 → 构建模块 → 启动服务
- **stop**: 停止所有服务进程
- **status**: 查看服务运行状态
- **restart**: 先停止再启动
