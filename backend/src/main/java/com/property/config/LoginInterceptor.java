package com.property.config;

import com.property.entity.SysUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 登录拦截器: 校验请求头中的 JWT 令牌
 */
@Component
public class LoginInterceptor implements HandlerInterceptor {

    public static final String TOKEN_HEADER = "Authorization";

    /** 当前请求的登录用户, 供 Controller 通过 LoginInterceptor.getCurrentUser() 获取 */
    private static final ThreadLocal<SysUser> CURRENT_USER = new ThreadLocal<>();

    /** 当前请求携带的原始令牌(操作日志/续期时会用到) */
    private static final ThreadLocal<String> CURRENT_TOKEN = new ThreadLocal<>();

    @Autowired
    private TokenStore tokenStore;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // 预检请求直接放行
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String token = request.getHeader(TOKEN_HEADER);
        // 令牌非法/过期/被吊销时由 TokenStore 抛 UnauthorizedException -> 全局处理器返回 401
        SysUser user = tokenStore.get(token);
        CURRENT_USER.set(user);
        CURRENT_TOKEN.set(token);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        CURRENT_USER.remove();
        CURRENT_TOKEN.remove();
    }

    /** 获取当前登录用户(未登录时为 null) */
    public static SysUser getCurrentUser() {
        return CURRENT_USER.get();
    }

    /** 获取当前请求的原始令牌 */
    public static String getCurrentToken() {
        return CURRENT_TOKEN.get();
    }
}
