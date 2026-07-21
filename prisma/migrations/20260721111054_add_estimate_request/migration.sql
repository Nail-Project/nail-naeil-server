/*
  Warnings:

  - You are about to drop the `estimate_request` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `estimate_response` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `request_image` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shop_proposal_time` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `estimate_response` DROP FOREIGN KEY `estimate_response_request_id_fkey`;

-- DropForeignKey
ALTER TABLE `estimate_response` DROP FOREIGN KEY `estimate_response_shop_id_fkey`;

-- DropForeignKey
ALTER TABLE `request_image` DROP FOREIGN KEY `request_image_request_id_fkey`;

-- DropForeignKey
ALTER TABLE `shop_proposal_time` DROP FOREIGN KEY `shop_proposal_time_proposal_id_fkey`;

-- DropIndex
DROP INDEX `estimate_responses_request_id_fkey` ON `estimate_responses`;

-- DropIndex
DROP INDEX `sms_messages_request_id_fkey` ON `sms_messages`;

-- DropTable
DROP TABLE `estimate_request`;

-- DropTable
DROP TABLE `estimate_response`;

-- DropTable
DROP TABLE `request_image`;

-- DropTable
DROP TABLE `shop_proposal_time`;

-- CreateTable
CREATE TABLE `estimate_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nail_type` ENUM('HAND', 'PEDICURE', 'BOTH') NOT NULL,
    `removal_type` ENUM('EXTENSION', 'PARTS', 'BASIC', 'NONE') NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `preferred_time` ENUM('AM', 'PM', 'EVENING', 'ANY') NOT NULL,
    `recommend_type` ENUM('BALANCED', 'CLOSE', 'WIDE', 'CHEAP') NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('MATCHING', 'COMPLETED', 'EXPIRED') NOT NULL DEFAULT 'MATCHING',
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `image_url` VARCHAR(255) NOT NULL,
    `request_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `estimate_responses` ADD CONSTRAINT `estimate_responses_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `estimate_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sms_messages` ADD CONSTRAINT `sms_messages_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `estimate_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_images` ADD CONSTRAINT `request_images_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `estimate_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
