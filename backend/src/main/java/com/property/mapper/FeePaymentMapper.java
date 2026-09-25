package com.property.mapper;

import com.property.common.BaseMapper;
import com.property.entity.FeePayment;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 缴费记录 Mapper
 */
@Mapper
public interface FeePaymentMapper extends BaseMapper<FeePayment> {

    /** 近 N 个月的实收金额统计(用于趋势图) */
    List<Map<String, Object>> sumGroupByMonth();

    /** 按缴费方式统计 */
    List<Map<String, Object>> sumGroupByMethod();

    /** 今日实收合计 */
    BigDecimal sumTodayAmount();

    /** 按账单删除缴费流水(缴费冲正时使用) */
    @Delete("DELETE FROM fee_payment WHERE bill_id = #{billId}")
    int deleteByBillId(@Param("billId") Long billId);
}
