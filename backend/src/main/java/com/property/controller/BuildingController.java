package com.property.controller;

import com.property.common.DataScope;
import com.property.common.PageResult;
import com.property.common.Result;
import com.property.entity.Building;
import com.property.service.BuildingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 楼栋管理 接口
 * <p>查询对所有登录用户开放; 增删改属于物业管理动作, 仅 ADMIN/STAFF 可执行。
 */
@RestController
@RequestMapping("/building")
public class BuildingController {

    @Autowired
    private BuildingService buildingService;

    @Autowired
    private DataScope dataScope;

    /** 分页查询 GET /api/building/page?pageNum=1&pageSize=10&keyword=1号楼 */
    @GetMapping("/page")
    public Result<PageResult<Building>> page(Building query,
                                             @RequestParam(defaultValue = "1") Integer pageNum,
                                             @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.ok(buildingService.page(query, pageNum, pageSize));
    }

    /** 全部楼栋(下拉框用) GET /api/building/list */
    @GetMapping("/list")
    public Result<List<Building>> list(Building query) {
        return Result.ok(buildingService.list(query));
    }

    /** 详情 GET /api/building/1 */
    @GetMapping("/{id}")
    public Result<Building> detail(@PathVariable Long id) {
        return Result.ok(buildingService.getById(id));
    }

    /** 新增 POST /api/building */
    @PostMapping
    public Result<Void> add(@RequestBody Building building) {
        dataScope.requireStaff("新增楼栋");
        buildingService.save(building);
        return Result.ok("楼栋新增成功", null);
    }

    /** 修改 PUT /api/building */
    @PutMapping
    public Result<Void> update(@RequestBody Building building) {
        dataScope.requireStaff("修改楼栋信息");
        buildingService.update(building);
        return Result.ok("楼栋信息已更新", null);
    }

    /** 删除 DELETE /api/building/1 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        dataScope.requireStaff("删除楼栋");
        buildingService.remove(id);
        return Result.ok("删除成功", null);
    }

    /** 楼栋入住情况统计 GET /api/building/statistics */
    @GetMapping("/statistics")
    public Result<List<Map<String, Object>>> statistics() {
        return Result.ok(buildingService.countHouseByBuilding());
    }
}
