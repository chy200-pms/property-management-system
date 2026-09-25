package com.property.config;

import com.property.common.JwtUtil;
import com.property.common.UnauthorizedException;
import com.property.entity.SysUser;
import com.property.mapper.SysUserMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 登录令牌存储(JWT 实现)
 *
 * <p>相比原先「内存 Map 存 UUID → 用户对象」的做法, 这里解决三个问题:
 * <ol>
 *   <li><b>有效期</b>: 令牌自带 {@code exp}, 到点自动失效, 不再永久有效;</li>
 *   <li><b>权限实时性</b>: 校验时按 {@code sub} 回查数据库取最新角色/状态,
 *       管理员改了角色或禁用账号后立即生效(旧实现要等重启);</li>
 *   <li><b>可吊销</b>: 登出把 {@code jti} 记入吊销表(带过期时间自动清理);
 *       改密/禁用则通过 {@code sys_user.token_version} 让该账号所有令牌一次性作废。</li>
 * </ol>
 *
 * <p>关于 Redis: 本项目按「单实例 + 免额外中间件」定位, 吊销表用带 TTL 的内存 Map 实现,
 * 并对外只暴露 {@code create/get/remove} 三个方法 —— 将来要换 Redis, 替换本类即可, 调用方无需改动。
 * 多实例部署时务必换成 Redis, 否则 A 实例的登出对 B 实例不可见。
 */
@Slf4j
@Component
public class TokenStore {

    /** 令牌类型前缀(前端原样回传, 便于将来扩展) */
    public static final String TOKEN_TYPE = "Bearer";

    @Value("${security.jwt.secret}")
    private String secret;

    @Value("${security.jwt.ttl-minutes:120}")
    private long ttlMinutes;

    /** 剩余有效期少于该值时可滑动续期(分钟) */
    @Value("${security.jwt.refresh-ahead-minutes:15}")
    private long refreshAheadMinutes;

    @Autowired
    private SysUserMapper sysUserMapper;

    /** 已吊销令牌: jti -> 过期时间戳(毫秒)。到点即可安全移除 */
    private final Map<String, Long> REVOKED = new ConcurrentHashMap<>();

    @PostConstruct
    public void checkSecret() {
        if (secret == null || secret.length() < 16) {
            log.warn("⚠️ security.jwt.secret 过短, 请通过环境变量 JWT_SECRET 配置至少 32 位的随机字符串");
        }
        log.info("令牌机制: JWT(HS256), 有效期 {} 分钟, 少于 {} 分钟时自动续期",
                ttlMinutes, refreshAheadMinutes);
    }

    /** 生成令牌 */
    public String create(SysUser user) {
        String jti = UUID.randomUUID().toString().replace("-", "");
        return JwtUtil.create(secret, ttlMinutes * 60, user.getId(), user.getUsername(),
                user.getRole(), user.getTokenVersion(), jti);
    }

    /**
     * 校验令牌并返回当前登录用户。
     * <p>任何一步不通过都抛 {@link UnauthorizedException}, 由全局异常处理器转成 code=401。
     */
    public SysUser get(String token) {
        Map<String, Object> payload = JwtUtil.parse(secret, token);
        String jti = JwtUtil.asString(payload, "jti");
        if (jti != null && REVOKED.containsKey(jti)) {
            throw new UnauthorizedException("登录已失效, 请重新登录");
        }
        Long userId = JwtUtil.asLong(payload, "sub");
        if (userId == null) {
            throw new UnauthorizedException("登录已失效, 请重新登录");
        }
        SysUser user = sysUserMapper.selectForSession(userId);
        if (user == null) {
            throw new UnauthorizedException("账号不存在或已被删除, 请重新登录");
        }
        if (user.getStatus() == null || user.getStatus() != 1) {
            throw new UnauthorizedException("该账号已被禁用, 请联系管理员");
        }
        // 令牌版本比对: 改密/禁用后 token_version 自增, 旧令牌自然对不上
        Long verInToken = JwtUtil.asLong(payload, "ver");
        Integer verInDb = user.getTokenVersion() == null ? 1 : user.getTokenVersion();
        if (verInToken == null || verInDb.longValue() != verInToken.longValue()) {
            throw new UnauthorizedException("账号信息已变更, 请重新登录");
        }
        return user;
    }

    /** 注销: 把该令牌加入吊销表 */
    public void remove(String token) {
        if (token == null || token.isEmpty()) {
            return;
        }
        try {
            Map<String, Object> payload = JwtUtil.parse(secret, token);
            String jti = JwtUtil.asString(payload, "jti");
            Long exp = JwtUtil.asLong(payload, "exp");
            if (jti != null) {
                long expMillis = exp == null ? System.currentTimeMillis() + ttlMinutes * 60_000
                        : exp * 1000L;
                REVOKED.put(jti, expMillis);
            }
        } catch (RuntimeException e) {
            // 令牌本身已失效, 无需吊销
            log.debug("注销时令牌已无效, 忽略: {}", e.getMessage());
        }
    }

    /**
     * 是否值得滑动续期(临近过期), 用于 {@code POST /auth/refresh}。
     */
    public boolean shouldRefresh(String token) {
        try {
            Map<String, Object> payload = JwtUtil.parse(secret, token);
            return JwtUtil.remainingSeconds(payload) <= refreshAheadMinutes * 60;
        } catch (RuntimeException e) {
            return false;
        }
    }

    /** 令牌剩余有效秒数(登录/续期时返回给前端, 便于前端提前续期) */
    public long ttlSeconds() {
        return ttlMinutes * 60;
    }

    public long refreshAheadSeconds() {
        return refreshAheadMinutes * 60;
    }

    /** 每 10 分钟清理已过期的吊销记录, 避免长期运行内存增长 */
    @Scheduled(fixedDelay = 600_000L)
    public void purgeRevoked() {
        long now = System.currentTimeMillis();
        int before = REVOKED.size();
        REVOKED.entrySet().removeIf(e -> e.getValue() == null || e.getValue() <= now);
        int removed = before - REVOKED.size();
        if (removed > 0) {
            log.debug("清理已过期吊销令牌 {} 条, 剩余 {}", removed, REVOKED.size());
        }
    }
}
