package com.property.mapper;

import com.property.common.BaseMapper;
import com.property.entity.Notice;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 通知公告 Mapper
 */
@Mapper
public interface NoticeMapper extends BaseMapper<Notice> {

    /** 阅读量 +1 */
    int increaseViewCount(@Param("id") Long id);
}
