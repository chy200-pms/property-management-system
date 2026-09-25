package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 房屋信息
 */
@Data
public class House implements Serializable {

    private Long id;

    /** 所属楼栋ID */
    private Long buildingId;

    /** 房屋完整编号, 如 1号楼1单元101 */
    private String houseNo;

    /** 单元号 */
    private Integer unitNo;

    /** 楼层 */
    private Integer floorNo;

    /** 房号, 如 101 */
    private String roomNo;

    /** 建筑面积(㎡) */
    private BigDecimal area;

    /** 户型 */
    private String houseType;

    /** 朝向 */
    private String orientation;

    /** 状态: OCCUPIED 自住 / RENTED 出租 / EMPTY 空置 / DECORATING 装修中 */
    private String status;

    /** 业主ID */
    private Long ownerId;

    /** 装修情况 */
    private String decoration;

    private String remark;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createTime;

    // ============ 关联展示字段(非表字段) ============

    /** 所属楼栋名称 */
    private String buildingName;

    /** 业主姓名 */
    private String ownerName;

    /** 业主电话 */
    private String ownerPhone;

    /** 查询关键字 */
    private String keyword;
}
