-- CreateTable
CREATE TABLE `StoreUser` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storeId` INTEGER NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'STAFF') NOT NULL DEFAULT 'ADMIN',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StoreUser_storeId_isActive_idx`(`storeId`, `isActive`),
    UNIQUE INDEX `StoreUser_storeId_email_key`(`storeId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StoreUser` ADD CONSTRAINT `StoreUser_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
