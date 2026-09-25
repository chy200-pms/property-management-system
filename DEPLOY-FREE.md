# 免费部署方案（2026 年 9 月实测行情）

> 回答两个问题：**有没有真正免费的服务器？能不能把这套系统配上去？**
>
> 结论：**有，两套都能真跑起来。** 项目已经改造完成，照着下面的步骤做即可。

---

## 零、想立刻给别人看？先用临时公网链接（0 注册、1 分钟）

如果只是想**马上**把系统发给别人看一眼，不用注册任何账号、不用买服务器，
用隧道把本机服务映射到公网即可：

```
1. 双击  2-启动后端.bat        （密码输 a123456，等出现 Started PropertyApplication）
2. 双击  6-公网临时访问.bat    （自动启动前端 + 建立隧道，无需其它操作）
3. 窗口里会打印 https://xxxx.run.pinggy-free.link —— 把这个网址发人即可打开
```

**代价（必须先知道）：**

| 限制 | 说明 |
| --- | --- |
| 本机必须开机 | 窗口一关，链接立刻失效；电脑睡眠/关机同样断 |
| **约 60 分钟到期** | 免费隧道有有效期，到期后**重跑 `6-公网临时访问.bat`** 即可。注意：网址由「随机前缀 + 当时的公网 IP」组成，**重开后大概率会变**（实测重连换过一次 IP，网址完全变了）——所以每次都要把窗口里新打印的网址重新发人 |
| 速度一般 | 流量经境外中转节点，首次打开可能慢几秒 |
| 偶发丢包 | 免费隧道质量一般，表现为个别请求 401/超时，**刷新一次通常就好** |
| ⚠️ **部分地区打不开** | 免费隧道域名（`*.pinggy-free.link`）属于被重点过滤的域名，**部分网络/地区会直接连不上**，浏览器报 `ERR_TIMED_OUT`。2026-09 用全球 8 节点实测：美/瑞/芬/奥/印 5 个正常，俄罗斯、伊朗、罗马尼亚 3 个超时 |
| 无可用性保证 | 上游服务商随时可能调整策略 |

**原理**（为什么只开一个端口就够）：
`frontend/serve.js` 支持 `--api 8080` 参数，会把 `/api/*` 反向代理给本机后端，
于是**页面和接口同源**——既没有跨域，也不会出现"https 页面去请求 http 接口"被浏览器拦掉的问题。
前端 `config.js` 会自动把接口推导成同域的 `/api`，无需改任何前端代码。

**因此**：临时链接只适合「演示、给同学同事看一眼」。
要一个**关掉电脑也能打开**的正式地址，请继续看下面的方案一（Render + Aiven，同样 0 元）。

### 别人打不开怎么办（浏览器报 `ERR_TIMED_OUT`）

按这个顺序查，**别先怀疑代码**：

1. 本机是否还开着、`6-公网临时访问.bat` 那个窗口是否还在
2. 用**公网网址**（不是 `127.0.0.1:9000`）自己打开一次 —— 自己能开，就说明页面和后端都没问题
3. 让对方换个网络试（手机流量 ↔ WiFi 互换），多数情况立刻好
4. 跑一次全球多节点检测，分清是「全网都不通」还是「只有部分地区不通」：

   ```bash
   ENC="https%3A%2F%2F<你的隧道域名>%2Findex.html"
   REQ=$(curl -s -H "Accept: application/json" "https://check-host.net/check-http?host=$ENC&max_nodes=8")
   ID=$(echo "$REQ" | grep -o '"request_id":"[^"]*"' | cut -d'"' -f4)
   sleep 12 && curl -s -H "Accept: application/json" "https://check-host.net/check-result/$ID"
   ```

   返回形如 `节点名: [[1, 耗时, "OK", "200", "解析IP"]]`，首元素 `1`=通、`0`=不通。

> **`ERR_TIMED_OUT` 的含义是「连接根本没有建立」** —— 属于 DNS 污染、域名被拦、运营商拦截这类**网络层**问题。
> 如果是我们服务自己的毛病，浏览器会收到 `502`/`503` 这类服务器响应，而不是超时。
> 这是免费隧道的固有短板，不是配置错误：**要稳定发给别人访问，请直接走下面的方案一。**

---

## 一、先说结论

| | 方案一：全程不用信用卡 | 方案二：Oracle 永久免费服务器 |
| --- | --- | --- |
| **后端** | Render 免费 Web Service（跑我们的 Docker 镜像） | 服务器上跑 `docker-compose.yml`（现成的，零改造） |
| **数据库** | Aiven 免费 MySQL（真 MySQL） | 服务器自建 MySQL 容器 |
| **前端** | Netlify Drop / Cloudflare Pages（免费静态托管） | Nginx 容器 |
| **成本** | 0 元 | 0 元 |
| **要不要绑卡** | **不用** | **要**（国际信用卡，用于身份验证，扣款会退） |
| **配置** | 512MB 内存 / 0.1 CPU，闲置 15 分钟休眠 | 2 核 / 12GB 内存，永不休眠 |
| **国内访问** | 较慢（服务器在新加坡/法兰克福等） | 快（可选国内/近区，但**国内区要备案**） |
| **数据库容量** | 1GB 磁盘（本项目数据仅约 460KB） | 200GB 块存储，随便用 |
| **注册难度** | 低（邮箱/GitHub 即可） | **高**（信用卡 + 地址核对 + 经常抢不到容量） |
| **适合** | 先跑起来看看、给别人演示 | 长期稳定使用 |

**建议**：先用**方案一**（15 分钟能出结果，不花钱不绑卡）；如果后面访问量上来了、嫌冷启动慢，再上方案二。

---

## 二、2026 年免费行情速览（别再看旧教程了）

免费额度变化极快，很多流传的"免费"其实早就没了。这是这次逐个核实的结果：

**还活着的：**

| 平台 | 免费额度 | 关键限制 |
| --- | --- | --- |
| **Render** | Web Service 512MB / 0.1 CPU，750 实例小时/月 | 闲置 15 分钟休眠，冷启动 30~60 秒；免费 PostgreSQL 30 天后过期 |
| **Aiven** | MySQL 1 CPU / 1GB 内存 / **1GB 磁盘** | 单节点、无 SLA、`max_connections` 仅 76；长期无活动会被关机（可唤醒） |
| **TiDB Cloud Starter** | 5GiB 行存 + 5GiB 列存 + 5000 万 RU/月 | MySQL 线协议兼容但**非 100% 一致**；必须走 TLS |
| **Koyeb** | 1 个 Web Service 512MB / 0.1 vCPU | 闲置 1 小时缩容到 0；风控较严 |
| **Northflank** | 2 个服务 + 1 个数据库，**不休眠** | **必须绑卡** |
| **Oracle Cloud** | ARM 2 核 12GB + 2 台 AMD 微实例 + 200GB 存储 + 10TB/月出站 | 注册难；容量经常抢不到；长期低负载会被回收 |
| **Netlify / Cloudflare Pages** | 静态站点，带宽充足 | 只能放静态文件（我们前端正好是） |

**已经死了或名存实亡的：**

| 平台 | 现状 |
| --- | --- |
| Heroku | 2022 年 11 月起取消免费层 |
| Fly.io | 新组织已无免费额度，只给短期试用 |
| Railway | 只剩 $5 试用额度（30 天过期），之后 $5/月起 |
| Vercel Hobby | 免费但**禁止商用**，且跑不了长驻后端 |
| Zeabur | 要绑卡，且服务器还得另外买 |
| Back4app | 无需绑卡，但**每天只有 1 小时可用**，实际不可用 |
| PythonAnywhere | 还免费，但只能跑 Python，跟我们无关 |

> ⚠️ **一个必须知道的先例**：Oracle 在 2026 年 6 月把 Always Free 的 ARM 配额从 **4 核 24GB 悄悄砍到 2 核 12GB**，没有公告、没有邮件，只是改了文档页面，8 月 18 日起终止超配实例。**免费额度是市场预算，不是合同。** 重要数据要有随时搬走的准备。

---

## 三、方案一：全程不用信用卡

### 0. 前置：把项目推到 GitHub

Render 和大多数平台都从 Git 仓库拉代码。项目已备好 `.gitignore`（会自动排除 `backend/target/`、`.env` 等，**避免把数据库密码提交上去**）。

```bash
cd property-management-system
git init
git add .
git commit -m "物业管理系统"
# 在 GitHub 上新建一个空仓库（私有仓库也可以），然后：
git remote add origin https://github.com/你的用户名/property-management-system.git
git push -u origin main
```

> 不用担心 `backend/target/` 里那个 26MB 的 jar —— 已忽略，平台会在容器里自己编译。

#### 生成推送用的令牌（GitHub 新版界面）

往私有仓库 `git push` 需要凭证。用**细粒度令牌**，权限只开一个仓库的代码读写。

**最省事的方式**：直接用带参数的链接打开创建页，名称 / 有效期 / Contents 权限都会**预先填好**，你只需要选仓库、点生成：

```
https://github.com/settings/personal-access-tokens/new?name=pms-deploy&description=Deploy+PMS&expires_in=30&contents=write
```

> GitHub 官方支持用 URL 参数预填令牌，参数表见[官方文档](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#pre-filling-fine-grained-personal-access-token-details-using-url-parameters)。

纯手点的话按这个顺序（入口 https://github.com/settings/personal-access-tokens ）：

1. **Generate new token**
2. **Token name** 随便填（如 `pms-deploy`）；**Expiration** 30 天够用
3. **Repository access** → 选 **Only select repositories** → 勾上你的仓库
4. **Permissions** → 点右侧的 **+ 添加权限 / + Add permissions**
   > ⚠️ 新版界面**没有下拉列表了**，改成这个按钮。点开后标签停在「存储库」，里面有搜索框，搜 **内容 / Contents**，点它，再把权限级别从默认的「只读」改成 **读取和写入 / Read and write**。
5. 页面底部点 **生成令牌** → **立刻复制** `github_pat_...`（离开页面就再也看不到）

> **其他权限一个都不要加。** Contents 读写就够推送代码，加多了只会放大令牌泄漏的风险。

推送时把那串令牌当作密码：

```bash
git remote set-url origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
# Username: 你的 GitHub 用户名
# Password: 粘贴 github_pat_ 开头那串
```

---

### 1. 建一个免费 MySQL（Aiven）

1. 打开 https://aiven.io ，用邮箱或 GitHub 注册（**不需要信用卡**）
2. 控制台 → **Create service** → 选 **MySQL** → 计划选 **Free** → 区域选 **Singapore**（离国内近）→ Create
3. 等 2~5 分钟，状态变为 **Running**
4. 在服务的 **Overview** 页记下这几个值：

   | 项 | 示例 |
   | --- | --- |
   | Host | `mysql-3a1b2c-你的项目.aivencloud.com` |
   | Port | `12345`（**不是 3306**，要照抄） |
   | User | `avnadmin` |
   | Password | 点眼睛图标显示 |
   | Database | `defaultdb` |

5. **导入数据**。Aiven 免费实例本来就带一个现成的库 `defaultdb`，直接用它最省事——
   项目里已准备好一份**去掉建库语句**的脚本 `sql/property_db_for_aiven.sql`（15 张表 + 2229 条演示数据）。

   本机用 mysql 客户端直连导入（Aiven 强制 TLS，必须带 `--ssl-mode=REQUIRED`）：

   ```bash
   # Windows（用本机已装的 MySQL 8 客户端）
   "C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" \
     -h <Host> -P <Port> -u avnadmin -p --ssl-mode=REQUIRED \
     < sql/property_db_for_aiven.sql
   ```

   回车后输入 Aiven 密码，表会建在 `defaultdb` 里。

   > 想导到自建库 `property_db` 也可以（用 `sql/property_db.sql`，它自带 `CREATE DATABASE`），
   > 但部分免费实例不给建库权限，而且那个文件开头有 `DROP DATABASE`，**重复导入会清空数据**。
   > 图省事、图安全，就用 `defaultdb` + `property_db_for_aiven.sql`。
   > 重复导入前如报「表已存在」，先执行 `DROP DATABASE defaultdb; CREATE DATABASE defaultdb;` 再导。

6. 拼出 JDBC 连接串（**库名用 `defaultdb`**；注意保留 `sslMode=REQUIRED`，写成 `useSSL=false` 会连不上）：

   ```
   jdbc:mysql://<Host>:<Port>/defaultdb?sslMode=REQUIRED&useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true
   ```

---

### 2. 部署后端（Render）

1. 打开 https://dashboard.render.com/blueprints → **New Blueprint Instance** → 选你刚推上去的仓库
2. Render 会读仓库根目录的 **`render.yaml`**，自动创建一个 Web Service（镜像用 `backend/Dockerfile.paas`，容器内自己编译）
3. 它会让你填三个值（对应 `sync: false`）：

   | 变量 | 填什么 |
   | --- | --- |
   | `DB_URL` | 第 1 步拼好的那条 JDBC 串 |
   | `DB_USERNAME` | `avnadmin` |
   | `DB_PASSWORD` | Aiven 里那个密码 |

   `JWT_SECRET` 由 Render **自动生成随机值**，`CAPTCHA_ECHO_MODE` 已固定为 `false`，都不用管。
4. 点部署，等日志出现 `Started PropertyApplication`。首次构建要 3~8 分钟（要下载 Maven 依赖）
5. 拿到地址形如 `https://pms-backend-xxxx.onrender.com`
6. **验证**：浏览器打开

   ```
   https://pms-backend-xxxx.onrender.com/api/auth/captcha
   ```

   能看到一段 JSON（含 `captchaId`）就说明后端通了。第一次可能要等 30~60 秒（冷启动）。

---

### 3. 部署前端（推荐：Render 静态站点）

前端和后端**不在同一个域名**下，所以必须先告诉前端「后端在哪」。
项目里有个现成脚本专门干这件事：`scripts/gen-env.js`（免依赖，就是生成 `frontend/js/env.js`）。

**做法：在 Render 上再建一个静态站点**（同一个控制台、免费、不休眠，以后改了代码会自动重新部署）：

1. Render 控制台 → **New** → **Static Site** → 选同一个仓库
2. 三个关键项这样填：

   | 项 | 填什么 |
   | --- | --- |
   | Build Command | `node scripts/gen-env.js` |
   | Publish Directory | `frontend` |
   | 环境变量 `API_BASE` | 第 2 步拿到的后端地址，如 `https://pms-backend-xxxx.onrender.com` |

3. 部署完成后得到形如 `https://pms-frontend-xxxx.onrender.com` 的地址，打开就是登录页

> `API_BASE` 结尾**不用**自己加 `/api`，脚本会补；没写协议也会自动按 https 处理。
> 这个站点只在「构建时」跑一次脚本，把后端地址写进页面，运行期是纯静态托管，**不会有冷启动**。

**备选做法：Netlify Drop（不想多建一个服务时）**

1. 在**项目根目录**执行（地址换成你的后端地址）：

   ```bash
   node scripts/gen-env.js https://pms-backend-xxxx.onrender.com
   ```

   它会把后端地址写进 `frontend/js/env.js`。
2. 复制一份 `frontend` 目录到顺手的地方（例如桌面），删掉副本里的 `test/` 与 `serve.js`（本地测试用，不必发布）
3. 打开 https://app.netlify.com/drop ，把整个 `frontend` 文件夹拖进去
4. 几秒后拿到 `https://xxxx-yyyy.netlify.app`，打开即用

> 做完后如果还要在本机跑开发或测试，记得还原：`git checkout frontend/js/env.js`
> （`test_config.js` 会断言这个文件处于「未启用」状态，忘了还原会有一项失败。）

---

### 4. 验证清单

| 检查 | 预期 |
| --- | --- |
| 打开前端地址 | 看到登录页（毛玻璃暖色风格） |
| 用 `admin` / `123456` 登录 | 进入数据大屏 |
| 故意输错密码 3 次 | **出现图形验证码**（说明 Linux 容器里 AWT 画图正常） |
| 进"3D 小区地图" | 模型能加载（说明静态资源与 MIME 都对） |
| 登录后立刻改密码 | 改完会被强制重新登录 |

登录成功后**第一件事就是改掉 `admin` 的默认密码**。

---

## 四、方案二：Oracle 永久免费服务器

如果你能搞定 Oracle 的注册（这是唯一的门槛），这条路其实**更省事**——项目里现成的 `docker-compose.yml` 一行命令就跑起来了，而且永不休眠。

1. 注册 Oracle Cloud（需要**国际信用卡**做验证，会扣 1~2 美元然后退回；地址要和账单地址一致）
2. 创建实例：**Ampere A1**，规格选 **2 OCPU / 12GB**（别再照着老教程选 4 核 24G，那个额度已经没了），系统选 **Ubuntu 22.04**
3. 安全组放行 **80** 端口（**不要**放行 8080）
4. 装 Docker 并部署：

   ```bash
   curl -fsSL https://get.docker.com | bash
   systemctl enable --now docker
   # 把项目传上去（注意带上 backend/target 下的 jar）
   cd /opt/property-management-system
   bash deploy/deploy.sh
   ```

5. 浏览器打开 `http://服务器IP/`

> **好消息**：这套 compose 在 ARM 上可以直接跑 —— 三个基础镜像
> （`eclipse-temurin:17-jre-jammy`、`mysql:8.0`、`nginx:alpine`）都有 arm64 版本，不用改一个字。
>
> **注意**：Oracle 会把「7 天内 CPU/网络/内存 95 分位都低于 20%」的免费实例回收掉。
> 正常有人访问不会触发，但**建完就忘的空实例**正是它要清理的对象。

---

## 五、免费方案的代价（务必知道）

| 代价 | 说明 | 怎么办 |
| --- | --- | --- |
| **冷启动 30~60 秒** | Render 免费层闲置 15 分钟就休眠，下次访问要等它醒来 | 用免费探活服务（如 cron-job.org）每 10 分钟请求一次 `/api/auth/captcha` 保持唤醒；注意这样会吃掉几乎全部 750 小时/月的额度 |
| **数据库只有 1GB** | Aiven 免费层磁盘 1GB（本项目数据约 460KB，**够用**） | 要放大量图片/附件时就得升级 |
| **⚠️ 重启会丢失令牌吊销记录** | `TokenStore` 的 `jti` 黑名单存在**内存**里。休眠唤醒等于一次重启 —— 重启前"已登出/已改密"的旧令牌会重新变得有效 | 这是已知设计取舍（见 README 技术要点）。要彻底解决需接 Redis；免费方案下建议接受这一点，并**把 JWT 有效期调短**（`JWT_TTL_MINUTES`，默认 120 分钟） |
| **数据库会被自动关机** | Aiven 免费实例长期无活动会 power off（有邮件通知，可随时唤醒） | 定期访问即可；被关机后到 Aiven 控制台点开机 |
| **额度随时可能变** | Oracle 就是活例子：4 核 24GB → 2 核 12GB，零公告 | 别把唯一一份数据放在免费方案上；数据库记得定期导出备份 |
| **国内访问偏慢** | 免费 PaaS 的机房基本都在境外 | 要国内速度就上国内轻量服务器（见 `DEPLOY.md`，约 70~120 元/年） |

**一句话**：免费方案适合**演示、试用、小范围内用**；真要长期对外服务，`DEPLOY.md` 里那台一年不到一百块的国内服务器是更稳的选择。

---

## 六、这次为免费部署改了什么

| 文件 | 改动 | 为什么 |
| --- | --- | --- |
| `backend/Dockerfile.paas` | **新增**：多阶段镜像，容器里用 Maven 现场编译 | PaaS 从 Git 拉代码自己构建，你没法先传一个 jar 上去 |
| `render.yaml` | **新增**：Render 部署蓝图 | 一键建好服务，免去手填一堆参数 |
| `frontend/js/env.js` | **新增**：部署配置（唯一要改的文件） | 前后端不同域名时，用来指定后端地址 |
| `frontend/index.html`、`main.html` | 在 `config.js` 之前引入 `env.js` | 让上面的覆盖生效 |
| `backend/.../PropertyApplication.java` | 启动时解析端口：`SERVER_PORT → PORT → 8080` | PaaS 会注入**随机端口** `PORT`，写死 8080 会让平台的健康检查失败。这里踩过一个坑：起初把优先级写成 yml 里的嵌套默认值 `${SERVER_PORT:${PORT:8080}}`，**实测会被解析成空串**，导致 `server.port` 绑不上、Tomcat 退回随机端口（连本机启动都会一起坏）——改成在启动类里显式判断，行为可预测。 |
| `backend/.../application.yml` | 端口保持扁平的 `${SERVER_PORT:8080}` | 与文件里其它占位符写法一致，避免上面的嵌套坑 |
| `backend/.../application.yml` | 连接池改为可用环境变量控制 | 512MB 内存 + 免费库 `max_connections=76` 的前提下，池子要收窄（`DB_POOL_MIN_IDLE=1`、`DB_POOL_MAX=5`） |
| `.gitignore` | **新增** | 防止把 `backend/target/`、含密码的 `.env` 提交到公开仓库 |

> 这些改动**不影响现有用法**：本机 `2-启动后端.bat`、`3-启动前端.bat`、`docker-compose.yml`、
> 局域网访问，行为与之前完全一致（连接池与端口的默认值都没变）。

---

## 七、上线前必改项

| 项 | 默认值 | 免费方案下怎么处理 |
| --- | --- | --- |
| `admin` 密码 | `123456` | **登录后立刻改** |
| `JWT_SECRET` | 代码里有开发用默认值 | `render.yaml` 里已由 Render 自动生成随机值 |
| `CAPTCHA_ECHO_MODE` | `local`（回显答案） | 已固定为 `false` |
| CORS | 放行任意来源 | 演示阶段可接受；正式用建议收紧为白名单 |
| 数据库口令 | — | Aiven 生成，只存在于 Render 的环境变量里，别写进代码 |

---

## 八、常见问题

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 打开页面一直转圈，第一次特别慢 | Render 冷启动（休眠后被唤醒） | 等 30~60 秒；或用探活服务保活 |
| 页面能开，但接口全 404 | `frontend/js/env.js` 没改，前端在请求静态托管自己的域名 | 打开 `env.js` 填上后端地址（结尾带 `/api`） |
| 接口报 CORS 跨域 | 后端没起来 / 地址填错 | 先直接访问 `后端地址/api/auth/captcha` 确认后端活着 |
| 后端日志报 `Access denied` 或 TLS 相关错误 | JDBC 串写成 `useSSL=false` | Aiven 强制 TLS，必须写 `sslMode=REQUIRED` |
| 后端连不上数据库，提示 host 解析失败 | Port 填成 3306 了 | Aiven 给的是**非标准端口**，照抄控制台里的值 |
| 登录提示"账号或密码错误"，但本机明明能登 | 数据库没导入成功，或导到了别的库 | 用 Aiven 控制台的 Query editor 执行 `SELECT COUNT(*) FROM sys_user;` 确认有 4 条 |
| 验证码显示为空白方框 | 平台镜像缺字体 | 我们的 Dockerfile 已内置 `fontconfig` + 字体，若自行改过镜像需补回去 |
| 部署后过一会又要重新登录 | 实例休眠重启，内存里的吊销表清空 | 正常现象，见第五节 |
| 想换回本机跑 | — | 双击 `2-启动后端.bat` + `3-启动前端.bat`，`env.js` 记得把那一行重新注释掉 |

---

## 九、下一步

按顺序做，大约 20 分钟能拿到一个公网可访问的网址：

1. 推代码到 GitHub（第三节第 0 步）
2. Aiven 建库 + 导入数据（第 1 步）
3. Render 部署后端（第 2 步）
4. 用 `scripts/gen-env.js` 把后端地址注入前端 → Render 静态站点部署前端（第 3 步）
5. 用 `admin / 123456` 登录，改密码

中间任何一步卡住，把报错贴给我，我帮你对症排查。
