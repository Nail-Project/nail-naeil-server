-- AlterTable
ALTER TABLE `estimate_requests` ADD COLUMN `design_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `estimate_requests_design_id_idx` ON `estimate_requests`(`design_id`);

-- AddForeignKey
ALTER TABLE `estimate_requests` ADD CONSTRAINT `estimate_requests_design_id_fkey` FOREIGN KEY (`design_id`) REFERENCES `designs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
