CREATE DATABASE IF NOT EXISTS fangzhibao_suppliers_mgmt;

use fangzhibao_suppliers_mgmt;

CREATE TABLE IF NOT EXISTS `supplier_store` (
  `store_id` INT NOT NULL COMMENT '门店ID',
  `supplier_name` VARCHAR(100) NOT NULL COMMENT '供应商',
  `store_name` VARCHAR(100) NOT NULL COMMENT '门店名称',
  `store_no` VARCHAR(50) NOT NULL COMMENT '档口号',
  `supplier_type` VARCHAR(50) NOT NULL COMMENT '供应商类型',
  `is_other_take_good` VARCHAR(10) NOT NULL COMMENT '是否开启代拿',
  `is_using_user_express` VARCHAR(10) NOT NULL COMMENT '直发订单开启用户快递',
  `is_push_and_print` VARCHAR(10) NOT NULL COMMENT '自动推送订单打印',
  `is_syncing_to_supplier` VARCHAR(10) NOT NULL COMMENT '待拿货数据同步供应商',
  `allow_to_change_price` VARCHAR(10) NOT NULL COMMENT '允许改价',
  `payment_point` VARCHAR(50) NOT NULL COMMENT '采购付款节点',
  `contact_phone` VARCHAR(20) NOT NULL COMMENT '联系电话',
  `store_address` VARCHAR(200) NOT NULL COMMENT '门店地址',
  `section_code` VARCHAR(20) NULL COMMENT '区域编码',
  `store_sequence` INT NULL COMMENT '门店顺序',
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`store_id`),
  INDEX `idx_supplier_name` (`supplier_name`),
  INDEX `idx_store_no` (`store_no`),
  INDEX `idx_store_address` (`store_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商管理';