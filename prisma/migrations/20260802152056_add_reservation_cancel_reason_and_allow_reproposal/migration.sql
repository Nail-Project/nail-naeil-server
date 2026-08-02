-- AlterTable
ALTER TABLE `reservations`
    ADD COLUMN `cancel_reason` VARCHAR(255) NULL;

-- CreateIndex
-- FK(reservations_proposal_id_fkey)가 항상 뒷받침 인덱스를 필요로 하므로,
-- 기존 UNIQUE 인덱스를 지우기 전에 대체 인덱스를 먼저 만든다.
CREATE INDEX `reservations_proposal_id_idx` ON `reservations`(`proposal_id`);

-- DropIndex
-- 취소된 예약은 같은 견적(proposal_id)으로 재예약을 허용하는 정책으로 바뀌면서
-- proposal_id 단위 유일성 제약을 DB 레벨에서 더 이상 강제하지 않는다.
-- (애플리케이션 레벨에서 "취소되지 않은 예약" 기준 중복만 막는다 - existsByProposalId 참고)
DROP INDEX `reservations_proposal_id_key` ON `reservations`;
