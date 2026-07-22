ALTER TABLE `shops`
    DROP COLUMN `industry_code`,
    DROP COLUMN `industry_name`,
    ADD COLUMN `province_code` VARCHAR(10) NULL,
    ADD COLUMN `province_name` VARCHAR(50) NULL,
    ADD COLUMN `district_code` VARCHAR(10) NULL,
    ADD COLUMN `district_name` VARCHAR(50) NULL,
    ADD COLUMN `admin_dong_code` VARCHAR(20) NULL,
    ADD COLUMN `admin_dong_name` VARCHAR(50) NULL;

CREATE INDEX `shops_province_code_district_code_admin_dong_code_idx`
    ON `shops`(`province_code`, `district_code`, `admin_dong_code`);
