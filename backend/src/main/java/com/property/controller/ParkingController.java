package com.property.controller;

import com.property.common.DataScope;
import com.property.common.PageResult;
import com.property.common.Result;
import com.property.entity.ParkingSpace;
import com.property.service.ParkingSpaceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * 车位管理 接口
 * <p>车位编号属于公开信息, 查询开放; 增删改与分配/释放是物业管理动作, 仅 ADMIN/STAFF 可执行。
 */
@RestController
@RequestMapping("/parking")
public class ParkingController {

    @Autowired
    private ParkingSpaceService parkingSpaceService;

    @Autowired
    private DataScope dataScope;

    /** 分页查询 GET /api/parking/page?spaceType=OUTSIDE&status=RENTED */
    @GetMapping("/page")
    public Result<PageResult<ParkingSpace>> page(ParkingSpace query,
                                                 @RequestParam(defaultValue = "1") Integer pageNum,
                                                 @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.ok(parkingSpaceService.page(query, pageNum, pageSize));
    }

    /** 全部车位 GET /api/parking/list */
    @GetMapping("/list")
    public Result<List<ParkingSpace>> list(ParkingSpace query) {
        return Result.ok(parkingSpaceService.list(query));
    }

    /** 详情 GET /api/parking/1 */
    @GetMapping("/{id}")
    public Result<ParkingSpace> detail(@PathVariable Long id) {
        return Result.ok(parkingSpaceService.getById(id));
    }

    /** 新增车位 POST /api/parking */
    @PostMapping
    public Result<Void> add(@RequestBody ParkingSpace space) {
        dataScope.requireStaff("新增车位");
        parkingSpaceService.save(space);
        return Result.ok("车位新增成功", null);
    }

    /** 修改车位 PUT /api/parking */
    @PutMapping
    public Result<Void> update(@RequestBody ParkingSpace space) {
        dataScope.requireStaff("修改车位信息");
        parkingSpaceService.update(space);
        return Result.ok("车位信息已更新", null);
    }

    /** 删除车位 DELETE /api/parking/1 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        dataScope.requireStaff("删除车位");
        parkingSpaceService.remove(id);
        return Result.ok("删除成功", null);
    }

    /**
     * 分配车位给住户
     * POST /api/parking/allocate?id=1&ownerId=2&carPlate=京A12345&status=RENTED
     */
    @PostMapping("/allocate")
    public Result<Void> allocate(@RequestParam Long id,
                                 @RequestParam Long ownerId,
                                 @RequestParam(required = false) String carPlate,
                                 @RequestParam(required = false) String status,
                                 @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
                                 @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate) {
        dataScope.requireStaff("分配车位");
        parkingSpaceService.allocate(id, ownerId, carPlate, status, startDate, endDate);
        return Result.ok("车位分配成功", null);
    }

    /**
     * 退租/释放车位
     * POST /api/parking/release?id=1
     */
    @PostMapping("/release")
    public Result<Void> release(@RequestParam Long id) {
        dataScope.requireStaff("释放车位");
        parkingSpaceService.release(id);
        return Result.ok("车位已释放", null);
    }

    /** 车位使用情况统计 GET /api/parking/statistics */
    @GetMapping("/statistics")
    public Result<List<Map<String, Object>>> statistics() {
        return Result.ok(parkingSpaceService.countGroupByType());
    }
}
