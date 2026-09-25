# 物业管理系统（Property Management System）

面向住宅小区的完整物业管理系统，覆盖 **小区楼栋管理、人员信息录入、物业费收缴、小区内外车位管理与临时停车计费、报修工单流转** 等核心业务。

| 层 | 技术 |
| --- | --- |
| 前端 | HTML + CSS + JavaScript + Vue 2.7 + Element UI 2.15 + ECharts 5（免构建，双击即可运行） |
| 后端 | SpringBoot 3.2 + MyBatis 3 + MySQL 8 |
| 数据库 | `property_db`，14 张业务表，2229 条演示数据 |

---

## 一、功能模块

| 模块 | 子功能 |
| --- | --- |
| **首页看板** | 核心指标概览、待办提醒、物业收费趋势、房屋入住分布、报修类型分布、车位使用情况（按角色分范围：管理员看全小区，业主只看自己那一套） |
| **3D 小区地图** | Three.js 三维楼栋模型（鸟瞰/俯视/地面视角、旋转缩放、定位我家）；点击楼栋/楼层/房间查看详情；业主自己的房间金色高亮，他人房间锁定置灰，点击提示「无权查看其他房间的信息」 |
| **房产资源** | 楼栋管理（单元/楼层/户数/入住率统计）、房屋管理（面积/户型/朝向/状态）、车位管理（分配/退租/车位一览） |
| **住户服务** | 人员信息录入（业主/租户/家庭成员）、访客登记与离场核销 |
| **收费管理** | 收费标准配置、物业费账单生成与收缴、车位管理费、缴费记录、欠费催缴、收费统计 |
| **停车收费** | 临时停车进出场登记、自动计费、出场结算、在场车辆监控、小区外临街车位收费 |
| **报修服务** | 报修提交、派单、处理、完工、业主评价（完整工单流转） |
| **综合管理** | 投诉建议受理回复、通知公告发布、设备设施台账与维保计划 |
| **系统管理** | 用户账号、角色（超级管理员/物业员工/业主）、修改密码、**操作日志**（写操作审计，仅管理员） |

### 数据权限（按角色隔离）

| 角色 | 可见范围 |
| --- | --- |
| 管理员 ADMIN | 全部数据 + 用户管理 |
| 物业人员 STAFF | 全部业务数据（无用户管理） |
| 业主 OWNER | **仅自己房间**的房屋、家庭成员、账单、缴费、报修、投诉、访客；不可见他人信息，新增/删除等管理操作被拒 |

- 业主账号与业主档案通过**手机号**自动关联（如 `yeye01` ↔ 邹建华 ↔ 1号楼1单元101）
- 业主越权访问（如猜 ID 查他人房屋详情）返回业务拒绝，不泄露数据
- 「用户管理」菜单仅管理员可见，后端接口同样强制校验（前端隐藏 + 后端拦截双保险）

**数据隔离的三道防线**

1. **首页看板 / 数据大屏按角色分流**：`/dashboard/overview|charts|todos` 对业主返回 `scope=SELF`，只统计自己那一套房屋/家庭成员/车位/账单/报修/投诉/访客，并隐藏物业侧待办；管理员返回 `scope=ALL` 全量数据。`/dashboard/screen` 同样分流——业主只拿到 `overview + charts + todos` 三块，**不下发** `buildingHouse / repairStatus / billStatus / billPeriods / complaintTypes / complaintStatus / personTypes / equipmentStatus / tempParkingTypes` 等 9 个经营维度。
2. **3D 场景只给几何与聚合**：`/community/scene` 对业主只返回**楼栋轮廓 + 户数统计 + 自己那间房**，不含任何他人房间明细，也不返回楼栋负责人及电话；管理员才拿得到完整信息。
3. **明细接口兜底**：即使前端被绕过直接调 `/house/page`、`/owner/detail/{id}`、`/parkingSpace/page` 等，后端 `DataScope` 组件也会按 `sys_user.phone → owner.phone → owner.houseId` 强制过滤/拒绝。

### 核心业务规则

**临时停车计费**（小区外临街 / 小区内临停统一）

```
前 30 分钟       免费
超过 30 分钟     首小时 5 元
超出部分         每满 1 小时加收 3 元（不足 1 小时按 1 小时计）
封顶             24 小时内最高 30 元
```

**物业费**：`房屋建筑面积 × 收费标准单价`

- 住宅 2.50 元/㎡·月 · 公寓 3.20 元/㎡·月

**车位管理费**：地下 300 元/月 · 地面 180 元/月 · 小区外临街 150 元/月

**报修工单流转**

```
待受理 PENDING → 已派单 ASSIGNED → 处理中 PROCESSING → 已完成 FINISHED → 已关闭 CLOSED(业主评价)
```

---

## 二、目录结构

```
property-management-system/
├─ 1-初始化数据库.bat        # 一键建库+导入演示数据（交互式输入 MySQL 密码）
├─ 2-启动后端.bat            # 一键启动后端（优先用打好的 jar，无 Maven 也能跑）
├─ 3-启动前端.bat            # 一键启动前端（用 Node.js 起静态服务，监听 0.0.0.0，并打印局域网地址）
├─ 4-编译打包.bat            # 重新编译打包后端
├─ 5-局域网访问.bat          # 列出本机局域网地址 + 放行防火墙 8080/9000（需管理员运行）
├─ 6-公网临时访问.bat        # 临时映射到公网，发网址给别人就能打开（免注册，约 60 分钟有效；部分地区网络可能被拦）
├─ README.md
├─ .gitignore                # 排除构建产物与含密码的 .env（推 GitHub 前必备）
├─ DEPLOY.md                 # 部署到公网服务器指南（自购服务器：路线对比 + 一键部署 + 上线清单）
├─ DEPLOY-FREE.md            # 免费部署指南（Render + Aiven MySQL + 静态托管，全程不用信用卡）
├─ render.yaml               # Render 部署蓝图（免费后端托管，读它自动建服务）
├─ docker-compose.yml        # 容器编排：mysql + backend + frontend(nginx 静态托管 + /api 反代)
│
├─ deploy/                   # 服务器部署配套文件
│  ├─ deploy.sh              # 服务器一键部署（自动生成随机密码/JWT 密钥 → 构建 → 探活）
│  ├─ nginx.conf             # 静态托管 + /api 反向代理（含 HTTPS 示例）
│  ├─ frontend.Dockerfile    # 前端镜像（构建上下文是项目根）
│  └─ .env.example           # 环境变量模板
│
├─ sql/
│  ├─ property_db.sql        # 建库+建表+2229 条演示数据，直接导入即可
│  ├─ property_db_for_aiven.sql  # 同上但去掉建库语句（免费 Aiven 实例导入 defaultdb 用）
│  ├─ generate_sql.py        # 演示数据生成器（固定随机种子，结果可复现）
│  └─ check_mapper.py        # 实体/Mapper 字段 ↔ 数据表 一致性检查
│
├─ scripts/
│  └─ gen-env.js             # 把后端地址写进 frontend/js/env.js（前后端不同域名部署时用）
│
├─ backend/                  # SpringBoot 后端（69 个 Java 文件）
│  ├─ pom.xml
│  ├─ Dockerfile             # 后端镜像（内置验证码所需字体，强制 java.awt.headless）
│  ├─ Dockerfile.paas        # PaaS 版镜像（容器内 Maven 现场编译，供 Render/Koyeb 用）
│  └─ src/main/
│     ├─ java/com/property/
│     │  ├─ PropertyApplication.java     # 启动类
│     │  ├─ common/       # Result 统一返回 / PageResult 分页 / 异常处理 / BaseMapper / BaseService
│     │  ├─ config/       # 跨域、登录拦截器、Token 存储
│     │  ├─ entity/       # 14 个实体类
│     │  ├─ mapper/       # 14 个 MyBatis Mapper 接口
│     │  ├─ service/      # 15 个业务 Service（DashboardService 按角色分范围，含大屏聚合 screen()）
│     │  └─ controller/   # 16 个 REST Controller（126 个接口，含 CommunityController、LogController）
│     └─ resources/
│        ├─ application.yml              # 数据源 / MyBatis 配置（支持环境变量覆盖）
│        └─ mapper/*.xml                 # 13 个 MyBatis SQL 映射文件
│
└─ frontend/                 # Vue + Element UI 前端
   ├─ index.html             # 登录页（暖色渐变 + 毛玻璃质感，非传统蓝调）
   ├─ main.html              # 主界面（侧边菜单 + 路由视图）
   ├─ css/style.css
   ├─ libs/                  # Vue / Element UI / axios / ECharts / Three.js（全部本地化，离线可用）
   ├─ serve.js               # 零依赖静态服务器（Node.js 实现，供 3-启动前端.bat 调用）
   ├─ js/
   │  ├─ env.js              # 部署环境配置（前后端不同域名时改这一个文件；默认不启用）
   │  ├─ config.js           # 全局配置（后端地址自动推导、演示模式开关）
   │  ├─ utils.js            # 数据字典 + 工具函数（PmsUtils，含 XSS 安全渲染）
   │  ├─ mock.js             # 本地演示数据（仅当 AppConfig.allowDemo=true 时启用，同样按角色隔离）
   │  ├─ api.js              # 接口封装（统一 token 注入、错误处理、演示模式降级）
   │  ├─ permission.js       # 角色权限 mixin（canManage / ownerAccount，管理按钮按角色显隐）
   │  └─ pages/*.js          # 17 个业务页面组件（含 community3d.js 3D 小区地图、bigscreen.js 数据大屏、syslog.js 操作日志）
   └─ test/
      ├─ test_mock.js        # 演示数据与业务流程测试（83 项）
      ├─ test_api_surface.js # 接口一致性测试：后端 ↔ 前端 ↔ 演示数据（7 项）
      ├─ test_render.js      # jsdom 真实渲染测试（98 项，含登录防重入 + 数据大屏隔离）
      ├─ test_config.js      # 接口地址推导 + 部署钩子测试（23 项）
      └─ test_real_backend.js# 前端 ↔ 真实后端联调（26 项，需先启动后端）
```

> 另附两个 Python 端到端脚本（需先启动后端）：`check-e2e.py`（126 个接口回归）、`check-isolation.py`（数据隔离 + 写权限专项，逐项校验业主/管理员/物业三类角色的可见范围与管理类写操作的准入）

---

## 三、环境要求

| 组件 | 版本 | 说明 |
| --- | --- | --- |
| JDK | 17+ | 后端运行必需 |
| MySQL | 8.0 | 数据库 |
| Maven | 3.6+ | 仅编译后端时需要；已打包 jar 则可跳过 |
| 浏览器 | Chrome / Edge | 现代浏览器均可 |
| Node.js | 16+ | **启动前端本地服务必需**（`frontend/serve.js` 是零依赖静态服务器）；运行自动化测试也需要 |

> **前端本地服务不依赖 Python**：`3-启动前端.bat` 会优先用 Node.js 起静态服务，没有 Node 才回退到 Python，两者都没有则直接用浏览器打开本地文件。
> 另需注意：Windows 应用商店里的 `python.exe` 是 0 字节占位符（App Execution Alias），执行它既不报错也**不会真的启动服务**——这正是「双击启动前端后浏览器打不开」的常见根因，脚本已自动排除该路径。

---

## 四、快速开始

### 方式 A：一键脚本（推荐）

```
1. 双击  1-初始化数据库.bat     →  输入 MySQL 用户名/密码，自动建库并导入演示数据
2. 双击  2-启动后端.bat         →  提示接口地址 http://localhost:8080/api
3. 双击  3-启动前端.bat         →  自动打开浏览器，并打印可供他人访问的局域网地址
4. 用演示账号登录
```

> 想让同事 / 手机也能访问？见 [十、让局域网内其它人访问本系统](#十让局域网内其它人访问本系统)。

### 方式 B：手动命令

```bash
# 1. 初始化数据库
mysql -u root -p < sql/property_db.sql

# 2. 启动后端（二选一）
cd backend
mvn spring-boot:run                       # 用 Maven 启动
java -jar target/property-management-system-1.0.0.jar   # 或用打好的 jar

# 3. 打开前端（内置零依赖静态服务器，本机与局域网均可访问）
cd frontend && node serve.js 9000 0.0.0.0
# 浏览器访问 http://localhost:9000/index.html

# 只想对外开一个端口时（内网穿透 / 容器 / 反向代理场景），让 /api 也从这个端口走：
cd frontend && node serve.js 9000 --api 8080
# 此时页面与接口同源，不会遇到跨域，也不会被浏览器拦 http 接口
```

### 数据库账号配置

`backend/src/main/resources/application.yml` 支持环境变量覆盖，改配置或设环境变量都行：

```yaml
spring:
  datasource:
    url: ${DB_URL:jdbc:mysql://localhost:3306/property_db?...}
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:123456}
```

```bash
# 或者用环境变量传入，不动配置文件
DB_USERNAME=root DB_PASSWORD=你的密码 java -jar target/property-management-system-1.0.0.jar
```

### 演示账号

| 账号 | 密码 | 角色 | 说明 |
| --- | --- | --- | --- |
| `admin` | `123456` | 超级管理员 | 全部数据 + 用户管理 |
| `wuye01` / `wuye02` | `123456` | 物业员工 | 全部业务数据 |
| `baojie` / `weixiu` | `123456` | 物业员工 | 全部业务数据 |
| `yeye01` | `123456` | 业主（邹建华） | 仅 1号楼1单元101 的数据 |
| `yeye02` | `123456` | 业主（刘华琪） | 仅 1号楼1单元201 的数据 |

> 业主账号与业主档案通过手机号自动关联，登录后只能看到自己房间的房屋、账单、报修等数据。

> **只连真实后端（默认）**：前端不做演示模式降级。后端没启动时，登录页会明确提示「无法连接后端服务（地址）」并提供「重试连接」；主界面会显示同样的提示条并提供「重试连接」，**不会**用内置数据把页面撑起来——避免「看着能用、其实没落库」。
>
> **离线演示能力仍保留，但改为显式开启**：把 `frontend/js/config.js` 里的 `AppConfig.allowDemo` 改成 `true`，后端离线时才会自动降级为 `mock.js` 内置数据（所有业务流程都可完整操作）。此开关默认 `false`，仅建议在离线演示或自动化测试时打开。

---

## 五、主要接口（共 126 个）

统一前缀 `http://localhost:8080/api`，除登录接口外均需在请求头携带 `Authorization: <token>`。

| 模块 | 代表接口 |
| --- | --- |
| 认证 | `POST /auth/login`、`POST /auth/logout`、`GET /auth/current`、`POST /auth/password`、`GET/POST/PUT/DELETE /auth/users` |
| 看板 | `GET /dashboard/overview`、`/dashboard/charts`、`/dashboard/todos`（业主返回 `scope=SELF` 自范围） |
| 数据大屏 | `GET /dashboard/screen`（大屏聚合：`overview + charts + todos` 为公共部分；管理员额外下发 `buildingHouse/repairStatus/billStatus/billPeriods/complaintTypes/complaintStatus/personTypes/equipmentStatus/tempParkingTypes` 9 个经营维度，业主**不下发**） |
| 3D 场景 | `GET /community/scene`（楼栋几何 + 户数聚合；业主仅额外返回自己那一间房，不含他人明细与负责人电话） |
| 楼栋 | `GET /building/page`、`/building/list`、`/building/statistics`、`GET /building/{id}`、`POST/PUT /building`、`DELETE /building/{id}` |
| 房屋 | `GET /house/page`、`/house/statistics/status`、`/house/statistics/type`、`POST /house/checkIn` |
| 人员 | `GET /owner/page`、`/owner/statistics`、`POST/PUT/DELETE /owner` |
| 车位 | `GET /parking/page`、`/parking/statistics`、`POST /parking/allocate`、`POST /parking/release` |
| 物业费 | `GET /feeBill/page`、`/feeBill/statistics/unpaid`、`POST /feeBill/generate/property`、`/feeBill/generate/parking`、`POST /feeBill/pay`、`/feeBill/payBatch`、`/feeBill/cancelPay` |
| 缴费记录 | `GET /feePayment/page`、`/feePayment/statistics/month`、`/feePayment/statistics/method`、`/feePayment/statistics/today` |
| 临时停车 | `POST /tempParking/entry`、`POST /tempParking/exit`（`payMethod=FREE` 免费放行）、`GET /tempParking/preview/{id}`、`/tempParking/calcFee`、`/tempParking/inParking`、`/tempParking/statistics` |
| 报修 | `GET /repair/page`、`POST /repair`、`/repair/assign`、`/repair/start`、`/repair/finish`、`/repair/rate`、`/repair/statistics/rating` |
| 投诉 | `GET /complaint/page`、`POST /complaint/reply`、`/complaint/statistics/status`、`/complaint/statistics/type` |
| 公告 | `GET /notice/page`、`/notice/list`、`GET /notice/{id}`（阅读量+1） |
| 访客 | `GET /visitor/page`、`POST /visitor/leave` |
| 设备 | `GET /equipment/page`、`POST /equipment/maintain` |

完整清单可通过接口一致性测试输出查看（见下）。

---

## 六、自动化测试

离线测试四套，共 **211 项断言**（83 + 7 + 98 + 23）；真实后端两侧，共 **98 项隔离与权限断言 + 26 项联调断言 + 126 个接口回归**。全部通过。

```bash
cd frontend/test

# 1) 演示数据与业务流程（83 项）—— 数据生成完整性、23 个接口返回、
#    停车计费规则、缴费/派单/车位分配/临停结算等流程、看板数据一致性
node test_mock.js

# 2) 接口一致性（7 项）—— 运行时反射加载 api.js，比对
#    后端 Controller ↔ 前端请求 URL ↔ 演示数据处理器 三方是否对得上
node test_api_surface.js

# 3) 接口地址推导 + 部署钩子（23 项）—— 穷举各种访问方式断言后端地址：
#    本机/局域网直连 :8080、服务器同域 /api、非标准端口、手动覆盖优先级、
#    file:// 直开与 Node 无 location 环境的兜底；
#    并校验 js/env.js 存在、两个 HTML 都在 config.js 之前引入它、且默认未启用覆盖
node test_config.js

# 4) jsdom 真实渲染（98 项）—— 在无浏览器环境下真实执行 Vue + Element UI，
#    验证登录流程、17 个页面能否渲染出内容、核心写操作可用、无未捕获异常、
#    "后端启动后自动切回真实数据"的探测逻辑，以及数据大屏的角色隔离
NODE_PATH="<jsdom 所在目录>" node test_render.js

# 5) 前端 ↔ 真实后端联调（26 项，需先启动后端）—— 强制关闭演示模式，
#    让 api.js/axios 真实请求 8080：登录、7 组读数据与直连后端逐一比对、
#    一次完整的新增/修改/删除并确认落库、错误密码/重复编号拦截、登出后 token 失效
NODE_PATH="<jsdom 所在目录>" node test_real_backend.js
```

后端侧的两套检查（需要 Python）：

```bash
cd sql
python check_mapper.py    # 校验 14 个实体、13 个 Mapper、约 180 处字段引用与建表语句是否一致

cd ..
python check-e2e.py         # 端到端联调: 遍历 126 个接口, 对照数据库核对条数/筛选/统计/CRUD/鉴权
python check-isolation.py   # 数据权限专项(98 项): 修改密码 + 业主隔离 + 3D 场景 + 管理类写操作拦截 + 业主自助改信息 + 换号关联
                            #   + 看板分范围 + 手机号唯一性 + 越权拦截
```

### 做过的验证

| 验证项 | 结果 |
| --- | --- |
| 后端编译打包 | 69 个 Java 文件，0 错误，产出 26MB 可执行 jar |
| 实体/Mapper 字段 ↔ 数据表 | 14 个实体、13 个 Mapper、约 180 处字段引用，全部一致 |
| 前端 113 个请求 URL ↔ 后端接口 | 全部匹配，无「前端调了后端没有」 |
| 页面 86 处 `Api.*` 调用 | 运行时反射校验，全部存在 |
| 演示模式接口覆盖 | 全覆盖（含新增的 `/community/scene`、`/dashboard/screen`） |
| 前端 jsdom 渲染 | 登录页 + 主界面均正常挂载；17 个业务页面均能渲染出内容 |
| 数据大屏渲染 | `.bs-page` 挂载正常，4 张 KPI + 4 项财务指标 + 8 个图表 + 收缴进度 + 底栏全部渲染，运行期 0 未捕获异常 |
| 数据大屏角色隔离 | 管理员 `scope=ALL` 且下发 9 个经营维度；业主 `scope=SELF`（房屋=1）且 9 个维度**全部不下发** |
| 演示模式默认关闭 | `allowDemo=false` 时 `enable()` 失效、遗留 `pms_demo` 标记被忽略、离线只提示不降级，57/57 通过 |
| 刷新 / 异常地址不再白屏 | 正常地址内容区非空（842 字符）、遗留 `#/redirect/dashboard` 兜底回 `#/dashboard`、完全未知 hash 同样兜底、刷新后 hash 不被改写，7/7 通过 |
| 图形验证码按需出现且必填 | 初始不显示、页面无「手动开启」入口、后端 428 时自动出现并拉图、空验证码提交被拦（0 次请求）、填后带 `captchaId+captchaCode` 提交，10/10 通过 |
| 局域网访问链路 | 前端 `0.0.0.0:9000`、后端 `0.0.0.0:8080` 均从局域网 IP 返回 200；CORS 预检对 `Origin: http://192.168.x.x:9000` 正确回显并放行 |
| 演示数据与业务流程 | 83/83 通过 |
| 修改密码（真实后端） | 改后旧密码立即失效、新密码可登录，6/6 通过 |
| 业主数据隔离 | 房屋/人员/账单/缴费/报修/投诉/访客全部按房间隔离，越权访问与写操作被拒 |
| 3D 场景隔离 | 业主只拿到楼栋聚合 + 自己那一间房；不含他人明细、不含物业负责人电话 |
| 看板数据范围 | 业主 `scope=SELF`（房屋=1），管理员 `scope=ALL`（房屋=138） |
| 数据大屏隔离 | `/dashboard/screen` 业主仅 `overview+charts+todos`，管理员额外 9 个经营维度；实测业主侧 9 个维度全部缺失 |
| 手机号唯一性 | 同一手机号被第二个账号占用时新增被拒（账号↔档案关联键不可重复） |
| **数据权限专项** | **98/98 通过**（`python check-isolation.py`） |
| **真实 MySQL 端到端联调** | **126 个接口、0 失败**（`python check-e2e.py`） |
| **前端 ↔ 真实后端联调** | **26/26 通过**（`node test_real_backend.js`，演示模式强制关闭） |

端到端联调明细（真实 MySQL + 打包后的 jar 实测）：

- 登录/鉴权：正确登录、错误密码、不存在账号、无 token、伪造 token，全部按预期放行或拦截
- 13 张表的分页列表条数与数据库实际行数完全一致（2229 条演示数据）
- 59 个查询类接口全部可用：0 个系统异常（无 SQL 错误）、0 个 404
- 受控 CRUD 全流程通过（新增→查询→修改→删除，只动自建测试数据）
- 25 个筛选条件的参数绑定全部正确（含中文参数）
- 21 个统计接口全部正常，看板 overview 数值与数据库一致（房屋 138 / 人员 217 / 车位 180）
- 登出后旧 token 立即失效，重新登录可用

### 安全自审（对新增代码的独立审查）

针对本次新增的登录页、3D 场景、看板分范围与数据隔离代码，逐项做了静态排查与运行验证：

| 检查项 | 结论 |
| --- | --- |
| SQL 注入 | Mapper 全部使用 `#{}` 预编译占位符，**无 `${}` 拼接**、无 ORDER BY/LIMIT 动态拼串 |
| XSS | 前端全程 **0 处 `innerHTML` / `v-html`**；3D 楼栋标签走 canvas `fillText`，列表走 Vue 插值（自动转义） |
| 越权（IDOR） | 猜 ID 查他人房屋/人员详情、按楼层筛选他人房屋，均被 `DataScope.checkHouseId/checkOwnerId` 拒绝 |
| 3D 信息泄露 | `/community/scene` 对业主只返回楼栋聚合 + 自己那一间房，**不下发他人房间明细，也不下发楼栋负责人电话** |
| 看板信息泄露 | `/dashboard/*` 对业主只统计自己那一套，隐藏物业侧待办，不泄露全小区经营数据 |
| 大屏信息泄露 | `/dashboard/screen` 把 **9 个经营维度**（楼栋户数排行、报修/账单/投诉分布、人员构成、设备状态、临停车型）放在 `if (owner) return` 之后，业主请求时**这些字段根本不出现在响应体里**（不是置空、不是打码），无法从响应结构反推 |
| 提权写入 | 管理类写操作（楼栋/设备/收费标准/公告/车位/临时停车/房屋/账单/人员）统一走 `DataScope.requireStaff`，**白名单式**准入（仅 ADMIN/STAFF）；未登录由 `LoginInterceptor` 拦为 401 |
| 管理接口 | `/auth/users` 五个端点全部经 `requireAdmin()` 校验，非管理员直接拒绝 |
| 关联键唯一性 | **已修复**：手机号是「账号 ↔ 房屋档案」的关联键，原先无唯一约束，`selectByPhone ... LIMIT 1` 会在号码重复时静默命中他人档案 → 已加应用层校验 + `sys_user.uk_phone` 唯一索引 |
| 密码存储 | **已加固**：`PasswordUtil` 统一 BCrypt 校验；历史明文密码在首次登录成功后**自动升级为密文**（平滑迁移，无需停机改库）；登录响应与列表一律不带密码字段 |
| Token 机制 | **已加固**：`TokenStore` 改为自签 HS256 JWT（`sub/usr/role/ver/iat/exp`），有有效期（默认 120 分钟）与滑动续期；登出把 `jti` 记入吊销表；改密/禁用账号时 `token_version` 自增 → 所有旧令牌立即失效 |
| 登录防爆破 | **已加固**：`LoginAttemptService` 按 `账号+IP` 统计连续失败，达阈值要求图形验证码，继续失败则临时锁定；`CaptchaService` 用 AWT 生成真实验证码（干扰线/噪点/旋转，TTL 5 分钟、一次性消费） |
| 操作审计 | **已加固**：新增 `sys_log` 表 + `OperationLogInterceptor` 拦截所有写操作与登录登出，按 URI 自动推导模块与动作，密码类字段脱敏，失败操作也留痕；`/log/page`、`/log/statistics` 仅管理员可查 |
| CORS | ⚠️ 为「双击打开 HTML」与**局域网多机访问**的免构建用法放行了 `allowedOriginPatterns("*")` + `allowCredentials`，生产应改为白名单域名 |

> 「⚠️」这条属于**免构建/局域网部署的取舍**：不放开就无法用 `file://` 或 `http://192.168.x.x:9000` 直连后端。正式上线（固定域名）时应改为白名单。其余各项目前均已拦截或已修复。

---

## 七、常见问题

**Q1：`mvn` 报「找不到或无法加载主类 org.codehaus.plexus.classworlds.launcher.Launcher」**

Maven 安装路径含中文或空格会导致 classworlds 加载失败。把 Maven 复制到纯英文路径（如 `D:\tools\apache-maven`），并确认 `JAVA_HOME` 指向 JDK 而非 JRE。

**Q2：后端启动报 `Access denied for user 'root'@'localhost'`**

数据库密码不对。改 `application.yml`，或用环境变量 `DB_PASSWORD` 传入。

**Q3：前端提示「无法连接后端服务」**

说明后端未启动或地址不通。先在浏览器直接访问 `http://localhost:8080/api/auth/captcha` 确认后端在线；再核对 `frontend/js/config.js` 里的 `baseURL`（默认 `http://localhost:8080/api`）。修好后点页面上的「重试连接」即可，**不会**再自动降级为演示数据。

**Q4：登录后 3D 小区地图是空白 / 只有平面网格**

说明浏览器未启用 WebGL（或显卡驱动被禁用）。页面会自动降级为**平面网格视图**，功能不受影响。想看到三维效果，请用 Chrome / Edge 打开，并在 `chrome://gpu` 确认 WebGL 为 Enabled。

**Q5：业主登录后在 3D 地图上点不动别的楼栋 / 房间**

这是**预期行为**。业主只能查看自己那一套房间（金色高亮），其他房间被置灰锁定，点击会提示「无权查看其他房间的信息」。管理员与物业账号不受此限制。

**Q6：数据大屏上业主看到的指标怎么比管理员少？**

这是**预期的分范围设计**，不是 bug。业主登录时大屏顶部会显示 `仅本户` 徽标，页面自动收窄为「核心指标 + 我的房屋 + 缴费/报修概况」，物业侧的楼栋排行、投诉分布、设备台账等**后端压根不下发**，所以前端也无法展示。管理员与物业账号登录则显示 `全小区` 徽标与全部 9 个经营维度。

**Q7：数据大屏的数据多久刷新一次？**

进入页面即拉一次 `/dashboard/screen`，之后每 **60 秒**自动刷新一次；右上角也有手动「刷新」按钮。顶部时钟每秒走一次，与数据刷新彼此独立。点右上角「全屏」可切到浏览器全屏（浏览器不支持时会给出提示）。

**Q8：如何重新生成演示数据？**

```bash
cd sql && python generate_sql.py    # 固定随机种子，结果可复现
```

**Q9：直接双击 HTML（file://）能用吗？**

可以。所有前端依赖都在本地 `libs/`，后端已配置跨域放行。若浏览器安全策略限制，改用 `cd frontend && node serve.js 9000`。

**Q10：点顶栏的「刷新」之后页面空白，或地址栏变成 `#/redirect/xxx` 后按 F5 一直空白？**

这是**已修复的 bug**：早先的刷新实现跳转到 `/redirect<当前路径>`，但路由表里没有这条路由，`<router-view>` 匹配不到组件，内容区就渲染成空白；同时地址栏 hash 被改写成 `#/redirect/xxx`，所以再按 F5 依旧空白。
现在改为**整页重载**，并给路由表补了一条兜底规则 `{ path: '*', redirect: '/dashboard' }` —— 任何未登记的地址都会回到首页看板，不会再出现"整页空白却看不出原因"。
若你用的是旧版本代码，改动 `frontend/main.html` 中 `refresh()` 与路由表末尾即可（`test_render.js` 第九节有 7 项断言锁住这个行为）。

**Q11：登录页什么时候会出现图形验证码？为什么有时要填、有时不用？**

验证码是**按需触发**的：正常登录不需要填；只有后端判定「本次登录有风险」（同一账号 + 同一 IP 连续失败达阈值，默认 3 次）时，登录接口会返回 `code=428`，页面**自动展开**验证码输入框与图片，并且此时**必填**——空着提交会被前端拦下，不发出登录请求。
失败次数继续累积到锁定阈值（默认 6 次）会临时锁定 10 分钟，期间一律拒绝。
页面上刻意**没有**"手动开启/收起验证码"的开关，避免被误解成可选步骤。

**Q12：怎么判断某个账号为什么登录不上？**

看管理端「操作日志」页（`/log/page`），登录成功与失败都会留痕：失败记录带 `status=0` 与错误原因（密码错误/账号不存在/验证码错误/已锁定），并记下 IP 与耗时。也可以用 `check-isolation.py` 之类脚本直接打接口定位。

---

## 八、技术要点

1. **统一返回体**：接口统一返回 `{ code, msg, data }`，分页数据外层为 `PageResult{ total, rows, pageNum, pageSize }`（分页字段是 **`rows`** 不是 `list`）。
2. **登录鉴权**：登录签发 **JWT**（HS256 自实现，无额外依赖），`LoginInterceptor` 校验请求头 `Authorization`；校验链为「验签 → 验期 → 按 `sub` 回查数据库取最新角色/状态 → 比对 `ver` 与 `sys_user.token_version` → 查 `jti` 是否已吊销」，因此改密、禁用、登出都能让旧令牌立刻失效。密钥与有效期走 `security.jwt.secret` / `ttl-minutes`（生产用环境变量 `JWT_SECRET` 注入）。
3. **泛型基类复用**：`BaseMapper<T>` + `BaseService<M, T>` 承载通用 CRUD 与分页，业务模块只写自身特有逻辑，避免样板代码。
4. **MyBatis 双写法**：简单 SQL 用注解（`SysUserMapper`），条件查询与统计用 XML，开启驼峰自动映射。
5. **事务控制**：账单生成、缴费、车位分配、工单流转等跨表操作均标注 `@Transactional`。
6. **业务校验前置**：删除楼栋前校验是否有房屋、重复缴费拦截、车位重复分配拦截、临停车辆重复入场拦截等，均在 Service 层给出友好提示。
7. **只连真实后端**：`AppConfig.allowDemo` 默认 `false`，`DemoMode.isOn()` 恒为 `false`、`enable()` 直接失效，网络异常时 `api.js` 抛出明确错误而不是悄悄用 mock —— 保证页面上看到的每条数据都来自后端。
8. **离线演示能力（显式开启）**：把 `AppConfig.allowDemo` 置 `true` 后，`mock.js` 会接管全部接口，前后端可脱离运行、便于演示与自动化测试；**演示模式下同样校验返回码**，业务失败会正常抛出（不会把「密码错误」当成登录成功）。
9. **3D 场景按需分层**：后端只下发「楼栋几何 + 户数聚合」，房间里有多少人、欠多少费一律不下发；点击房间时才按需调明细接口，由 `DataScope` 兜底过滤。这样 3D 页首屏体积小，也不会因为"整场景一次性下发"而泄露他人数据。
10. **WebGL 能力探测**：创建 `WebGLRenderer` 之前先 `canvas.getContext('webgl')` 探测，不支持时降级为平面网格视图——既避免控制台报错，也让无显卡环境（含 jsdom 测试）能跑通。
11. **数据权限单一入口**：所有隔离判断集中在 `DataScope`（`isOwnerRole / isStaffRole / currentOwnerProfile / checkHouseId / checkOwnerId / requireStaff / denyOwnerWrite`），各 Controller 只调用不重复实现，避免漏改。管理类写操作用**白名单**（仅 ADMIN/STAFF）而不是「只拦业主」，将来新增角色也不会漏网。
12. **大屏聚合单接口**：`/dashboard/screen` 一次请求返回 15 个数据块（概览、7 组图表、待办、9 个经营维度），避免大屏开十几个并发请求打后端；业主侧在 `if (owner) return` 处提前返回，经营维度**不进响应体**而非置空。
13. **大屏前端两处性能细节**：ECharts 实例按图表 key 缓存复用（`ctx(key, el, option)`），刷新只 `setOption` 不重建，避免长时间开着大屏导致实例泄漏；KPI 数字走 `requestAnimationFrame` 补间动画，组件 `beforeDestroy` 统一取消时钟、轮询与所有 RAF。
14. **3D 昼夜光照切换**：光源句柄保存在普通实例属性上（`this._hemi/_sun/_fill`，不出现在 `data()` 里），`applyTheme()` 只改 `fog` 与光源强度/色温，不重建场景与材质，切换零卡顿。

### 开发中踩过的坑（已修复，记录备查）

| 问题 | 原因 | 处理 |
| --- | --- | --- |
| 前端所有列表的状态标签渲染失败 | 页面把工具库写成了 `methods: { Utils }`。Vue 初始化 methods 时执行 `vm[key] = typeof methods[key] !== 'function' ? noop : bind(...)`，**往 methods 里放对象会被静默替换成空函数**，于是 `Utils.tag(...)` 报错 | 改为全局 mixin 提供 computed `PmsUtils`；工具库全局名也从 `Utils` 改为 `PmsUtils`（`Utils` 会被 Element UI 的 focus-trap 占用） |
| 房屋入住、车位分配等接口报 `is not a function` | `api.js` 的 `crud()` 未暴露 `_request`，页面无法调用 `/house/checkIn`、`/parking/allocate` 等模块专有接口 | `crud()` 增加 `_request`；`building` 额外提供 `statistics` |
| 演示模式下密码错误也能登录 | `api.js` 在演示模式分支直接返回 Mock 结果，未校验 `code` | 演示模式分支同样校验返回码，失败即抛出 |
| 登录页演示模式不可用 | `index.html` 未引入 `mock.js`，登录时 `Mock` 未定义 | 补上 `mock.js` |
| 后端编译报 47 处歧义 | `Result.ok(String, T)` 与 `Result.ok(T, Long)` 在传 `null` 时重载歧义 | 删除多余的 `ok(T, Long)` 重载 |
| 部分筛选/看板接口报系统异常 | 5 个 Mapper XML 的公共 `whereCondition` 片段里写了 `status != null and status != ''`，缺 `q.` 前缀，MyBatis 报 `Parameter 'status' not found`（共 9 处） | 统一改为 `q.status != null and q.status != ''`；`check_mapper.py` 新增同类检查防复发 |
| 删除记录后按 ID 查询仍返回「操作成功」 | `BaseService.getById` 查到 null 也直接 `Result.ok(null)` 返回 | `getById` 改为记录不存在时抛业务异常「记录不存在或已被删除」，14 个详情接口一并生效 |
| 数据库导入报 `Column count doesn't match value count` | SQL 生成器给 `fee_payment` 的 INSERT 少了一个 `pay_time` 值（11 个值对 12 列），导致其后 7 张表导入失败 | 修复生成器并加行级「值个数=列个数」断言 |
| 后端启动报 `Port 64550 was already in use` | `application.yml` 的端口支持 `${SERVER_PORT:8080}` 环境变量覆盖，而某些终端环境会预置 `SERVER_PORT`，把 8080 顶掉 | 启动脚本显式 `SERVER_PORT=8080`（见 `2-启动后端.bat`） |
| 双击 bat 满屏「'et' 不是内部或外部命令」 | bat 保存成了 UTF-8，而 cmd.exe 按 GBK 解析，中文字符的多字节序列把相邻命令"咬碎"（`set`→`et`、`property_db`→`erty_db`） | 四个 bat 统一转成 **GBK + CRLF**，并把 `chcp 65001` 改为 `chcp 936` 与文件编码匹配 |
| 「修改密码成功」但旧密码仍能登录 | **不是后端 bug**：页面处于演示模式（后端没启动），改密码只改了浏览器内置演示数据，而演示数据每次刷新重新初始化 | 排查时先确认页面顶部是否处于演示模式；真实后端全链路验证（改→旧密码失效→新密码生效）见 `check-isolation.py` |
| E2E 误报「缴费记录条数不符」 | 脚本里把各表行数**硬编码**为期望值，历史破坏性测试在 `fee_payment` 多留过 1 行，DB 恢复后硬编码值过期 | 期望值以数据库真实分布为准（619→618） |
| 启动 SpringBoot 后前端仍是「本地演示模式」 | `DemoMode.enable()` 会把标记写进 localStorage**长期保留**，而主界面只读标记、不重新探测后端，于是后端起来了页面也不知道 | 先加探测 + 自动切回；后按业务要求**直接关掉演示模式**（`allowDemo:false`），从根上消除这类不一致 |
| 引入 three.js 后 jsdom 用例崩溃 | `new THREE.WebGLRenderer()` 在无 WebGL 的 jsdom 里直接抛异常，导致"主界面无未捕获异常"用例失败 | 建 renderer 前先探测 WebGL 能力，不支持则走降级视图并直接返回 |
| 3D 场景楼栋统计全为 0 | `countHouseByBuilding` 的 SELECT 没有返回 `buildingId` 列，后端无法把统计结果按楼栋对上 | SELECT 补 `b.id AS buildingId` |
| 业主账号可能看到别人的房间 | 手机号是「账号 ↔ 房屋档案」的关联键，原先只在库里有非唯一索引 `idx_phone`，`selectByPhone ... LIMIT 1` 遇到重复号码会**静默命中他人档案** | 应用层加手机号唯一性校验（新增/修改账号时拦截）+ 数据库加 `sys_user.uk_phone` 唯一索引，双保险 |
| 管理员密码改不动 / 登录不上 | 库里的 admin 密码被历史测试改成了非文档值，而 README、种子 SQL、前端演示账号都写 `123456` | 排查时先 `SELECT username,password FROM sys_user` 对一遍；本库已还原为 `123456`（如需保留新密码，改文档与种子 SQL 保持一致即可） |
| 登录页同时弹出两条一模一样的「无法连接后端服务」 | 两个独立原因叠加：① 后端确实没启动；② `doLogin()` **没有防重入** —— 请求发出后要等最长 8 秒才超时，这段窗口里再按一次回车或再点一次按钮，就会发出第二个请求，超时后自然多弹一条提示 | `doLogin()` 开头加 `if (this.loading) return;`；登录中输入框加 `:disabled="loading"`；错误提示改用 `$message({ grouping: true })`（内容相同自动合并）。`test_render.js` 新增「七、登录防重入」6 项断言锁住该行为 |
| **数据大屏页面渲染直接报 `Cannot read properties of undefined (reading 'forEach')`** | `data()` 里放了 `_charts` / `_rafs` / `_clockTimer` / `_refreshTimer` 这几个**下划线开头**的属性。Vue 2 在 `initData` 时用 `Object.keys(data)` 做代理，**下划线开头的键不会被 `vm.$data` 代理到实例上**（`vm._charts === undefined`），于是 `this._charts.forEach` 直接炸 | 把图表实例、定时器、RAF id 从 `data()` 挪出，改成普通实例属性并在 `created()` 里初始化；同时去掉 `_` 前缀（改名 `chartInsts / rafIds / clockTimer / refreshTimer`），避免和 Vue 内部私有字段命名撞车。**记住：ECharts 实例 / 定时器 / RAF id 一律不进 `data()`**，否则还会被深响应式包一层，性能与正确性双输 |
| `test_api_surface.js` 突然「全绿」，但后端 113 个接口全被报成「前端未接入」 | 该测试靠 `DemoMode.enable()` 打开 mock 拦截来记录前端请求 URL；而 `allowDemo=false` 后 `enable()` 变成了**静默 no-op**，拦截器没装上 → 只捕获到 4 个静态 URL，其余全被判成"没调" | 测试里在 `enable()` 前显式 `global.AppConfig.allowDemo = true`，并加一条「若 `DemoMode.isOn()` 仍为 false 则直接 fatal 退出」的守卫，防止同类"假通过"再次发生。修复后捕获 115 个前端 URL，与后端接口对齐（当前 126 个） |
| **点顶栏「刷新」后内容区一片空白，之后按 F5 依旧空白** | `refresh()` 跳转到 `'/redirect' + 当前路径`，但**路由表里根本没有 `/redirect/:path` 这条路由**。Vue Router 对未匹配路径给出 `matched: []`，`<router-view>` 于是渲染出空内容；更麻烦的是地址栏 hash 被改写成 `#/redirect/dashboard`，用户以为只是"刷新了一下"，再按 F5 自然还是空白 | `refresh()` 改为 `location.reload()`（真正整页重载）；路由表末尾补 `{ path: '*', redirect: '/dashboard' }` 兜底，任何未登记地址都回首页看板。`test_render.js` 第九节 7 项断言覆盖「正常地址 / 遗留 `#/redirect/xxx` / 完全未知 hash / 刷新后 hash 不变」四种情况 |
| **`config.js` 在 Node 环境直接抛 `ReferenceError: location is not defined`** | 把 `baseURL` 从写死的 `localhost` 改成「跟随 `location.hostname` 自动推导」（为局域网访问），代码里直接用了 `location`。浏览器里没问题，但 Node 里 `require` 这个文件做单测时全局没有 `location` | 改成 `typeof location !== 'undefined'` 守卫后再取 `protocol/hostname`，无 `location` 时退回 `localhost`。凡是"读浏览器全局"的代码都要先守卫 |
| **演示模式下所有写操作集体失败，报 `localStorage is not defined`** | 新增的 `recordDemoLog()` 里读了 `localStorage.getItem('pms_user')` 来自动记录操作人。`test_mock.js` 用 `vm` 构造的是**最小沙箱**（只有 `window/console/setTimeout`…），没有 `localStorage` → `ReferenceError` 被 Mock 的 try/catch 兜成 `code=500`，于是"临停入场""账单缴费"等一连串写操作全部失败 | 抽出 `readLocalUser()` 统一读取，内部先 `typeof localStorage === 'undefined'` 再取值并兜 `try/catch`。**Mock 里任何读浏览器 API 的地方都要能容忍 Node 沙箱** |
| **`test_api_surface.js` 把已实现的 `/log/detail/{id}` 误报成"演示模式未覆盖"** | 该检查是**静态扫描** mock 源码里的 `path === '...'` 字面量；而 `/log/detail/{id}` 走的是 `seg[0]==='log' && seg[1]==='detail'` 这种**按二级路径分支**的写法，扫描不到 | 扫描规则增加对 `seg[1] === 'xxx'` 分支的识别（detail/list/page/preview/statistics/users），并把它打印出来便于核对 |
| bat 启动后端连不上数据库 | `application.yml` 里数据源密码默认值是 `123456`，而本机 MySQL 真实 root 密码是 `a123456`。`2-启动后端.bat` 的密码提示**直接回车就会用默认值**，于是拿到错误口令，启动中断 | 运行 bat 时**必须手动输入 `a123456`**，不能直接回车；或把本机密码改回 `123456` 与默认值对齐 |

---

## 九、后续可扩展方向（现状缺口，按建议优先级）

以下是通读代码后梳理出的功能缺口，按「先补短板、再补闭环、最后做体验」排序。

### 第一阶段 · 安全加固（P0）—— 已完成 ✅

| 项 | 状态 | 落地方式 |
| --- | --- | --- |
| 密码 BCrypt 存储 | ✅ 已完成 | `PasswordUtil` + `spring-security-crypto`；历史明文登录后自动升级 |
| 图形验证码 | ✅ 已完成 | `CaptchaService`（AWT 生成 PNG，5 分钟 TTL、一次性消费、点图换一张） |
| 登录失败锁定 | ✅ 已完成 | `LoginAttemptService`：失败 N 次要求验证码、再超阈值临时锁定 |
| JWT + 过期 + 吊销 + 续期 | ✅ 已完成 | `JwtUtil` 自签 HS256；`token_version` 作废旧令牌；`/auth/refresh` 滑动续期 |
| 操作日志 | ✅ 已完成 | `sys_log` 表 + 拦截器零侵入埋点；管理端「操作日志」页可筛选与看详情 |

仍待加固（尚未做，需要时再排期）：

| 缺口 | 现状 | 建议 |
| --- | --- | --- |
| 令牌吊销表在内存 | 服务重启后吊销记录丢失（JWT 本身仍受 `exp` 与 `token_version` 约束） | 换 Redis 存 `jti` 黑名单，顺带支持多实例部署 |
| 无密码强度校验 | 只校验长度 ≥ 6 | 加复杂度规则与常见弱口令拦截 |
| CORS 全放行 | `allowedOriginPatterns("*")` | 固定域名后改白名单 |
| 验证码答案回显开关 | `security.captcha.echo-answer` 默认 `local`（仅回环回显，供本机自动化测试两步握手） | 上线前设为 `false` |

### 第二阶段 · 业务闭环（P1）

| 缺口 | 现状 | 建议 |
| --- | --- | --- |
| 租户无合同 | `owner` 表已有 28 条 `TENANT`，但只挂了 `house_id`，没有租期/押金/租金 | 加 `lease_contract`（房源/租户/租期/押金/租金/状态）+ 到期提醒 |
| 欠费无催缴记录 | 只有 `/feeBill/statistics/unpaid` 统计 | 加催缴单与催缴记录（谁催的、第几次、结果） |
| 报修缺过程数据 | 工单有流转与评价，但没有超时提醒、材料费、维修人 | 加工单 SLA 提醒、材料与费用登记，维修成本可并入报表 |
| 车位无合同 | 只有分配/退租两个动作 | 加车位合同、租金、到期续租与提醒 |

### 第三阶段 · 业主自助与报表（P1 体验 / P2 加分）

| 缺口 | 现状 | 建议 |
| --- | --- | --- |
| 业主端与管理端同构 | 数据隔离已做（业主只看自己那套），但用的是同一套管理端界面与菜单 | 做业主专用首页：我的房屋/账单/报修/访客四个入口 |
| 无在线缴费入口 | 缴费是物业侧代收 | 加业主在线缴费与电子凭证 |
| 无进度跟踪 | 业主提交报修/投诉后看不到进度 | 加「我的工单」进度时间轴 |
| 无消息通知 | 没有站内信/邮件/短信，也没有消息表 | 加站内消息中心，后续可接短信/邮件（需新增依赖） |
| 无导出 | 后端无 POI/Excel 依赖 | 加 Excel/PDF 导出（账单、台账、报表） |
| 无经营报表 | 看板只有实时指标 | 加月度经营报表：收缴率、欠费账龄、维修成本 |
| 未适配移动端 | 侧边栏布局偏管理端 | 响应式改造，业主端优先 |

> 本清单只记录方向，不代表已实现；具体做哪一批可与使用方确认后再排期。

---

## 十、让局域网内其它人访问本系统

同一局域网（同一个 WiFi / 同一个交换机）下，**不需要改任何代码**，也**不需要打包部署**，两步就能让别人用自己的浏览器打开：

### 步骤

```
1. 双击  2-启动后端.bat     →  MySQL 密码按本机实际填写（本机是 a123456）
2. 双击  3-启动前端.bat     →  脚本会打印两行地址：
                                [本机访问]   http://localhost:9000/index.html
                                [局域网访问] http://192.168.x.x:9000/index.html
3. 把「局域网访问」那一行的地址发给同事，他用浏览器打开即可登录
4. 若对方打不开 → 右键  5-局域网访问.bat  →  以管理员身份运行（放行防火墙 8080/9000）
```

### 为什么不用改地址？

`frontend/js/config.js` 里的接口地址**不再写死 localhost**，而是跟着当前访问的主机名走：

```js
// 简化示意（真实逻辑见 js/config.js，含两种部署形态与手动覆盖）：
//   形态 A 本机/局域网/非标准端口 → 直连后端端口
//     别人用 http://192.168.2.103:9000 打开 → 接口自动指向 http://192.168.2.103:8080/api
//   形态 B 服务器部署（非本机 + 80/443）→ 同域 /api，交给 Nginx 反代
//     用 https://pms.example.com 打开 → 接口自动指向 https://pms.example.com/api
```

所以同一份前端代码，本机用 `localhost`、同事用局域网 IP，都能连到**你这台机器**的后端。
后端本身默认监听 `0.0.0.0:8080`（不是 `127.0.0.1`），天生支持外部访问；跨域也已放行任意来源。

需要指向另一台机器的后端时，在浏览器控制台先执行 `window.PMS_API_BASE = 'http://10.0.0.8:8080/api'` 即可覆盖。

### 排查顺序（按"从近到远"）

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 本机能用，别人打不开前端页面 | 前端服务只监听了 `127.0.0.1` | 用 `3-启动前端.bat`（内部绑定 `0.0.0.0`）；手动启动要写全 `node serve.js 9000 0.0.0.0` |
| 双击 `3-启动前端.bat` 后浏览器打不开页面 | 本机没装 Python，脚本却拿到了应用商店的 0 字节 `python.exe` 占位符，实际没起服务 | 现脚本改为**优先用 Node.js**（`frontend/serve.js`）并自动排除 `WindowsApps` 占位符；确认 9000 是否在监听：`netstat -ano \| findstr :9000` |
| 页面能打开，但一直提示「无法连接后端服务」 | 8080 端口被防火墙拦了 | 以管理员运行 `5-局域网访问.bat`；或临时关闭防火墙验证 |
| 前端能开、后端也通，但接口报跨域 | 用域名/非 80 端口访问且被浏览器拦截 | 本项目后端已 `allowedOriginPatterns("*")` 放行；若你另行加了白名单，需把同事的访问地址加进去 |
| 手机连的是 4G/5G 流量 | 不在同一局域网 | 连同一个 WiFi；跨网络访问：临时分享用 `6-公网临时访问.bat`，长期可用请按 `DEPLOY-FREE.md` 部署到公网 |
| 本想只开一个端口对外（隧道/容器/反代），但接口全 404 | 只暴露了前端端口，`/api` 没挂上去 | 启动前端时加代理参数：`node serve.js 9000 --api 8080`（`6-公网临时访问.bat` 已内置） |
| 把临时网址发给别人，对方报 `ERR_TIMED_OUT` | 免费隧道域名被对方所在网络拦截 —— **不是你的服务坏了**（服务坏了会返回 502/503，而不是超时） | 让对方换网络试（流量 ↔ WiFi）；要稳定分享请按 `DEPLOY-FREE.md` 方案一部署到云上。检测方法见 `DEPLOY-FREE.md`「别人打不开怎么办」 |
| 想知道本机 IP | — | 命令行执行 `ipconfig`，看「IPv4 地址」；`5-局域网访问.bat` 也会直接列出来 |

### 注意

- 多人同时用**同一账号**登录是允许的（各自浏览器各存一份 token），但操作日志里看到的是同一用户名，审计时无法区分是谁。
- 演示数据是**共用的**：同事新增/修改的数据会真实写进同一个 MySQL，不是各自的沙箱。
- 端口与密码属于本机环境信息，别把这些地址和 `a123456` 之类口令一起发到公开渠道。

---

## 十一、部署到公网服务器

不想局限于局域网、想让任何地方的人都能访问时，有两份指南：

- **[`DEPLOY.md`](DEPLOY.md)** —— 自己买服务器（国内轻量云 / 海外 PaaS / 内网穿透的对比与操作）
- **[`DEPLOY-FREE.md`](DEPLOY-FREE.md)** —— **完全免费**的方案（Render + Aiven MySQL + 免费静态托管，全程不用信用卡）

**结论：能部署，且不需要改业务代码。** 四条路线怎么选：

| 路线 | 成本 | 国内速度 | 稳定性 | 适合 |
| --- | --- | --- | --- | --- |
| **A. 国内轻量云服务器 + Docker** | 首年约 70~120 元 | 快（20~50ms） | 7×24 | 长期用、给别人稳定访问 |
| **B. 免费组合：Render + Aiven + 静态托管** ⭐ 零成本 | 0 元 | 较慢 | 15 分钟无访问会休眠（冷启动 30~60 秒） | 先跑起来看看、演示 |
| **C. Oracle 永久免费服务器** | 0 元（**注册需国际信用卡**） | 较快 | 2 核 12G，永不休眠 | 用免费额度长期跑 |
| D. 内网穿透（frp / cpolar） | 0 元 | 取决于中转 | 你电脑关机就断 | 今天就要给人看一眼 |

路线 A 的操作就一句话（服务器上装好 Docker 后）：

```bash
cd /opt/property-management-system && bash deploy/deploy.sh
```

脚本会自动生成随机数据库密码与 JWT 密钥、构建三个容器、等接口探活通过，然后打印访问地址。
路线 B 则按 [`DEPLOY-FREE.md`](DEPLOY-FREE.md) 走：Aiven 建库 → 导入 `sql/property_db_for_aiven.sql` → Render 部署后端 → 用 `node scripts/gen-env.js <后端地址>` 把后端地址注入前端 → 部署前端。

**为部署做的事先准备（已完成）：**

| 改动 | 说明 |
| --- | --- |
| `frontend/js/config.js` 支持同域部署 | 服务器上走 80/443 时自动用 `/api`，不必暴露 8080，也便于上 HTTPS |
| `frontend/js/env.js` | 前后端**不同域名**时的部署钩子（免费方案靠它指定后端地址），默认不启用 |
| `backend/Dockerfile` | 基于 JRE 17，**内置 `fontconfig` + DejaVu 字体**并强制 `java.awt.headless=true` |
| `backend/Dockerfile.paas` + `render.yaml` | 免费方案用：容器内 Maven 现场编译（不用预先打包 jar），蓝图一键建服务 |
| `deploy/frontend.Dockerfile` + `deploy/nginx.conf` | Nginx 托管静态文件 + `/api` 反代到后端容器 |
| `docker-compose.yml` | 编排 mysql + backend + frontend，含健康检查、启动顺序、数据卷持久化 |
| `deploy/deploy.sh` / `.env.example` | 一键部署与环境变量模板 |
| 启动类支持 PaaS 的 `PORT` | 端口优先级 `SERVER_PORT → PORT → 8080`，平台分配的随机端口不会导致健康检查失败 |
| `frontend/test/test_config.js` | 23 项断言，锁住接口地址推导与 `env.js` 部署钩子 |

**三个容易翻车的点，已经提前处理：**

1. **验证码在 Linux 上会空白** —— 该图是后端用 Java AWT 现画的，容器缺字体会渲染成空白/方块。镜像里已装字体，并已在本机用 `-Djava.awt.headless=true` 实测：能正常生成 132×44 的有效 PNG。
2. **生产环境验证码答案泄漏** —— `CAPTCHA_ECHO_MODE` 默认是 `local`（回显答案，仅供本机自动化测试）。compose 里已默认设为 `false`。
3. **JWT 密钥用开发默认值** —— `deploy.sh` 会自动生成 48 位随机密钥写入 `.env`。

> ⚠️ **两条如实说明**：
> ① 本机没有安装 Docker（也没有 WSL 环境），所以镜像是**按标准写法交付并做了静态校验**
> （文件行尾、YAML 结构、构建上下文与 COPY 源路径、依赖顺序），**未能在本机实际构建运行**；
> 首次在服务器执行 `deploy.sh` 时请留意构建日志。
> ② 如果选国内服务器：**用 IP 直接访问无需备案；一旦绑定域名就必须先完成 ICP 备案**（约 1~20 个工作日）。

---

© 2026 阳光家园物业服务中心 · 物业管理系统
