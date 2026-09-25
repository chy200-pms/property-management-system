package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;

/**
 * 投诉建议
 */
@Data
public class Complaint implements Serializable {

    private Long id;

    private String complaintNo;

    private Long ownerId;

    private String ownerName;

    private String phone;

    private String houseNo;

    /** 类型: SERVICE/NOISE/SANITARY/SAFETY/PARKING/OTHER */
    private String complaintType;

    private String title;

    private String content;

    /** 状态: PENDING/PROCESSING/RESOLVED/CLOSED */
    private String status;

    private String handler;

    /** 处理回复 */
    private String reply;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date handleTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createTime;

    // ============ 查询条件(非表字段) ============

    private String keyword;
}
