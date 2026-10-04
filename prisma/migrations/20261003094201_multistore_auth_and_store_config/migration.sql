/*
  Warnings:

  - Made the column `freeDeliveryThreshold` on table `store_settings` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `audit_log` DROP FOREIGN KEY `audit_log_storeId_fkey`;

-- AlterTable
ALTER TABLE `audit_log` MODIFY `actorType` ENUM('SUPER_ADMIN', 'STORE_USER', 'SYSTEM') NOT NULL;

-- AlterTable
ALTER TABLE `store_profile` ADD COLUMN `province` VARCHAR(120) NULL,
    ADD COLUMN `refundPolicy` TEXT NULL,
    ADD COLUMN `returnsPolicy` TEXT NULL,
    ADD COLUMN `supportEmail` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `store_settings` ADD COLUMN `allowPickup` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `bankTransfer` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `cardPayment` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `cashOnDelivery` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `deliveryCharge` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `heroOfferPercent` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `islandwideDelivery` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `minimumOrder` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `onlinePayment` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `freeDeliveryThreshold` DECIMAL(12, 2) NOT NULL DEFAULT 5000;

-- AlterTable
ALTER TABLE `store_theme` ADD COLUMN `buttonStyle` VARCHAR(40) NOT NULL DEFAULT 'ROUNDED',
    ADD COLUMN `headerStyle` VARCHAR(40) NOT NULL DEFAULT 'CLASSIC';

-- CreateTable
CREATE TABLE `app_session` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tokenHash` VARCHAR(64) NOT NULL,
    `storeUserId` INTEGER NULL,
    `superAdminId` INTEGER NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `app_session_tokenHash_key`(`tokenHash`),
    INDEX `app_session_storeUserId_expiresAt_idx`(`storeUserId`, `expiresAt`),
    INDEX `app_session_superAdminId_expiresAt_idx`(`superAdminId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `app_session` ADD CONSTRAINT `app_session_storeUserId_fkey` FOREIGN KEY (`storeUserId`) REFERENCES `store_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `app_session` ADD CONSTRAINT `app_session_superAdminId_fkey` FOREIGN KEY (`superAdminId`) REFERENCES `super_admin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
