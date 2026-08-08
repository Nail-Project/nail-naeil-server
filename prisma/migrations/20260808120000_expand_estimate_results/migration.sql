ALTER TABLE `shops`
  ADD COLUMN `rating` DECIMAL(2, 1) NOT NULL DEFAULT 0.0,
  ADD COLUMN `review_count` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `business_hours` JSON NULL,
  ADD COLUMN `closed_days` JSON NULL;

ALTER TABLE `estimate_requests`
  ADD COLUMN `latitude` DECIMAL(10, 7) NULL,
  ADD COLUMN `longitude` DECIMAL(10, 7) NULL;

ALTER TABLE `estimate_responses`
  MODIFY COLUMN `base_price` INTEGER NULL,
  MODIFY COLUMN `removal_price` INTEGER NULL,
  MODIFY COLUMN `extra_price` INTEGER NULL,
  ADD COLUMN `estimated_duration_minutes` INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN `can_provide_service` BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN `is_removal_included` BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE `estimate_request_shops` (
  `request_id` INTEGER NOT NULL,
  `shop_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`request_id`, `shop_id`),
  INDEX `estimate_request_shops_shop_id_created_at_idx` (`shop_id`, `created_at`),
  CONSTRAINT `estimate_request_shops_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `estimate_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `estimate_request_shops_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
