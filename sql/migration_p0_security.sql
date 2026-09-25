-- =====================================================================
-- P0 安全加固 迁移脚本（增量，可重复执行）
--
--   1. sys_user 增加 token_version：改密/禁用后自增，使旧 JWT 立即失效
--   2. 新建 sys_log 操作日志表（由 OperationLogInterceptor 自动写入）
--   3. 预置若干条操作日志，便于首次进入「操作日志」页面即有内容
--
-- 用法：mysql -u root -p < sql/migration_p0_security.sql
--   已执行过 1-初始化数据库.bat（导入完整 property_db.sql）的环境不必再跑本脚本。
-- =====================================================================

USE `property_db`;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'property_db' AND TABLE_NAME = 'sys_user' AND COLUMN_NAME = 'token_version'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `sys_user` ADD COLUMN `token_version` INT NOT NULL DEFAULT 1 COMMENT ''令牌版本: 改密/禁用后自增, 使已签发的旧令牌立即失效'' AFTER `last_login`',
  'SELECT ''sys_user.token_version 已存在, 跳过'' AS notice');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `sys_log` (
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
