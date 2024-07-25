---
sort: 40
lastUpdated: "2024-04-28T14:38:01+08:00"
---
### 修改镜像源

```bash
$ cp /etc/yum.repos.d/CentOS-Base.repo /etc/yum.repos.d/CentOS-Base.repo_bak 
$ curl -o /etc/yum.repos.d/CentOS-Base.repo https://mirrors.aliyun.com/repo/Centos-7.repo
$ yum clean all && yum makecache
$ yum -y install epel-release
```

### 设置中文环境

```bash
$ locale -a |grep "zh_CN"
$ localectl set-locale LANG=zh_CN.UTF-8
```

### 安装mate-desktop桌面

```bash
$ yum --enablerepo=epel -y groups install "MATE Desktop"
```

### 安装tigervnc-1.13.1

下载[此处](https://sourceforge.net/projects/tigervnc/files/stable/1.13.1/el7/RPMS/)的所有文件到本地

```bash
$ yum localinstall ./tigervnc-*
$ yum list installed | grep tigervnc
```

### 中文输入法

mate桌面自带ibus，只需要配置环境变量即可。

```bash
$ cat << EOF >> ~/.bashrc
export GTK_IM_MODULE=ibus
export QT_IM_MODULE=ibus
export XMODIFIERS=@im=ibus
EOF
```

### 设置service

```bash
$ cat << EOF >> /etc/systemd/system/vncserver.service
[Unit]
Description=VNC Server
After=syslog.target network.target

[Service]
Type=forking
Environment="GTK_IM_MODULE=ibus"
Environment="QT_IM_MODULE=ibus"
Environment="XMODIFIERS=@im=ibus"
ExecStart=/bin/bash -c '/usr/libexec/vncserver :1 >/dev/null 2>&1 &'
ExecStop=/bin/bash -c 'kill -9 $(pidof Xvnc)'
Restart=on-failure
User=root

[Install]
WantedBy=multi-user.target
EOF
$ systemctl daemon-reload
$ systemctl enable vncserver
$ systemctl start vncserver
```

