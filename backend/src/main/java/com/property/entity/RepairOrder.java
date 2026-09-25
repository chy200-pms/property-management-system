package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 报修工单
 */
@Data
public class RepairOrder implements Serializable {

    private Long id;

    /** 工单编号 */
    private String orderNo;

    private Long ownerId;

    private String ownerName;

    private String phone;

    private Long houseId;

    private String houseNo;

    /** 报修标题 */
    private String title;

    /** 故障描述 */
    private String content;

    /** 报修类型: WATER_ELEC/DOOR_WINDOW/PUBLIC/ELEVATOR/PLUMBING/OTHER */
    private String repairType;

    /** 紧急程度: LOW/NORMAL/HIGH/URGENT */
    private String urgency;

    /** 工单状态: PENDING 待受理 / ASSIGNED 已派单 / PROCESSING 处理中 / FINISHED 已完成 / CLOSED 已关闭 */
    private String status;

    /** 维修人员 */
    private String handler;

    private String handlerPhone;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date assignTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date finishTime;

    /** 维修费用 */
    private BigDecimal cost;

    /** 业主评分 1-5 */
    private Integer rating;

    private String feedback;

    private String remark;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createTime;

    // ============ 查询条件(非表字段) ============

    private String keyword;

    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    private Date beginDate;

    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    private Date endDate;
}
