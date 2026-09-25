package com.property.service;

import com.property.common.BaseService;
import com.property.common.BusinessException;
import com.property.entity.Complaint;
import com.property.entity.Owner;
import com.property.mapper.ComplaintMapper;
import com.property.mapper.OwnerMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 投诉建议 业务
 */
@Service
public class ComplaintService extends BaseService<ComplaintMapper, Complaint> {

    @Autowired
    private OwnerMapper ownerMapper;

    @Override
    public int save(Complaint entity) {
        if (entity.getTitle() == null || entity.getTitle().trim().isEmpty()) {
            throw new BusinessException("请填写投诉/建议标题");
        }
        if (entity.getOwnerId() != null) {
            Owner owner = ownerMapper.selectById(entity.getOwnerId());
            if (owner != null) {
                entity.setOwnerName(owner.getName());
                if (entity.getPhone() == null) {
                    entity.setPhone(owner.getPhone());
                }
                if (entity.getHouseNo() == null && owner.getHouseId() != null) {
                    entity.setHouseNo(owner.getHouseNo());
                }
            }
        }
        if (entity.getComplaintNo() == null) {
            entity.setComplaintNo(nextNo());
        }
        if (entity.getStatus() == null) {
            entity.setStatus("PENDING");
        }
        if (entity.getCreateTime() == null) {
            entity.setCreateTime(new Date());
        }
        return baseMapper.insert(entity);
    }

    /**
     * 受理并回复
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> reply(Long id, String handler, String reply, boolean resolved) {
        Complaint complaint = baseMapper.selectById(id);
        if (complaint == null) {
            throw new BusinessException("投诉记录不存在");
        }
        if (reply == null || reply.trim().isEmpty()) {
            throw new BusinessException("请填写处理回复内容");
        }
        Complaint update = new Complaint();
        update.setId(id);
        update.setHandler(handler);
        update.setReply(reply);
        update.setStatus(resolved ? "RESOLVED" : "PROCESSING");
        update.setHandleTime(new Date());
        baseMapper.updateById(update);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", resolved
                ? "投诉 " + complaint.getComplaintNo() + " 已处理完成"
                : "已受理, 状态更新为处理中");
        return result;
    }

    /** 状态统计 */
    public List<Map<String, Object>> countGroupByStatus() {
        return baseMapper.countGroupByStatus();
    }

    /** 类型统计 */
    public List<Map<String, Object>> countGroupByType() {
        return baseMapper.countGroupByType();
    }

    private String nextNo() {
        String date = new java.text.SimpleDateFormat("yyyyMMdd").format(new Date());
        String rand = UUID.randomUUID().toString().replace("-", "").substring(0, 4).toUpperCase();
        return "TS" + date + rand;
    }
}
