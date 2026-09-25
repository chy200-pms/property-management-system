package com.property.service;

import com.property.common.BaseService;
import com.property.common.BusinessException;
import com.property.entity.Equipment;
import com.property.mapper.EquipmentMapper;
import org.springframework.stereotype.Service;

import java.util.Calendar;
import java.util.Date;

/**
 * 设备设施管理 业务
 */
@Service
public class EquipmentService extends BaseService<EquipmentMapper, Equipment> {

    @Override
    public int save(Equipment entity) {
        if (entity.getName() == null || entity.getName().trim().isEmpty()) {
            throw new BusinessException("请填写设备名称");
        }
        if (entity.getEquipmentNo() == null || entity.getEquipmentNo().isEmpty()) {
            entity.setEquipmentNo("SB" + System.currentTimeMillis() % 100000);
        }
        if (entity.getStatus() == null) {
            entity.setStatus("NORMAL");
        }
        if (entity.getMaintainCycle() == null) {
            entity.setMaintainCycle(30);
        }
        if (entity.getLastMaintain() != null) {
            entity.setNextMaintain(plusDays(entity.getLastMaintain(), entity.getMaintainCycle()));
        }
        return baseMapper.insert(entity);
    }

    /**
     * 完成一次维保: 更新上次/下次维保日期
     */
    public int maintain(Long id, Date maintainDate) {
        Equipment equipment = baseMapper.selectById(id);
        if (equipment == null) {
            throw new BusinessException("设备不存在");
        }
        Date date = maintainDate == null ? new Date() : maintainDate;
        int cycle = equipment.getMaintainCycle() == null ? 30 : equipment.getMaintainCycle();

        Equipment update = new Equipment();
        update.setId(id);
        update.setLastMaintain(date);
        update.setNextMaintain(plusDays(date, cycle));
        update.setStatus("NORMAL");
        return baseMapper.updateById(update);
    }

    private Date plusDays(Date date, int days) {
        Calendar c = Calendar.getInstance();
        c.setTime(date);
        c.add(Calendar.DAY_OF_MONTH, days);
        return c.getTime();
    }
}
