package com.property.service;

import com.property.common.BaseService;
import com.property.common.BusinessException;
import com.property.entity.House;
import com.property.entity.Owner;
import com.property.mapper.HouseMapper;
import com.property.mapper.OwnerMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * 房屋管理 业务
 */
@Service
public class HouseService extends BaseService<HouseMapper, House> {

    @Autowired
    private OwnerMapper ownerMapper;

    @Override
    public int save(House entity) {
        if (entity.getHouseNo() == null || entity.getHouseNo().trim().isEmpty()) {
            throw new BusinessException("房屋编号不能为空");
        }
        // 校验房屋编号唯一
        House query = new House();
        query.setHouseNo(entity.getHouseNo().trim());
        if (!baseMapper.selectList(query, null, null).isEmpty()) {
            throw new BusinessException("房屋编号 " + entity.getHouseNo() + " 已存在");
        }
        return baseMapper.insert(entity);
    }

    @Override
    public int remove(Long id) {
        // 房屋下有人员信息时不允许删除
        Owner oq = new Owner();
        oq.setHouseId(id);
        if (ownerMapper.countByQuery(oq) > 0) {
            throw new BusinessException("该房屋下已登记人员信息, 请先移除人员后再删除");
        }
        return baseMapper.deleteById(id);
    }

    /** 办理入住: 更新房屋状态并绑定业主 */
    public int checkIn(Long houseId, Long ownerId, String status) {
        House house = baseMapper.selectById(houseId);
        if (house == null) {
            throw new BusinessException("房屋不存在");
        }
        House update = new House();
        update.setId(houseId);
        update.setOwnerId(ownerId);
        update.setStatus(status == null ? "OCCUPIED" : status);
        return baseMapper.updateById(update);
    }

    /** 按状态统计 */
    public List<Map<String, Object>> countGroupByStatus() {
        return baseMapper.countGroupByStatus();
    }

    /** 按户型统计 */
    public List<Map<String, Object>> countGroupByType() {
        return baseMapper.countGroupByType();
    }
}
