package com.property.service;

import com.property.common.BaseService;
import com.property.entity.FeePayment;
import com.property.mapper.FeePaymentMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 缴费记录 业务
 */
@Service
public class FeePaymentService extends BaseService<FeePaymentMapper, FeePayment> {

    /** 按月实收统计(趋势图) */
    public List<Map<String, Object>> sumGroupByMonth() {
        return baseMapper.sumGroupByMonth();
    }

    /** 按缴费方式统计 */
    public List<Map<String, Object>> sumGroupByMethod() {
        return baseMapper.sumGroupByMethod();
    }

    /** 今日实收 */
    public BigDecimal sumTodayAmount() {
        return baseMapper.sumTodayAmount();
    }
}
