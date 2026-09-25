package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 收费标准
 */
@Data
public class FeeStandard implements Serializable {

    private Long id;

    /** 费用编码 */
    private String feeCode;

    /** 费用名称 */
    private String feeName;

    /** 费用类型: PROPERTY/PARKING/WATER/ELECTRIC/GAS/SANITATION */
    private String feeType;

    /** 单价 */
    private BigDecimal unitPrice;

    /** 计价单位, 如 元/㎡·月 */
    private String unit;

    /** 收费周期: MONTH/QUARTER/HALF_YEAR/YEAR */
    private String chargeCycle;

    /** 滞纳金日利率 */
    private BigDecimal lateFeeRate;

    /** 状态: 1 启用 / 0 停用 */
    private Integer status;

    private String remark;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createTime;

    /** 查询关键字 */
    private String keyword;
}
