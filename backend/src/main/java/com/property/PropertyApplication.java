package com.property;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 物业管理系统 启动类
 *
 * @author property-team
 */
@SpringBootApplication
@EnableScheduling
@MapperScan("com.property.mapper")
public class PropertyApplication {

    public static void main(String[] args) {
        applyPaasPort();
        ConfigurableApplicationContext ctx = SpringApplication.run(PropertyApplication.class, args);

        System.out.printf("""

                ==========================================================
                  物业管理系统 后端服务启动成功
                  接口地址: http://localhost:%d/api
                  前端入口: frontend/index.html
                  安全机制: BCrypt 密码 / 图形验证码 / JWT(含过期与吊销) / 操作日志
                ==========================================================
                """, currentPort(ctx));
    }

    /**
     * 端口取值优先级：SERVER_PORT → PORT → application.yml 里的默认值(8080)
     * <p>
     * 为什么单独用一段代码处理，而不是在 yml 里写 ${SERVER_PORT:${PORT:8080}}：
     * 嵌套默认值在本项目实测会被解析成空串，导致 server.port 绑不上整数、Tomcat
     * 退回随机端口（日志表现是 "Tomcat initialized with port 6xxxx"），
     * 连本机启动都会一起坏掉。这里改成显式判断，行为可预测。
     * <p>
     * PORT 是 PaaS 平台的通用约定（Render / Koyeb / Heroku 等会注入一个随机端口）；
     * 写入系统属性的优先级高于 application.yml，因此能生效；而已显式设置了
     * SERVER_PORT 时以 SERVER_PORT 为准，不影响本机与 docker-compose 的现有用法。
     */
    private static void applyPaasPort() {
        String serverPort = System.getenv("SERVER_PORT");
        if (serverPort != null && !serverPort.trim().isEmpty()) {
            return;   // 显式指定优先，不再看 PORT
        }
        String paasPort = System.getenv("PORT");
        if (paasPort != null && !paasPort.trim().isEmpty()) {
            System.setProperty("server.port", paasPort.trim());
        }
    }

    /** 取实际生效的端口（用于启动横幅；拿不到时退回配置值） */
    private static int currentPort(ConfigurableApplicationContext ctx) {
        if (ctx instanceof ServletWebServerApplicationContext web && web.getWebServer() != null) {
            return web.getWebServer().getPort();
        }
        String configured = ctx.getEnvironment().getProperty("server.port", "8080");
        try {
            return Integer.parseInt(configured);
        } catch (NumberFormatException e) {
            return 8080;
        }
    }
}
