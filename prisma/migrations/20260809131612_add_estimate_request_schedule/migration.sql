/*
  Warnings:

  - You are about to drop the column `end_date` on the `estimate_requests` table. All the data in the column will be lost.
  - You are about to drop the column `preferred_time` on the `estimate_requests` table. All the data in the column will be lost.
  - You are about to drop the column `removal_type` on the `estimate_requests` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `estimate_requests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `estimate_requests` DROP COLUMN `end_date`,
    DROP COLUMN `preferred_time`,
    DROP COLUMN `removal_type`,
    DROP COLUMN `start_date`;

-- CreateTable
CREATE TABLE `estimate_request_schedules` (
    `request_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `time` ENUM('AM', 'PM', 'EVENING', 'ANY') NOT NULL,

    PRIMARY KEY (`request_id`, `date`, `time`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estimate_request_removals` (
    `request_id` INTEGER NOT NULL,
    `removal_type` ENUM('EXTENSION', 'PARTS', 'BASIC', 'NONE') NOT NULL,

    PRIMARY KEY (`request_id`, `removal_type`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `estimate_request_schedules` ADD CONSTRAINT `estimate_request_schedules_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `estimate_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estimate_request_removals` ADD CONSTRAINT `estimate_request_removals_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `estimate_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
