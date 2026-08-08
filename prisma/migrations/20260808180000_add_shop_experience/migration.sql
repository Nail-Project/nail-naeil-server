ALTER TABLE `shops`
  ADD COLUMN `thumbnail_image_url` VARCHAR(500) NULL;

CREATE TABLE `wish_shops` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `shop_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `wish_shops_shop_id_user_id_key` (`shop_id`, `user_id`),
  INDEX `wish_shops_user_id_created_at_id_idx` (`user_id`, `created_at`, `id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `wish_shops_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `wish_shops_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `shop_reviews` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `shop_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `rating` INTEGER NOT NULL,
  `content` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `shop_reviews_shop_id_user_id_key` (`shop_id`, `user_id`),
  INDEX `shop_reviews_shop_id_created_at_id_idx` (`shop_id`, `created_at`, `id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `shop_reviews_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `shop_reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `shop_reviews_rating_check` CHECK (`rating` BETWEEN 1 AND 5)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
