-- AlterTable
-- 기존 extra_price 값을 design_extra_price로 그대로 이어받는다(RENAME, 데이터 보존).
-- option_extra_price는 신규 컬럼으로 기존 row는 전부 NULL.
ALTER TABLE `estimate_responses`
    RENAME COLUMN `extra_price` TO `design_extra_price`,
    ADD COLUMN `option_extra_price` INTEGER NULL;
