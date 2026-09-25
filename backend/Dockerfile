# ============================================================
#  物业管理系统 —— 后端镜像
#
#  构建（在 backend 目录下执行，需先有打好的 jar）:
#     cd backend
#     /d/tools/mvn.sh clean package -DskipTests     # 或双击 4-编译打包.bat
#     docker build -t pms-backend:1.0.0 .
#
#  也可以直接用 docker compose 一键构建，见项目根目录 docker-compose.yml
# ============================================================
FROM eclipse-temurin:17-jre-jammy

# ---- 验证码所需的系统依赖（重要）----
# CaptchaService 用 AWT 在内存里画 PNG 验证码，依赖 fontconfig 与真实字体。
# 官方 JRE 镜像里两者都没有，缺了会出现「验证码图片空白/方块」或
# 「java.lang.InternalError: Can't connect to X11 window server」。
# curl 用于下面的 HEALTHCHECK。
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      fontconfig \
      fonts-dejavu-core \
      curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 通配符只匹配主 jar（Spring Boot 还会产出 xxx.jar.original，不会被匹配到）
COPY target/property-management-system-*.jar /app/app.jar

# java.awt.headless=true —— 容器里没有显示器，强制无头模式，
#                        否则 AWT 可能尝试连 X server 直接抛异常。
# user.timezone        —— 不依赖系统 tzdata，保证日志与数据库时间都是东八区。
ENV JAVA_OPTS="-Djava.awt.headless=true -Dfile.encoding=UTF-8 -Duser.timezone=Asia/Shanghai -XX:MaxRAMPercentage=75 -XX:+UseSerialGC" \
    TZ=Asia/Shanghai

EXPOSE 8080

# 用无需登录态的接口探活
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8080/api/auth/captcha > /dev/null || exit 1

# 数据源 / JWT 等全部支持环境变量覆盖（application.yml 里写的 ${DB_URL:默认值}）：
#   DB_URL、DB_USERNAME、DB_PASSWORD、JWT_SECRET、CAPTCHA_ECHO_MODE ...
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
