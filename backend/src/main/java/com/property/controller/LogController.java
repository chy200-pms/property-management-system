package com.property.controller;

import com.property.common.BusinessException;
import com.property.common.PageResult;
import com.property.common.Result;
import com.property.config.LoginInterceptor;
import com.property.entity.SysLog;
import com.property.entity.SysUser;
import com.property.service.SysLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 操作日志 接口(仅管理员)
 */
@RestController
@RequestMapping("/log")
public class LogController {

    @Autowired
    private SysLogService sysLogService;

    /** 校验当前登录用户是否为管理员 */
    private void requireAdmin() {
        SysUser user = LoginInterceptor.getCurrentUser();
        if (user == null || !"ADMIN".equals(user.getRole())) {
            throw new BusinessException("只有管理员可以查看操作日志");
        }
    }

    /**
     * 日志分页 GET /api/log/page
     * 支持 keyword / module / role / status / startTime / endTime 筛选
     */
    @GetMapping("/page")
    public Result<PageResult<SysLog>> page(@RequestParam(required = false) String keyword,
                                           @RequestParam(required = false) String module,
                                           @RequestParam(required = false) String role,
                                           @RequestParam(required = false) Integer status,
                                           @RequestParam(required = false) String startTime,
                                           @RequestParam(required = false) String endTime,
                                           @RequestParam(defaultValue = "1") Integer pageNum,
                                           @RequestParam(defaultValue = "20") Integer pageSize) {
        requireAdmin();
        return Result.ok(sysLogService.page(keyword, module, role, status, startTime, endTime, pageNum, pageSize));
    }

    /** 日志概览 GET /api/log/statistics */
    @GetMapping("/statistics")
    public Result<Map<String, Object>> statistics() {
        requireAdmin();
        return Result.ok(sysLogService.statistics());
    }

    /** 日志详情 GET /api/log/detail/{id} */
    @GetMapping("/detail/{id}")
    public Result<SysLog> detail(@PathVariable Long id) {
        requireAdmin();
        return Result.ok(sysLogService.getById(id));
    }
}
