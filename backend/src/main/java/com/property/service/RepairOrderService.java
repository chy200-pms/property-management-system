package com.property.service;

import com.property.common.BaseService;
import com.property.common.BusinessException;
import com.property.entity.House;
import com.property.entity.Owner;
import com.property.entity.RepairOrder;
import com.property.mapper.HouseMapper;
import com.property.mapper.OwnerMapper;
import com.property.mapper.RepairOrderMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

/**
 * 报修工单 业务
 * <p>
 * 工单流转: 待受理 PENDING -> 已派单 ASSIGNED -> 处理中 PROCESSING -> 已完成 FINISHED / 已关闭 CLOSED
 */
@Service
public class RepairOrderService extends BaseService<RepairOrderMapper, RepairOrder> {

    @Autowired
    private OwnerMapper ownerMapper;

    @Autowired
    private HouseMapper houseMapper;

    /**
     * 提交报修
     */
    @Override
    public int save(RepairOrder entity) {
        if (entity.getTitle() == null || entity.getTitle().trim().isEmpty()) {
            throw new BusinessException("请填写报修标题");
        }
        if (entity.getOwnerId() == null) {
            throw new BusinessException("请选择报修人");
        }
        // 自动补充报修人信息
        Owner owner = ownerMapper.selectById(entity.getOwnerId());
        if (owner == null) {
            throw new BusinessException("报修人不存在");
        }
        entity.setOwnerName(owner.getName());
        if (entity.getPhone() == null) {
            entity.setPhone(owner.getPhone());
        }
        if (entity.getHouseId() == null) {
            entity.setHouseId(owner.getHouseId());
        }
        if (entity.getHouseNo() == null && entity.getHouseId() != null) {
            House house = houseMapper.selectById(entity.getHouseId());
            entity.setHouseNo(house == null ? null : house.getHouseNo());
        }
        if (entity.getOrderNo() == null) {
            entity.setOrderNo(nextNo());
        }
        if (entity.getStatus() == null) {
            entity.setStatus("PENDING");
        }
        if (entity.getUrgency() == null) {
            entity.setUrgency("NORMAL");
        }
        if (entity.getCreateTime() == null) {
            entity.setCreateTime(new Date());
        }
        return baseMapper.insert(entity);
    }

    /**
     * 派单: 指派维修人员
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> assign(Long id, String handler, String handlerPhone) {
        RepairOrder order = baseMapper.selectById(id);
        if (order == null) {
            throw new BusinessException("工单不存在");
        }
        if (("FINISHED".equals(order.getStatus()) || "CLOSED".equals(order.getStatus()))) {
            throw new BusinessException("工单已结束, 无法派单");
        }
        if (handler == null || handler.trim().isEmpty()) {
            throw new BusinessException("请选择维修人员");
        }
        RepairOrder update = new RepairOrder();
        update.setId(id);
        update.setHandler(handler);
        update.setHandlerPhone(handlerPhone);
        update.setStatus("ASSIGNED");
        update.setAssignTime(new Date());
        baseMapper.updateById(update);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "工单 " + order.getOrderNo() + " 已派单给 " + handler);
        return result;
    }

    /**
     * 开始处理
     */
    @Transactional(rollbackFor = Exception.class)
    public int start(Long id) {
        RepairOrder order = baseMapper.selectById(id);
        if (order == null) {
            throw new BusinessException("工单不存在");
        }
        if (order.getHandler() == null) {
            throw new BusinessException("请先派单后再开始处理");
        }
        RepairOrder update = new RepairOrder();
        update.setId(id);
        update.setStatus("PROCESSING");
        return baseMapper.updateById(update);
    }

    /**
     * 完工
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> finish(Long id, BigDecimal cost, String remark) {
        RepairOrder order = baseMapper.selectById(id);
        if (order == null) {
            throw new BusinessException("工单不存在");
        }
        if ("FINISHED".equals(order.getStatus())) {
            throw new BusinessException("工单已完成, 请勿重复操作");
        }
        if (order.getHandler() == null) {
            throw new BusinessException("请先派单后再完工");
        }
        RepairOrder update = new RepairOrder();
        update.setId(id);
        update.setStatus("FINISHED");
        update.setFinishTime(new Date());
        update.setCost(cost == null ? BigDecimal.ZERO : cost);
        update.setRemark(remark);
        baseMapper.updateById(update);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "工单 " + order.getOrderNo() + " 已完工, 请通知业主验收");
        return result;
    }

    /**
     * 业主评价(完工后)
     */
    @Transactional(rollbackFor = Exception.class)
    public int rate(Long id, Integer rating, String feedback) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new BusinessException("评分需在 1-5 之间");
        }
        RepairOrder order = baseMapper.selectById(id);
        if (order == null) {
            throw new BusinessException("工单不存在");
        }
        if (!"FINISHED".equals(order.getStatus())) {
            throw new BusinessException("工单完工后才能评价");
        }
        RepairOrder update = new RepairOrder();
        update.setId(id);
        update.setRating(rating);
        update.setFeedback(feedback);
        update.setStatus("CLOSED");
        return baseMapper.updateById(update);
    }

    /** 工单状态统计 */
    public List<Map<String, Object>> countGroupByStatus() {
        return baseMapper.countGroupByStatus();
    }

    /** 报修类型统计 */
    public List<Map<String, Object>> countGroupByType() {
        return baseMapper.countGroupByType();
    }

    /** 平均满意度 */
    public BigDecimal avgRating() {
        return baseMapper.avgRating();
    }

    private String nextNo() {
        String date = new java.text.SimpleDateFormat("yyyyMMdd").format(new Date());
        String rand = UUID.randomUUID().toString().replace("-", "").substring(0, 4).toUpperCase();
        return "BX" + date + rand;
    }
}
