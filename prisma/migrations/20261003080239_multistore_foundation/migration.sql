/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `store_user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `store_user` ADD COLUMN `username` VARCHAR(100) NULL;

-- CreateTable
CREATE TABLE `store_profile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storeId` INTEGER NOT NULL,
    `businessName` VARCHAR(200) NULL,
    `displayName` VARCHAR(150) NULL,
    `tagline` VARCHAR(300) NULL,
    `description` TEXT NULL,
    `logoUrl` VARCHAR(500) NULL,
    `faviconUrl` VARCHAR(500) NULL,
    `phone` VARCHAR(40) NULL,
    `whatsapp` VARCHAR(40) NULL,
    `email` VARCHAR(191) NULL,
    `addressLine1` VARCHAR(255) NULL,
    `addressLine2` VARCHAR(255) NULL,
    `city` VARCHAR(120) NULL,
    `district` VARCHAR(120) NULL,
    `postalCode` VARCHAR(30) NULL,
    `country` VARCHAR(100) NULL,
    `businessHours` JSON NULL,
    `facebookUrl` VARCHAR(500) NULL,
    `instagramUrl` VARCHAR(500) NULL,
    `tiktokUrl` VARCHAR(500) NULL,
    `youtubeUrl` VARCHAR(500) NULL,
    `websiteUrl` VARCHAR(500) NULL,
    `aboutText` TEXT NULL,
    `shippingPolicy` TEXT NULL,
    `returnPolicy` TEXT NULL,
    `privacyPolicy` TEXT NULL,
    `termsText` TEXT NULL,
    `faqText` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `store_profile_storeId_key`(`storeId`),
    INDEX `store_profile_storeId_idx`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `store_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storeId` INTEGER NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'LKR',
    `deliveryEnabled` BOOLEAN NOT NULL DEFAULT true,
    `pickupEnabled` BOOLEAN NOT NULL DEFAULT false,
    `freeDeliveryEnabled` BOOLEAN NOT NULL DEFAULT false,
    `freeDeliveryThreshold` DECIMAL(12, 2) NULL,
    `minimumOrderEnabled` BOOLEAN NOT NULL DEFAULT false,
    `minimumOrderAmount` DECIMAL(12, 2) NULL,
    `cashOnDeliveryEnabled` BOOLEAN NOT NULL DEFAULT true,
    `bankTransferEnabled` BOOLEAN NOT NULL DEFAULT true,
    `taxEnabled` BOOLEAN NOT NULL DEFAULT false,
    `taxPercent` DECIMAL(5, 2) NULL,
    `defaultDeliveryMethod` ENUM('DELIVERY', 'PICKUP') NOT NULL DEFAULT 'DELIVERY',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `store_settings_storeId_key`(`storeId`),
    INDEX `store_settings_storeId_idx`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `store_theme` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storeId` INTEGER NOT NULL,
    `template` ENUM('MODERN', 'CLASSIC', 'MINIMAL') NOT NULL DEFAULT 'MODERN',
    `primaryColor` VARCHAR(20) NOT NULL DEFAULT '#d71920',
    `secondaryColor` VARCHAR(20) NOT NULL DEFAULT '#111111',
    `accentColor` VARCHAR(20) NOT NULL DEFAULT '#f5c542',
    `backgroundColor` VARCHAR(20) NOT NULL DEFAULT '#ffffff',
    `surfaceColor` VARCHAR(20) NOT NULL DEFAULT '#f5f5f5',
    `textColor` VARCHAR(20) NOT NULL DEFAULT '#111111',
    `mutedColor` VARCHAR(20) NOT NULL DEFAULT '#6b7280',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `store_theme_storeId_key`(`storeId`),
    INDEX `store_theme_storeId_idx`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_slide` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storeId` INTEGER NOT NULL,
    `imageUrl` VARCHAR(1000) NOT NULL,
    `eyebrow` VARCHAR(150) NULL,
    `title` VARCHAR(200) NULL,
    `accentText` VARCHAR(200) NULL,
    `description` VARCHAR(500) NULL,
    `buttonText` VARCHAR(100) NULL,
    `buttonUrl` VARCHAR(500) NULL,
    `offerPercent` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `hero_slide_storeId_sortOrder_idx`(`storeId`, `sortOrder`),
    INDEX `hero_slide_storeId_isActive_idx`(`storeId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `super_admin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `super_admin_username_key`(`username`),
    UNIQUE INDEX `super_admin_email_key`(`email`),
    INDEX `super_admin_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storeId` INTEGER NULL,
    `actorType` ENUM('SUPER_ADMIN', 'STORE_USER') NOT NULL,
    `storeUserId` INTEGER NULL,
    `superAdminId` INTEGER NULL,
    `module` VARCHAR(100) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity` VARCHAR(100) NULL,
    `entityId` VARCHAR(100) NULL,
    `description` TEXT NOT NULL,
    `metadata` JSON NULL,
    `ipAddress` VARCHAR(100) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_log_storeId_createdAt_idx`(`storeId`, `createdAt`),
    INDEX `audit_log_storeId_module_createdAt_idx`(`storeId`, `module`, `createdAt`),
    INDEX `audit_log_storeId_actorType_createdAt_idx`(`storeId`, `actorType`, `createdAt`),
    INDEX `audit_log_storeUserId_createdAt_idx`(`storeUserId`, `createdAt`),
    INDEX `audit_log_superAdminId_createdAt_idx`(`superAdminId`, `createdAt`),
    INDEX `audit_log_entity_entityId_idx`(`entity`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `store_user_username_key` ON `store_user`(`username`);

-- AddForeignKey
ALTER TABLE `store_profile` ADD CONSTRAINT `store_profile_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `store_settings` ADD CONSTRAINT `store_settings_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `store_theme` ADD CONSTRAINT `store_theme_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hero_slide` ADD CONSTRAINT `hero_slide_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_storeUserId_fkey` FOREIGN KEY (`storeUserId`) REFERENCES `store_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_superAdminId_fkey` FOREIGN KEY (`superAdminId`) REFERENCES `super_admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
