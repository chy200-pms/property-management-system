# ============================================================
#  物业管理系统 —— 前端镜像（Nginx 托管静态文件 + 反代 /api）
#
#  注意：本文件的构建上下文是「项目根目录」，不是 deploy 目录。
#  构建:
#     docker build -f deploy/frontend.Dockerfile -t pms-frontend:1.0.0 .
#  通常不需要手动构建，docker compose 会自动处理。
# ============================================================
FROM nginx:alpine

# 让容器内时间与日志为东八区，便于排查
RUN apk add --no-cache tzdata \
 && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
 && echo "Asia/Shanghai" > /etc/timezone

# 清掉镜像自带的示例页
RUN rm -rf /usr/share/nginx/html/*

# 前端是「免构建」的纯静态文件，整目录复制即可
COPY frontend/ /usr/share/nginx/html/

# 测试代码与本地静态服务器不需要暴露到公网
RUN rm -rf /usr/share/nginx/html/test /usr/share/nginx/html/serve.js

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
