-- AlterTable
ALTER TABLE `reservations` MODIFY COLUMN `user_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
