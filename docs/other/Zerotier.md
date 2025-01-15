# 通过zerotier访问局域网同网段设备

### 物理网卡
```bash
#!/bin/bash

# 获取物理网卡名称，跳过 lo 接口
PHY_IFACE=$(ip link show | awk '/^[0-9]+:/{if (count++ == 1) print $2;}' | sed 's/:$//')

# 获取 Zerotier 虚拟网卡名称
ZT_IFACE=$(ip a | grep 'zt' | awk 'NR==2 {print $NF}')

# 输出获取的网卡名称
echo "Physical Interface: $PHY_IFACE"
echo "Zerotier Interface: $ZT_IFACE"

# 函数：添加 iptables 规则
start() {
    echo "Starting network rules..."
    sudo iptables -t nat -A POSTROUTING -o "$PHY_IFACE" -j MASQUERADE
    sudo iptables -A FORWARD -i "$PHY_IFACE" -o "$ZT_IFACE" -m state --state RELATED,ESTABLISHED -j ACCEPT
    sudo iptables -A FORWARD -i "$ZT_IFACE" -o "$PHY_IFACE" -j ACCEPT
    echo "iptables rules have been set."
}

# 函数：删除 iptables 规则
stop() {
    echo "Stopping network rules..."
    sudo iptables -t nat -D POSTROUTING -o "$PHY_IFACE" -j MASQUERADE
    sudo iptables -D FORWARD -i "$PHY_IFACE" -o "$ZT_IFACE" -m state --state RELATED,ESTABLISHED -j ACCEPT
    sudo iptables -D FORWARD -i "$ZT_IFACE" -o "$PHY_IFACE" -j ACCEPT
    echo "iptables rules have been removed."
}

# 函数：重载 iptables 规则
reload() {
    echo "Reloading network rules..."
    stop
    start
    echo "iptables rules have been reloaded."
}

# 检查参数并调用相应的函数
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    reload)
        reload
        ;;
    *)
        echo "Usage: $0 {start|stop|reload}"
        exit 1
        ;;
esac

```
### ovs

```bash
#!/bin/bash

# 获取物理网卡名称，跳过 lo 接口
PHY_IFACE=$(ovs-vsctl list-br | head -n 1)

# 获取 Zerotier 虚拟网卡名称
ZT_IFACE=$(ip a | grep 'zt' | awk 'NR==2 {print $NF}')

# 输出获取的网卡名称
echo "Physical Interface: $PHY_IFACE"
echo "Zerotier Interface: $ZT_IFACE"

# 函数：添加 iptables 规则
start() {
    echo "Starting network rules..."
    sudo iptables -t nat -A POSTROUTING -o "$PHY_IFACE" -j MASQUERADE
    sudo iptables -A FORWARD -i "$PHY_IFACE" -o "$ZT_IFACE" -m state --state RELATED,ESTABLISHED -j ACCEPT
    sudo iptables -A FORWARD -i "$ZT_IFACE" -o "$PHY_IFACE" -j ACCEPT
    echo "iptables rules have been set."
}

# 函数：删除 iptables 规则
stop() {
    echo "Stopping network rules..."
    sudo iptables -t nat -D POSTROUTING -o "$PHY_IFACE" -j MASQUERADE
    sudo iptables -D FORWARD -i "$PHY_IFACE" -o "$ZT_IFACE" -m state --state RELATED,ESTABLISHED -j ACCEPT
    sudo iptables -D FORWARD -i "$ZT_IFACE" -o "$PHY_IFACE" -j ACCEPT
    echo "iptables rules have been removed."
}

# 函数：重载 iptables 规则
reload() {
    echo "Reloading network rules..."
    stop
    start
    echo "iptables rules have been reloaded."
}

# 检查参数并调用相应的函数
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    reload)
        reload
        ;;
    *)
        echo "Usage: $0 {start|stop|reload}"
        exit 1
        ;;
esac

```
### 设置为系统服务
```bash
bash -c 'cat > /etc/systemd/system/zerotier-nat.service << EOF
[Unit]
Description=Run zerotier nat at startup
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash /root/zerotier-nat.sh start
ExecStop=/bin/bash /root/zerotier-nat.sh stop
ExecReload=/bin/bash /root/zerotier-nat.sh reload
PIDFile=/var/run/zerotier-nat.pid
Restart=on-failure
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF'

systemctl daemon-reload
systemctl enable zerotier-nat.service
systemctl start zerotier-nat.service
```
