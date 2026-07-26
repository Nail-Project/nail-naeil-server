/*
  Warnings:

  - You are about to drop the column `kakao_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `login_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `users_email_key` ON `users`;

-- DropIndex
DROP INDEX `users_kakao_id_key` ON `users`;

-- DropIndex
DROP INDEX `users_login_id_key` ON `users`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `kakao_id`,
    DROP COLUMN `login_id`,
    DROP COLUMN `password`,
    ADD COLUMN `nickname` VARCHAR(100) NULL,
    MODIFY `email` VARCHAR(100) NULL,
    MODIFY `phone_number` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `user_auth_providers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `provider` ENUM('LOCAL', 'KAKAO', 'NAVER') NOT NULL,
    `provider_id` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_auth_providers_user_id_idx`(`user_id`),
    UNIQUE INDEX `user_auth_providers_provider_provider_id_key`(`provider`, `provider_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_auth_providers` ADD CONSTRAINT `user_auth_providers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
