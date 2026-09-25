package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;

/**
 * 通知公告
 */
@Data
public class Notice implements Serializable {

    private Long id;

    private String title;

    private String content;

    /** 类型: NOTIFY 通知公告 / ACTIVITY 社区活动 / URGENT 紧急通知 / MAINTAIN 停水停电 */
    private String noticeType;

    private String publisher;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date publishTime;

    /** 是否置顶: 1 是 / 0 否 */
    private Integer topFlag;

    /** 状态: 1 已发布 / 0 草稿 */
    private Integer status;

    private Integer viewCount;

    // ============ 查询条件(非表字段) ============

    private String keyword;
}
