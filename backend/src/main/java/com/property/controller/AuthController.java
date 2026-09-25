package com.property.controller;

import com.property.common.Result;
import com.property.common.WebUtils;
import com.property.config.LoginInterceptor;
import com.property.entity.SysUser;
import com.property.service.CaptchaService;
import com.property.service.SysUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 登录认证 接口
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private SysUserService sysUserService;

    @Autowired
    private CaptchaService captchaService;

    /**
     * 获取图形验证码
     * GET /api/auth/captcha
     * 返回 { captchaId, image(base64 PNG), expireSeconds }
     * <p>仅在 security.captcha.echo-answer=local 且请求来自本机回环地址时, 额外回显 answer 供自动化测试使用;
     * 线上环境该策略应为 false。
     */
    @GetMapping("/captcha")
    public Result<Map<String, Object>> captcha(HttpServletRequest request) {
        CaptchaService.Captcha c = captchaService.generate();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("captchaId", c.captchaId());
        data.put("image", c.imageBase64());
        data.put("expireSeconds", c.expireSeconds());
        String mode = captchaService.echoMode();
        boolean echo = "true".equals(mode)
                || ("local".equals(mode) && WebUtils.isLoopback(WebUtils.clientIp(request)));
        if (echo) {
            data.put("answer", c.code());
            data.put("echo", true);
        }
        return Result.ok(data);
    }

    /**
     * 登录
     * POST /api/auth/login
     * { "username": "admin", "password": "123456", "captchaId": "...", "captchaCode": "AB3D" }
     * <p>验证码仅在「同一账号+IP 连续失败达到阈值」后强制要求, 正常用户无感。
     */
    @PostMapping("/login")
    public Result<Map<String, Object>> login(@RequestBody Map<String, String> body,
                                             HttpServletRequest request) {
        Map<String, Object> data = sysUserService.login(
                body.get("username"),
                body.get("password"),
                body.get("captchaId"),
                body.get("captchaCode"),
                WebUtils.clientIp(request));
        return Result.ok("登录成功", data);
    }

    /**
     * 滑动续期: 用当前令牌换新令牌(前端临近过期时自动调用)
     * POST /api/auth/refresh
     */
    @PostMapping("/refresh")
    public Result<Map<String, Object>> refresh() {
        return Result.ok(sysUserService.refresh(LoginInterceptor.getCurrentToken()));
    }

    /**
     * 注销
     * POST /api/auth/logout
     */
    @PostMapping("/logout")
    public Result<Void> logout(HttpServletRequest request) {
        sysUserService.logout(request.getHeader(LoginInterceptor.TOKEN_HEADER));
        return Result.ok("已退出登录", null);
    }

    /**
     * 获取当前登录用户
     * GET /api/auth/current
     */
    @GetMapping("/current")
    public Result<SysUser> current() {
        return Result.ok(LoginInterceptor.getCurrentUser());
    }

    /**
     * 修改密码
     * POST /api/auth/password
     */
    @PostMapping("/password")
    public Result<Void> changePassword(@RequestBody Map<String, String> body) {
        SysUser user = LoginInterceptor.getCurrentUser();
        sysUserService.changePassword(user.getId(), body.get("oldPassword"), body.get("newPassword"));
        return Result.ok("密码修改成功", null);
    }

    // ==================================================================
    //  用户管理(仅管理员)
    // ==================================================================

    /** 校验当前登录用户是否为管理员 */
    private void requireAdmin() {
        SysUser user = LoginInterceptor.getCurrentUser();
        if (user == null || !"ADMIN".equals(user.getRole())) {
            throw new com.property.common.BusinessException("只有管理员可以管理用户账号");
        }
    }

    /** 用户列表 GET /api/auth/users */
    @GetMapping("/users")
    public Result<List<SysUser>> users(@RequestParam(required = false) String keyword,
                                       @RequestParam(required = false) String role) {
        requireAdmin();
        return Result.ok(sysUserService.list(keyword, role));
    }

    /** 用户详情 GET /api/auth/users/{id} */
    @GetMapping("/users/{id}")
    public Result<SysUser> userDetail(@PathVariable Long id) {
        requireAdmin();
        return Result.ok(sysUserService.getById(id));
    }

    /** 新增用户 POST /api/auth/users */
    @PostMapping("/users")
    public Result<Void> addUser(@RequestBody SysUser user) {
        requireAdmin();
        sysUserService.save(user);
        return Result.ok("新增成功", null);
    }

    /** 修改用户 PUT /api/auth/users */
    @PutMapping("/users")
    public Result<Void> updateUser(@RequestBody SysUser user) {
        requireAdmin();
        sysUserService.update(user);
        return Result.ok("修改成功", null);
    }

    /** 删除用户 DELETE /api/auth/users/{id} */
    @DeleteMapping("/users/{id}")
    public Result<Void> deleteUser(@PathVariable Long id) {
        requireAdmin();
        sysUserService.remove(id);
        return Result.ok("删除成功", null);
    }
}
