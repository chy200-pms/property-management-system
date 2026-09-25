package com.property.common;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Web 请求辅助工具
 */
public final class WebUtils {

    private WebUtils() {
    }

    /**
     * 取客户端真实 IP。
     * <p>按 {@code X-Forwarded-For} → {@code X-Real-IP} → {@code remoteAddr} 顺序取,
     * 兼容反向代理部署; 直连时即为 socket 地址。
     */
    public static String clientIp(HttpServletRequest request) {
        if (request == null) {
            return "-";
        }
        String ip = request.getHeader("X-Forwarded-For");
        if (valid(ip)) {
            // 可能形如 "client, proxy1, proxy2", 取第一个
            int comma = ip.indexOf(',');
            return (comma > 0 ? ip.substring(0, comma) : ip).trim();
        }
        ip = request.getHeader("X-Real-IP");
        if (valid(ip)) {
            return ip.trim();
        }
        String remote = request.getRemoteAddr();
        // IPv6 回环地址统一显示为 127.0.0.1, 便于日志阅读
        if ("0:0:0:0:0:0:0:1".equals(remote) || "::1".equals(remote)) {
            return "127.0.0.1";
        }
        return remote == null ? "-" : remote;
    }

    /** 是否为本机回环地址 */
    public static boolean isLoopback(String ip) {
        if (ip == null) {
            return false;
        }
        return "127.0.0.1".equals(ip) || "::1".equals(ip) || "localhost".equalsIgnoreCase(ip)
                || ip.startsWith("127.") || "0:0:0:0:0:0:0:1".equals(ip);
    }

    private static boolean valid(String v) {
        return v != null && !v.isEmpty() && !"unknown".equalsIgnoreCase(v);
    }
}
