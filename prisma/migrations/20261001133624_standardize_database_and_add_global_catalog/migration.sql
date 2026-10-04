/*
  Warnings:

  - You are about to drop the `deliveryzone` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orderitem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `productimage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `storeuser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `category` DROP FOREIGN KEY `Category_parentId_fkey`;

-- DropForeignKey
ALTER TABLE `category` DROP FOREIGN KEY `Category_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `customer` DROP FOREIGN KEY `Customer_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `deliveryzone` DROP FOREIGN KEY `DeliveryZone_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_customerId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_deliveryZoneId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `orderitem` DROP FOREIGN KEY `OrderItem_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `orderitem` DROP FOREIGN KEY `OrderItem_productId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `productimage` DROP FOREIGN KEY `ProductImage_productId_fkey`;

-- DropForeignKey
ALTER TABLE `storeuser` DROP FOREIGN KEY `StoreUser_storeId_fkey`;

-- DropIndex
DROP INDEX `Order_deliveryZoneId_fkey` ON `order`;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `globalProductId` INTEGER NULL;

-- DropTable
DROP TABLE `deliveryzone`;

-- DropTable
DROP TABLE `orderitem`;

-- DropTable
DROP TABLE `productimage`;

-- DropTable
DROP TABLE `storeuser`;

-- CreateTable
CREATE TABLE `product_image` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `imageUrl` VARCHAR(1000) NOT NULL,
    `altText` VARCHAR(255) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_image_productId_sortOrder_idx`(`productId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `global_product` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `barcode` VARCHAR(50) NOT NULL,
    `brand` VARCHAR(150) NULL,
    `name` VARCHAR(200) NOT NULL,
    `shortDescription` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `global_product_barcode_key`(`barcode`),
    INDEX `global_product_name_idx`(`name`),
    INDEX `global_product_brand_idx`(`brand`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_zone` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storeId` INTEGER NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(500) NULL,
    `charge` DECIMAL(12, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `delivery_zone_storeId_isActive_idx`(`storeId`, `isActive`),
    UNIQUE INDEX `delivery_zone_storeId_name_key`(`storeId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `productId` INTEGER NULL,
    `productName` VARCHAR(200) NOT NULL,
    `sku` VARCHAR(100) NULL,
    `imageUrl` VARCHAR(1000) NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `lineTotal` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_item_orderId_idx`(`orderId`),
    INDEX `order_item_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `store_user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storeId` INTEGER NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'STAFF') NOT NULL DEFAULT 'ADMIN',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `store_user_storeId_isActive_idx`(`storeId`, `isActive`),
    UNIQUE INDEX `store_user_storeId_email_key`(`storeId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `product_globalProductId_idx` ON `product`(`globalProductId`);

-- AddForeignKey
ALTER TABLE `category` ADD CONSTRAINT `category_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category` ADD CONSTRAINT `category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_globalProductId_fkey` FOREIGN KEY (`globalProductId`) REFERENCES `global_product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_image` ADD CONSTRAINT `product_image_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer` ADD CONSTRAINT `customer_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_zone` ADD CONSTRAINT `delivery_zone_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_deliveryZoneId_fkey` FOREIGN KEY (`deliveryZoneId`) REFERENCES `delivery_zone`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `store_user` ADD CONSTRAINT `store_user_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `category` RENAME INDEX `Category_parentId_idx` TO `category_parentId_idx`;

-- RenameIndex
ALTER TABLE `category` RENAME INDEX `Category_storeId_isActive_idx` TO `category_storeId_isActive_idx`;

-- RenameIndex
ALTER TABLE `category` RENAME INDEX `Category_storeId_slug_key` TO `category_storeId_slug_key`;

-- RenameIndex
ALTER TABLE `customer` RENAME INDEX `Customer_storeId_email_key` TO `customer_storeId_email_key`;

-- RenameIndex
ALTER TABLE `customer` RENAME INDEX `Customer_storeId_name_idx` TO `customer_storeId_name_idx`;

-- RenameIndex
ALTER TABLE `customer` RENAME INDEX `Customer_storeId_phone_idx` TO `customer_storeId_phone_idx`;

-- RenameIndex
ALTER TABLE `order` RENAME INDEX `Order_customerId_idx` TO `order_customerId_idx`;

-- RenameIndex
ALTER TABLE `order` RENAME INDEX `Order_storeId_orderNumber_key` TO `order_storeId_orderNumber_key`;

-- RenameIndex
ALTER TABLE `order` RENAME INDEX `Order_storeId_paymentStatus_idx` TO `order_storeId_paymentStatus_idx`;

-- RenameIndex
ALTER TABLE `order` RENAME INDEX `Order_storeId_status_createdAt_idx` TO `order_storeId_status_createdAt_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_storeId_categoryId_idx` TO `product_storeId_categoryId_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_storeId_isFeatured_idx` TO `product_storeId_isFeatured_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_storeId_sku_key` TO `product_storeId_sku_key`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_storeId_slug_key` TO `product_storeId_slug_key`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_storeId_status_isAvailable_idx` TO `product_storeId_status_isAvailable_idx`;

-- RenameIndex
ALTER TABLE `store` RENAME INDEX `Store_isActive_idx` TO `store_isActive_idx`;

-- RenameIndex
ALTER TABLE `store` RENAME INDEX `Store_slug_key` TO `store_slug_key`;
