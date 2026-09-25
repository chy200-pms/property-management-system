package com.property.mapper;

import com.property.common.BaseMapper;
import com.property.entity.Building;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

/**
 * 楼栋 Mapper
 */
@Mapper
public interface BuildingMapper extends BaseMapper<Building> {

    /** 按楼栋统计房屋入住情况(已入住/空置) */
    List<Map<String, Object>> countHouseByBuilding();
}
