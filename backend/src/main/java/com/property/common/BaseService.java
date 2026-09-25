package com.property.common;

import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

/**
 * 通用 Service 基类
 * <p>
 * 承载各模块共有的分页查询、明细查询、增删改逻辑, 业务模块只需继承并补充自身特有逻辑。
 *
 * @param <M> 对应的 Mapper 类型
 * @param <T> 实体类型
 */
public abstract class BaseService<M extends BaseMapper<T>, T> {

    @Autowired
    protected M baseMapper;

    /**
     * 分页查询
     */
    public PageResult<T> page(T query, Integer pageNum, Integer pageSize) {
        if (query == null) {
            throw new BusinessException("查询条件对象不能为空");
        }
        int num = (pageNum == null || pageNum < 1) ? 1 : pageNum;
        int size = (pageSize == null || pageSize < 1) ? 10 : Math.min(pageSize, 500);
        long total = baseMapper.countByQuery(query);
        List<T> rows = baseMapper.selectList(query, (num - 1) * size, size);
        return new PageResult<>(total, rows, num, size);
    }

    /**
     * 条件查询全部(不分页)
     */
    public List<T> list(T query) {
        return baseMapper.selectList(query, null, null);
    }

    /**
     * 按主键查询(不存在时抛出业务异常, 避免前端拿到"操作成功"的空数据)
     */
    public T getById(Long id) {
        if (id == null) {
            throw new BusinessException("ID 不能为空");
        }
        T entity = baseMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException("记录不存在或已被删除");
        }
        return entity;
    }

    /**
     * 新增
     */
    public int save(T entity) {
        return baseMapper.insert(entity);
    }

    /**
     * 修改
     */
    public int update(T entity) {
        return baseMapper.updateById(entity);
    }

    /**
     * 删除
     */
    public int remove(Long id) {
        if (id == null) {
            throw new BusinessException("ID 不能为空");
        }
        return baseMapper.deleteById(id);
    }
}
