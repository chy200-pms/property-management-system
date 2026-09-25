package com.property.controller;

import com.property.common.DataScope;
import com.property.common.Result;
import com.property.entity.Building;
import com.property.entity.House;
import com.property.entity.Owner;
import com.property.service.BuildingService;
import com.property.service.HouseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 3D 小区场景 接口
 * <p>
 * 给前端 3D 地图页(community3d)提供渲染场景所需的聚合数据:
 * 楼栋几何信息(单元数/层数) + 各楼栋房屋与入住数量。
 * <p>
 * 数据权限:
 * <ul>
 *   <li>管理员 / 物业人员: 返回全部楼栋信息(含物业负责人), 可进一步查看任意房屋与住户</li>
 *   <li>业主: 楼栋只返回几何与汇总信息(不含负责人联系方式),
 *       并额外返回"我的房屋"位置, 用于在 3D 场景中高亮自己的房间</li>
 * </ul>
 * 注意: 这里只返回聚合数据, 不下发任何他人房屋明细, 业主的明细数据由
 * HouseController/OwnerController 的数据权限拦截, 避免越权。
 */
@RestController
@RequestMapping("/community")
public class CommunityController {

    @Autowired
    private BuildingService buildingService;

    @Autowired
    private HouseService houseService;

    @Autowired
    private DataScope dataScope;

    /**
     * 3D 场景数据 GET /api/community/scene
     */
    @GetMapping("/scene")
    public Result<Map<String, Object>> scene() {
        boolean owner = dataScope.isOwnerRole();

        // 各楼栋房屋统计: buildingId -> {totalHouse, occupiedHouse, emptyHouse}
        Map<Object, Map<String, Object>> stats = new HashMap<>();
        for (Map<String, Object> row : buildingService.countHouseByBuilding()) {
            stats.put(row.get("buildingId"), row);
        }

        List<Map<String, Object>> buildings = new ArrayList<>();
        for (Building b : buildingService.list(new Building())) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("buildingNo", b.getBuildingNo());
            m.put("name", b.getName());
            m.put("buildingType", b.getBuildingType());
            m.put("unitCount", num(b.getUnitCount(), 1));
            m.put("floorCount", num(b.getFloorCount(), 1));
            m.put("buildYear", b.getBuildYear());

            Map<String, Object> st = stats.get(b.getId());
            int total = st == null ? 0 : intOf(st.get("totalHouse"));
            int occupied = st == null ? 0 : intOf(st.get("occupiedHouse"));
            int empty = st == null ? 0 : intOf(st.get("emptyHouse"));
            m.put("houseCount", total > 0 ? total : num(b.getHouseCount(), 0));
            m.put("occupiedCount", occupied);
            m.put("emptyCount", empty);
            m.put("occupancyRate", total == 0 ? "0%" : Math.round(occupied * 100.0 / total) + "%");
            m.put("totalArea", b.getTotalArea() == null ? BigDecimal.ZERO : b.getTotalArea());

            // 物业负责人联系方式属于内部信息, 业主账号不下发
            if (!owner) {
                m.put("manager", b.getManager());
                m.put("managerPhone", b.getManagerPhone());
            }
            buildings.add(m);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("isOwner", owner);
        data.put("buildings", buildings);

        if (owner) {
            // 业主: 返回自己的房屋位置(仅自己那一套, 由数据权限给出)
            Owner me = dataScope.currentOwnerProfile();
            House h = houseService.getById(me.getHouseId());
            Map<String, Object> my = new LinkedHashMap<>();
            my.put("houseId", h.getId());
            my.put("houseNo", h.getHouseNo());
            my.put("buildingId", h.getBuildingId());
            my.put("buildingName", h.getBuildingName() != null ? h.getBuildingName() : "");
            my.put("unitNo", h.getUnitNo());
            my.put("floorNo", h.getFloorNo());
            my.put("roomNo", h.getRoomNo());
            my.put("area", h.getArea());
            my.put("houseType", h.getHouseType());
            my.put("status", h.getStatus());
            my.put("ownerName", me.getName());
            data.put("myHouse", my);
        }

        return Result.ok(data);
    }

    private static int num(Integer v, int def) {
        return v == null ? def : v;
    }

    private static int intOf(Object v) {
        if (v == null) {
            return 0;
        }
        if (v instanceof Number) {
            return ((Number) v).intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(v));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
