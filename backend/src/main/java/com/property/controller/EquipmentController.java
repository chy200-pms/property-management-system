package com.property.controller;

import com.property.common.DataScope;
import com.property.common.PageResult;
import com.property.common.Result;
import com.property.entity.Equipment;
import com.property.service.EquipmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.util.Date;

/**
 * 设备设施管理 接口
 * <p>查询对所有登录用户开放; 增删改与维保登记属于物业管理动作, 仅 ADMIN/STAFF 可执行。
 */
@RestController
@RequestMapping("/equipment")
public class EquipmentController {

    @Autowired
    private EquipmentService equipmentService;

    @Autowired
    private DataScope dataScope;

    /** 分页查询 GET /api/equipment/page?equipmentType=ELEVATOR&status=REPAIR */
    @GetMapping("/page")
    public Result<PageResult<Equipment>> page(Equipment query,
                                              @RequestParam(defaultValue = "1") Integer pageNum,
                                              @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.ok(equipmentService.page(query, pageNum, pageSize));
    }

    /** 详情 GET /api/equipment/1 */
    @GetMapping("/{id}")
    public Result<Equipment> detail(@PathVariable Long id) {
        return Result.ok(equipmentService.getById(id));
    }

    /** 新增 POST /api/equipment */
    @PostMapping
    public Result<Void> add(@RequestBody Equipment equipment) {
        dataScope.requireStaff("新增设备");
        equipmentService.save(equipment);
        return Result.ok("设备新增成功", null);
    }

    /** 修改 PUT /api/equipment */
    @PutMapping
    public Result<Void> update(@RequestBody Equipment equipment) {
        dataScope.requireStaff("修改设备信息");
        equipmentService.update(equipment);
        return Result.ok("设备信息已更新", null);
    }

    /** 删除 DELETE /api/equipment/1 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        dataScope.requireStaff("删除设备");
        equipmentService.remove(id);
        return Result.ok("删除成功", null);
    }

    /**
     * 登记维保完成
     * POST /api/equipment/maintain?id=1&maintainDate=2026-09-16
     */
    @PostMapping("/maintain")
    public Result<Void> maintain(@RequestParam Long id,
                                 @RequestParam(required = false)
                                 @DateTimeFormat(pattern = "yyyy-MM-dd") Date maintainDate) {
        dataScope.requireStaff("登记设备维保");
        equipmentService.maintain(id, maintainDate);
        return Result.ok("维保记录已登记, 下次维保日期已自动更新", null);
    }
}
