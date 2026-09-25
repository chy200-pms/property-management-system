package com.property.controller;

import com.property.common.DataScope;
import com.property.common.PageResult;
import com.property.common.Result;
import com.property.config.LoginInterceptor;
import com.property.entity.FeeBill;
import com.property.entity.Owner;
import com.property.entity.SysUser;
import com.property.service.FeeBillService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 物业费 / 费用账单管理 接口
 */
@RestController
@RequestMapping("/feeBill")
public class FeeBillController {

    @Autowired
    private FeeBillService feeBillService;

    @Autowired
    private DataScope dataScope;

    /**
     * 账单分页查询
     * GET /api/feeBill/page?payStatus=UNPAID&period=2026-09&feeType=PROPERTY
     */
    @GetMapping("/page")
    public Result<PageResult<FeeBill>> page(FeeBill query,
                                            @RequestParam(defaultValue = "1") Integer pageNum,
                                            @RequestParam(defaultValue = "10") Integer pageSize) {
        // 业主只能看自己名下的账单
        if (dataScope.isOwnerRole()) {
            Owner me = dataScope.currentOwnerProfile();
            query.setOwnerId(me.getId());
        }
        return Result.ok(feeBillService.page(query, pageNum, pageSize));
    }

    /** 账单列表(不分页) GET /api/feeBill/list */
    @GetMapping("/list")
    public Result<List<FeeBill>> list(FeeBill query) {
        if (dataScope.isOwnerRole()) {
            Owner me = dataScope.currentOwnerProfile();
            query.setOwnerId(me.getId());
        }
        return Result.ok(feeBillService.list(query));
    }

    /** 账单详情 GET /api/feeBill/1 */
    @GetMapping("/{id}")
    public Result<FeeBill> detail(@PathVariable Long id) {
        FeeBill bill = feeBillService.getById(id);
        dataScope.checkOwnerId(bill.getOwnerId());
        return Result.ok(bill);
    }

    /** 手工新增账单 POST /api/feeBill */
    @PostMapping
    public Result<Void> add(@RequestBody FeeBill bill) {
        dataScope.denyOwnerWrite("新增账单");
        feeBillService.save(bill);
        return Result.ok("账单新增成功", null);
    }

    /** 修改账单 PUT /api/feeBill */
    @PutMapping
    public Result<Void> update(@RequestBody FeeBill bill) {
        dataScope.denyOwnerWrite("修改账单");
        feeBillService.update(bill);
        return Result.ok("账单已更新", null);
    }

    /** 删除账单 DELETE /api/feeBill/1 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        dataScope.denyOwnerWrite("删除账单");
        feeBillService.remove(id);
        return Result.ok("删除成功", null);
    }

    /**
     * 账单缴费
     * POST /api/feeBill/pay?id=1&payMethod=WECHAT
     */
    @PostMapping("/pay")
    public Result<Map<String, Object>> pay(@RequestParam Long id,
                                           @RequestParam(required = false) String payMethod) {
        // 业主可以缴自己的账单, 但不能替别人缴
        dataScope.checkOwnerId(feeBillService.getById(id).getOwnerId());
        SysUser user = LoginInterceptor.getCurrentUser();
        Map<String, Object> data = feeBillService.pay(id, payMethod, user == null ? "系统" : user.getRealName());
        return Result.ok((String) data.get("message"), data);
    }

    /**
     * 批量缴费
     * POST /api/feeBill/payBatch  body: [1,2,3]
     */
    @PostMapping("/payBatch")
    public Result<Map<String, Object>> payBatch(@RequestBody List<Long> billIds,
                                                @RequestParam(required = false) String payMethod) {
        if (dataScope.isOwnerRole() && billIds != null) {
            for (Long bid : billIds) {
                dataScope.checkOwnerId(feeBillService.getById(bid).getOwnerId());
            }
        }
        SysUser user = LoginInterceptor.getCurrentUser();
        Map<String, Object> data = feeBillService.payBatch(billIds, payMethod, user == null ? "系统" : user.getRealName());
        return Result.ok((String) data.get("message"), data);
    }

    /**
     * 撤销缴费(收费冲正)
     * POST /api/feeBill/cancelPay?id=1
     */
    @PostMapping("/cancelPay")
    public Result<Map<String, Object>> cancelPay(@RequestParam Long id) {
        dataScope.denyOwnerWrite("撤销缴费");
        Map<String, Object> data = feeBillService.cancelPay(id);
        return Result.ok((String) data.get("message"), data);
    }

    /**
     * 一键生成物业费账单
     * POST /api/feeBill/generate/property?period=2026-09
     */
    @PostMapping("/generate/property")
    public Result<Map<String, Object>> generateProperty(@RequestParam String period) {
        dataScope.denyOwnerWrite("生成账单");
        Map<String, Object> data = feeBillService.generatePropertyBill(period);
        return Result.ok((String) data.get("message"), data);
    }

    /**
     * 一键生成车位管理费账单
     * POST /api/feeBill/generate/parking?period=2026-09
     */
    @PostMapping("/generate/parking")
    public Result<Map<String, Object>> generateParking(@RequestParam String period) {
        dataScope.denyOwnerWrite("生成账单");
        Map<String, Object> data = feeBillService.generateParkingBill(period);
        return Result.ok((String) data.get("message"), data);
    }

    /** 缴费状态统计 GET /api/feeBill/statistics/status */
    @GetMapping("/statistics/status")
    public Result<List<Map<String, Object>>> statusStatistics() {
        return Result.ok(feeBillService.countGroupByStatus());
    }

    /** 费用类型统计 GET /api/feeBill/statistics/type */
    @GetMapping("/statistics/type")
    public Result<List<Map<String, Object>>> typeStatistics() {
        return Result.ok(feeBillService.countGroupByType());
    }

    /** 收费趋势 GET /api/feeBill/statistics/period */
    @GetMapping("/statistics/period")
    public Result<List<Map<String, Object>>> periodStatistics() {
        return Result.ok(feeBillService.sumGroupByPeriod());
    }

    /** 欠费总额 GET /api/feeBill/statistics/unpaid */
    @GetMapping("/statistics/unpaid")
    public Result<BigDecimal> unpaidAmount() {
        return Result.ok(feeBillService.sumUnpaidAmount());
    }
}
