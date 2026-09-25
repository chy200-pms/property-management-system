package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 楼栋信息
 */
@Data
public class Building implements Serializable {

    private Long id;

    /** 楼栋编号, 如 1号楼 */
    private String buildingNo;

    /** 楼栋名称 */
    private String name;

    /** 单元数 */
    private Integer unitCount;

    /** 楼层数 */
    private Integer floorCount;

    /** 房屋总数 */
    private Integer houseCount;

    /** 楼栋类型: 住宅/公寓/别墅/商铺 */
    private String buildingType;

    /** 建成年份 */
    private Integer buildYear;

    /** 建筑面积(㎡) */
    private BigDecimal totalArea;

    /** 楼栋管家 */
    private String manager;

    /** 管家电话 */
    private String managerPhone;

    private String remark;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createTime;

    // ============ 以下为统计字段(非表字段), 用于列表展示 ============

    /** 已入住户数 */
    private Integer occupiedCount;

    /** 空置户数 */
    private Integer emptyCount;

    /** 入住率 */
    private String occupancyRate;

    /** 查询关键字(楼栋编号/名称 模糊匹配) */
    private String keyword;
}
