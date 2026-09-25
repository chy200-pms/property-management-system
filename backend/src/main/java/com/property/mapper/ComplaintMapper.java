package com.property.mapper;

import com.property.common.BaseMapper;
import com.property.entity.Complaint;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

/**
 * 投诉建议 Mapper
 */
@Mapper
public interface ComplaintMapper extends BaseMapper<Complaint> {

    /** 按处理状态统计 */
    List<Map<String, Object>> countGroupByStatus();

    /** 按投诉类型统计 */
    List<Map<String, Object>> countGroupByType();
}
