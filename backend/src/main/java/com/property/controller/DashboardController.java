package com.property.controller;

import com.property.common.Result;
import com.property.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 首页数据看板 接口
 */
@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    /** 核心指标概览 GET /api/dashboard/overview */
    @GetMapping("/overview")
    public Result<Map<String, Object>> overview() {
        return Result.ok(dashboardService.overview());
    }

    /** 图表数据 GET /api/dashboard/charts */
    @GetMapping("/charts")
    public Result<Map<String, Object>> charts() {
        return Result.ok(dashboardService.charts());
    }

    /** 待办提醒 GET /api/dashboard/todos */
    @GetMapping("/todos")
    public Result<List<Map<String, Object>>> todos() {
        return Result.ok(dashboardService.todos());
    }

    /** 数据大屏聚合数据 GET /api/dashboard/screen (管理侧含全量维度, 业主仅自有数据) */
    @GetMapping("/screen")
    public Result<Map<String, Object>> screen() {
        return Result.ok(dashboardService.screen());
    }
}
