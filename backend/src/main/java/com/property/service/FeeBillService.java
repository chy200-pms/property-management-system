package com.property.service;

import com.property.common.BaseService;
import com.property.common.BusinessException;
import com.property.entity.*;
import com.property.mapper.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * 费用账单管理 业务
 * <p>
 * 核心能力: 账单查询、按月批量生成物业费/车位管理费、缴费、欠费统计。
 */
@Service
public class FeeBillService extends BaseService<FeeBillMapper, FeeBill> {

    /** 住宅物业费标准编码 */
    private static final String STD_RESIDENT = "PROPERTY-001";
    /** 公寓物业费标准编码 */
    private static final String STD_APARTMENT = "PROPERTY-002";

    @Autowired
    private HouseMapper houseMapper;

    @Autowired
    private BuildingMapper buildingMapper;

    @Autowired
    private FeeStandardMapper feeStandardMapper;

    @Autowired
    private ParkingSpaceMapper parkingSpaceMapper;

    @Autowired
    private FeePaymentMapper feePaymentMapper;

    // ==================================================================
    //  账单生成
    // ==================================================================

    /**
     * 按月批量生成物业费账单
     *
     * @param period 账期, 格式 yyyy-MM
     * @return 生成结果统计
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> generatePropertyBill(String period) {
        validatePeriod(period);

        // 楼栋 -> 楼栋类型
        Map<Long, String> buildingTypeMap = new HashMap<>();
        for (Building b : buildingMapper.selectList(new Building(), null, null)) {
            buildingTypeMap.put(b.getId(), b.getBuildingType());
        }
        // 收费标准
        Map<String, FeeStandard> stdMap = new HashMap<>();
        for (FeeStandard s : feeStandardMapper.selectList(new FeeStandard(), null, null)) {
            stdMap.put(s.getFeeCode(), s);
        }
        FeeStandard residentStd = stdMap.get(STD_RESIDENT);
        FeeStandard apartmentStd = stdMap.get(STD_APARTMENT);
        if (residentStd == null) {
            throw new BusinessException("未找到住宅物业费标准(编码 " + STD_RESIDENT + "), 请先在收费标准中配置");
        }

        // 已入住/已出租且已绑定住户的房屋
        List<House> houses = houseMapper.selectList(new House(), null, null);
        int created = 0, skipped = 0, generated = 0;
        for (House h : houses) {
            if (!"OCCUPIED".equals(h.getStatus()) && !"RENTED".equals(h.getStatus())) {
                continue;
            }
            if (h.getOwnerId() == null) {
                continue;
            }
            generated++;
            if (baseMapper.existsBill(h.getOwnerId(), period, "PROPERTY", null) > 0) {
                skipped++;
                continue;
            }
            boolean isApartment = "公寓".equals(buildingTypeMap.get(h.getBuildingId()));
            FeeStandard std = (isApartment && apartmentStd != null) ? apartmentStd : residentStd;

            BigDecimal amount = h.getArea() == null
                    ? BigDecimal.ZERO
                    : h.getArea().multiply(std.getUnitPrice()).setScale(2, RoundingMode.HALF_UP);

            FeeBill bill = new FeeBill();
            bill.setBillNo(nextNo("WY", period));
            bill.setOwnerId(h.getOwnerId());
            bill.setHouseId(h.getId());
            bill.setHouseNo(h.getHouseNo());
            bill.setStandardId(std.getId());
            bill.setFeeType("PROPERTY");
            bill.setFeeName(std.getFeeName());
            bill.setPeriod(period);
            bill.setAmount(amount);
            bill.setPaidAmount(BigDecimal.ZERO);
            bill.setPayStatus("UNPAID");
            bill.setDueDate(dueDateOf(period));
            baseMapper.insert(bill);
            created++;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period", period);
        result.put("total", generated);
        result.put("created", created);
        result.put("skipped", skipped);
        result.put("message", String.format("账期 %s 物业费账单生成完成: 应生成 %d 户, 新增 %d 条, 已存在跳过 %d 条",
                period, generated, created, skipped));
        return result;
    }

    /**
     * 按月批量生成车位管理费账单
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> generateParkingBill(String period) {
        validatePeriod(period);

        // 车位类型 -> 收费标准编码
        Map<String, String> typeToCode = Map.of(
                "UNDERGROUND", "PARKING-001",
                "GROUND", "PARKING-002",
                "OUTSIDE", "PARKING-003");
        Map<String, FeeStandard> stdMap = new HashMap<>();
        for (FeeStandard s : feeStandardMapper.selectList(new FeeStandard(), null, null)) {
            stdMap.put(s.getFeeCode(), s);
        }

        // 已分配且绑定了使用人的车位
        ParkingSpace query = new ParkingSpace();
        List<ParkingSpace> spaces = parkingSpaceMapper.selectList(query, null, null);

        int created = 0, skipped = 0, generated = 0;
        for (ParkingSpace sp : spaces) {
            if ("FREE".equals(sp.getStatus()) || sp.getOwnerId() == null) {
                continue;
            }
            generated++;
            if (baseMapper.existsBill(sp.getOwnerId(), period, "PARKING", sp.getId()) > 0) {
                skipped++;
                continue;
            }
            FeeStandard std = stdMap.get(typeToCode.get(sp.getSpaceType()));
            BigDecimal amount = sp.getMonthFee() == null ? BigDecimal.ZERO : sp.getMonthFee();

            FeeBill bill = new FeeBill();
            bill.setBillNo(nextNo("CW", period));
            bill.setOwnerId(sp.getOwnerId());
            bill.setParkingId(sp.getId());
            bill.setParkingNo(sp.getSpaceNo());
            bill.setStandardId(std == null ? null : std.getId());
            bill.setFeeType("PARKING");
            bill.setFeeName(std == null ? "车位管理费" : std.getFeeName());
            bill.setPeriod(period);
            bill.setAmount(amount);
            bill.setPaidAmount(BigDecimal.ZERO);
            bill.setPayStatus("UNPAID");
            bill.setDueDate(dueDateOf(period));
            baseMapper.insert(bill);
            created++;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period", period);
        result.put("total", generated);
        result.put("created", created);
        result.put("skipped", skipped);
        result.put("message", String.format("账期 %s 车位管理费账单生成完成: 应生成 %d 个车位, 新增 %d 条, 已存在跳过 %d 条",
                period, generated, created, skipped));
        return result;
    }

    // ==================================================================
    //  缴费
    // ==================================================================

    /**
     * 账单缴费
     *
     * @param billId    账单ID
     * @param payMethod 缴费方式
     * @param operator  操作人
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> pay(Long billId, String payMethod, String operator) {
        FeeBill bill = baseMapper.selectById(billId);
        if (bill == null) {
            throw new BusinessException("账单不存在");
        }
        if ("PAID".equals(bill.getPayStatus())) {
            throw new BusinessException("账单 " + bill.getBillNo() + " 已缴费, 无需重复缴费");
        }
        Date now = new Date();
        String method = (payMethod == null || payMethod.isEmpty()) ? "WECHAT" : payMethod;

        // 1. 更新账单状态
        FeeBill update = new FeeBill();
        update.setId(billId);
        update.setPaidAmount(bill.getAmount());
        update.setPayStatus("PAID");
        update.setPayTime(now);
        update.setPayMethod(method);
        baseMapper.updateById(update);

        // 2. 生成缴费流水
        FeePayment payment = new FeePayment();
        payment.setPaymentNo(nextNo("PAY", new SimpleDateFormat("yyyy-MM-dd").format(now)));
        payment.setBillId(billId);
        payment.setBillNo(bill.getBillNo());
        payment.setOwnerId(bill.getOwnerId());
        payment.setOwnerName(bill.getOwnerName());
        payment.setFeeName(bill.getFeeName());
        payment.setAmount(bill.getAmount());
        payment.setPayMethod(method);
        payment.setPayTime(now);
        payment.setOperator(operator == null ? "系统" : operator);
        payment.setRemark(bill.getPeriod() + " " + bill.getFeeName());
        feePaymentMapper.insert(payment);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("billNo", bill.getBillNo());
        result.put("amount", bill.getAmount());
        result.put("paymentNo", payment.getPaymentNo());
        result.put("payTime", now);
        result.put("message", "缴费成功, 实收 " + bill.getAmount() + " 元");
        return result;
    }

    /**
     * 批量缴费
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> payBatch(List<Long> billIds, String payMethod, String operator) {
        if (billIds == null || billIds.isEmpty()) {
            throw new BusinessException("请选择需要缴费的账单");
        }
        BigDecimal total = BigDecimal.ZERO;
        int success = 0;
        for (Long id : billIds) {
            try {
                Map<String, Object> r = pay(id, payMethod, operator);
                total = total.add((BigDecimal) r.get("amount"));
                success++;
            } catch (BusinessException ignored) {
                // 单条失败不影响其它账单
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", success);
        result.put("total", total);
        result.put("message", String.format("批量缴费完成: 成功 %d 笔, 合计 %s 元", success, total));
        return result;
    }

    /**
     * 撤销缴费(仅管理员, 用于收费错误冲正)
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> cancelPay(Long billId) {
        FeeBill bill = baseMapper.selectById(billId);
        if (bill == null) {
            throw new BusinessException("账单不存在");
        }
        if (!"PAID".equals(bill.getPayStatus())) {
            throw new BusinessException("该账单未缴费, 无法撤销");
        }
        FeeBill update = new FeeBill();
        update.setId(billId);
        update.setPaidAmount(BigDecimal.ZERO);
        update.setPayStatus("UNPAID");
        update.setPayMethod("");
        baseMapper.updateById(update);
        feePaymentMapper.deleteByBillId(billId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "已撤销账单 " + bill.getBillNo() + " 的缴费记录");
        return result;
    }

    // ==================================================================
    //  统计
    // ==================================================================

    /** 缴费状态统计 */
    public List<Map<String, Object>> countGroupByStatus() {
        return baseMapper.countGroupByStatus();
    }

    /** 费用类型统计 */
    public List<Map<String, Object>> countGroupByType() {
        return baseMapper.countGroupByType();
    }

    /** 按账期统计收费趋势 */
    public List<Map<String, Object>> sumGroupByPeriod() {
        return baseMapper.sumGroupByPeriod();
    }

    /** 欠费总额 */
    public BigDecimal sumUnpaidAmount() {
        return baseMapper.sumUnpaidAmount();
    }

    // ==================================================================
    //  内部工具
    // ==================================================================

    private void validatePeriod(String period) {
        if (period == null || !period.matches("\\d{4}-\\d{2}")) {
            throw new BusinessException("账期格式不正确, 正确格式如 2026-09");
        }
    }

    /** 账期对应的应缴截止日(当月25日) */
    private Date dueDateOf(String period) {
        try {
            String[] arr = period.split("-");
            Calendar c = Calendar.getInstance();
            c.set(Integer.parseInt(arr[0]), Integer.parseInt(arr[1]) - 1, 25, 0, 0, 0);
            c.set(Calendar.MILLISECOND, 0);
            return c.getTime();
        } catch (Exception e) {
            return new Date();
        }
    }

    /** 生成业务单号: 前缀 + 账期去除横线 + 6位随机码 */
    private String nextNo(String prefix, String period) {
        String p = period.replace("-", "");
        String rand = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
        return prefix + p + rand;
    }
}
