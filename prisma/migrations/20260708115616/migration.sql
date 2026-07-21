/*
  Warnings:

  - You are about to alter the column `shop_id` on the `estimate_response` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.

*/
-- AlterTable
ALTER TABLE `estimate_response` MODIFY `shop_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `estimate_response` ADD CONSTRAINT `estimate_response_shop_id_fkey` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
