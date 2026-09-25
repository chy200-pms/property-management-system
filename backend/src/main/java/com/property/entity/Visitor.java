package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;

/**
 * 访客登记
 */
@Data
public class Visitor implements Serializable {

    private Long id;

    private String visitorName;

    private String phone;

    private Long visitOwnerId;

    /** 被访业主姓名 */
    private String visitOwner;

    private String houseNo;

    /** 来访事由 */
    private String visitReason;

    private String carPlate;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date visitTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date leaveTime;

    /** 状态: IN 在小区内 / OUT 已离开 */
    private String status;

    /** 登记人 */
    private String register;

    // ============ 查询条件(非表字段) ============

    private String keyword;
}
