package com.property.mapper;

import com.property.common.BaseMapper;
import com.property.entity.TempParking;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 临时停车 Mapper
 */
@Mapper
public interface TempParkingMapper extends BaseMapper<TempParking> {

    /** 按停车区域统计 */
    List<Map<String, Object>> countGroupByParkType();

    /** 今日临停收入 */
    BigDecimal sumTodayFee();

    /** 车辆是否在场(未出场) */
    TempParking findInParkingByPlate(@Param("carPlate") String carPlate);

    /** 在场车辆列表 */
    List<TempParking> listInParking();
}
