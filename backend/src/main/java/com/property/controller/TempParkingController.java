package com.property.controller;

import com.property.common.DataScope;
import com.property.common.PageResult;
import com.property.common.Result;
import com.property.entity.TempParking;
import com.property.service.TempParkingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 临时停车管理 接口
 * <p>
 * 计费规则: 前30分钟免费, 之后首小时5元, 每超1小时加3元, 24小时封顶30元。
 * <p>入场登记与出场结算由门岗执行, 记录修改/删除由物业执行, 均要求 ADMIN/STAFF 身份。
 */
@RestController
@RequestMapping("/tempParking")
public class TempParkingController {

    @Autowired
    private TempParkingService tempParkingService;

    @Autowired
    private DataScope dataScope;

    /** 停车记录分页 GET /api/tempParking/page?parkType=OUTSIDE */
    @GetMapping("/page")
    public Result<PageResult<TempParking>> page(TempParking query,
                                                @RequestParam(defaultValue = "1") Integer pageNum,
                                                @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.ok(tempParkingService.page(query, pageNum, pageSize));
    }

    /** 详情 GET /api/tempParking/1 */
    @GetMapping("/{id}")
    public Result<TempParking> detail(@PathVariable Long id) {
        return Result.ok(tempParkingService.getById(id));
    }

    /** 车辆入场 POST /api/tempParking/entry */
    @PostMapping("/entry")
    public Result<TempParking> entry(@RequestBody TempParking param) {
        dataScope.requireStaff("登记车辆入场");
        return Result.ok("车辆入场登记成功", tempParkingService.entry(param));
    }

    /**
     * 车辆出场结算
     * POST /api/tempParking/exit?id=1&payMethod=WECHAT
     * payMethod 传 "FREE" 表示免费放行
     */
    @PostMapping("/exit")
    public Result<Map<String, Object>> exit(@RequestParam Long id,
                                            @RequestParam(required = false) String payMethod,
                                            @RequestParam(required = false) String operator) {
        dataScope.requireStaff("办理车辆出场结算");
        Map<String, Object> data = tempParkingService.exit(id, payMethod, operator);
        return Result.ok((String) data.get("message"), data);
    }

    /** 出场费用试算 GET /api/tempParking/preview/1 */
    @GetMapping("/preview/{id}")
    public Result<Map<String, Object>> preview(@PathVariable Long id) {
        return Result.ok(tempParkingService.calcPreview(id));
    }

    /**
     * 停车费试算(按分钟)
     * GET /api/tempParking/calcFee?minutes=125
     */
    @GetMapping("/calcFee")
    public Result<BigDecimal> calcFee(@RequestParam Integer minutes) {
        return Result.ok(tempParkingService.calcFee(minutes));
    }

    /** 在场车辆 GET /api/tempParking/inParking */
    @GetMapping("/inParking")
    public Result<List<TempParking>> inParking() {
        return Result.ok(tempParkingService.listInParking());
    }

    /** 记录修改 PUT /api/tempParking */
    @PutMapping
    public Result<Void> update(@RequestBody TempParking record) {
        dataScope.requireStaff("修改停车记录");
        tempParkingService.update(record);
        return Result.ok("记录已更新", null);
    }

    /** 删除记录 DELETE /api/tempParking/1 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        dataScope.requireStaff("删除停车记录");
        tempParkingService.remove(id);
        return Result.ok("删除成功", null);
    }

    /** 停车统计 GET /api/tempParking/statistics */
    @GetMapping("/statistics")
    public Result<List<Map<String, Object>>> statistics() {
        return Result.ok(tempParkingService.countGroupByParkType());
    }
}
