package com.property.controller;

import com.property.common.DataScope;
import com.property.common.PageResult;
import com.property.common.Result;
import com.property.entity.Owner;
import com.property.entity.RepairOrder;
import com.property.service.RepairOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 报修管理 接口
 */
@RestController
@RequestMapping("/repair")
public class RepairController {

    @Autowired
    private RepairOrderService repairOrderService;

    @Autowired
    private DataScope dataScope;

    /**
     * 工单分页查询
     * GET /api/repair/page?status=PENDING&repairType=WATER_ELEC&urgency=URGENT
     */
    @GetMapping("/page")
    public Result<PageResult<RepairOrder>> page(RepairOrder query,
                                                @RequestParam(defaultValue = "1") Integer pageNum,
                                                @RequestParam(defaultValue = "10") Integer pageSize) {
        // 业主只能看自己提交的报修
        if (dataScope.isOwnerRole()) {
            Owner me = dataScope.currentOwnerProfile();
            query.setOwnerId(me.getId());
        }
        return Result.ok(repairOrderService.page(query, pageNum, pageSize));
    }

    /** 详情 GET /api/repair/1 */
    @GetMapping("/{id}")
    public Result<RepairOrder> detail(@PathVariable Long id) {
        RepairOrder order = repairOrderService.getById(id);
        dataScope.checkOwnerId(order.getOwnerId());
        return Result.ok(order);
    }

    /** 提交报修 POST /api/repair */
    @PostMapping
    public Result<Void> add(@RequestBody RepairOrder order) {
        // 业主提交报修时, 强制挂到自己名下/自己房间, 防止替他人提交
        if (dataScope.isOwnerRole()) {
            Owner me = dataScope.currentOwnerProfile();
            order.setOwnerId(me.getId());
            order.setOwnerName(me.getName());
            order.setHouseId(me.getHouseId());
        }
        repairOrderService.save(order);
        return Result.ok("报修提交成功, 物业会尽快与您联系", null);
    }

    /** 修改工单 PUT /api/repair */
    @PutMapping
    public Result<Void> update(@RequestBody RepairOrder order) {
        dataScope.denyOwnerWrite("修改工单");
        repairOrderService.update(order);
        return Result.ok("工单已更新", null);
    }

    /** 删除工单 DELETE /api/repair/1 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        dataScope.denyOwnerWrite("删除工单");
        repairOrderService.remove(id);
        return Result.ok("删除成功", null);
    }

    /**
     * 派单
     * POST /api/repair/assign?id=1&handler=刘海涛&handlerPhone=13900001001
     */
    @PostMapping("/assign")
    public Result<Map<String, Object>> assign(@RequestParam Long id,
                                              @RequestParam String handler,
                                              @RequestParam(required = false) String handlerPhone) {
        dataScope.denyOwnerWrite("派单");
        Map<String, Object> data = repairOrderService.assign(id, handler, handlerPhone);
        return Result.ok((String) data.get("message"), data);
    }

    /**
     * 开始处理
     * POST /api/repair/start?id=1
     */
    @PostMapping("/start")
    public Result<Void> start(@RequestParam Long id) {
        dataScope.denyOwnerWrite("处理工单");
        repairOrderService.start(id);
        return Result.ok("工单已开始处理", null);
    }

    /**
     * 完工
     * POST /api/repair/finish?id=1&cost=80&remark=已更换配件
     */
    @PostMapping("/finish")
    public Result<Map<String, Object>> finish(@RequestParam Long id,
                                              @RequestParam(required = false) BigDecimal cost,
                                              @RequestParam(required = false) String remark) {
        dataScope.denyOwnerWrite("办结工单");
        Map<String, Object> data = repairOrderService.finish(id, cost, remark);
        return Result.ok((String) data.get("message"), data);
    }

    /**
     * 业主评价
     * POST /api/repair/rate?id=1&rating=5&feedback=服务很好
     */
    @PostMapping("/rate")
    public Result<Void> rate(@RequestParam Long id,
                             @RequestParam Integer rating,
                             @RequestParam(required = false) String feedback) {
        // 业主只能评价自己的工单
        dataScope.checkOwnerId(repairOrderService.getById(id).getOwnerId());
        repairOrderService.rate(id, rating, feedback);
        return Result.ok("感谢您的评价", null);
    }

    /** 工单状态统计 GET /api/repair/statistics/status */
    @GetMapping("/statistics/status")
    public Result<List<Map<String, Object>>> statusStatistics() {
        return Result.ok(repairOrderService.countGroupByStatus());
    }

    /** 报修类型统计 GET /api/repair/statistics/type */
    @GetMapping("/statistics/type")
    public Result<List<Map<String, Object>>> typeStatistics() {
        return Result.ok(repairOrderService.countGroupByType());
    }

    /** 平均满意度 GET /api/repair/statistics/rating */
    @GetMapping("/statistics/rating")
    public Result<BigDecimal> avgRating() {
        return Result.ok(repairOrderService.avgRating());
    }
}
