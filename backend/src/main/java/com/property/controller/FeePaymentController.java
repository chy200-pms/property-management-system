package com.property.controller;

import com.property.common.DataScope;
import com.property.common.PageResult;
import com.property.common.Result;
import com.property.entity.FeePayment;
import com.property.entity.Owner;
import com.property.service.FeePaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 缴费记录 接口
 */
@RestController
@RequestMapping("/feePayment")
public class FeePaymentController {

    @Autowired
    private FeePaymentService feePaymentService;

    @Autowired
    private DataScope dataScope;

    /** 分页查询 GET /api/feePayment/page?payMethod=WECHAT */
    @GetMapping("/page")
    public Result<PageResult<FeePayment>> page(FeePayment query,
                                               @RequestParam(defaultValue = "1") Integer pageNum,
                                               @RequestParam(defaultValue = "10") Integer pageSize) {
        // 业主只能看自己的缴费记录
        if (dataScope.isOwnerRole()) {
            Owner me = dataScope.currentOwnerProfile();
            query.setOwnerId(me.getId());
        }
        return Result.ok(feePaymentService.page(query, pageNum, pageSize));
    }

    /** 详情 GET /api/feePayment/1 */
    @GetMapping("/{id}")
    public Result<FeePayment> detail(@PathVariable Long id) {
        FeePayment payment = feePaymentService.getById(id);
        dataScope.checkOwnerId(payment.getOwnerId());
        return Result.ok(payment);
    }

    /** 删除 DELETE /api/feePayment/1 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        dataScope.denyOwnerWrite("删除缴费记录");
        feePaymentService.remove(id);
        return Result.ok("删除成功", null);
    }

    /** 按月实收趋势 GET /api/feePayment/statistics/month */
    @GetMapping("/statistics/month")
    public Result<List<Map<String, Object>>> monthStatistics() {
        return Result.ok(feePaymentService.sumGroupByMonth());
    }

    /** 按缴费方式统计 GET /api/feePayment/statistics/method */
    @GetMapping("/statistics/method")
    public Result<List<Map<String, Object>>> methodStatistics() {
        return Result.ok(feePaymentService.sumGroupByMethod());
    }

    /** 今日实收 GET /api/feePayment/statistics/today */
    @GetMapping("/statistics/today")
    public Result<BigDecimal> todayAmount() {
        return Result.ok(feePaymentService.sumTodayAmount());
    }
}
