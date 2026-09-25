# -*- coding: utf-8 -*-
"""
物业管理系统 - 数据库脚本生成器
运行: python generate_sql.py
输出: property_db.sql (建库 + 建表 + 初始化演示数据)

说明: 使用固定随机种子, 保证每次生成的数据一致、可复现。
"""
import random
from datetime import date, datetime, timedelta

random.seed(20260916)

OUT = "property_db.sql"
DB = "property_db"

# ============================================================
# 建表语句
# ============================================================
DDL = r"""
-- =====================================================================
-- 物业管理系统 数据库脚本  property_db
-- 数据库: MySQL 8.0   字符集: utf8mb4
-- 说明: 包含建库、建表、索引及初始化演示数据
-- =====================================================================

DROP DATABASE IF EXISTS `property_db`;
CREATE DATABASE `property_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `property_db`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. 系统用户表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `username`    VARCHAR(50)  NOT NULL COMMENT '登录账号',
  `password`    VARCHAR(100) NOT NULL COMMENT '登录密码',
  `real_name`   VARCHAR(50)  NOT NULL COMMENT '姓名',
  `phone`       VARCHAR(20)           DEFAULT NULL COMMENT '手机号',
  `role`        VARCHAR(20)  NOT NULL DEFAULT 'STAFF' COMMENT '角色: ADMIN超级管理员/STAFF物业员工/OWNER业主',
  `avatar`      VARCHAR(255)          DEFAULT NULL COMMENT '头像',
  `status`      TINYINT      NOT NULL DEFAULT 1 COMMENT '状态: 1启用 0禁用',
  `last_login`  DATETIME              DEFAULT NULL COMMENT '最后登录时间',
  `token_version` INT        NOT NULL DEFAULT 1 COMMENT '令牌版本: 改密/禁用后自增, 使已签发的旧令牌立即失效',
  `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户表';

-- ---------------------------------------------------------------------
-- 2. 楼栋表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `building`;
CREATE TABLE `building` (
  `id`            BIGINT      NOT NULL AUTO_INCREMENT COMMENT '主键',
  `building_no`   VARCHAR(20) NOT NULL COMMENT '楼栋编号(如 1号楼)',
  `name`          VARCHAR(50) NOT NULL COMMENT '楼栋名称',
  `unit_count`    INT         NOT NULL DEFAULT 1 COMMENT '单元数',
  `floor_count`   INT         NOT NULL DEFAULT 1 COMMENT '楼层数',
  `house_count`   INT         NOT NULL DEFAULT 0 COMMENT '房屋总数',
  `building_type` VARCHAR(20)          DEFAULT '住宅' COMMENT '楼栋类型: 住宅/公寓/别墅/商铺',
  `build_year`    INT                  DEFAULT NULL COMMENT '建成年份',
  `total_area`    DECIMAL(10,2)        DEFAULT 0 COMMENT '建筑面积(㎡)',
  `manager`       VARCHAR(50)          DEFAULT NULL COMMENT '楼栋管家',
  `manager_phone` VARCHAR(20)          DEFAULT NULL COMMENT '管家电话',
  `remark`        VARCHAR(255)         DEFAULT NULL COMMENT '备注',
  `create_time`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_building_no` (`building_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='楼栋信息表';

-- ---------------------------------------------------------------------
-- 3. 房屋表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `house`;
CREATE TABLE `house` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `building_id` BIGINT       NOT NULL COMMENT '所属楼栋ID',
  `house_no`    VARCHAR(50)  NOT NULL COMMENT '房屋完整编号(如 1号楼1单元101)',
  `unit_no`     INT          NOT NULL DEFAULT 1 COMMENT '单元号',
  `floor_no`    INT          NOT NULL DEFAULT 1 COMMENT '楼层',
  `room_no`     VARCHAR(20)  NOT NULL COMMENT '房号(如 101)',
  `area`        DECIMAL(8,2) NOT NULL DEFAULT 0 COMMENT '建筑面积(㎡)',
  `house_type`  VARCHAR(30)           DEFAULT '两室一厅' COMMENT '户型',
  `orientation` VARCHAR(10)           DEFAULT '南' COMMENT '朝向',
  `status`      VARCHAR(20)  NOT NULL DEFAULT 'EMPTY' COMMENT '状态: OCCUPIED自住/RENTED出租/EMPTY空置/DECORATING装修中',
  `owner_id`    BIGINT                DEFAULT NULL COMMENT '业主ID',
  `decoration`  VARCHAR(20)           DEFAULT '精装' COMMENT '装修情况: 毛坯/简装/精装',
  `remark`      VARCHAR(255)          DEFAULT NULL COMMENT '备注',
  `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_house_no` (`house_no`),
  KEY `idx_building` (`building_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='房屋信息表';

-- ---------------------------------------------------------------------
-- 4. 人员信息表(业主/租户/家庭成员)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `owner`;
CREATE TABLE `owner` (
  `id`               BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name`             VARCHAR(50)  NOT NULL COMMENT '姓名',
  `gender`           VARCHAR(4)   NOT NULL DEFAULT '男' COMMENT '性别',
  `id_card`          VARCHAR(20)           DEFAULT NULL COMMENT '身份证号',
  `phone`            VARCHAR(20)  NOT NULL COMMENT '联系电话',
  `person_type`      VARCHAR(20)  NOT NULL DEFAULT 'OWNER' COMMENT '人员类型: OWNER业主/TENANT租户/FAMILY家庭成员',
  `house_id`         BIGINT                DEFAULT NULL COMMENT '所属房屋ID',
  `family_count`     INT          NOT NULL DEFAULT 1 COMMENT '家庭人口数',
  `move_in_date`     DATE                  DEFAULT NULL COMMENT '入住日期',
  `car_plate`        VARCHAR(20)           DEFAULT NULL COMMENT '登记车牌',
  `emergency_name`   VARCHAR(50)           DEFAULT NULL COMMENT '紧急联系人',
  `emergency_phone`  VARCHAR(20)           DEFAULT NULL COMMENT '紧急联系电话',
  `status`           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' COMMENT '状态: ACTIVE在住/MOVED搬离',
  `remark`           VARCHAR(255)          DEFAULT NULL COMMENT '备注',
  `create_time`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_house` (`house_id`),
  KEY `idx_phone` (`phone`),
  KEY `idx_person_type` (`person_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='人员信息表';

-- ---------------------------------------------------------------------
-- 5. 车位表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `parking_space`;
CREATE TABLE `parking_space` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `space_no`    VARCHAR(30)  NOT NULL COMMENT '车位编号(如 B1-001)',
  `area_name`   VARCHAR(50)  NOT NULL COMMENT '所属区域(如 地下一层A区)',
  `space_type`  VARCHAR(20)  NOT NULL DEFAULT 'UNDERGROUND' COMMENT '车位类型: UNDERGROUND地下/GROUND地面/OUTSIDE小区外临街',
  `space_size`  VARCHAR(20)           DEFAULT '标准' COMMENT '车位规格: 标准/子母/微型/充电桩',
  `month_fee`   DECIMAL(8,2) NOT NULL DEFAULT 0 COMMENT '月租金(元/月)',
  `status`      VARCHAR(20)  NOT NULL DEFAULT 'FREE' COMMENT '状态: FREE空闲/SOLD已售/RENTED已租',
  `owner_id`    BIGINT                DEFAULT NULL COMMENT '使用人ID',
  `car_plate`   VARCHAR(20)           DEFAULT NULL COMMENT '绑定车牌',
  `start_date`  DATE                  DEFAULT NULL COMMENT '租赁开始日期',
  `end_date`    DATE                  DEFAULT NULL COMMENT '租赁结束日期',
  `location`    VARCHAR(100)          DEFAULT NULL COMMENT '位置描述',
  `remark`      VARCHAR(255)          DEFAULT NULL COMMENT '备注',
  `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_space_no` (`space_no`),
  KEY `idx_space_type` (`space_type`),
  KEY `idx_space_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='车位信息表';

-- ---------------------------------------------------------------------
-- 6. 收费标准表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `fee_standard`;
CREATE TABLE `fee_standard` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `fee_code`      VARCHAR(30)  NOT NULL COMMENT '费用编码',
  `fee_name`      VARCHAR(50)  NOT NULL COMMENT '费用名称',
  `fee_type`      VARCHAR(20)  NOT NULL COMMENT '费用类型: PROPERTY物业费/PARKING车位管理费/WATER水费/ELECTRIC电费/GAS燃气费/SANITATION垃圾处理费',
  `unit_price`    DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '单价',
  `unit`          VARCHAR(20)  NOT NULL DEFAULT '元/㎡·月' COMMENT '计价单位',
  `charge_cycle`  VARCHAR(20)  NOT NULL DEFAULT 'MONTH' COMMENT '收费周期: MONTH月/QUARTER季/HALF_YEAR半年/YEAR年',
  `late_fee_rate` DECIMAL(6,4) NOT NULL DEFAULT 0.0005 COMMENT '滞纳金日利率',
  `status`        TINYINT      NOT NULL DEFAULT 1 COMMENT '状态: 1启用 0停用',
  `remark`        VARCHAR(255)          DEFAULT NULL COMMENT '备注',
  `create_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_fee_code` (`fee_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收费标准表';

-- ---------------------------------------------------------------------
-- 7. 费用账单表(物业费/车位管理费/水电费等)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `fee_bill`;
CREATE TABLE `fee_bill` (
  `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `bill_no`         VARCHAR(40)  NOT NULL COMMENT '账单编号',
  `owner_id`        BIGINT                DEFAULT NULL COMMENT '业主ID',
  `owner_name`      VARCHAR(50)           DEFAULT NULL COMMENT '业主姓名',
  `house_id`        BIGINT                DEFAULT NULL COMMENT '房屋ID',
  `house_no`        VARCHAR(50)           DEFAULT NULL COMMENT '房屋编号',
  `parking_id`      BIGINT                DEFAULT NULL COMMENT '车位ID',
  `parking_no`      VARCHAR(30)           DEFAULT NULL COMMENT '车位编号',
  `standard_id`     BIGINT                DEFAULT NULL COMMENT '收费标准ID',
  `fee_type`        VARCHAR(20)  NOT NULL COMMENT '费用类型',
  `fee_name`        VARCHAR(50)  NOT NULL COMMENT '费用名称',
  `period`          VARCHAR(20)  NOT NULL COMMENT '费用所属期间(如 2026-08)',
  `amount`          DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '应收金额',
  `paid_amount`     DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '实收金额',
  `pay_status`      VARCHAR(20)  NOT NULL DEFAULT 'UNPAID' COMMENT '缴费状态: UNPAID未缴/PAID已缴/PARTIAL部分缴纳/OVERDUE逾期欠费',
  `due_date`        DATE                  DEFAULT NULL COMMENT '应缴截止日期',
  `pay_time`        DATETIME              DEFAULT NULL COMMENT '缴费时间',
  `pay_method`      VARCHAR(20)           DEFAULT NULL COMMENT '缴费方式: CASH现金/WECHAT微信/ALIPAY支付宝/BANK银行转账',
  `generate_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '账单生成时间',
  `remark`          VARCHAR(255)          DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bill_no` (`bill_no`),
  KEY `idx_bill_owner` (`owner_id`),
  KEY `idx_bill_status` (`pay_status`),
  KEY `idx_bill_period` (`period`),
  KEY `idx_bill_type` (`fee_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='费用账单表';

-- ---------------------------------------------------------------------
-- 8. 缴费记录表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `fee_payment`;
CREATE TABLE `fee_payment` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `payment_no`  VARCHAR(40)  NOT NULL COMMENT '缴费流水号',
  `bill_id`     BIGINT       NOT NULL COMMENT '账单ID',
  `bill_no`     VARCHAR(40)           DEFAULT NULL COMMENT '账单编号',
  `owner_id`    BIGINT                DEFAULT NULL COMMENT '业主ID',
  `owner_name`  VARCHAR(50)           DEFAULT NULL COMMENT '业主姓名',
  `fee_name`    VARCHAR(50)           DEFAULT NULL COMMENT '费用名称',
  `amount`      DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '缴费金额',
  `pay_method`  VARCHAR(20)  NOT NULL DEFAULT 'WECHAT' COMMENT '缴费方式',
  `pay_time`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '缴费时间',
  `operator`    VARCHAR(50)           DEFAULT NULL COMMENT '收银/操作人',
  `remark`      VARCHAR(255)          DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_no` (`payment_no`),
  KEY `idx_pay_bill` (`bill_id`),
  KEY `idx_pay_time` (`pay_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='缴费记录表';

-- ---------------------------------------------------------------------
-- 9. 临时停车记录表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `temp_parking`;
CREATE TABLE `temp_parking` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `record_no`   VARCHAR(40)  NOT NULL COMMENT '停车记录编号',
  `car_plate`   VARCHAR(20)  NOT NULL COMMENT '车牌号',
  `car_type`    VARCHAR(20)  NOT NULL DEFAULT '小型车' COMMENT '车辆类型: 小型车/中型车/大型车',
  `space_no`    VARCHAR(30)           DEFAULT NULL COMMENT '停放车位',
  `park_type`   VARCHAR(20)  NOT NULL DEFAULT 'OUTSIDE' COMMENT '停车区域: INSIDE小区内/OUTSIDE小区外临街',
  `entry_time`  DATETIME     NOT NULL COMMENT '入场时间',
  `exit_time`   DATETIME              DEFAULT NULL COMMENT '出场时间',
  `duration`    INT          NOT NULL DEFAULT 0 COMMENT '停车时长(分钟)',
  `fee`         DECIMAL(8,2) NOT NULL DEFAULT 0 COMMENT '应收停车费',
  `paid_fee`    DECIMAL(8,2) NOT NULL DEFAULT 0 COMMENT '实收停车费',
  `pay_status`  VARCHAR(20)  NOT NULL DEFAULT 'UNPAID' COMMENT '缴费状态: UNPAID未缴/PAID已缴/FREE免费',
  `pay_method`  VARCHAR(20)           DEFAULT NULL COMMENT '缴费方式',
  `pay_time`    DATETIME              DEFAULT NULL COMMENT '缴费时间',
  `gate`        VARCHAR(30)           DEFAULT NULL COMMENT '通道/岗亭',
  `operator`    VARCHAR(50)           DEFAULT NULL COMMENT '操作人',
  `remark`      VARCHAR(255)          DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_record_no` (`record_no`),
  KEY `idx_car_plate` (`car_plate`),
  KEY `idx_entry_time` (`entry_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='临时停车记录表';

-- ---------------------------------------------------------------------
-- 10. 报修工单表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `repair_order`;
CREATE TABLE `repair_order` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `order_no`      VARCHAR(40)  NOT NULL COMMENT '工单编号',
  `owner_id`      BIGINT                DEFAULT NULL COMMENT '报修人ID',
  `owner_name`    VARCHAR(50)           DEFAULT NULL COMMENT '报修人姓名',
  `phone`         VARCHAR(20)           DEFAULT NULL COMMENT '联系电话',
  `house_id`      BIGINT                DEFAULT NULL COMMENT '房屋ID',
  `house_no`      VARCHAR(50)           DEFAULT NULL COMMENT '房屋编号',
  `title`         VARCHAR(100) NOT NULL COMMENT '报修标题',
  `content`       VARCHAR(500)          DEFAULT NULL COMMENT '故障描述',
  `repair_type`   VARCHAR(20)  NOT NULL DEFAULT 'WATER_ELEC' COMMENT '报修类型: WATER_ELEC水电/DOOR_WINDOW门窗/PUBLIC公共设施/ELEVATOR电梯/PLUMBING管道疏通/OTHER其他',
  `urgency`       VARCHAR(20)  NOT NULL DEFAULT 'NORMAL' COMMENT '紧急程度: LOW低/NORMAL普通/HIGH高/URGENT紧急',
  `status`        VARCHAR(20)  NOT NULL DEFAULT 'PENDING' COMMENT '工单状态: PENDING待受理/ASSIGNED已派单/PROCESSING处理中/FINISHED已完成/CLOSED已关闭',
  `handler`       VARCHAR(50)           DEFAULT NULL COMMENT '维修人员',
  `handler_phone` VARCHAR(20)           DEFAULT NULL COMMENT '维修人员电话',
  `assign_time`   DATETIME              DEFAULT NULL COMMENT '派单时间',
  `finish_time`   DATETIME              DEFAULT NULL COMMENT '完工时间',
  `cost`          DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '维修费用',
  `rating`        INT                   DEFAULT NULL COMMENT '业主评分(1-5)',
  `feedback`      VARCHAR(255)          DEFAULT NULL COMMENT '业主反馈',
  `remark`        VARCHAR(255)          DEFAULT NULL COMMENT '备注',
  `create_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报修时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_repair_status` (`status`),
  KEY `idx_repair_owner` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报修工单表';

-- ---------------------------------------------------------------------
-- 11. 投诉建议表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `complaint`;
CREATE TABLE `complaint` (
  `id`             BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `complaint_no`   VARCHAR(40)  NOT NULL COMMENT '投诉单号',
  `owner_id`       BIGINT                DEFAULT NULL COMMENT '投诉人ID',
  `owner_name`     VARCHAR(50)           DEFAULT NULL COMMENT '投诉人姓名',
  `phone`          VARCHAR(20)           DEFAULT NULL COMMENT '联系电话',
  `house_no`       VARCHAR(50)           DEFAULT NULL COMMENT '房屋编号',
  `complaint_type` VARCHAR(20)  NOT NULL DEFAULT 'SERVICE' COMMENT '类型: SERVICE服务态度/NOISE噪音扰民/SANITARY环境卫生/SAFETY安全隐患/PARKING停车纠纷/OTHER其他',
  `title`          VARCHAR(100) NOT NULL COMMENT '标题',
  `content`        VARCHAR(500)          DEFAULT NULL COMMENT '内容',
  `status`         VARCHAR(20)  NOT NULL DEFAULT 'PENDING' COMMENT '状态: PENDING待处理/PROCESSING处理中/RESOLVED已解决/CLOSED已关闭',
  `handler`        VARCHAR(50)           DEFAULT NULL COMMENT '处理人',
  `reply`          VARCHAR(500)          DEFAULT NULL COMMENT '处理回复',
  `handle_time`    DATETIME              DEFAULT NULL COMMENT '处理时间',
  `create_time`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_complaint_no` (`complaint_no`),
  KEY `idx_complaint_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投诉建议表';

-- ---------------------------------------------------------------------
-- 12. 通知公告表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `notice`;
CREATE TABLE `notice` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `title`        VARCHAR(100) NOT NULL COMMENT '标题',
  `content`      TEXT COMMENT '公告内容',
  `notice_type`  VARCHAR(20)  NOT NULL DEFAULT 'NOTIFY' COMMENT '类型: NOTIFY通知公告/ACTIVITY社区活动/URGENT紧急通知/MAINTAIN停水停电',
  `publisher`    VARCHAR(50)           DEFAULT NULL COMMENT '发布人',
  `publish_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  `top_flag`     TINYINT      NOT NULL DEFAULT 0 COMMENT '是否置顶: 1是 0否',
  `status`       TINYINT      NOT NULL DEFAULT 1 COMMENT '状态: 1已发布 0草稿',
  `view_count`   INT          NOT NULL DEFAULT 0 COMMENT '阅读量',
  PRIMARY KEY (`id`),
  KEY `idx_notice_time` (`publish_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知公告表';

-- ---------------------------------------------------------------------
-- 13. 访客登记表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `visitor`;
CREATE TABLE `visitor` (
  `id`             BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `visitor_name`   VARCHAR(50)  NOT NULL COMMENT '访客姓名',
  `phone`          VARCHAR(20)           DEFAULT NULL COMMENT '访客电话',
  `visit_owner_id` BIGINT                DEFAULT NULL COMMENT '被访业主ID',
  `visit_owner`    VARCHAR(50)           DEFAULT NULL COMMENT '被访业主姓名',
  `house_no`       VARCHAR(50)           DEFAULT NULL COMMENT '到访房屋',
  `visit_reason`   VARCHAR(100)          DEFAULT NULL COMMENT '来访事由',
  `car_plate`      VARCHAR(20)           DEFAULT NULL COMMENT '车牌号',
  `visit_time`     DATETIME     NOT NULL COMMENT '进入时间',
  `leave_time`     DATETIME              DEFAULT NULL COMMENT '离开时间',
  `status`         VARCHAR(20)  NOT NULL DEFAULT 'IN' COMMENT '状态: IN在小区内/OUT已离开',
  `register`       VARCHAR(50)           DEFAULT NULL COMMENT '登记人',
  PRIMARY KEY (`id`),
  KEY `idx_visitor_time` (`visit_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='访客登记表';

-- ---------------------------------------------------------------------
-- 14. 设备设施表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `equipment`;
CREATE TABLE `equipment` (
  `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `equipment_no`    VARCHAR(40)  NOT NULL COMMENT '设备编号',
  `name`            VARCHAR(50)  NOT NULL COMMENT '设备名称',
  `equipment_type`  VARCHAR(20)  NOT NULL DEFAULT 'OTHER' COMMENT '类型: ELEVATOR电梯/WATER_PUMP水泵/DOOR门禁监控/FIRE消防/FITNESS健身器材/LIGHT照明/OTHER其他',
  `location`        VARCHAR(100)          DEFAULT NULL COMMENT '安装位置',
  `brand`           VARCHAR(50)           DEFAULT NULL COMMENT '品牌型号',
  `status`          VARCHAR(20)  NOT NULL DEFAULT 'NORMAL' COMMENT '状态: NORMAL正常/REPAIR维修中/SCRAPPED已报废',
  `buy_date`        DATE                  DEFAULT NULL COMMENT '采购日期',
  `maintain_cycle`  INT          NOT NULL DEFAULT 30 COMMENT '维保周期(天)',
  `last_maintain`   DATE                  DEFAULT NULL COMMENT '上次维保日期',
  `next_maintain`   DATE                  DEFAULT NULL COMMENT '下次维保日期',
  `keeper`          VARCHAR(50)           DEFAULT NULL COMMENT '责任人',
  `remark`          VARCHAR(255)          DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_equipment_no` (`equipment_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备设施表';

-- ---------------------------------------------------------------------
-- 15. 操作日志表
--     由 OperationLogInterceptor 自动写入, 记录所有写操作与登录登出
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_log`;
CREATE TABLE `sys_log` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id`     BIGINT                DEFAULT NULL COMMENT '操作人ID',
  `username`    VARCHAR(50)           DEFAULT NULL COMMENT '操作人账号',
  `real_name`   VARCHAR(50)           DEFAULT NULL COMMENT '操作人姓名',
  `role`        VARCHAR(20)           DEFAULT NULL COMMENT '操作人角色: ADMIN/STAFF/OWNER',
  `module`      VARCHAR(40)           DEFAULT NULL COMMENT '业务模块(由请求路径推导)',
  `action`      VARCHAR(40)           DEFAULT NULL COMMENT '动作(登录/新增/修改/删除/缴费...)',
  `method`      VARCHAR(10)           DEFAULT NULL COMMENT 'HTTP 方法',
  `uri`         VARCHAR(255)          DEFAULT NULL COMMENT '请求路径',
  `params`      TEXT                  DEFAULT NULL COMMENT '请求参数(敏感字段已脱敏)',
  `ip`          VARCHAR(64)           DEFAULT NULL COMMENT '客户端IP',
  `user_agent`  VARCHAR(255)          DEFAULT NULL COMMENT '客户端UA',
  `status`      TINYINT      NOT NULL DEFAULT 1 COMMENT '结果: 1成功 0失败',
  `error_msg`   VARCHAR(500)          DEFAULT NULL COMMENT '失败原因',
  `cost_ms`     INT          NOT NULL DEFAULT 0 COMMENT '耗时(毫秒)',
  `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_user` (`user_id`),
  KEY `idx_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

SET FOREIGN_KEY_CHECKS = 1;
"""

# ============================================================
# 演示数据生成
# ============================================================
surnames = "赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章林刘高罗郭梁宋唐黄"
given1 = "建国志伟华明芳强军平磊洋勇艳杰娟涛超秀霞燕敏静丽娜鹏宇浩鑫天云海峰文博子墨思雨欣怡"
given2 = "华明强军平磊洋勇杰涛峰宇浩鑫杰华婷静怡雨轩然琪琳"

def cn_name():
    s = random.choice(surnames)
    g = random.choice(given1) + (random.choice(given2) if random.random() < 0.6 else "")
    return s + g

def phone():
    prefix = random.choice(["138", "139", "150", "151", "158", "186", "187", "188", "133", "159", "177", "199"])
    return prefix + "".join(random.choice("0123456789") for _ in range(8))

def id_card(birth_year):
    area = random.choice(["110101", "310104", "440305", "320102", "330106", "510107", "420106", "610113"])
    m = random.randint(1, 12)
    d = random.randint(1, 28)
    seq = "".join(random.choice("0123456789") for _ in range(3))
    return f"{area}{birth_year}{m:02d}{d:02d}{seq}{random.choice('0123456789X')}"

def car_plate():
    prov = random.choice(["京A", "沪B", "粤B", "苏A", "浙A", "川A", "鄂A", "陕A"])
    tail = "".join(random.choice("0123456789") for _ in range(5))
    letter = random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ")
    return f"{prov}{letter}{tail}"

def d(y, m, day):
    return date(y, m, day)

def dt(y, m, day, h=9, mi=0):
    return f"{y}-{m:02d}-{day:02d} {h:02d}:{mi:02d}:00"

SQL = []
def add(s):
    SQL.append(s)

def esc(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"

def insert(table, cols, rows):
    """生成批量 INSERT 语句(每 50 条一组)"""
    # 防御性校验: 每行的值个数必须与列个数一致, 否则导入时会报
    # ERROR 1136 (Column count doesn't match value count) —— 且往往到导入阶段才发现
    for idx, r in enumerate(rows):
        if len(r) != len(cols):
            raise ValueError(
                f"表 {table} 第 {idx+1} 行的值个数({len(r)})与列个数({len(cols)})不一致\n"
                f"  列: {cols}\n  值: {r}")
    add(f"\n-- {table}: {len(rows)} 条")
    for i in range(0, len(rows), 50):
        chunk = rows[i:i + 50]
        add(f"INSERT INTO `{table}` ({', '.join('`' + c + '`' for c in cols)}) VALUES")
        vals = []
        for r in chunk:
            vals.append("(" + ", ".join(esc(x) for x in r) + ")")
        add(",\n".join(vals) + ";")

# ---------- 当前时间基准 ----------
TODAY = date(2026, 9, 16)
NOW_Y, NOW_M = 2026, 9

# ---------- 1. 系统用户 ----------
# 密码统一为 123456, 但以 BCrypt 密文入库(不再存明文)。
# 这里用固定密文, 使生成结果可复现; 之所以有 4 个不同密文, 只是为了演示 BCrypt 每次加盐不同。
# 若更换密码, 用后端 PasswordUtil.encode("新密码") 生成, 或见 README「演示账号」一节。
PWD_123456 = [
    "$2a$10$kWvGIMGZnoRS0vUQZjwdH.APz4CdT.Am3XalX9XpqtjNY3GBV1vzS",
    "$2a$10$0zq27WFfPRph6ihm1EMgduUcvNz9twubQNuPRpMD4P3ZMt/E2.FBC",
    "$2a$10$Kk.GhxduW537DpscaRcqKunlqOExHcok2Y8Dtv7OJJYdqZrEgZ5Hu",
    "$2a$10$kCXu.oSAMiEGFIqNoHoMdeOPNrzy5vmzKVg2ull/GfQ4kcpymg1Ja",
]
users = [
    (1, "admin",   PWD_123456[0], "系统管理员", "13800000001", "ADMIN", 1, dt(2026, 9, 15, 8, 30)),
    (2, "wuye01",  PWD_123456[1], "王丽",       "13800000002", "STAFF", 1, dt(2026, 9, 15, 9, 10)),
    (3, "wuye02",  PWD_123456[2], "李强",       "13800000003", "STAFF", 1, dt(2026, 9, 14, 10, 20)),
    (4, "baojie",  PWD_123456[3], "张秀兰",     "13800000004", "STAFF", 1, dt(2026, 9, 12, 8, 0)),
    (5, "weixiu",  PWD_123456[0], "刘海涛",     "13800000005", "STAFF", 1, dt(2026, 9, 13, 14, 45)),
]
insert("sys_user", ["id", "username", "password", "real_name", "phone", "role", "status", "last_login"], users)
add("INSERT INTO `sys_user` (`username`, `password`, `real_name`, `phone`, `role`, `status`) VALUES "
    f"('yeye01', '{PWD_123456[1]}', '陈治国', '13800000006', 'OWNER', 1),"
    f"('yeye02', '{PWD_123456[2]}', '孙美玲', '13800000007', 'OWNER', 1);")

# ---------- 2. 楼栋 ----------
buildings = [
    (1, "1号楼", "阳光家园1号楼", 2, 6, 24, "住宅", 2015, 2880.00, "王丽", "13800000002", dt(2015, 6, 30)),
    (2, "2号楼", "阳光家园2号楼", 2, 6, 24, "住宅", 2015, 2880.00, "王丽", "13800000002", dt(2015, 6, 30)),
    (3, "3号楼", "阳光家园3号楼", 2, 6, 24, "住宅", 2016, 3120.00, "李强", "13800000003", dt(2016, 8, 15)),
    (4, "4号楼", "阳光家园4号楼", 2, 6, 24, "住宅", 2017, 3120.00, "李强", "13800000003", dt(2017, 5, 20)),
    (5, "5号楼", "阳光家园5号楼", 2, 8, 32, "住宅", 2018, 4160.00, "张秀兰", "13800000004", dt(2018, 10, 1)),
    (6, "6号楼", "阳光家园6号楼(公寓)", 1, 10, 20, "公寓", 2020, 1600.00, "刘海涛", "13800000005", dt(2020, 3, 28)),
]
insert("building", ["id", "building_no", "name", "unit_count", "floor_count", "house_count", "building_type", "build_year", "total_area", "manager", "manager_phone", "create_time"], buildings)

# ---------- 3. 房屋 ----------
house_types = ["一室一厅", "两室一厅", "两室两厅", "三室两厅", "三室一厅"]
orientations = ["南", "南北通透", "东南", "东", "西南"]
houses = []
hid = 1
for b in buildings:
    bid, bno, bname, units, floors, hc, btype = b[0], b[1], b[2], b[3], b[4], b[5], b[6]
    num = bno.replace("号楼", "")
    for u in range(1, units + 1):
        for f in range(1, floors + 1):
            rooms = [1, 2] if btype == "住宅" else [1]
            for r in rooms:
                room_no = f"{f}{r:02d}"
                house_no = f"{num}号楼{u}单元{room_no}"
                if btype == "公寓":
                    area = round(random.choice([38.5, 42.0, 45.5, 50.0]), 2)
                    htype = "一室一厅"
                elif f == 1:
                    area = round(random.choice([88.5, 92.0, 96.5, 105.0]), 2)
                    htype = "两室一厅"
                else:
                    area = round(random.choice([105.5, 118.0, 126.5, 138.0, 145.5]), 2)
                    htype = random.choice(house_types[1:])
                status = "EMPTY"
                rand = random.random()
                if rand < 0.72:
                    status = "OCCUPIED"
                elif rand < 0.88:
                    status = "RENTED"
                elif rand < 0.94:
                    status = "DECORATING"
                houses.append([hid, bid, house_no, u, f, room_no, area, htype,
                               random.choice(orientations), status, None,
                               random.choice(["精装", "精装", "简装", "毛坯"]), None, dt(2015 + (bid % 3), random.randint(1, 12), random.randint(1, 28))])
                hid += 1
insert("house", ["id", "building_id", "house_no", "unit_no", "floor_no", "room_no", "area",
                 "house_type", "orientation", "status", "owner_id", "decoration", "remark", "create_time"], houses)

# ---------- 4. 人员信息 ----------
owners = []
oid = 1
car_used = set()
occupied = [h for h in houses if h[9] in ("OCCUPIED", "RENTED")]
for h in occupied:
    house_id, house_no, hstatus = h[0], h[2], h[9]
    ptype = "OWNER" if hstatus == "OCCUPIED" else "TENANT"
    gender = random.choice(["男", "女"])
    name = cn_name()
    plate = None
    if random.random() < 0.8:
        for _ in range(20):
            p = car_plate()
            if p not in car_used:
                car_used.add(p)
                plate = p
                break
    owners.append([oid, name, gender, id_card(random.randint(1960, 1995)), phone(), ptype, house_id,
                   random.randint(1, 5), d(random.randint(2015, 2024), random.randint(1, 12), random.randint(1, 28)),
                   plate, cn_name(), phone(), "ACTIVE", None, dt(2016, random.randint(1, 12), random.randint(1, 28))])
    h[10] = oid
    oid += 1
    # 家庭成员
    for _ in range(random.choice([0, 0, 1, 1, 2])):
        fg = random.choice(["男", "女"])
        owners.append([oid, cn_name(), fg, id_card(random.randint(1996, 2018)), phone(), "FAMILY", house_id,
                       1, d(random.randint(2016, 2024), random.randint(1, 12), random.randint(1, 28)),
                       None, None, None, "ACTIVE", None, dt(2016, random.randint(1, 12), random.randint(1, 28))])
        oid += 1
insert("owner", ["id", "name", "gender", "id_card", "phone", "person_type", "house_id", "family_count",
                 "move_in_date", "car_plate", "emergency_name", "emergency_phone", "status", "remark", "create_time"], owners)

# 业主登录账号(yeye01/yeye02)关联到生成的真实业主档案: 一楼、二楼各一户,
# 用于演示"业主只能查看自己房间"的数据隔离(关联键: 登录账号手机号 = 档案手机号)
house_floor = {h[0]: h[4] for h in houses}
owner_only = [o for o in owners if o[5] == "OWNER"]
_y1 = next(o for o in owner_only if house_floor.get(o[6]) == 1)
_y2 = next(o for o in owner_only if house_floor.get(o[6]) == 2)
add("\n-- 业主登录账号关联人员档案(数据隔离: 登录手机号 = 档案手机号)")
SQL.append(f"UPDATE `sys_user` SET `real_name` = '{_y1[1]}', `phone` = '{_y1[4]}' WHERE `username` = 'yeye01';")
SQL.append(f"UPDATE `sys_user` SET `real_name` = '{_y2[1]}', `phone` = '{_y2[4]}' WHERE `username` = 'yeye02';")

# 回填房屋的 owner_id
upd = []
for h in houses:
    if h[10]:
        upd.append(f"UPDATE `house` SET `owner_id` = {h[10]} WHERE `id` = {h[0]};")
add("\n-- 回填房屋关联业主")
SQL.extend(upd)

# ---------- 5. 车位 ----------
spaces = []
sid = 1
# 地下车位
for area, prefix, cnt, fee in [("地下一层A区", "B1", 60, 300.00), ("地下二层B区", "B2", 40, 260.00)]:
    for i in range(1, cnt + 1):
        spaces.append([sid, f"{prefix}-{i:03d}", area, "UNDERGROUND",
                       random.choice(["标准", "标准", "标准", "子母", "充电桩"]), fee, "FREE", None, None, None, None,
                       f"{area} {i:03d}号位", dt(2015, 6, 1)])
        sid += 1
# 地面车位
for i in range(1, 41):
    spaces.append([sid, f"DM-{i:03d}", "小区地面停车区", "GROUND", "标准", 180.00, "FREE", None, None, None, None,
                   f"地面停车区 {i:03d}号位", dt(2015, 6, 1)])
    sid += 1
# 小区外临街车位
for i in range(1, 41):
    spaces.append([sid, f"WJ-{i:03d}", "小区外临街商铺停车区", "OUTSIDE", "标准", 150.00, "FREE", None, None, None, None,
                   f"临街停车区 {i:03d}号位", dt(2019, 4, 1)])
    sid += 1

# 分配车位给有车业主
owner_with_car = [o for o in owners if o[1] and o[9] and o[5] in ("OWNER", "TENANT")]
random.shuffle(owner_with_car)
free_idx = list(range(len(spaces)))
random.shuffle(free_idx)
for o in owner_with_car[:min(110, len(owner_with_car))]:
    if not free_idx:
        break
    idx = free_idx.pop()
    sp = spaces[idx]
    sp[6] = "SOLD" if random.random() < 0.35 else "RENTED"
    sp[7] = o[0]
    sp[8] = o[9]
    sp[9] = d(2026, random.randint(1, 8), 1)
    sp[10] = d(2027, random.randint(1, 8), 1)
insert("parking_space", ["id", "space_no", "area_name", "space_type", "space_size", "month_fee", "status",
                         "owner_id", "car_plate", "start_date", "end_date", "location", "create_time"], spaces)

# ---------- 6. 收费标准 ----------
standards = [
    (1, "PROPERTY-001", "住宅物业服务费", "PROPERTY", 2.50, "元/㎡·月", "MONTH", 0.0005, 1, "按建筑面积计收, 每月1日出账"),
    (2, "PROPERTY-002", "公寓物业服务费", "PROPERTY", 3.20, "元/㎡·月", "MONTH", 0.0005, 1, "公寓楼按此标准执行"),
    (3, "PARKING-001", "地下车位管理费", "PARKING", 300.00, "元/月", "MONTH", 0.0005, 1, "地下车库车位月度管理费"),
    (4, "PARKING-002", "地面车位管理费", "PARKING", 180.00, "元/月", "MONTH", 0.0005, 1, "地面车位月度管理费"),
    (5, "PARKING-003", "小区外车位管理费", "PARKING", 150.00, "元/月", "MONTH", 0.0005, 1, "小区外临街车位管理费"),
    (6, "WATER-001", "居民用水费", "WATER", 4.20, "元/吨", "MONTH", 0.0005, 1, "按抄表用量计收"),
    (7, "ELECTRIC-001", "居民用电费", "ELECTRIC", 0.568, "元/度", "MONTH", 0.0005, 1, "阶梯电价第一档"),
    (8, "SANITATION-001", "生活垃圾处理费", "SANITATION", 8.00, "元/户·月", "MONTH", 0.0005, 1, "环卫部门代收"),
]
insert("fee_standard", ["id", "fee_code", "fee_name", "fee_type", "unit_price", "unit", "charge_cycle",
                        "late_fee_rate", "status", "remark"], standards)

# ---------- 7. 费用账单 ----------
bills = []
bid_seq = 1
months = [(2026, 6), (2026, 7), (2026, 8), (2026, 9)]
house_std = {1: (1, 2.50), 2: (1, 2.50), 3: (1, 2.50), 4: (1, 2.50), 5: (1, 2.50), 6: (2, 3.20)}

for h in houses:
    if h[9] == "EMPTY" or not h[10]:
        continue
    house_id, house_no, area, bid_, owner_id = h[0], h[2], h[6], h[1], h[10]
    o = next((x for x in owners if x[0] == owner_id), None)
    if not o:
        continue
    std_id, price = house_std[bid_]
    owner_name = o[1]
    for (yy, mm) in months:
        period = f"{yy}-{mm:02d}"
        amount = round(area * price, 2)
        due = d(yy, mm, 25)
        # 9 月账单大部分未缴
        if yy == 2026 and mm == 9:
            r = random.random()
            if r < 0.42:
                st, paid, pt, pm = "PAID", amount, dt(yy, mm, random.randint(1, 14), 10, 30), random.choice(["WECHAT", "ALIPAY", "BANK", "CASH"])
            else:
                st, paid, pt, pm = "UNPAID", 0, None, None
        elif yy == 2026 and mm == 8:
            r = random.random()
            if r < 0.80:
                st, paid, pt, pm = "PAID", amount, dt(yy, mm, random.randint(1, 28), 10, 30), random.choice(["WECHAT", "ALIPAY", "BANK", "CASH"])
            else:
                st, paid, pt, pm = "OVERDUE", 0, None, None
        else:
            r = random.random()
            if r < 0.93:
                st, paid, pt, pm = "PAID", amount, dt(yy, mm, random.randint(1, 28), 10, 30), random.choice(["WECHAT", "ALIPAY", "BANK", "CASH"])
            else:
                st, paid, pt, pm = "OVERDUE", 0, None, None
        bills.append([bid_seq, f"WY{yy}{mm:02d}{bid_seq:06d}", owner_id, owner_name, house_id, house_no,
                      None, None, std_id, "PROPERTY", "住宅物业服务费" if bid_ != 6 else "公寓物业服务费",
                      period, amount, paid, st, due, pt, pm, dt(yy, mm, 1, 0, 5), None])
        bid_seq += 1

# 车位管理费账单 (最近4个月)
active_spaces = [s for s in spaces if s[6] in ("SOLD", "RENTED") and s[7]]
for s in active_spaces:
    sp_id, sp_no, sp_type, sp_fee, owner_id = s[0], s[1], s[3], s[5], s[7]
    o = next((x for x in owners if x[0] == owner_id), None)
    if not o:
        continue
    fee_name = {"UNDERGROUND": "地下车位管理费", "GROUND": "地面车位管理费", "OUTSIDE": "小区外车位管理费"}[sp_type]
    std_id = {"UNDERGROUND": 3, "GROUND": 4, "OUTSIDE": 5}[sp_type]
    house_id = o[6]
    hno = next((x[2] for x in houses if x[0] == house_id), None)
    for (yy, mm) in months:
        period = f"{yy}-{mm:02d}"
        amount = sp_fee
        due = d(yy, mm, 25)
        if yy == 2026 and mm == 9:
            r = random.random()
            if r < 0.38:
                st, paid, pt, pm = "PAID", amount, dt(yy, mm, random.randint(1, 14), 11, 0), random.choice(["WECHAT", "ALIPAY", "BANK", "CASH"])
            else:
                st, paid, pt, pm = "UNPAID", 0, None, None
        else:
            r = random.random()
            if r < 0.88:
                st, paid, pt, pm = "PAID", amount, dt(yy, mm, random.randint(1, 28), 11, 0), random.choice(["WECHAT", "ALIPAY", "BANK", "CASH"])
            else:
                st, paid, pt, pm = "OVERDUE", 0, None, None
        bills.append([bid_seq, f"CW{yy}{mm:02d}{bid_seq:06d}", owner_id, o[1], house_id, hno,
                      sp_id, sp_no, std_id, "PARKING", fee_name, period, amount, paid, st, due, pt, pm, dt(yy, mm, 1, 0, 5), None])
        bid_seq += 1

insert("fee_bill", ["id", "bill_no", "owner_id", "owner_name", "house_id", "house_no", "parking_id", "parking_no",
                    "standard_id", "fee_type", "fee_name", "period", "amount", "paid_amount", "pay_status",
                    "due_date", "pay_time", "pay_method", "generate_time", "remark"], bills)

# ---------- 8. 缴费记录 ----------
payments = []
pid = 1
for b in bills:
    if b[14] == "PAID":
        # 注意: 值顺序必须与下面 insert() 的列顺序严格一致
        # id, payment_no, bill_id, bill_no, owner_id, owner_name, fee_name,
        # amount, pay_method, pay_time, operator, remark
        payments.append([pid, f"PAY{b[16].replace('-', '').replace(':', '').replace(' ', '')}{pid:05d}",
                         b[0], b[1], b[2], b[3], b[10], b[13], b[17], b[16],
                         random.choice(["王丽", "李强", "系统自动"]), None])
        pid += 1
# 为 9 月已缴账单生成本月记录(时间已在上面)
insert("fee_payment", ["id", "payment_no", "bill_id", "bill_no", "owner_id", "owner_name", "fee_name",
                       "amount", "pay_method", "pay_time", "operator", "remark"], payments)

# ---------- 9. 临时停车记录 ----------
temps = []
tid = 1
gates = ["南门岗亭", "北门岗亭", "外街西口岗亭", "外街东口岗亭"]
for i in range(90):
    day_offset = random.randint(0, 29)
    entry_d = TODAY - timedelta(days=day_offset)
    h = random.randint(6, 22)
    mi = random.randint(0, 59)
    entry = datetime(entry_d.year, entry_d.month, entry_d.day, h, mi)
    dur = random.choice([15, 25, 40, 55, 75, 95, 120, 150, 185, 240, 320, 480, 610, 900, 1250])
    exit_t = entry + timedelta(minutes=dur)
    ptype = random.choice(["OUTSIDE", "OUTSIDE", "INSIDE"])
    # 计费规则: 前30分钟免费, 之后首小时5元, 每超1小时加3元, 24小时封顶30元
    fee = 0.0
    if dur > 30:
        hours = (dur - 30 + 59) // 60
        fee = 5.0 + max(0, hours - 1) * 3.0
        fee = min(fee, 30.0)
    st = "PAID" if random.random() < 0.9 else "UNPAID"
    temps.append([tid, f"LS{entry.strftime('%Y%m%d')}{tid:04d}", car_plate(), random.choice(["小型车", "小型车", "小型车", "中型车", "大型车"]),
                  None, ptype, entry.strftime("%Y-%m-%d %H:%M:%S"),
                  exit_t.strftime("%Y-%m-%d %H:%M:%S") if random.random() < 0.92 else None,
                  dur, round(fee, 2), round(fee, 2) if st == "PAID" else 0, st,
                  random.choice(["WECHAT", "ALIPAY", "CASH"]) if st == "PAID" else None,
                  exit_t.strftime("%Y-%m-%d %H:%M:%S") if st == "PAID" else None,
                  random.choice(gates), random.choice(["王丽", "李强"]), None])
    tid += 1
# 追加在场未出场车辆
for i in range(6):
    entry = datetime(2026, 9, 16, random.randint(7, 14), random.randint(0, 59))
    dur = int((datetime(2026, 9, 16, 15, 0) - entry).total_seconds() // 60)
    hours = 0 if dur <= 30 else (dur - 30 + 59) // 60
    fee = 0.0 if dur <= 30 else min(5.0 + max(0, hours - 1) * 3.0, 30.0)
    temps.append([tid, f"LS20260916{tid:04d}", car_plate(), "小型车", random.choice(["WJ-001", "WJ-002", "WJ-003", "WJ-004"]),
                  "OUTSIDE", entry.strftime("%Y-%m-%d %H:%M:%S"), None, dur, round(fee, 2), 0, "UNPAID",
                  None, None, random.choice(gates), "王丽", "车辆在场"])
    tid += 1
insert("temp_parking", ["id", "record_no", "car_plate", "car_type", "space_no", "park_type", "entry_time",
                        "exit_time", "duration", "fee", "paid_fee", "pay_status", "pay_method", "pay_time",
                        "gate", "operator", "remark"], temps)

# ---------- 10. 报修工单 ----------
repair_titles = [
    ("厨房水管漏水", "WATER_ELEC", "厨房水槽下方管道接口处渗水, 地面已有积水"),
    ("客厅灯不亮", "WATER_ELEC", "客厅主灯开关无反应, 灯泡已更换仍不亮"),
    ("卫生间马桶堵塞", "PLUMBING", "马桶冲水后水位上升缓慢, 有返味"),
    ("卧室窗户关不严", "DOOR_WINDOW", "次卧窗户密封条老化, 关不上有缝隙漏风"),
    ("单元门门禁损坏", "PUBLIC", "2单元门禁刷卡无反应, 门无法自动闭合"),
    ("电梯运行有异响", "ELEVATOR", "电梯上行至5楼时有明显金属摩擦声"),
    ("阳台下水道堵塞", "PLUMBING", "阳台地漏排水缓慢, 下雨天积水"),
    ("插座跳闸", "WATER_ELEC", "书房插座一插电器就跳闸"),
    ("楼道声控灯不亮", "PUBLIC", "3楼楼道声控灯整晚不亮, 晚上上下楼不便"),
    ("热水器不出热水", "WATER_ELEC", "燃气热水器打不着火, 已确认燃气正常"),
    ("入户门锁芯卡顿", "DOOR_WINDOW", "入户门钥匙插拔困难, 需要用力拧"),
    ("空调外机噪音大", "OTHER", "空调外机运行时噪音明显, 影响邻居"),
    ("墙面渗水发霉", "PUBLIC", "主卧外墙渗水, 内墙出现霉斑"),
    ("水表读数异常", "WATER_ELEC", "本月水费异常偏高, 怀疑水表故障"),
    ("地库照明灯损坏", "PUBLIC", "地下一层A区有3盏灯不亮"),
    ("阳台护栏松动", "PUBLIC", "阳台护栏有晃动, 存在安全隐患"),
    ("洗衣机进水管爆裂", "WATER_ELEC", "洗衣进水管接口爆裂, 已关闭总阀"),
    ("楼道感应门异响", "PUBLIC", "单元门开合时有刺耳摩擦声"),
    ("入户门禁卡失效", "PUBLIC", "门禁卡无法识别, 需要重新授权"),
    ("厨房排烟不畅", "OTHER", "油烟机排烟效果差, 疑似公共烟道堵塞"),
]
handlers = [("刘海涛", "13900001001"), ("陈国强", "13900001002"), ("赵建军", "13900001003"),
            ("孙志远", "13900001004"), ("周明华", "13900001005")]
repairs = []
rid = 1
pool = [o for o in owners if o[5] in ("OWNER", "TENANT")]
for i, (title, rtype, content) in enumerate(repair_titles):
    o = random.choice(pool)
    day_offset = random.randint(0, 58)
    cdate = TODAY - timedelta(days=day_offset)
    ctime = datetime(cdate.year, cdate.month, cdate.day, random.randint(8, 20), random.randint(0, 59))
    urgency = random.choice(["NORMAL", "NORMAL", "HIGH", "LOW", "URGENT"])
    # 状态按时间推移
    if day_offset > 20:
        status = random.choice(["FINISHED", "FINISHED", "FINISHED", "CLOSED"])
    elif day_offset > 8:
        status = random.choice(["FINISHED", "PROCESSING", "FINISHED"])
    elif day_offset > 3:
        status = random.choice(["PROCESSING", "ASSIGNED", "PENDING"])
    else:
        status = random.choice(["PENDING", "ASSIGNED", "PROCESSING"])
    handler = handler_phone = None
    assign_time = finish_time = None
    cost = 0.0
    rating = feedback = None
    if status != "PENDING":
        handler, handler_phone = random.choice(handlers)
        assign_time = (ctime + timedelta(hours=random.randint(1, 12))).strftime("%Y-%m-%d %H:%M:%S")
    if status in ("FINISHED", "CLOSED"):
        finish_time = (ctime + timedelta(hours=random.randint(6, 72))).strftime("%Y-%m-%d %H:%M:%S")
        cost = round(random.choice([0, 0, 30, 50, 80, 120, 150, 200, 280]), 2)
        rating = random.choice([5, 5, 5, 4, 4, 3])
        feedback = random.choice(["师傅很专业, 处理很快", "问题解决了, 满意", "响应及时, 服务态度好", "处理较快, 还可以", "等待时间稍长"])
    repairs.append([rid, f"BX{ctime.strftime('%Y%m%d')}{rid:04d}", o[0], o[1], o[3], o[6],
                    next((x[2] for x in houses if x[0] == o[6]), None), title, content, rtype, urgency, status,
                    handler, handler_phone, assign_time, finish_time, cost, rating, feedback, None,
                    ctime.strftime("%Y-%m-%d %H:%M:%S")])
    rid += 1
# 补充到 40 条
extra_titles = [("网络接口故障", "OTHER", "网线接口松动无法上网"), ("水龙头滴水", "WATER_ELEC", "厨房水龙头关不紧一直滴水"),
                ("纱窗破损", "DOOR_WINDOW", "客厅纱窗破了个洞需要更换"), ("地漏返味", "PLUMBING", "卫生间地漏反味严重"),
                ("墙面开裂", "PUBLIC", "客厅墙面出现细微裂缝"), ("门禁对讲机没声音", "PUBLIC", "对讲机有画面无声音"),
                ("车库卷帘门卡顿", "PUBLIC", "地库入口卷帘门升降不顺畅"), ("消防栓箱门锁坏", "PUBLIC", "楼道消防栓箱门锁损坏"),
                ("暖气不热", "WATER_ELEC", "供暖季暖气片不热"), ("阳台推拉门卡轨", "DOOR_WINDOW", "推拉门滑轨变形推不动"),
                ("楼道堆放杂物", "PUBLIC", "3楼楼道长期堆放杂物影响通行"), ("水压过低", "WATER_ELEC", "高层用水高峰水压不足"),
                ("马桶水箱漏水", "PLUMBING", "马桶水箱一直有水声"), ("厨房下水返水", "PLUMBING", "厨房下水道往上返水"),
                ("门铃不响", "WATER_ELEC", "入户门铃按下无反应"), ("电梯按钮失灵", "ELEVATOR", "电梯5楼按钮按下无反应"),
                ("玻璃门破碎", "PUBLIC", "单元门玻璃被撞碎"), ("楼下漏水至我家", "PLUMBING", "楼上卫生间漏水"),
                ("空调漏水", "OTHER", "空调室内机滴水"), ("电视信号差", "OTHER", "有线电视信号时断时续")]
while rid <= 40:
    title, rtype, content = random.choice(extra_titles)
    o = random.choice(pool)
    day_offset = random.randint(0, 58)
    cdate = TODAY - timedelta(days=day_offset)
    ctime = datetime(cdate.year, cdate.month, cdate.day, random.randint(8, 20), random.randint(0, 59))
    urgency = random.choice(["NORMAL", "NORMAL", "HIGH", "LOW", "URGENT"])
    if day_offset > 20:
        status = random.choice(["FINISHED", "FINISHED", "CLOSED"])
    elif day_offset > 8:
        status = random.choice(["FINISHED", "PROCESSING"])
    elif day_offset > 3:
        status = random.choice(["PROCESSING", "ASSIGNED", "PENDING"])
    else:
        status = random.choice(["PENDING", "ASSIGNED", "PROCESSING"])
    handler = handler_phone = assign_time = finish_time = None
    cost = 0.0
    rating = feedback = None
    if status != "PENDING":
        handler, handler_phone = random.choice(handlers)
        assign_time = (ctime + timedelta(hours=random.randint(1, 12))).strftime("%Y-%m-%d %H:%M:%S")
    if status in ("FINISHED", "CLOSED"):
        finish_time = (ctime + timedelta(hours=random.randint(6, 72))).strftime("%Y-%m-%d %H:%M:%S")
        cost = round(random.choice([0, 0, 30, 50, 80, 120, 150, 200]), 2)
        rating = random.choice([5, 5, 5, 4, 4, 3])
        feedback = random.choice(["师傅很专业, 处理很快", "问题解决了, 满意", "响应及时", "处理较快"])
    repairs.append([rid, f"BX{ctime.strftime('%Y%m%d')}{rid:04d}", o[0], o[1], o[3], o[6],
                    next((x[2] for x in houses if x[0] == o[6]), None), title, content, rtype, urgency, status,
                    handler, handler_phone, assign_time, finish_time, cost, rating, feedback, None,
                    ctime.strftime("%Y-%m-%d %H:%M:%S")])
    rid += 1
insert("repair_order", ["id", "order_no", "owner_id", "owner_name", "phone", "house_id", "house_no", "title",
                        "content", "repair_type", "urgency", "status", "handler", "handler_phone", "assign_time",
                        "finish_time", "cost", "rating", "feedback", "remark", "create_time"], repairs)

# ---------- 11. 投诉建议 ----------
complaint_data = [
    ("SERVICE", "物业前台态度问题", "8月10日前台工作人员对业主咨询答复不耐烦, 语气生硬"),
    ("NOISE", "楼上装修噪音扰民", "楼上住户周末装修, 电钻声持续一整天, 严重影响休息"),
    ("SANITARY", "垃圾清运不及时", "3号楼垃圾桶经常满溢, 夏天异味严重, 清运频率需要提高"),
    ("SAFETY", "单元门长期敞开", "2号楼单元门门禁损坏后一直敞开, 存在安全隐患"),
    ("PARKING", "访客车辆占用私家车位", "有外来车辆长期停在B1-015车位, 请物业处理"),
    ("SANITARY", "绿化带内宠物粪便", "小区绿化带内多处宠物粪便无人清理"),
    ("NOISE", "夜间施工噪音", "小区外道路夜间施工, 噪音大影响睡眠"),
    ("SERVICE", "报修响应太慢", "报修后两天才有人上门, 希望能提高响应速度"),
    ("SAFETY", "楼道消防通道被堵", "消防通道长期停放电动车, 存在安全隐患"),
    ("PARKING", "临街车位收费不透明", "小区外车位收费规则不清楚, 希望公示计费标准"),
    ("NOISE", "广场舞音乐过响", "晚间广场舞音量过大, 影响孩子写作业"),
    ("SANITARY", "楼道卫生差", "5号楼2单元楼道一周未打扫"),
    ("SERVICE", "建议增加快递柜", "小区快递量大, 建议在门口增设快递柜"),
    ("SAFETY", "地库照明太暗", "地下一层通道照明不足, 晚上停车看不清"),
    ("PARKING", "建议增设新能源充电桩", "小区新能源车增多, 建议增加充电桩"),
    ("SANITARY", "景观水池水质差", "中心景观水池发绿发臭, 建议定期换水"),
    ("SERVICE", "建议延长门岗服务时间", "希望北门岗亭开放时间延长到 24 点"),
    ("NOISE", "宠物犬吠叫扰民", "1号楼有住户养狗, 夜间频繁吠叫"),
    ("SAFETY", "监控盲区较多", "小区西南角无监控覆盖, 建议加装"),
    ("SERVICE", "建议开展社区活动", "希望物业多组织亲子类社区活动"),
]
complaints = []
cid = 1
for i, (ctype, title, content) in enumerate(complaint_data):
    o = random.choice(pool)
    day_offset = random.randint(0, 70)
    cdate = TODAY - timedelta(days=day_offset)
    ctime = datetime(cdate.year, cdate.month, cdate.day, random.randint(8, 21), random.randint(0, 59))
    if day_offset > 15:
        status = random.choice(["RESOLVED", "RESOLVED", "CLOSED"])
    elif day_offset > 5:
        status = random.choice(["RESOLVED", "PROCESSING"])
    else:
        status = random.choice(["PENDING", "PROCESSING"])
    handler = reply = handle_time = None
    if status != "PENDING":
        handler = random.choice(["王丽", "李强", "客服主管-张敏"])
        handle_time = (ctime + timedelta(days=random.randint(1, 5), hours=random.randint(1, 8))).strftime("%Y-%m-%d %H:%M:%S")
    if status in ("RESOLVED", "CLOSED"):
        reply = random.choice([
            "已安排相关负责人核实处理, 并对相关人员进行了沟通提醒, 感谢您的反馈。",
            "已联系当事住户协调, 现已停止扰民行为, 后续将持续跟进。",
            "已调整清运频次为每日两次, 并加强现场巡查, 感谢您的监督。",
            "已完成现场整改并张贴提示, 后续会加强巡查管理。",
            "已核实并处理完毕, 相关费用标准已在小区公示栏公示。",
        ])
    complaints.append([cid, f"TS{ctime.strftime('%Y%m%d')}{cid:04d}", o[0], o[1], o[3],
                       next((x[2] for x in houses if x[0] == o[6]), None), ctype, title, content, status,
                       handler, reply, handle_time, ctime.strftime("%Y-%m-%d %H:%M:%S")])
    cid += 1
insert("complaint", ["id", "complaint_no", "owner_id", "owner_name", "phone", "house_no", "complaint_type",
                     "title", "content", "status", "handler", "reply", "handle_time", "create_time"], complaints)

# ---------- 12. 通知公告 ----------
notices = [
    ("关于2026年9月物业服务费缴纳的通知", "各位业主:\n\n2026年9月物业服务费账单已生成, 请于9月25日前完成缴纳。可通过物业服务中心现场缴纳, 或使用小区APP在线缴纳。\n\n感谢您的支持与配合!", "NOTIFY", "物业服务中心", dt(2026, 9, 1, 9, 0), 1, 328),
    ("小区外临街停车区收费标准公示", "为进一步规范小区外临街停车区管理, 现将收费标准公示如下:\n\n1. 临时停车: 前30分钟免费, 超时首小时5元, 每超1小时加收3元, 24小时内封顶30元\n2. 月租车位: 150元/月\n\n公示期7天, 如有疑问请联系物业服务中心。", "URGENT", "物业服务中心", dt(2026, 9, 5, 10, 30), 1, 512),
    ("关于小区消防设施集中检查的通知", "为保障小区消防安全, 物业将于9月20日-9月22日对全小区消防设施进行集中检查, 期间可能需要进入部分楼层公共区域, 感谢配合。", "NOTIFY", "安全管理部", dt(2026, 9, 8, 14, 0), 0, 246),
    ("中秋社区活动报名开始啦", "值此中秋佳节, 物业将于9月28日18:00在小区中心广场举办\"月圆人团圆\"中秋游园会, 现场有猜灯谜、做月饼、露天电影等活动, 欢迎各位业主携家人参加! 报名请联系楼栋管家。", "ACTIVITY", "物业服务中心", dt(2026, 9, 10, 9, 30), 1, 689),
    ("3号楼2单元电梯维保停运通知", "3号楼2单元电梯将于9月18日9:00-12:00进行季度维保, 期间电梯暂停使用, 请业主提前安排出行, 给您带来不便敬请谅解。", "MAINTAIN", "工程维修部", dt(2026, 9, 12, 16, 0), 0, 178),
    ("关于开展秋季绿化养护的通知", "物业将于9月中下旬开展秋季绿化养护工作, 包括修剪树枝、补种草皮、施秋肥等, 施工期间请勿在绿化带附近停车。", "NOTIFY", "环境管理部", dt(2026, 9, 13, 11, 0), 0, 134),
    ("小区智能门禁系统升级完成", "小区智能门禁系统已完成升级, 现支持人脸识别、手机NFC刷卡、二维码开门三种方式。业主可前往物业服务中心或使用小区APP进行人脸录入。", "NOTIFY", "物业服务中心", dt(2026, 9, 14, 15, 20), 1, 421),
    ("关于加强小区电动车停放管理的通知", "近期发现部分电动车停放在楼道、消防通道内, 存在严重安全隐患。请各位业主将电动车停放至指定区域, 物业将于9月20日起对违规停放车辆进行清理。", "URGENT", "安全管理部", dt(2026, 9, 15, 9, 0), 1, 367),
    ("小区外临街停车区优惠月租活动", "即日起至10月31日, 办理小区外临街停车区月租车位可享首月立减50元优惠, 数量有限先到先得。办理地点: 物业服务中心。", "ACTIVITY", "物业服务中心", dt(2026, 9, 15, 14, 40), 0, 203),
    ("关于小区供水管道检修的通知", "接自来水公司通知, 9月22日8:00-17:00将对小区供水主管道进行检修, 期间全小区可能间歇性停水, 请各位业主提前储水。", "MAINTAIN", "工程维修部", dt(2026, 9, 16, 8, 30), 1, 156),
]
insert("notice", ["title", "content", "notice_type", "publisher", "publish_time", "top_flag", "view_count"], notices)

# ---------- 13. 访客登记 ----------
visitors = []
vid = 1
reasons = ["亲友探访", "快递送货", "家政保洁", "装修施工", "外卖配送", "看房", "维修上门", "商务洽谈"]
for i in range(45):
    day_offset = random.randint(0, 20)
    vdate = TODAY - timedelta(days=day_offset)
    vtime = datetime(vdate.year, vdate.month, vdate.day, random.randint(7, 21), random.randint(0, 59))
    o = random.choice(pool)
    is_in = (day_offset == 0 and random.random() < 0.45)
    leave = None if is_in else (vtime + timedelta(hours=random.randint(1, 6))).strftime("%Y-%m-%d %H:%M:%S")
    visitors.append([vid, cn_name(), phone(), o[0], o[1],
                     next((x[2] for x in houses if x[0] == o[6]), None),
                     random.choice(reasons),
                     car_plate() if random.random() < 0.45 else None,
                     vtime.strftime("%Y-%m-%d %H:%M:%S"), leave,
                     "IN" if is_in else "OUT", random.choice(["王丽", "李强", "门岗-赵刚"])])
    vid += 1
insert("visitor", ["id", "visitor_name", "phone", "visit_owner_id", "visit_owner", "house_no", "visit_reason",
                   "car_plate", "visit_time", "leave_time", "status", "register"], visitors)

# ---------- 14. 设备设施 ----------
equipments = []
eid = 1
equip_defs = []
for b in buildings[:5]:
    bno = b[1]
    equip_defs.append((f"{bno}1单元客梯", "ELEVATOR", f"{bno}1单元", "通力 KONE-1000", random.random() < 0.85))
    equip_defs.append((f"{bno}2单元客梯", "ELEVATOR", f"{bno}2单元", "通力 KONE-1000", random.random() < 0.85))
equip_defs += [
    ("生活水泵1号", "WATER_PUMP", "地下一层水泵房", "南方泵业 CDL32-40", True),
    ("生活水泵2号", "WATER_PUMP", "地下一层水泵房", "南方泵业 CDL32-40", True),
    ("消防水泵", "FIRE", "地下一层消防泵房", "上海连成 XBD", True),
    ("消防控制主机", "FIRE", "消防控制室", "海湾 JB-QB-GST5000", True),
    ("小区周界监控主机", "DOOR", "监控中心", "海康威视 DS-9600", True),
    ("南门门禁系统", "DOOR", "小区南门", "中控智慧 ZKTeco", True),
    ("北门门禁系统", "DOOR", "小区北门", "中控智慧 ZKTeco", True),
    ("地下车库道闸", "DOOR", "地库出入口", "捷顺 JS-9000", True),
    ("临街停车区道闸", "DOOR", "外街西口", "捷顺 JS-8000", False),
    ("小区路灯配电箱", "LIGHT", "小区北侧配电房", "正泰 NXBLE", True),
    ("地库照明回路A", "LIGHT", "地下一层A区", "雷士照明", True),
    ("健身区漫步机", "FITNESS", "中心广场健身区", "舒华 SH-5001", True),
    ("健身区太极推手", "FITNESS", "中心广场健身区", "舒华 SH-5002", False),
    ("儿童滑梯组合", "FITNESS", "儿童游乐区", "凯奇 KQ-8801", True),
    ("景观喷泉泵", "WATER_PUMP", "中心景观池", "格兰富 CR10", False),
]
for name, etype, loc, brand, normal in equip_defs:
    last = TODAY - timedelta(days=random.randint(5, 90))
    cycle = random.choice([15, 30, 30, 60, 90])
    equipments.append([eid, f"SB{eid:04d}", name, etype, loc, brand,
                       "NORMAL" if normal else random.choice(["REPAIR", "NORMAL"]),
                       d(random.randint(2015, 2022), random.randint(1, 12), random.randint(1, 28)),
                       cycle, last.strftime("%Y-%m-%d"), (last + timedelta(days=cycle)).strftime("%Y-%m-%d"),
                       random.choice(["刘海涛", "陈国强", "赵建军"]), None])
    eid += 1
insert("equipment", ["id", "equipment_no", "name", "equipment_type", "location", "brand", "status",
                     "buy_date", "maintain_cycle", "last_maintain", "next_maintain", "keeper", "remark"], equipments)

# ---- 15. 操作日志 (预置若干条, 便于首次进入「操作日志」页面即有内容) ----
_log_seed = [
    (1, "admin", "系统管理员", "ADMIN", "登录认证", "登录", "POST", "/auth/login", "[已脱敏]", "127.0.0.1", 1, None, 42),
    (1, "admin", "系统管理员", "ADMIN", "楼栋管理", "新增楼栋", "POST", "/building", '{"buildingNo":"7号楼","unitCount":2,"floorCount":11}', "127.0.0.1", 1, None, 63),
    (1, "admin", "系统管理员", "ADMIN", "房屋管理", "房屋入住登记", "POST", "/house/checkIn", '{"houseId":18,"ownerId":33}', "127.0.0.1", 1, None, 55),
    (2, "wuye01", "王丽", "STAFF", "登录认证", "登录", "POST", "/auth/login", "[已脱敏]", "127.0.0.1", 1, None, 38),
    (2, "wuye01", "王丽", "STAFF", "费用账单", "生成物业费账单", "POST", "/feeBill/generate/property", '{"period":"2026-09"}', "127.0.0.1", 1, None, 780),
    (2, "wuye01", "王丽", "STAFF", "费用账单", "账单缴费", "POST", "/feeBill/pay", '{"id":301,"payMethod":"WECHAT"}', "127.0.0.1", 1, None, 96),
    (3, "wuye02", "赵敏", "STAFF", "报修工单", "报修派单", "PUT", "/repair/assign", '{"id":12,"handler":"李师傅"}', "127.0.0.1", 1, None, 71),
    (3, "wuye02", "赵敏", "STAFF", "临时停车", "临时车入场登记", "POST", "/tempParking/entry", '{"plateNo":"苏A88K21"}', "127.0.0.1", 1, None, 49),
    (4, "baojie", "孙芳", "STAFF", "投诉建议", "投诉回复", "POST", "/complaint/reply", '{"id":7,"reply":"已安排保洁清理"}', "127.0.0.1", 1, None, 58),
    (5, "weixiu", "周强", "STAFF", "设备设施", "设备维保登记", "POST", "/equipment/maintain", '{"id":9}', "127.0.0.1", 1, None, 67),
    (6, "yeye01", "邹建华", "OWNER", "报修工单", "提交报修", "POST", "/repair", '{"houseId":1,"content":"厨房水管渗水"}', "127.0.0.1", 1, None, 84),
    (6, "yeye01", "邹建华", "OWNER", "访客管理", "访客离场核销", "POST", "/visitor/leave", '{"id":21}', "127.0.0.1", 1, None, 36),
    (1, "admin", "系统管理员", "ADMIN", "登录认证", "修改密码", "POST", "/auth/password", "[已脱敏]", "127.0.0.1", 1, None, 121),
    (2, "wuye01", "王丽", "STAFF", "车位管理", "车位分配", "POST", "/parking/allocate", '{"spaceId":44,"ownerId":57}', "127.0.0.1", 0, "车位已被占用", 33),
    (1, "admin", "系统管理员", "ADMIN", "登录认证", "注销", "POST", "/auth/logout", None, "127.0.0.1", 1, None, 12),
]
_log_rows = []
for i, (uid, un, rn, role, mod, act, mth, uri, prm, ip, st, err, cost) in enumerate(_log_seed):
    ts = (TODAY - timedelta(days=random.randint(0, 6))).strftime("%Y-%m-%d") + \
         " %02d:%02d:%02d" % (random.randint(8, 20), random.randint(0, 59), random.randint(0, 59))
    _log_rows.append((i + 1, uid, un, rn, role, mod, act, mth, uri, prm, ip, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", st, err, cost, ts))
insert("sys_log", ["id", "user_id", "username", "real_name", "role", "module", "action", "method",
                   "uri", "params", "ip", "user_agent", "status", "error_msg", "cost_ms", "create_time"], _log_rows)

# ============================================================
# 输出
# ============================================================
with open(OUT, "w", encoding="utf-8") as f:
    f.write("-- ============================================================\n")
    f.write("-- 物业管理系统 初始化脚本 (自动生成, 请勿手工修改)\n")
    f.write(f"-- 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    f.write("-- 账号: admin / 123456 (超级管理员, 密码以 BCrypt 密文入库)\n")
    f.write("-- ============================================================\n")
    f.write(DDL)
    f.write("\n\n-- ==================== 初始化数据 ====================\n")
    f.write("\n".join(SQL))
    f.write("\n\n-- 数据统计\n")
    for t in ["sys_user", "building", "house", "owner", "parking_space", "fee_standard",
              "fee_bill", "fee_payment", "temp_parking", "repair_order", "complaint", "notice", "visitor",
              "equipment", "sys_log"]:
        f.write(f"SELECT '{t}' AS 表名, COUNT(*) AS 记录数 FROM `{t}` UNION ALL\n")
    f.write("SELECT 'TOTAL', 0;\n")

stats = {
    "系统用户": len(users) + 2, "楼栋": len(buildings), "房屋": len(houses), "人员": len(owners),
    "车位": len(spaces), "收费标准": len(standards), "费用账单": len(bills), "缴费记录": len(payments),
    "临时停车": len(temps), "报修工单": len(repairs), "投诉建议": len(complaints),
    "通知公告": len(notices), "访客": len(visitors), "设备": len(equipments),
}
print(f"生成完成 -> {OUT}")
for k, v in stats.items():
    print(f"  {k}: {v}")
