ALTER TABLE `estimate_responses`
    ADD CONSTRAINT `estimate_responses_request_id_shop_id_key`
        UNIQUE (`request_id`, `shop_id`);
