package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;

/**
 * 操作日志
 * <p>由 {@code OperationLogInterceptor} 自动落库, 记录「谁、什么时候、对什么、做了什么、结果如何」。
 */
@Data
public class SysLog implements Serializable {

    private Long id;

    /** 操作人ID(未登录时为空) */
    private Long userId;

    /** 操作人账号 */
    private String username;

    /** 操作人姓名 */
    private String realName;

    /** 操作人角色: ADMIN / STAFF / OWNER */
    private String role;

    /** 业务模块 */
    private String module;

    /** 动作 */
    private String action;

    /** HTTP 方法 */
    private String method;

    /** 请求路径 */
    private String uri;

    /** 请求参数(敏感字段已脱敏) */
    private String params;

    /** 客户端IP */
    private String ip;

    /** 客户端 UA */
    private String userAgent;

    /** 结果: 1 成功 / 0 失败 */
    private Integer status;

    /** 失败原因 */
    private String errorMsg;

    /** 耗时(毫秒) */
    private Integer costMs;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createTime;
}
