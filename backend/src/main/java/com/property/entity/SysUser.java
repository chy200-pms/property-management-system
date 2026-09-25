package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;

/**
 * 系统用户
 */
@Data
public class SysUser implements Serializable {

    private Long id;

    /** 登录账号 */
    private String username;

    /** 登录密码(BCrypt 密文, 不参与 JSON 序列化) */
    @JsonIgnore
    private String password;

    /**
     * 令牌版本: 改密 / 禁用账号后自增。
     * <p>JWT 载荷里带着签发时的版本号, 与库中值不一致即视为失效,
     * 从而做到「改完密码, 其它地方已登录的会话立刻掉线」。
     */
    private Integer tokenVersion;

    /** 姓名 */
    private String realName;

    /** 手机号 */
    private String phone;

    /** 角色: ADMIN 超级管理员 / STAFF 物业员工 / OWNER 业主 */
    private String role;

    private String avatar;

    /** 状态: 1 启用 / 0 禁用 */
    private Integer status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date lastLogin;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createTime;
}
