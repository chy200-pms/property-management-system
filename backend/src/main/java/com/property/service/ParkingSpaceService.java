package com.property.service;

import com.property.common.BaseService;
import com.property.common.BusinessException;
import com.property.entity.ParkingSpace;
import com.property.mapper.ParkingSpaceMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * 车位管理 业务
 */
@Service
public class ParkingSpaceService extends BaseService<ParkingSpaceMapper, ParkingSpace> {

    @Override
    public int save(ParkingSpace entity) {
        if (entity.getSpaceNo() == null || entity.getSpaceNo().trim().isEmpty()) {
            throw new BusinessException("车位编号不能为空");
        }
        ParkingSpace query = new ParkingSpace();
        query.setSpaceNo(entity.getSpaceNo().trim());
        if (!baseMapper.selectList(query, null, null).isEmpty()) {
            throw new BusinessException("车位编号 " + entity.getSpaceNo() + " 已存在");
        }
        return baseMapper.insert(entity);
    }

    /**
     * 分配车位(出租/出售给业主)
     */
    @Transactional(rollbackFor = Exception.class)
    public int allocate(Long spaceId, Long ownerId, String carPlate, String status, Date startDate, Date endDate) {
        ParkingSpace space = baseMapper.selectById(spaceId);
        if (space == null) {
            throw new BusinessException("车位不存在");
        }
        if (!"FREE".equals(space.getStatus())) {
            throw new BusinessException("车位 " + space.getSpaceNo() + " 当前状态为"
                    + statusText(space.getStatus()) + ", 不可重复分配");
        }
        ParkingSpace update = new ParkingSpace();
        update.setId(spaceId);
        update.setOwnerId(ownerId);
        update.setCarPlate(carPlate);
        update.setStatus(status == null ? "RENTED" : status);
        update.setStartDate(startDate == null ? new Date() : startDate);
        update.setEndDate(endDate);
        return baseMapper.updateById(update);
    }

    /**
     * 退租/释放车位
     */
    @Transactional(rollbackFor = Exception.class)
    public int release(Long spaceId) {
        ParkingSpace space = baseMapper.selectById(spaceId);
        if (space == null) {
            throw new BusinessException("车位不存在");
        }
        if ("FREE".equals(space.getStatus())) {
            throw new BusinessException("车位 " + space.getSpaceNo() + " 当前为空闲状态, 无需释放");
        }
        // 清空使用人、车牌与租期(owner_id 置 NULL, 避免外键约束报错)
        return baseMapper.release(spaceId);
    }

    /** 按车位类型统计使用情况 */
    public List<Map<String, Object>> countGroupByType() {
        return baseMapper.countGroupByType();
    }

    private String statusText(String status) {
        return switch (status == null ? "" : status) {
            case "FREE" -> "空闲";
            case "SOLD" -> "已售";
            case "RENTED" -> "已租";
            default -> status;
        };
    }
}
