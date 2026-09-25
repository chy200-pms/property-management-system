package com.property.mapper;

import com.property.common.BaseMapper;
import com.property.entity.ParkingSpace;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

/**
 * 车位 Mapper
 */
@Mapper
public interface ParkingSpaceMapper extends BaseMapper<ParkingSpace> {

    /** 按车位类型分组统计使用情况 */
    List<Map<String, Object>> countGroupByType();

    /** 释放车位: 清空使用人、车牌与租期 */
    int release(@Param("id") Long id);
}
