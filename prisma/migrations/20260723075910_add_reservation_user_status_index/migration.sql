-- CreateIndex
CREATE INDEX `reservations_user_id_status_reserved_at_idx` ON `reservations`(`user_id`, `status`, `reserved_at`);
