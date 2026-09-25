package com.property.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;

/**
 * 人员信息(业主 / 租户 / 家庭成员)
 */
@Data
public class Owner implements Serializable {

    private Long id;

    /** 姓名 */
    private String name;

    /** 性别 */
    private String gender;

    /** 身份证号 */
    private String idCard;

    /** 联系电话 */
    private String phone;

    /** 人员类型: OWNER 业主 / TENANT 租户 / FAMILY 家庭成员 */
    private String personType;

    /** 所属房屋ID */
    private Long houseId;

    /** 家庭人口数 */
    private Integer familyCount;

    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    private Date moveInDate;

    /** 登记车牌 */
    private String carPlate;

    private String emergencyName;

    private String emergencyPhone;

    /** 状态: ACTIVE 在住 / MOVED 搬离 */
    private String status;

    private String remark;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createTime;

    // ============ 关联展示字段(非表字段) ============

    /** 所属房屋编号 */
    private String houseNo;

    /** 查询关键字(姓名/电话/车牌) */
    private String keyword;
}
