CREATE TABLE `estimate_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('TEMPORARY', 'REQUESTED', 'CLOSED') NOT NULL DEFAULT 'TEMPORARY',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `estimate_responses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NOT NULL,
    `shop_id` INTEGER NOT NULL,
    `total_price` INTEGER NOT NULL,
    `base_price` INTEGER NOT NULL,
    `removal_price` INTEGER NOT NULL DEFAULT 0,
    `extra_price` INTEGER NOT NULL DEFAULT 0,
    `memo` TEXT NULL,
    `status` ENUM('SUBMITTED', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sms_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `message_id` VARCHAR(100) NOT NULL,
    `direction` ENUM('OUTBOUND', 'INBOUND') NOT NULL,
    `raw_payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'PARSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `error_message` TEXT NULL,
    `request_id` INTEGER NULL,
    `shop_id` INTEGER NULL,
    `estimate_response_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `shop_proposal_times` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proposal_id` INTEGER NOT NULL,
    `proposal_datetime` DATETIME(3) NOT NULL,
    `is_selected` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `estimate_responses`
    ADD CONSTRAINT `estimate_responses_request_id_fkey`
    FOREIGN KEY (`request_id`) REFERENCES `estimate_requests`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `estimate_responses`
    ADD CONSTRAINT `estimate_responses_shop_id_fkey`
    FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `shop_proposal_times`
    ADD CONSTRAINT `shop_proposal_times_proposal_id_fkey`
    FOREIGN KEY (`proposal_id`) REFERENCES `estimate_responses`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `sms_messages`
    ADD CONSTRAINT `sms_messages_request_id_fkey`
    FOREIGN KEY (`request_id`) REFERENCES `estimate_requests`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `sms_messages`
    ADD CONSTRAINT `sms_messages_shop_id_fkey`
    FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `sms_messages`
    ADD CONSTRAINT `sms_messages_estimate_response_id_fkey`
    FOREIGN KEY (`estimate_response_id`) REFERENCES `estimate_responses`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
