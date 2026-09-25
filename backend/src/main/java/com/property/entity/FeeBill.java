package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 费用账单(物业费 / 车位管理费 / 水电费等)
 */
@Data
public class FeeBill implements Serializable {

    private Long id;

    /** 账单编号 */
    private String billNo;

    private Long ownerId;

    private String ownerName;

    private Long houseId;

    private String houseNo;

    private Long parkingId;

    private String parkingNo;

    private Long standardId;

    /** 费用类型 */
    private String feeType;

    /** 费用名称 */
    private String feeName;

    /** 费用所属期间, 如 2026-08 */
    private String period;

    /** 应收金额 */
    private BigDecimal amount;

    /** 实收金额 */
    private BigDecimal paidAmount;

    /** 缴费状态: UNPAID 未缴 / PAID 已缴 / PARTIAL 部分缴纳 / OVERDUE 逾期欠费 */
    private String payStatus;

    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    private Date dueDate;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date payTime;

    /** 缴费方式 */
    private String payMethod;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date generateTime;

    private String remark;

    // ============ 查询条件(非表字段) ============

    /** 关键字: 业主姓名 / 房屋编号 / 账单编号 */
    private String keyword;

    /** 账单起始期间 */
    private String beginPeriod;

    /** 账单结束期间 */
    private String endPeriod;
}
