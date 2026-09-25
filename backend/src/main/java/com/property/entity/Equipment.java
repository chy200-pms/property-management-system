package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;

/**
 * 设备设施
 */
@Data
public class Equipment implements Serializable {

    private Long id;

    private String equipmentNo;

    /** 设备名称 */
    private String name;

    /** 类型: ELEVATOR/WATER_PUMP/DOOR/FIRE/FITNESS/LIGHT/OTHER */
    private String equipmentType;

    private String location;

    /** 品牌型号 */
    private String brand;

    /** 状态: NORMAL 正常 / REPAIR 维修中 / SCRAPPED 已报废 */
    private String status;

    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    private Date buyDate;

    /** 维保周期(天) */
    private Integer maintainCycle;

    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    private Date lastMaintain;

    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    private Date nextMaintain;

    /** 责任人 */
    private String keeper;

    private String remark;

    // ============ 查询条件(非表字段) ============

    private String keyword;
}
