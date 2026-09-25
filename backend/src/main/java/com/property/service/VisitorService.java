package com.property.service;

import com.property.common.BaseService;
import com.property.common.BusinessException;
import com.property.entity.Owner;
import com.property.entity.Visitor;
import com.property.mapper.OwnerMapper;
import com.property.mapper.VisitorMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 访客登记 业务
 */
@Service
public class VisitorService extends BaseService<VisitorMapper, Visitor> {

    @Autowired
    private OwnerMapper ownerMapper;

    @Override
    public int save(Visitor entity) {
        if (entity.getVisitorName() == null || entity.getVisitorName().trim().isEmpty()) {
            throw new BusinessException("请填写访客姓名");
        }
        if (entity.getVisitOwnerId() != null) {
            Owner owner = ownerMapper.selectById(entity.getVisitOwnerId());
            if (owner != null) {
                entity.setVisitOwner(owner.getName());
                // 从 owner 查出房号
                if (owner.getHouseId() != null) {
                    entity.setHouseNo(owner.getHouseNo());
                }
            }
        }
        if (entity.getVisitTime() == null) {
            entity.setVisitTime(new Date());
        }
        if (entity.getStatus() == null) {
            entity.setStatus("IN");
        }
        return baseMapper.insert(entity);
    }

    /**
     * 访客离开登记
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> leave(Long id) {
        Visitor visitor = baseMapper.selectById(id);
        if (visitor == null) {
            throw new BusinessException("访客记录不存在");
        }
        if ("OUT".equals(visitor.getStatus())) {
            throw new BusinessException("该访客已登记离开");
        }
        Visitor update = new Visitor();
        update.setId(id);
        update.setStatus("OUT");
        update.setLeaveTime(new Date());
        baseMapper.updateById(update);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "访客 " + visitor.getVisitorName() + " 已登记离开");
        return result;
    }
}
