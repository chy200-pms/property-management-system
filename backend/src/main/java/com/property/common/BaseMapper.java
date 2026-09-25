package com.property.common;

import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 通用 Mapper 基础接口
 * <p>
 * 所有业务 Mapper 继承此接口, 统一 CRUD 方法签名。
 * 各模块在对应的 XML 中实现下列 statement, 即可复用 {@link BaseService} 的通用逻辑。
 *
 * @param <T> 实体类型
 */
public interface BaseMapper<T> {

    /**
     * 条件查询列表(支持分页)
     *
     * @param q      查询条件实体(字段非空即作为过滤条件), 不可为 null
     * @param offset 起始行, 为 null 表示不分页
     * @param limit  每页条数, 为 null 表示不分页
     */
    List<T> selectList(@Param("q") T q, @Param("offset") Integer offset, @Param("limit") Integer limit);

    /**
     * 按条件统计总数
     */
    long countByQuery(@Param("q") T q);

    /**
     * 按主键查询
     */
    T selectById(@Param("id") Long id);

    /**
     * 新增(自动回填主键)
     */
    int insert(T entity);

    /**
     * 按主键更新(仅更新非空字段)
     */
    int updateById(T entity);

    /**
     * 按主键删除
     */
    int deleteById(@Param("id") Long id);
}
