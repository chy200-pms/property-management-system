package com.property.common;

import com.fasterxml.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 极简 JWT 实现(HS256), 不引入第三方 JWT 库。
 *
 * <p>令牌结构: {@code base64Url(header).base64Url(payload).base64Url(HMAC-SHA256)}
 * <p>载荷字段:
 * <ul>
 *   <li>{@code sub} 用户ID、{@code usr} 账号、{@code role} 角色</li>
 *   <li>{@code ver} 令牌版本, 与 {@code sys_user.token_version} 比对, 改密/禁用后旧令牌立即失效</li>
 *   <li>{@code jti} 令牌唯一ID, 用于登出时把单个令牌加入吊销表</li>
 *   <li>{@code iat} 签发时间、{@code exp} 过期时间(秒)</li>
 * </ul>
 *
 * <p>相比原有的「内存 Map + UUID」:
 * ① 令牌自带有效期, 重启/多实例都能校验; ② 无需在每个实例保存全量会话;
 * ③ 载荷里带版本号, 改密后可让所有已签发令牌立即作废。
 */
public final class JwtUtil {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Base64.Encoder B64E = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder B64D = Base64.getUrlDecoder();
    private static final String HEADER_JSON = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";

    private JwtUtil() {
    }

    /** 签发令牌 */
    public static String create(String secret, long ttlSeconds, Long userId, String username,
                               String role, Integer tokenVersion, String jti) {
        long now = System.currentTimeMillis() / 1000L;
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sub", userId);
        payload.put("usr", username);
        payload.put("role", role);
        payload.put("ver", tokenVersion == null ? 1 : tokenVersion);
        payload.put("jti", jti);
        payload.put("iat", now);
        payload.put("exp", now + ttlSeconds);

        String header = B64E.encodeToString(HEADER_JSON.getBytes(StandardCharsets.UTF_8));
        String body;
        try {
            body = B64E.encodeToString(MAPPER.writeValueAsBytes(payload));
        } catch (Exception e) {
            throw new BusinessException("令牌签发失败");
        }
        String signingInput = header + "." + body;
        return signingInput + "." + B64E.encodeToString(hmac(secret, signingInput));
    }

    /**
     * 校验签名与有效期, 返回载荷。
     *
     * @throws UnauthorizedException 签名不合法、格式错误或已过期
     */
    public static Map<String, Object> parse(String secret, String token) {
        if (token == null || token.isEmpty()) {
            throw new UnauthorizedException("登录已失效, 请重新登录");
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new UnauthorizedException("登录已失效, 请重新登录");
        }
        String signingInput = parts[0] + "." + parts[1];
        byte[] expected = hmac(secret, signingInput);
        byte[] actual;
        try {
            actual = B64D.decode(parts[2]);
        } catch (IllegalArgumentException e) {
            throw new UnauthorizedException("登录已失效, 请重新登录");
        }
        // 定长比较, 避免时序侧信道
        if (!MessageDigest.isEqual(expected, actual)) {
            throw new UnauthorizedException("登录已失效, 请重新登录");
        }
        Map<String, Object> payload;
        try {
            payload = MAPPER.readValue(B64D.decode(parts[1]), Map.class);
        } catch (Exception e) {
            throw new UnauthorizedException("登录已失效, 请重新登录");
        }
        Object exp = payload.get("exp");
        long expSec = exp instanceof Number ? ((Number) exp).longValue() : 0L;
        if (expSec <= System.currentTimeMillis() / 1000L) {
            throw new UnauthorizedException("登录已过期, 请重新登录");
        }
        return payload;
    }

    /** 剩余有效秒数(用于判断是否需要滑动续期) */
    public static long remainingSeconds(Map<String, Object> payload) {
        Object exp = payload.get("exp");
        long expSec = exp instanceof Number ? ((Number) exp).longValue() : 0L;
        return expSec - System.currentTimeMillis() / 1000L;
    }

    /** 取整型字段 */
    public static Long asLong(Map<String, Object> payload, String key) {
        Object v = payload.get(key);
        if (v instanceof Number) {
            return ((Number) v).longValue();
        }
        if (v instanceof String) {
            try {
                return Long.parseLong((String) v);
            } catch (NumberFormatException ignore) {
                return null;
            }
        }
        return null;
    }

    /** 取字符串字段 */
    public static String asString(Map<String, Object> payload, String key) {
        Object v = payload.get(key);
        return v == null ? null : String.valueOf(v);
    }

    private static byte[] hmac(String secret, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new BusinessException("令牌校验失败");
        }
    }
}
