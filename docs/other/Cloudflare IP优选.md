# CloudFlare IP 优选

> 声明：本文所有步骤来自网络，本人已操作并验证，但文章具备时效性，请谨慎参考！

## 前言

  作为家用NAS用户来说，拥有公网IP是非常重要的。作为移动宽带用户（没办法一个月10块性价比到位了），是申请不到动态公网IPV4地址的🤣，但公网IPV6不用申请就能够使用。但是也会有一个问题，就是对于只有IPV4网络的访问者来说，是没办法访问到IPV6地址的，所以我们利用CloudFlare（下简称CF）提供的免费CDN双栈服务，进行IPV4<->IPV6流量的互相转换。实现IPV4的网络也能够访问IPV6的NAS服务。

但是国内用户通过CF访问时，会出现极大的不稳定性，延迟过高，丢包等网络问题，所以需要配置IP优选来提升访问速度，减少延迟和丢包问题。

> 默认你已经联系过宽带师傅，将光猫修改为桥接，并通过路由器设备拨号，并开启了IPV6的设置。[点此测试是否IPV6优先](https://ipw.cn/)。

## 准备工作

- 两个已经备案的域名（最好都托管在CF上）

打开[CF](https://dash.cloudflare.com/)，选择添加域，在两个域名的购买商处将DNS名称服务器修改为CF提供的地址，等待一会，就能够在CF中来管理这两个域名了。

![From leejay.top](https://fn.leejay.top:9000/images/2025/01/23/30ffd762-dc2f-453a-81d7-0a38be9573ef.png)

- VISA银行卡，用于开启CF的[Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/)（并不收费只做验证）

## 流程图

![image.png](https://fn.leejay.top:9000/images/2025/01/23/186efa9a-6d2c-479d-afeb-39fcdf8349d7.png)

> IPV4网络通过`fnos.leejay.top`域名能够访问IPV6网络中的web服务。

## 配置

### 1. DDNS

首先确保网络是IPV6网络优先，且拥有IPV6公网IP，因为IPV6的地址是动态的，可能会变，所以需要配置DDNS，自动的将最新的IPV6地址绑定到域名中，此步我们可以依赖软件（ddns-go或lucky，前者简单易用，后者功能全面，各取所需）。此处我们以lucky为例



![image.png](https://fn.leejay.top:9000/images/2025/01/23/ab395c13-2133-4b78-a9b5-88024971b0e7.png)

> 动态域名 -> 添加任务 -> 服务商选择CloudFlare -> 类型选择IPV6 -> 域名填写v6.0001024.cn

点击确认后查看是否成功设置，登陆CF查看域名0001024.cn的DNS解析中是否包含刚才设置的域名解析。

![image.png](https://fn.leejay.top:9000/images/2025/01/23/0ab84cf0-ecb4-4992-b90b-8ba1f97fd8af.png)

> 需要开启代理，即小黄云是打开状态。若没打开，编辑打开即可。

在本地的浏览器访问`v6.0001024.cn`查看是否能够正常访问（或终端 curl v4.0001024.cn），若正常访问即为设置成功。

### 2. 自定义主机名

#### 2.1 添加回退源

在域名`0001024.cn`下，点击`SSL/TLS ->自定义主机名`，添加回退源`v6.0001024.cn`即步骤1中的域名。等待回退源状态为`有效`。

![image.png](https://fn.leejay.top:9000/images/2025/01/23/0ad36244-f35e-4555-979b-e55b20f38c5c.png)

#### 2.2 优选配置

在`0001024.cn`域名中配置`cdn.00024.cn -> cloudflare.182682.xyz` CNAME解析，且不要开启代理。

![image.png](https://fn.leejay.top:9000/images/2025/01/23/a182533a-908a-416e-b865-496b5733d467.png)

> [查看更多公共优选域名](https://www.wetest.vip/page/cloudflare/cname.html)

#### 2.3 添加自定义主机名

参考流程图，此处的自定义主机名为`fnos.leejay.top`用于实现最终访问局域网web服务。

![image.png](https://fn.leejay.top:9000/images/2025/01/23/242cef73-efae-43ef-8802-d34f849f9efc.png)

查看自定义主机名列表，此时会提示需要配置`TXT`验证。回到`leejay.top`DNS解析界面，添加2个TXT解析（此处无图，按照提示配置即可，注意为TXT类型）。同时需要配置一个CNAME解析（`按照网上的教程没有这一步，导致主机名状态一直显示失效！`）

![image.png](https://fn.leejay.top:9000/images/2025/01/23/72ddefca-01b5-4784-b133-456d67f79cef.png)

> `fnos.leejay.top -> cdn.0001024.cn，注意不需要开启代理`。

等待几分钟，自定义主机状态全绿表示配置完成（如果遇到了一直不会变绿，那么删除自定义主机名重新配置一次，注意TXT解析不能配置错！）

![image.png](https://fn.leejay.top:9000/images/2025/01/23/ab1f87c2-1780-401e-a08f-e8e59dd0a38c.png)

### 3. 验证

再次访问[网站测速](https://www.itdog.cn/http/)，访问`fnos.leejay.top`查看测速结果。

![image.png](https://fn.leejay.top:9000/images/2025/01/23/9e9598e0-a6fe-489f-aa99-4dfd7671205d.png)