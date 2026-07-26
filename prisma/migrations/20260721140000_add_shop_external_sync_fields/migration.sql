ALTER TABLE `shops`
    ADD COLUMN `data_source` VARCHAR(30) NULL,
    ADD COLUMN `external_store_id` VARCHAR(50) NULL,
    ADD COLUMN `industry_code` VARCHAR(20) NULL,
    ADD COLUMN `industry_name` VARCHAR(100) NULL,
    ADD COLUMN `is_data_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `last_synced_at` DATETIME(3) NULL;

CREATE UNIQUE INDEX `shops_data_source_external_store_id_key`
    ON `shops`(`data_source`, `external_store_id`);
