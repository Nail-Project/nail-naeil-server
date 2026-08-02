-- AddForeignKey
ALTER TABLE `wish_designs` ADD CONSTRAINT `wish_designs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
