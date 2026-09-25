package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 车位信息
 */
@Data
public class ParkingSpace implements Serializable {

    private Long id;

    /** 车位编号, 如 B1-001 / WJ-001 */
    private String spaceNo;

    /** 所属区域 */
    private String areaName;

    /** 车位类型: UNDERGROUND 地下 / GROUND 地面 / OUTSIDE 小区外临街 */
    private String spaceType;

    /** 车位规格: 标准/子母/微型/充电桩 */
    private String spaceSize;

    /** 月租金(元/月) */
    private BigDecimal monthFee;

    /** 状态: FREE 空闲 / SOLD 已售 / RENTED 已租 */
    private String status;

    /** 使用人ID */
    private Long ownerId;

    /** 绑定车牌 */
    private String carPlate;

    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    private Date startDate;

    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    private Date endDate;

    /** 位置描述 */
    private String location;

    private String remark;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createTime;

    // ============ 关联展示字段(非表字段) ============

    /** 使用人姓名 */
    private String ownerName;

    /** 使用人电话 */
    private String ownerPhone;

    /** 查询关键字 */
    private String keyword;
}
