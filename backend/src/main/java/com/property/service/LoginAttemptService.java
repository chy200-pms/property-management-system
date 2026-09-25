package com.property.service;

import com.property.common.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

/**
 * 登录失败次数控制
 *
 * <p>策略(两档递进, 避免"一上验证码就谁都进不去"):
 * <ol>
 *   <li>同一账号 + 同一IP 在统计窗口内连续失败 {@code captcha-threshold} 次 → 之后登录必须带图形验证码;</li>
 *   <li>继续失败到 {@code lock-threshold} 次 → 直接锁定 {@code lock-minutes} 分钟, 期间一律拒绝;</li>
 *   <li>任意一次登录成功即清空计数, 正常用户完全无感。</li>
 * </ol>
 *
 * <p>为什么要按 账号+IP 组合计数: 只按账号会被用来「拿别人的账号刷锁定」;
 * 只按 IP 又会误伤同一出口下的其他用户。组合起来最贴近真实风控做法。
 */
@Slf4j
@Service
public class LoginAttemptService {

    /** 累计失败到该次数后开始要求验证码 */
    @Value("${security.login.captcha-threshold:3}")
    private int captchaThreshold;

    /** 累计失败到该次数后锁定账号+IP */
    @Value("${security.login.lock-threshold:6}")
    private int lockThreshold;

    /** 锁定时长(分钟) */
    @Value("${security.login.lock-minutes:10}")
    private int lockMinutes;

    /** 失败计数统计窗口(分钟): 窗口内没有新失败就自动归零 */
    @Value("${security.login.window-minutes:10}")
    private int windowMinutes;

    private final Map<String, Attempt> RECORDS = new ConcurrentHashMap<>();

    /** 计数载体 */
    private static class Attempt {
        int fails;
        long windowStart;
        long lockedUntil;

        Attempt(int fails, long windowStart, long lockedUntil) {
            this.fails = fails;
            this.windowStart = windowStart;
            this.lockedUntil = lockedUntil;
        }
    }

    /** 计数键: 账号 + IP */
    public static String key(String username, String ip) {
        return (username == null ? "-" : username.trim().toLowerCase()) + "|" + (ip == null ? "-" : ip);
    }

    /**
     * 登录前置校验: 被锁定直接拒绝; 达到验证码阈值则要求前端提交验证码。
     *
     * @return true 表示本次登录必须带验证码
     */
    public boolean preCheck(String username, String ip) {
        String k = key(username, ip);
        Attempt r = RECORDS.get(k);
        if (r == null) {
            return false;
        }
        long now = System.currentTimeMillis();
        if (r.lockedUntil > now) {
            long minutes = Math.max(1, (r.lockedUntil - now) / 60000 + 1);
            throw new BusinessException(429,
                    "登录失败次数过多, 账号已被临时锁定, 请 " + minutes + " 分钟后再试");
        }
        // 统计窗口过期则清零
        if (now - r.windowStart > windowMinutes * 60_000L) {
            RECORDS.remove(k);
            return false;
        }
        return r.fails >= captchaThreshold;
    }

    /** 记录一次失败, 返回是否需要提示"即将锁定" */
    public void recordFailure(String username, String ip) {
        String k = key(username, ip);
        long now = System.currentTimeMillis();
        Attempt r = RECORDS.computeIfAbsent(k, x -> new Attempt(0, now, 0L));
        synchronized (r) {
            if (now - r.windowStart > windowMinutes * 60_000L) {
                r.fails = 0;
                r.windowStart = now;
            }
            r.fails++;
            if (r.fails >= lockThreshold) {
                r.lockedUntil = now + lockMinutes * 60_000L;
                log.warn("账号 {} 来自 {} 连续登录失败 {} 次, 已锁定 {} 分钟",
                        username, ip, r.fails, lockMinutes);
            }
        }
    }

    /** 登录成功: 清空计数 */
    public void recordSuccess(String username, String ip) {
        RECORDS.remove(key(username, ip));
    }

    /** 当前失败次数(用于响应里给前端提示) */
    public int failCount(String username, String ip) {
        Attempt r = RECORDS.get(key(username, ip));
        return r == null ? 0 : r.fails;
    }

    public int captchaThreshold() {
        return captchaThreshold;
    }

    /** 每 10 分钟清理过期计数 */
    @Scheduled(fixedDelay = 600_000L)
    public void purge() {
        long now = System.currentTimeMillis();
        RECORDS.entrySet().removeIf(e -> {
            Attempt r = e.getValue();
            return r.lockedUntil <= now && now - r.windowStart > windowMinutes * 60_000L;
        });
    }
}
