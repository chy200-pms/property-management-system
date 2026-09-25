package com.property.mapper;

import com.property.common.BaseMapper;
import com.property.entity.Owner;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

/**
 * 人员信息 Mapper
 */
@Mapper
public interface OwnerMapper extends BaseMapper<Owner> {

    /** 按人员类型分组统计 */
    List<Map<String, Object>> countGroupByType();

    /** 按手机号查人员档案(用于把业主登录账号关联到自己的人员档案) */
    @Select("SELECT * FROM owner WHERE phone = #{phone} AND status = 'ACTIVE' ORDER BY id LIMIT 1")
    Owner selectByPhone(@Param("phone") String phone);
}
