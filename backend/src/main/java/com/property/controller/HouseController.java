package com.property.controller;

import com.property.common.DataScope;
import com.property.common.PageResult;
import com.property.common.Result;
import com.property.entity.House;
import com.property.entity.Owner;
import com.property.service.HouseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 房屋管理 接口
 */
@RestController
@RequestMapping("/house")
public class HouseController {

    @Autowired
    private HouseService houseService;

    @Autowired
    private DataScope dataScope;

    /** 分页查询 GET /api/house/page */
    @GetMapping("/page")
    public Result<PageResult<House>> page(House query,
                                          @RequestParam(defaultValue = "1") Integer pageNum,
                                          @RequestParam(defaultValue = "10") Integer pageSize) {
        // 业主只能看自己那一套房
        if (dataScope.isOwnerRole()) {
            Owner me = dataScope.currentOwnerProfile();
            query.setId(me.getHouseId());
        }
        return Result.ok(houseService.page(query, pageNum, pageSize));
    }

    /** 全部房屋 GET /api/house/list */
    @GetMapping("/list")
    public Result<List<House>> list(House query) {
        if (dataScope.isOwnerRole()) {
            Owner me = dataScope.currentOwnerProfile();
            query.setId(me.getHouseId());
        }
        return Result.ok(houseService.list(query));
    }

    /** 详情 GET /api/house/1 */
    @GetMapping("/{id}")
    public Result<House> detail(@PathVariable Long id) {
        House house = houseService.getById(id);
        dataScope.checkHouseId(house.getId());
        return Result.ok(house);
    }

    /** 新增 POST /api/house */
    @PostMapping
    public Result<Void> add(@RequestBody House house) {
        dataScope.denyOwnerWrite("新增房屋");
        houseService.save(house);
        return Result.ok("房屋新增成功", null);
    }

    /** 修改 PUT /api/house */
    @PutMapping
    public Result<Void> update(@RequestBody House house) {
        dataScope.denyOwnerWrite("修改房屋信息");
        houseService.update(house);
        return Result.ok("房屋信息已更新", null);
    }

    /** 删除 DELETE /api/house/1 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        dataScope.denyOwnerWrite("删除房屋");
        houseService.remove(id);
        return Result.ok("删除成功", null);
    }

    /**
     * 办理入住 / 变更房屋状态
     * POST /api/house/checkIn?id=1&ownerId=2&status=OCCUPIED
     */
    @PostMapping("/checkIn")
    public Result<Void> checkIn(@RequestParam Long id,
                                @RequestParam(required = false) Long ownerId,
                                @RequestParam(required = false) String status) {
        dataScope.denyOwnerWrite("办理入住登记");
        houseService.checkIn(id, ownerId, status);
        return Result.ok("入住登记已完成", null);
    }

    /** 按状态统计 GET /api/house/statistics/status */
    @GetMapping("/statistics/status")
    public Result<List<Map<String, Object>>> statusStatistics() {
        return Result.ok(houseService.countGroupByStatus());
    }

    /** 按户型统计 GET /api/house/statistics/type */
    @GetMapping("/statistics/type")
    public Result<List<Map<String, Object>>> typeStatistics() {
        return Result.ok(houseService.countGroupByType());
    }
}
