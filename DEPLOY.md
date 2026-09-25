# 部署到服务器（公网访问）

> 本文回答一个问题：**这套系统能不能部署到服务器上、让别人通过公网访问？**
> 结论是**能，而且不需要改代码**——配套的部署文件已经全部准备好（见文末清单）。

---

## 一、先说结论

这个项目天生适合上服务器，原因：

| 特性 | 对部署的意义 |
| --- | --- |
| 后端是标准 SpringBoot fat jar | 跨平台，装个 JDK 17 就能跑，不依赖 Windows |
| 前端是**免构建**的纯静态文件 | 丢给 Nginx 就行，不需要 Node 打包 |
| 配置全部支持环境变量覆盖 | `DB_URL / DB_USERNAME / DB_PASSWORD / JWT_SECRET / CAPTCHA_ECHO_MODE`，不用改配置文件 |
| 已审查：**无文件读写、无硬编码 Windows 路径** | 不用担心 `C:\` 之类的路径在 Linux 上崩掉 |
| 数据库初始化脚本自包含 | `sql/property_db.sql` 自带建库+建表+2229 条演示数据，容器首次启动自动导入 |

唯一需要改的地方是「前端接口地址」——本机/局域网上前端在 9000、后端在 8080，是两个端口；
上了服务器应该前后端**同域**（由 Nginx 把 `/api` 转给后端），这样才能上 HTTPS、也不用把 8080 暴露出去。
**这个改造已经做完了**（`frontend/js/config.js` 现在会根据「主机名 + 端口」自动区分形态：
非本机且走 80/443 → 同域 `/api`；本机 / 局域网 / 非标准端口 → 直连 `:8080`），
并且补了单元测试 `frontend/test/test_config.js`（**17 项断言**，覆盖 file://、localhost、局域网、80、443、公网 IP、非标准端口、手动覆盖等场景）。

> 为什么本机即使走 80 端口也不走同域？因为「标准端口」并不等于「前面一定有反向代理」——
> 开发时前端就是个独立静态服务，若按同域推导，接口会打到 `http://localhost/api` 而 404。

---

## 二、三条路线怎么选

| | 路线 A：国内轻量云服务器 | 路线 B：海外免费 PaaS | 路线 C：内网穿透 |
| --- | --- | --- | --- |
| **代表** | 腾讯云/阿里云轻量应用服务器 | Railway、Render、Zeabur | frp、cpolar、花生壳 |
| **成本** | 首年约 **70~120 元**（2核2G），续费约 300 元/年 | 0 元起，Railway 试用 $5 后约 $1/月起 | 免费版有流量/带宽限制 |
| **国内访问速度** | 快，同城约 20~50ms | 慢，服务器在海外，约 150~250ms+ | 取决于中转节点 |
| **稳定性** | 高，7×24 在线 | Render 免费层**闲置 15 分钟休眠**，下次访问要等 10~60 秒冷启动 | **依赖你自己的电脑一直开机** |
| **MySQL** | 自建，免费 | Railway 可一键 MySQL（收费）；**Render 免费 Postgres 30 天后过期** | 用你本机的 MySQL |
| **域名/HTTPS** | 支持，可绑域名 | 自带 HTTPS 子域名 | 一般给随机地址 |
| **部署难度** | 中（装 Docker 后一条命令） | 低，但要接 GitHub 仓库、配环境变量 | 低 |
| **适合** | **长期使用、要给别人稳定访问** | 临时演示、不介意慢和休眠 | 临时给人看一眼 |

**推荐路线 A。** 理由：一年不到一百块，换来国内高速 + 稳定在线 + 域名 HTTPS，
比折腾免费平台的各种限制（休眠、冷启动、数据库过期、海外延迟）省心得多。

> ⚠️ 如果选国内服务器：**用 IP 直接访问不需要备案；一旦绑定域名就必须先完成 ICP 备案**（约 1~20 个工作日）。

---

## 三、路线 A：国内轻量服务器 + Docker（推荐）

### 0. 买服务器

配置建议：

| 项 | 建议 | 说明 |
| --- | --- | --- |
| CPU/内存 | **2核2G 起步，4核4G 更稳** | 同时跑 MySQL + Java + Nginx，2G 会比较紧 |
| 磁盘 | 40GB+ | 镜像 + 数据库足够 |
| 带宽 | 3M 以上 | 演示场景够用 |
| 系统 | **Ubuntu 22.04 / 24.04** | 装 Docker 最顺 |
| 地域 | 离使用者近的（如华东/华南） | 延迟更低 |

腾讯云、阿里云、华为云都有「轻量应用服务器」，新用户首年通常 70~120 元。
买的时候**留意续费价**（首年便宜次年翻倍是常态）。

### 1. 放行端口

到云控制台的**安全组 / 防火墙**里放行：

- `80`（HTTP，前端入口）——**必须**
- `22`（SSH）——应该默认开着
- `8080` **不要**放行。生产走 Nginx 反代，后端只在 Docker 内网暴露，更安全

### 2. 装 Docker

SSH 登录服务器后：

```bash
curl -fsSL https://get.docker.com | bash
systemctl enable --now docker
docker --version          # 确认安装成功
```

> 国内服务器拉取镜像慢的话，可配置镜像加速器（`/etc/docker/daemon.json` 加 `registry-mirrors`）。

### 3. 上传项目

**关键：必须带上打包好的 jar**（`backend/target/property-management-system-1.0.0.jar`，约 26MB）。
在开发机先双击 `4-编译打包.bat` 打包，然后把整个 `property-management-system` 目录传上去。

常见两种方式：

```bash
# 方式一：从开发机用 scp 上传（在开发机的 Git Bash 里执行）
scp -r "D:/code/2026-09-16-14-27-28/property-management-system" root@服务器IP:/opt/

# 方式二：服务器上直接从 Git 仓库拉（如果代码在仓库里，注意 jar 一般不入库，仍需单独传 jar）
```

服务器上确认 jar 在位：

```bash
cd /opt/property-management-system
ls -lh backend/target/*.jar
```

### 4. 一键部署

```bash
cd /opt/property-management-system
bash deploy/deploy.sh
```

脚本会自动完成：检查环境 → 生成 `.env`（**随机数据库密码 + 随机 JWT 密钥**）→
构建并启动三个容器 → 等到接口探活通过 → 打印访问地址。

首次执行要拉取 MySQL、JRE、Nginx 基础镜像，视网络需要几分钟。

### 5. 访问

```
http://服务器IP/
```

初始账号 **`admin` / `123456`** —— 登录后请立刻改密码。

### 6. 日常运维

```bash
docker compose ps                 # 看三个容器状态
docker compose logs -f backend    # 看后端日志
docker compose restart backend    # 重启后端
docker compose down               # 停止（数据库数据保留在数据卷里）
docker compose down -v            # 停止并清空数据库（慎用）
```

---

## 四、路线 B：海外免费 PaaS（不想买服务器时）

这类平台都能直接吃 `backend/Dockerfile`，前端那套 Dockerfile 也基本通用。

| 平台 | 免费额度现状 | 要注意 |
| --- | --- | --- |
| **Railway** | 注册送 $5 试用额度，之后最低约 $1/月起 | 对 Java 友好，**唯一能一键开 MySQL 的**，但额度烧完要付费 |
| **Render** | 静态站点永久免费；Web Service 有免费层 | **免费 Web 闲置 15 分钟休眠**，冷启动 10~60 秒；**免费 Postgres 30 天过期**；无信用卡也能用 |
| **Zeabur** | 有免费层，亚太（香港/台湾）节点 | 亚太延迟低，但免费层政策变动频繁，务必以官网为准 |

通用步骤：

1. 把代码推到 GitHub 仓库
2. 平台上新建服务 → 选仓库 → 指定 `backend/Dockerfile` 构建
3. 起一个 MySQL 服务，把它的连接信息填成环境变量：
   `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` / `JWT_SECRET`
4. 前端两个选择：
   - 也部署成 Web Service（用 `deploy/frontend.Dockerfile`），或
   - 只传 `frontend/` 目录当静态站点托管（此时前后端不同域：需要设
     `window.PMS_API_BASE` 指到后端地址，或依赖后端已放行的 CORS）
5. 休眠问题：可用 cron-job.org 或 GitHub Actions 每 10 分钟请求一次探活接口保持唤醒

> **重要提醒**：免费平台的免费数据库常有「30 天过期/额度用尽」条款，
> 里面的演示数据可能随时被清空，**不要用来放真实数据**。

---

## 五、路线 C：内网穿透（最省事，但依赖本机开机）

不买服务器，用 frp / cpolar / 花生壳 把本机端口映射到公网。适合「今天就要给别人看一眼」。

- 优点：0 成本、几分钟搞定
- 缺点：**你电脑关机/断网，对方就打不开**；免费版通常限带宽和流量；地址是随机域名

如果走这条路，本机就按平时的方式启动（`2-启动后端.bat` + `3-启动前端.bat`），
再让穿透工具把 **80 或 9000** 映射出去即可。

---

## 六、上线前必须检查的清单

| 项 | 默认值 | 生产要求 |
| --- | --- | --- |
| `JWT_SECRET` | 代码里有开发用默认值 | **必须换随机长串**（`deploy.sh` 已自动生成 48 位随机） |
| `MYSQL_ROOT_PASSWORD` | — | **必须强密码**（`deploy.sh` 已自动生成） |
| `CAPTCHA_ECHO_MODE` | `local` | **必须 `false`**（compose 里已默认 false，防止验证码答案泄漏） |
| admin 初始密码 | `123456` | **登录后立刻修改** |
| CORS | 放行任意来源 | 绑域名后建议收紧为白名单（`allowedOriginPatterns`） |
| HTTP | 明文 | 有域名后配 HTTPS（见 `deploy/nginx.conf` 末尾说明） |
| 令牌吊销表 | 内存 Map | 多实例部署时应换 Redis |

---

## 七、部署后怎么验证

1. 浏览器打开 `http://服务器IP/`，能看到登录页
2. 用 `admin / 123456` 登录成功，进数据大屏
3. 故意输错密码 3 次 → **出现图形验证码**（说明 AWT 在 Linux 上工作正常）
4. 换个能上网的设备（手机 4G）访问同一地址，确认外网可达
5. 界面里能加载 3D 小区地图（说明静态资源与 MIME 都正常）

> 第 3 步很关键：验证码是后端用 Java AWT 现场画的图，
> **Linux 容器缺字体会导致图片空白**——所以 `backend/Dockerfile` 里已经装了
> `fontconfig` + `fonts-dejavu-core`，并强制 `-Djava.awt.headless=true`。

---

## 八、常见问题

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 浏览器打不开，`curl` 本机也不通 | 容器没起来 | `docker compose ps` 看状态，`docker compose logs backend` 看日志 |
| 容器都正常，但外网打不开 | 云服务器**安全组没放行 80** | 到控制台加规则；本机 `curl localhost` 能通就说明是安全组问题 |
| 页面能开，但接口全 404 | 前端请求打到了别的地址 | 检查是不是用非标准端口访问；必要时在页面里设 `window.PMS_API_BASE='/api'` |
| 接口报 502 | 后端没就绪或挂了 | `docker compose logs backend`；MySQL 初始化较慢，首次启动多等一会 |
| 登录后中文乱码 | 数据库字符集不对 | 本项目脚本已含 `SET NAMES utf8mb4`；确认没手工改过容器字符集参数 |
| 验证码图片是空白/方块 | 容器缺字体 | 本项目已内置字体；若自定义过镜像，需装 `fontconfig` + `fonts-dejavu-core` |
| 改完代码重启后还是旧页面 | 浏览器缓存 | 本项目 Nginx 已设 `no-cache`，正常会走 304；强制刷新 `Ctrl+F5` |
| 想重置演示数据 | — | `docker compose down -v && docker compose up -d`（会重新导入 `property_db.sql`） |

---

## 九、附：本次新增的部署文件清单

```
property-management-system/
├─ docker-compose.yml               # 编排 mysql + backend + frontend
├─ deploy/
│  ├─ deploy.sh                     # 服务器一键部署脚本
│  ├─ nginx.conf                    # 前端静态托管 + /api 反代（含 HTTPS 示例）
│  ├─ frontend.Dockerfile           # 前端镜像
│  └─ .env.example                  # 环境变量模板
├─ backend/
│  ├─ Dockerfile                    # 后端镜像（含验证码所需的字体依赖）
│  └─ .dockerignore
└─ frontend/
   ├─ js/config.js                  # 已改造：支持服务器同域部署
   └─ test/test_config.js           # 新增：接口地址推导测试（17 项）
```

> 说明：本机没有安装 Docker（也没有 WSL 环境），所以镜像是**按标准写法交付并做了静态校验**
> （文件行尾、YAML 结构、构建上下文路径、依赖关系），**未能在本机实际构建运行**。
> 首次在服务器上执行 `deploy.sh` 时请留意构建日志。
