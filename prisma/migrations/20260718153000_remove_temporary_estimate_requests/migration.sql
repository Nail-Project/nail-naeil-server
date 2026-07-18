ALTER TABLE `estimate_responses`
    DROP FOREIGN KEY `estimate_responses_request_id_fkey`;

ALTER TABLE `sms_messages`
    DROP FOREIGN KEY `sms_messages_request_id_fkey`;

DROP TABLE `estimate_requests`;
