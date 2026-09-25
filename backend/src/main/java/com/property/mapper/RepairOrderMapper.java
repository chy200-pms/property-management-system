package com.property.mapper;

import com.property.common.BaseMapper;
import com.property.entity.RepairOrder;
import org.apache.ibatis.annotations.Mapper;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 报修工单 Mapper
 */
@Mapper
public interface RepairOrderMapper extends BaseMapper<RepairOrder> {

    /** 按工单状态统计 */
    List<Map<String, Object>> countGroupByStatus();

    /** 按报修类型统计 */
    List<Map<String, Object>> countGroupByType();

    /** 平均评分 */
    BigDecimal avgRating();
}
