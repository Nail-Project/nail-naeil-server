ALTER TABLE `sms_messages`
    ADD COLUMN `source` VARCHAR(100) NOT NULL,
    ADD CONSTRAINT `sms_messages_source_direction_message_id_key`
        UNIQUE (`source`, `direction`, `message_id`);
