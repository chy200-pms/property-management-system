package com.property.service;

import com.property.common.BaseService;
import com.property.common.BusinessException;
import com.property.entity.ParkingSpace;
import com.property.entity.TempParking;
import com.property.mapper.ParkingSpaceMapper;
import com.property.mapper.TempParkingMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * 临时停车管理 业务
 * <p>
 * 计费规则(小区外临街 / 小区内临停统一):
 * <pre>
 *   前 30 分钟        免费
 *   超过 30 分钟      首小时 5 元, 之后每满 1 小时加收 3 元
 *   24 小时内         封顶 30 元
 * </pre>
 */
@Service
public class TempParkingService extends BaseService<TempParkingMapper, TempParking> {

    /** 免费时长(分钟) */
    public static final int FREE_MINUTES = 30;
    /** 首小时费用(元) */
    public static final BigDecimal FIRST_HOUR_FEE = new BigDecimal("5.00");
    /** 超出部分每小时费用(元) */
    public static final BigDecimal HOURLY_FEE = new BigDecimal("3.00");
    /** 单日封顶费用(元) */
    public static final BigDecimal DAILY_CAP = new BigDecimal("30.00");

    @Autowired
    private ParkingSpaceMapper parkingSpaceMapper;

    /**
     * 车辆入场登记
     */
    @Transactional(rollbackFor = Exception.class)
    public TempParking entry(TempParking param) {
        if (param.getCarPlate() == null || param.getCarPlate().trim().isEmpty()) {
            throw new BusinessException("请输入车牌号");
        }
        String plate = param.getCarPlate().trim().toUpperCase();
        // 检查是否已在场
        TempParking in = baseMapper.findInParkingByPlate(plate);
        if (in != null) {
            throw new BusinessException("车辆 " + plate + " 已在场(" + in.getRecordNo() + "), 请勿重复入场");
        }
        TempParking record = new TempParking();
        record.setCarPlate(plate);
        record.setCarType(param.getCarType() == null ? "小型车" : param.getCarType());
        record.setParkType(param.getParkType() == null ? "OUTSIDE" : param.getParkType());
        record.setSpaceNo(param.getSpaceNo());
        record.setGate(param.getGate());
        record.setOperator(param.getOperator());
        record.setEntryTime(new Date());
        record.setExitTime(null);
        record.setDuration(0);
        record.setFee(BigDecimal.ZERO);
        record.setPaidFee(BigDecimal.ZERO);
        record.setPayStatus("UNPAID");
        record.setRemark("车辆在场");
        record.setRecordNo(nextNo());
        baseMapper.insert(record);
        return record;
    }

    /**
     * 车辆出场结算
     *
     * @param recordId  停车记录ID
     * @param payMethod 缴费方式, 传 "FREE" 表示免费放行
     * @param operator  操作人
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> exit(Long recordId, String payMethod, String operator) {
        TempParking record = baseMapper.selectById(recordId);
        if (record == null) {
            throw new BusinessException("停车记录不存在");
        }
        if (record.getExitTime() != null) {
            throw new BusinessException("该记录已完成出场结算, 不能重复操作");
        }
        Date now = new Date();
        int minutes = (int) ((now.getTime() - record.getEntryTime().getTime()) / 60000L);
        if (minutes < 0) {
            minutes = 0;
        }
        BigDecimal fee = calcFee(minutes);
        boolean free = "FREE".equals(payMethod);
        String method = free ? null : (payMethod == null ? "WECHAT" : payMethod);

        TempParking update = new TempParking();
        update.setId(recordId);
        update.setExitTime(now);
        update.setDuration(minutes);
        update.setFee(fee);
        update.setPaidFee(free ? BigDecimal.ZERO : fee);
        update.setPayStatus(free ? "FREE" : "PAID");
        update.setPayMethod(method);
        update.setPayTime(now);
        update.setOperator(operator);
        update.setRemark(free ? "免费放行" : "已结算出场");
        baseMapper.updateById(update);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("recordNo", record.getRecordNo());
        result.put("carPlate", record.getCarPlate());
        result.put("duration", minutes);
        result.put("durationText", formatDuration(minutes));
        result.put("fee", fee);
        result.put("payStatus", free ? "FREE" : "PAID");
        result.put("message", free
                ? String.format("车辆 %s 已免费放行, 停车 %s", record.getCarPlate(), formatDuration(minutes))
                : String.format("车辆 %s 停车 %s, 应收 %s 元, 已结算", record.getCarPlate(), formatDuration(minutes), fee));
        return result;
    }

    /**
     * 试算停车费(用于出场前预览)
     */
    public Map<String, Object> calcPreview(Long recordId) {
        TempParking record = baseMapper.selectById(recordId);
        if (record == null) {
            throw new BusinessException("停车记录不存在");
        }
        int minutes = record.getExitTime() != null
                ? record.getDuration()
                : (int) ((System.currentTimeMillis() - record.getEntryTime().getTime()) / 60000L);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("carPlate", record.getCarPlate());
        result.put("entryTime", record.getEntryTime());
        result.put("duration", minutes);
        result.put("durationText", formatDuration(minutes));
        result.put("fee", record.getExitTime() != null ? record.getFee() : calcFee(minutes));
        return result;
    }

    /**
     * 停车费计算
     *
     * @param minutes 停车时长(分钟)
     */
    public BigDecimal calcFee(int minutes) {
        if (minutes <= FREE_MINUTES) {
            return BigDecimal.ZERO;
        }
        // 超出免费时长后的计费小时数(不足 1 小时按 1 小时计)
        int billableHours = (int) Math.ceil((minutes - FREE_MINUTES) / 60.0);
        BigDecimal fee = FIRST_HOUR_FEE.add(HOURLY_FEE.multiply(BigDecimal.valueOf(Math.max(0, billableHours - 1))));
        // 跨天则按天数计算封顶
        int days = Math.max(1, (int) Math.ceil(minutes / (24 * 60.0)));
        BigDecimal cap = DAILY_CAP.multiply(BigDecimal.valueOf(days));
        fee = fee.min(cap);
        return fee.setScale(2, RoundingMode.HALF_UP);
    }

    /** 时长的可读文本, 如 "2小时35分钟" */
    public String formatDuration(int minutes) {
        if (minutes < 60) {
            return minutes + "分钟";
        }
        int h = minutes / 60;
        int m = minutes % 60;
        return m == 0 ? h + "小时" : h + "小时" + m + "分钟";
    }

    /** 按停车区域统计 */
    public List<Map<String, Object>> countGroupByParkType() {
        return baseMapper.countGroupByParkType();
    }

    /** 今日临停收入 */
    public BigDecimal sumTodayFee() {
        return baseMapper.sumTodayFee();
    }

    /** 在场车辆列表 */
    public List<TempParking> listInParking() {
        return baseMapper.listInParking();
    }

    /** 空闲车位(供临停引导使用) */
    public List<ParkingSpace> listFreeSpaces() {
        ParkingSpace q = new ParkingSpace();
        q.setStatus("FREE");
        return parkingSpaceMapper.selectList(q, null, null);
    }

    private String nextNo() {
        String date = new java.text.SimpleDateFormat("yyyyMMdd").format(new Date());
        String rand = UUID.randomUUID().toString().replace("-", "").substring(0, 4).toUpperCase();
        return "LS" + date + rand;
    }
}
