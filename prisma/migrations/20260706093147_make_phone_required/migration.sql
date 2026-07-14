/*
  Warnings:

  - Made the column `phone_number` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `users` MODIFY `phone_number` VARCHAR(20) NOT NULL;
