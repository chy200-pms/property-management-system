package com.property.controller;

import com.property.common.DataScope;
import com.property.common.PageResult;
import com.property.common.Result;
import com.property.entity.FeeStandard;
import com.property.service.FeeStandardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 收费标准管理 接口
 * <p>业主需要看到收费标准, 因此查询开放; 但制定/调整/删除标准是物业管理动作, 仅 ADMIN/STAFF 可执行。
 */
@RestController
@RequestMapping("/feeStandard")
public class FeeStandardController {

    @Autowired
    private FeeStandardService feeStandardService;

    @Autowired
    private DataScope dataScope;

    /** 分页查询 GET /api/feeStandard/page */
    @GetMapping("/page")
    public Result<PageResult<FeeStandard>> page(FeeStandard query,
                                                @RequestParam(defaultValue = "1") Integer pageNum,
                                                @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.ok(feeStandardService.page(query, pageNum, pageSize));
    }

    /** 全部收费标准 GET /api/feeStandard/list */
    @GetMapping("/list")
    public Result<List<FeeStandard>> list(FeeStandard query) {
        return Result.ok(feeStandardService.list(query));
    }

    /** 详情 GET /api/feeStandard/1 */
    @GetMapping("/{id}")
    public Result<FeeStandard> detail(@PathVariable Long id) {
        return Result.ok(feeStandardService.getById(id));
    }

    /** 新增 POST /api/feeStandard */
    @PostMapping
    public Result<Void> add(@RequestBody FeeStandard standard) {
        dataScope.requireStaff("新增收费标准");
        feeStandardService.save(standard);
        return Result.ok("收费标准新增成功", null);
    }

    /** 修改 PUT /api/feeStandard */
    @PutMapping
    public Result<Void> update(@RequestBody FeeStandard standard) {
        dataScope.requireStaff("修改收费标准");
        feeStandardService.update(standard);
        return Result.ok("收费标准已更新", null);
    }

    /** 删除 DELETE /api/feeStandard/1 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        dataScope.requireStaff("删除收费标准");
        feeStandardService.remove(id);
        return Result.ok("删除成功", null);
    }
}
