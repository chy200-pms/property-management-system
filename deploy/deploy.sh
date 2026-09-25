#!/usr/bin/env bash
# ============================================================
#  物业管理系统 —— 服务器一键部署（Linux + Docker）
#
#  用法（在服务器上，项目根目录下）:
#     bash deploy/deploy.sh
#
#  它会:
#     1. 检查 Docker / Docker Compose 环境
#     2. 生成 .env（随机数据库密码 + JWT 密钥；已存在则保留）
#     3. 构建并启动 mysql / backend / frontend 三个容器
#     4. 等到接口探活通过，打印访问地址与初始账号
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

echo ""
echo "============================================================"
echo "  物业管理系统 - 服务器部署"
echo "  项目目录: $ROOT"
echo "============================================================"
echo ""

# ---------- 1. 环境检查 ----------
if ! command -v docker >/dev/null 2>&1; then
    echo "[错误] 未检测到 docker。请先安装："
    echo "       curl -fsSL https://get.docker.com | bash"
    echo "       systemctl enable --now docker"
    exit 1
fi

if docker compose version >/dev/null 2>&1; then
    DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
else
    echo "[错误] 未检测到 docker compose（Docker 20.10+ 自带；旧版本需单独安装）"
    exit 1
fi
echo "[环境] $(docker --version)"
echo ""

# ---------- 2. 生成 .env ----------
gen_secret() {
    # 只取字母数字：避免特殊字符在 JDBC URL / shell / sed 里被转义
    # 末尾的 || true 是必需的：head 读满指定字节后会关闭管道，
    # tr 随即收到 SIGPIPE 而非零退出；本脚本开了 set -o pipefail，
    # 不加这层兜底在某些环境会让整条管道判定为失败。
    LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom 2>/dev/null | head -c "${1:-32}" || true
}

if [ -f .env ]; then
    echo "[配置] 已存在 .env，保持原样（想重新生成请先删除它，注意会导致数据库密码不匹配）"
else
    echo "[配置] 未发现 .env，正在生成随机密码与密钥 ..."
    cat > .env <<EOF
# 由 deploy.sh 自动生成于 $(date '+%Y-%m-%d %H:%M:%S')
MYSQL_ROOT_PASSWORD=$(gen_secret 20)
JWT_SECRET=$(gen_secret 48)
CAPTCHA_ECHO_MODE=false
HTTP_PORT=80
EOF
    chmod 600 .env 2>/dev/null || true
    echo "[配置] 已写入 .env（权限 600）"
fi

HTTP_PORT="$(grep -E '^HTTP_PORT=' .env | head -1 | cut -d= -f2 | tr -d ' \r' || true)"
HTTP_PORT="${HTTP_PORT:-80}"

# ---------- 3. 检查 jar ----------
if ! ls backend/target/property-management-system-*.jar >/dev/null 2>&1; then
    echo ""
    echo "[错误] 没找到后端 jar: backend/target/property-management-system-*.jar"
    echo "       请先在开发机打包（双击 4-编译打包.bat，或 mvn clean package -DskipTests），"
    echo "       再把整个项目目录（含 target 下的 jar）上传到服务器。"
    exit 1
fi

# ---------- 4. 构建并启动 ----------
echo ""
echo "[1/3] 构建镜像并启动容器（首次会拉取基础镜像，视网络需几分钟）..."
$DC up -d --build

echo ""
echo "[2/3] 等待后端就绪 ..."
READY=0
for i in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:${HTTP_PORT}/api/auth/captcha" >/dev/null 2>&1; then
        echo "      后端已就绪（第 ${i} 次探测）"
        READY=1
        break
    fi
    sleep 3
done
if [ "$READY" -eq 0 ]; then
    echo "      [警告] 等待超时，请执行 $DC logs -f backend 查看原因"
fi

echo ""
echo "[3/3] 容器状态："
$DC ps

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
[ -z "${IP:-}" ] && IP="<服务器公网IP>"

echo ""
echo "============================================================"
echo "  部署完成"
echo ""
echo "  访问地址: http://${IP}/"
if [ "$HTTP_PORT" != "80" ]; then
    echo "            http://${IP}:${HTTP_PORT}/"
fi
echo ""
echo "  初始账号: admin / 123456      （登录后请立刻修改密码）"
echo ""
echo "  常用命令:"
echo "    $DC ps                     查看容器状态"
echo "    $DC logs -f backend        查看后端日志"
echo "    $DC restart backend        重启后端"
echo "    $DC down                   停止（数据保留）"
echo "    $DC down -v                停止并清空数据库"
echo "============================================================"
echo ""
echo "  提醒:"
echo "   1) 云服务器「安全组 / 防火墙」必须放行 ${HTTP_PORT} 端口，否则外网打不开"
echo "   2) 用域名访问需先完成 ICP 备案；直接用 IP 访问不需要备案"
echo "   3) 想启用 HTTPS：证书放到 deploy/certs/，参考 deploy/nginx.conf 末尾的说明"
echo ""
