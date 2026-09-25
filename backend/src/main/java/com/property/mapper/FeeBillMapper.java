package com.property.mapper;

import com.property.common.BaseMapper;
import com.property.entity.FeeBill;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 费用账单 Mapper
 */
@Mapper
public interface FeeBillMapper extends BaseMapper<FeeBill> {

    /** 按缴费状态统计(金额 + 笔数) */
    List<Map<String, Object>> countGroupByStatus();

    /** 按费用类型统计 */
    List<Map<String, Object>> countGroupByType();

    /** 按期间统计收费情况(用于趋势图) */
    List<Map<String, Object>> sumGroupByPeriod();

    /** 删除指定期间/类型且未缴费的账单(重新生成前清理) */
    int deleteUnpaidByPeriod(@Param("period") String period, @Param("feeType") String feeType);

    /** 某业主某期间是否已存在账单 */
    int existsBill(@Param("ownerId") Long ownerId, @Param("period") String period,
                   @Param("feeType") String feeType, @Param("parkingId") Long parkingId);

    /** 汇总欠费总额 */
    BigDecimal sumUnpaidAmount();
}
