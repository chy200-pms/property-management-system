package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 临时停车记录
 */
@Data
public class TempParking implements Serializable {

    private Long id;

    /** 停车记录编号 */
    private String recordNo;

    /** 车牌号 */
    private String carPlate;

    /** 车辆类型: 小型车/中型车/大型车 */
    private String carType;

    /** 停放车位 */
    private String spaceNo;

    /** 停车区域: INSIDE 小区内 / OUTSIDE 小区外临街 */
    private String parkType;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date entryTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date exitTime;

    /** 停车时长(分钟) */
    private Integer duration;

    /** 应收停车费 */
    private BigDecimal fee;

    /** 实收停车费 */
    private BigDecimal paidFee;

    /** 缴费状态: UNPAID/PAID/FREE */
    private String payStatus;

    private String payMethod;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date payTime;

    /** 通道/岗亭 */
    private String gate;

    private String operator;

    private String remark;

    // ============ 查询条件(非表字段) ============

    /** 关键字: 车牌号 / 记录编号 */
    private String keyword;

    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    private Date beginDate;

    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    private Date endDate;
}
