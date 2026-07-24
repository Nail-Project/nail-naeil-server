-- CreateTable
CREATE TABLE `estimate_request` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nail_type` ENUM('HAND', 'PEDICURE', 'BOTH') NOT NULL,
    `removal_type` ENUM('EXTENSION', 'PARTS', 'BASIC', 'NONE') NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `preferred_time` ENUM('AM', 'PM', 'EVENING', 'ANY') NOT NULL,
    `description` TEXT NULL,
    `recommend_type` ENUM('BALANCED', 'CLOSE', 'WIDE', 'CHEAP') NOT NULL,
    `status` ENUM('MATCHING', 'COMPLETED', 'EXPIRED') NOT NULL DEFAULT 'MATCHING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `user_id` BIGINT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_image` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `image_url` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `request_id` BIGINT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `request_image` ADD CONSTRAINT `request_image_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `estimate_request`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
