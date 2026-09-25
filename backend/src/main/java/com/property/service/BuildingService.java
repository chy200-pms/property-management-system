package com.property.service;

import com.property.common.BaseService;
import com.property.common.BusinessException;
import com.property.entity.Building;
import com.property.mapper.BuildingMapper;
import com.property.mapper.HouseMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * 楼栋管理 业务
 */
@Service
public class BuildingService extends BaseService<BuildingMapper, Building> {

    @Autowired
    private HouseMapper houseMapper;

    @Override
    public int save(Building entity) {
        if (entity.getBuildingNo() == null || entity.getBuildingNo().trim().isEmpty()) {
            throw new BusinessException("楼栋编号不能为空");
        }
        // 校验编号唯一
        Building query = new Building();
        query.setBuildingNo(entity.getBuildingNo().trim());
        if (!baseMapper.selectList(query, null, null).isEmpty()) {
            throw new BusinessException("楼栋编号 " + entity.getBuildingNo() + " 已存在");
        }
        if (entity.getName() == null || entity.getName().isEmpty()) {
            entity.setName("阳光家园" + entity.getBuildingNo());
        }
        return baseMapper.insert(entity);
    }

    @Override
    public int remove(Long id) {
        Building building = baseMapper.selectById(id);
        if (building == null) {
            throw new BusinessException("楼栋不存在");
        }
        // 楼栋下存在房屋时不允许删除
        com.property.entity.House hq = new com.property.entity.House();
        hq.setBuildingId(id);
        if (houseMapper.countByQuery(hq) > 0) {
            throw new BusinessException("该楼栋下已存在房屋信息, 请先删除房屋后再操作");
        }
        return baseMapper.deleteById(id);
    }

    /** 楼栋房屋统计 */
    public List<Map<String, Object>> countHouseByBuilding() {
        return baseMapper.countHouseByBuilding();
    }
}
