-- DropIndex
DROP INDEX `estimate_responses_request_id_fkey` ON `estimate_responses`;

-- DropIndex
DROP INDEX `sms_messages_request_id_fkey` ON `sms_messages`;

-- CreateTable
CREATE TABLE `reservations` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `proposal_id` INTEGER NOT NULL,
    `user_id` BIGINT NOT NULL,
    `reserved_at` DATETIME(3) NOT NULL,
    `status` ENUM('CONFIRMED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `reservations_proposal_id_key`(`proposal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `estimate_responses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
