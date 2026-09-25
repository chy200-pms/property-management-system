package com.property.service;

import com.property.common.BaseService;
import com.property.entity.SysUser;
import com.property.common.BusinessException;
import com.property.common.PasswordUtil;
import com.property.config.LoginInterceptor;
import com.property.config.TokenStore;
import com.property.mapper.SysUserMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 系统用户 / 登录 业务
 */
@Slf4j
@Service
public class SysUserService {

    /** 业务码: 本次登录需要图形验证码(前端据此展开验证码输入框) */
    public static final int CODE_CAPTCHA_REQUIRED = 428;

    @Autowired
    private SysUserMapper sysUserMapper;

    @Autowired
    private TokenStore tokenStore;

    @Autowired
    private CaptchaService captchaService;

    @Autowired
    private LoginAttemptService loginAttemptService;

    /**
     * 登录: 校验账号密码并签发 JWT。
     *
     * <p>安全链路: ① 失败锁定前置校验 → ② 达到阈值则强制图形验证码 →
     * ③ BCrypt 校验(兼容历史明文并在成功后自动升级) → ④ 签发带过期时间的 JWT。
     */
    public Map<String, Object> login(String username, String password,
                                     String captchaId, String captchaCode, String ip) {
        if (username == null || username.trim().isEmpty()) {
            throw new BusinessException("请输入账号");
        }
        if (password == null || password.trim().isEmpty()) {
            throw new BusinessException("请输入密码");
        }
        String name = username.trim();

        // ① + ② 先过风控: 被锁定直接拒绝; 达到阈值则本次必须带验证码
        boolean needCaptcha = loginAttemptService.preCheck(name, ip);
        if (needCaptcha) {
            if (captchaId == null || captchaId.isEmpty() || captchaCode == null || captchaCode.trim().isEmpty()) {
                throw new BusinessException(CODE_CAPTCHA_REQUIRED, "本次登录需要图形验证码");
            }
            try {
                captchaService.verify(captchaId, captchaCode);
            } catch (BusinessException e) {
                loginAttemptService.recordFailure(name, ip);
                throw e;
            }
        }

        // ③ 校验账号与密码
        SysUser user = sysUserMapper.selectByUsername(name);
        if (user == null) {
            loginAttemptService.recordFailure(name, ip);
            throw new BusinessException("账号不存在");
        }
        if (!PasswordUtil.matches(password, user.getPassword())) {
            loginAttemptService.recordFailure(name, ip);
            int count = loginAttemptService.failCount(name, ip);
            String tip = count >= 1 ? "（已连续失败 " + count + " 次）" : "";
            throw new BusinessException("密码错误" + tip);
        }
        if (user.getStatus() == null || user.getStatus() != 1) {
            throw new BusinessException("该账号已被禁用, 请联系管理员");
        }

        // 历史明文密码: 登录成功后就地升级为 BCrypt 密文, 之后库里不再有明文
        if (!PasswordUtil.isEncoded(user.getPassword())) {
            sysUserMapper.updatePassword(user.getId(), PasswordUtil.encode(password));
            log.info("已将账号 {} 的历史明文密码升级为 BCrypt 密文", name);
            user.setPassword(PasswordUtil.encode(password));
        }

        loginAttemptService.recordSuccess(name, ip);
        sysUserMapper.updateLastLogin(user.getId(), new Date());
        String token = tokenStore.create(user);

        Map<String, Object> data = new HashMap<>();
        data.put("token", token);
        data.put("tokenType", TokenStore.TOKEN_TYPE);
        data.put("expiresIn", tokenStore.ttlSeconds());
        data.put("refreshAhead", tokenStore.refreshAheadSeconds());
        user.setPassword(null);
        data.put("user", user);
        return data;
    }

    /** 注销: 把当前令牌加入吊销表 */
    public void logout(String token) {
        tokenStore.remove(token);
    }

    /**
     * 滑动续期: 用当前有效令牌换一枚新令牌。
     * <p>前端在剩余有效期不足 {@code refreshAhead} 时自动调用, 用户长时间停留无需重新登录。
     */
    public Map<String, Object> refresh(String token) {
        SysUser current = LoginInterceptor.getCurrentUser();
        if (current == null) {
            throw new com.property.common.UnauthorizedException("登录已失效, 请重新登录");
        }
        // 老令牌立即作废, 避免同时存在两枚可用令牌
        tokenStore.remove(token);
        String fresh = tokenStore.create(current);
        Map<String, Object> data = new HashMap<>();
        data.put("token", fresh);
        data.put("tokenType", TokenStore.TOKEN_TYPE);
        data.put("expiresIn", tokenStore.ttlSeconds());
        return data;
    }

    /** 用户列表 */
    public List<SysUser> list(String keyword, String role) {
        return sysUserMapper.selectList(keyword, role);
    }

    public SysUser getById(Long id) {
        SysUser user = sysUserMapper.selectById(id);
        if (user == null) {
            throw new BusinessException("记录不存在或已被删除");
        }
        user.setPassword(null);
        return user;
    }

    public int save(SysUser user) {
        if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
            throw new BusinessException("账号不能为空");
        }
        SysUser exist = sysUserMapper.selectByUsername(user.getUsername());
        if (exist != null) {
            throw new BusinessException("账号 " + user.getUsername() + " 已存在");
        }
        ensurePhoneUnique(user);
        // 新建账号未指定密码时给一个初始口令, 并统一哈希后入库
        String raw = (user.getPassword() == null || user.getPassword().isEmpty())
                ? "123456" : user.getPassword();
        PasswordUtil.validate(raw);
        user.setPassword(PasswordUtil.encode(raw));
        if (user.getStatus() == null) {
            user.setStatus(1);
        }
        return sysUserMapper.insert(user);
    }

    public int update(SysUser user) {
        ensurePhoneUnique(user);
        SysUser before = sysUserMapper.selectById(user.getId());
        if (before == null) {
            throw new BusinessException("记录不存在或已被删除");
        }
        // 密码留空表示不修改; 有值则哈希存储
        if (user.getPassword() != null && user.getPassword().isEmpty()) {
            user.setPassword(null);
        } else if (user.getPassword() != null) {
            PasswordUtil.validate(user.getPassword());
            user.setPassword(PasswordUtil.encode(user.getPassword()));
        }
        int rows = sysUserMapper.updateById(user);
        // 禁用账号 -> 已有令牌立即作废; 改密 -> 同理(强制重新登录)
        boolean disabled = user.getStatus() != null && user.getStatus() != 1;
        if (disabled || user.getPassword() != null) {
            sysUserMapper.bumpTokenVersion(user.getId());
            log.info("账号 {} 的密码/状态已变更, 已作废其全部历史令牌", before.getUsername());
        }
        return rows;
    }

    /**
     * 手机号唯一性校验。
     * <p>
     * 业主账号通过手机号关联到 owner 档案, 进而决定能看到哪套房屋的数据。
     * 若同一手机号被两个账号占用, 二者会命中同一条档案, 破坏数据隔离,
     * 因此这里强制"一个手机号只能绑定一个登录账号"。
     */
    private void ensurePhoneUnique(SysUser user) {
        String phone = user.getPhone();
        if (phone == null || phone.trim().isEmpty()) {
            return;
        }
        String p = phone.trim();
        user.setPhone(p);
        if (sysUserMapper.countByPhoneExcluding(p, user.getId()) > 0) {
            throw new BusinessException("手机号 " + p + " 已被其他账号使用, 请更换");
        }
    }

    public int remove(Long id) {
        if (id != null && id == 1L) {
            throw new BusinessException("超级管理员账号不可删除");
        }
        return sysUserMapper.deleteById(id);
    }

    /**
     * 修改密码
     * <p>改完即 {@code token_version + 1}: 该账号在其它浏览器/设备上的登录会立即失效,
     * 满足"修改密码后必须重新登录"的要求(当前会话也随之失效, 前端引导重新登录)。
     */
    public void changePassword(Long id, String oldPwd, String newPwd) {
        SysUser user = sysUserMapper.selectById(id);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        if (!PasswordUtil.matches(oldPwd, user.getPassword())) {
            throw new BusinessException("原密码错误");
        }
        PasswordUtil.validate(newPwd);
        if (PasswordUtil.matches(newPwd, user.getPassword())) {
            throw new BusinessException("新密码不能与原密码相同");
        }
        sysUserMapper.updatePassword(id, PasswordUtil.encode(newPwd));
        sysUserMapper.bumpTokenVersion(id);
        log.info("用户 {} 修改密码成功, 已作废其全部历史令牌", user.getUsername());
    }
}
