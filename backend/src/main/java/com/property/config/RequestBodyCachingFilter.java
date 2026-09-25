package com.property.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.util.ContentCachingRequestWrapper;

import java.io.IOException;

/**
 * 把请求体缓存起来, 供 {@link OperationLogInterceptor} 在请求结束后读取参数。
 *
 * <p>为什么需要它: Servlet 的请求体是<b>一次性流</b>, 业务层读过之后就无法再读。
 * 用 Spring 提供的 {@link ContentCachingRequestWrapper} 包一层, 业务代码照常读,
 * 日志拦截器在 {@code afterCompletion} 里再取缓存副本 —— 这样既不影响参数绑定, 也能把
 * 「改了哪条数据、传了什么参数」记下来, 是操作日志真正有价值的部分。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestBodyCachingFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest http && !(request instanceof ContentCachingRequestWrapper)) {
            chain.doFilter(new ContentCachingRequestWrapper(http), response);
        } else {
            chain.doFilter(request, response);
        }
    }
}
