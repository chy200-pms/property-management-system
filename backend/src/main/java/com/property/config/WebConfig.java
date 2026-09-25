package com.property.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web 配置: 跨域放行 + 登录拦截
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private LoginInterceptor loginInterceptor;

    @Autowired
    private OperationLogInterceptor operationLogInterceptor;

    /**
     * 跨域配置
     * 前端以文件方式(file://)打开或使用其他端口时, 浏览器会拦截请求, 这里统一放行。
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Authorization")
                .allowCredentials(true)
                .maxAge(3600);
    }

    /**
     * 拦截器注册
     * <p>顺序很关键:
     * <ol>
     *   <li>{@link LoginInterceptor} 先跑, 把登录用户放进 ThreadLocal;</li>
     *   <li>{@link OperationLogInterceptor} 后跑, 在 preHandle 里抓下用户, 请求结束后落库。
     *       它<b>不排除</b> {@code /auth/login}, 这样登录成功与失败(密码错误/账号锁定)都能留痕。</li>
     * </ol>
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(loginInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns(
                        "/auth/login",
                        "/auth/captcha",
                        "/error",
                        "/favicon.ico"
                );
        registry.addInterceptor(operationLogInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/error", "/favicon.ico");
    }
}
