package com.property.mapper;

import com.property.common.BaseMapper;
import com.property.entity.House;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

/**
 * 房屋 Mapper
 */
@Mapper
public interface HouseMapper extends BaseMapper<House> {

    /** 按房屋状态分组统计 */
    List<Map<String, Object>> countGroupByStatus();

    /** 按户型分组统计 */
    List<Map<String, Object>> countGroupByType();
}
