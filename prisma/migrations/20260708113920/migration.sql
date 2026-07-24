-- CreateTable
CREATE TABLE `estimate_response` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `total_price` INTEGER NULL,
    `base_price` INTEGER NULL,
    `removal_price` INTEGER NULL,
    `extra_price` INTEGER NULL,
    `request_id` BIGINT NOT NULL,
    `shop_id` BIGINT NOT NULL,
    `memo` TEXT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shop_proposal_time` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `proposal_id` BIGINT NOT NULL,
    `proposal_datetime` DATETIME(3) NULL,
    `is_selected` BOOLEAN NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `estimate_response` ADD CONSTRAINT `estimate_response_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `estimate_request`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shop_proposal_time` ADD CONSTRAINT `shop_proposal_time_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `estimate_response`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
