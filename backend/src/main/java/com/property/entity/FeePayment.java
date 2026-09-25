package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 缴费记录
 */
@Data
public class FeePayment implements Serializable {

    private Long id;

    /** 缴费流水号 */
    private String paymentNo;

    private Long billId;

    private String billNo;

    private Long ownerId;

    private String ownerName;

    /** 费用名称 */
    private String feeName;

    /** 缴费金额 */
    private BigDecimal amount;

    /** 缴费方式: CASH/WECHAT/ALIPAY/BANK */
    private String payMethod;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date payTime;

    /** 收银/操作人 */
    private String operator;

    private String remark;

    // ============ 查询条件(非表字段) ============

    private String keyword;

    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    private Date beginDate;

    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    private Date endDate;
}
