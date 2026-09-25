package com.property.common;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * 密码工具: BCrypt 哈希与校验。
 *
 * <p>为什么需要它:
 * <ul>
 *   <li>历史版本把密码当明文存进 {@code sys_user.password}, 一旦库被拖走即全部泄露;</li>
 *   <li>BCrypt 自带随机盐 + 可调代价因子, 同样的明文每次哈希结果都不同, 且无法反推。</li>
 * </ul>
 *
 * <p>平滑迁移: {@link #matches} 同时兼容「已哈希」与「历史明文」两种存量数据,
 * 登录成功后由 {@code SysUserService} 把明文就地升级为哈希 —— 老库不需要停机刷数据。
 */
public final class PasswordUtil {

    /** BCrypt 代价因子: 10 约 60ms/次, 在安全与登录耗时之间取平衡 */
    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder(10);

    /** 密码最小长度 */
    public static final int MIN_LENGTH = 6;

    /** 密码最大长度(BCrypt 只取前 72 字节, 这里再收紧到 32 字符以避免用户误解) */
    public static final int MAX_LENGTH = 32;

    private PasswordUtil() {
    }

    /**
     * 判断存量字符串是否已经是 BCrypt 密文。
     * <p>BCrypt 密文形如 {@code $2a$10$...} / {@code $2b$...} / {@code $2y$...}。
     */
    public static boolean isEncoded(String stored) {
        if (stored == null) {
            return false;
        }
        return stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
    }

    /** 生成密文 */
    public static String encode(String raw) {
        return ENCODER.encode(raw);
    }

    /**
     * 校验密码。
     * <p>密文走 BCrypt 比对; 明文(历史数据)直接字符串比较, 以便登录后自动升级。
     */
    public static boolean matches(String raw, String stored) {
        if (raw == null || stored == null) {
            return false;
        }
        if (isEncoded(stored)) {
            try {
                return ENCODER.matches(raw, stored);
            } catch (IllegalArgumentException e) {
                // 密文格式损坏时按校验失败处理, 不向上抛
                return false;
            }
        }
        return stored.equals(raw);
    }

    /** 设置/修改密码时的强度校验(仅长度, 避免与演示口令 123456 冲突) */
    public static void validate(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            throw new BusinessException("密码不能为空");
        }
        if (raw.length() < MIN_LENGTH) {
            throw new BusinessException("密码长度不能少于 " + MIN_LENGTH + " 位");
        }
        if (raw.length() > MAX_LENGTH) {
            throw new BusinessException("密码长度不能超过 " + MAX_LENGTH + " 位");
        }
    }
}
