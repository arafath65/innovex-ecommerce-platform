-- AlterTable
ALTER TABLE `order_item` ADD COLUMN `variantId` INTEGER NULL,
    ADD COLUMN `variantOptions` JSON NULL,
    ADD COLUMN `variantTitle` VARCHAR(300) NULL;

-- CreateTable
CREATE TABLE `store_product_attribute` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storeId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `type` ENUM('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT') NOT NULL DEFAULT 'TEXT',
    `options` JSON NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    `isFilterable` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `store_product_attribute_storeId_isActive_sortOrder_idx`(`storeId`, `isActive`, `sortOrder`),
    UNIQUE INDEX `store_product_attribute_storeId_name_key`(`storeId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_attribute_value` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `attributeId` INTEGER NOT NULL,
    `value` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `product_attribute_value_attributeId_idx`(`attributeId`),
    UNIQUE INDEX `product_attribute_value_productId_attributeId_key`(`productId`, `attributeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_option` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `product_option_productId_sortOrder_idx`(`productId`, `sortOrder`),
    UNIQUE INDEX `product_option_productId_name_key`(`productId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_option_value` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `optionId` INTEGER NOT NULL,
    `value` VARCHAR(150) NOT NULL,
    `colorCode` VARCHAR(20) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `product_option_value_optionId_sortOrder_idx`(`optionId`, `sortOrder`),
    UNIQUE INDEX `product_option_value_optionId_value_key`(`optionId`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_variant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storeId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `sku` VARCHAR(100) NULL,
    `barcode` VARCHAR(100) NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `compareAtPrice` DECIMAL(12, 2) NULL,
    `stockQuantity` INTEGER NOT NULL DEFAULT 0,
    `trackInventory` BOOLEAN NOT NULL DEFAULT true,
    `lowStockThreshold` INTEGER NULL,
    `imageUrl` VARCHAR(1000) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `product_variant_storeId_productId_isAvailable_idx`(`storeId`, `productId`, `isAvailable`),
    INDEX `product_variant_productId_isDefault_idx`(`productId`, `isDefault`),
    UNIQUE INDEX `product_variant_storeId_sku_key`(`storeId`, `sku`),
    UNIQUE INDEX `product_variant_storeId_barcode_key`(`storeId`, `barcode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_variant_option_value` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `variantId` INTEGER NOT NULL,
    `optionValueId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_variant_option_value_optionValueId_idx`(`optionValueId`),
    UNIQUE INDEX `product_variant_option_value_variantId_optionValueId_key`(`variantId`, `optionValueId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `store_product_attribute` ADD CONSTRAINT `store_product_attribute_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_attribute_value` ADD CONSTRAINT `product_attribute_value_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_attribute_value` ADD CONSTRAINT `product_attribute_value_attributeId_fkey` FOREIGN KEY (`attributeId`) REFERENCES `store_product_attribute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_option` ADD CONSTRAINT `product_option_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_option_value` ADD CONSTRAINT `product_option_value_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `product_option`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variant` ADD CONSTRAINT `product_variant_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variant` ADD CONSTRAINT `product_variant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variant_option_value` ADD CONSTRAINT `product_variant_option_value_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variant_option_value` ADD CONSTRAINT `product_variant_option_value_optionValueId_fkey` FOREIGN KEY (`optionValueId`) REFERENCES `product_option_value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create a default variant for each existing product.
-- Inventory tracking stays disabled until stock is configured.

INSERT INTO `product_variant` (
    `storeId`,
    `productId`,
    `title`,
    `sku`,
    `price`,
    `compareAtPrice`,
    `stockQuantity`,
    `trackInventory`,
    `isDefault`,
    `isAvailable`,
    `sortOrder`,
    `createdAt`,
    `updatedAt`
)
SELECT
    p.`storeId`,
    p.`id`,
    p.`name`,
    p.`sku`,
    p.`price`,
    p.`compareAtPrice`,
    0,
    FALSE,
    TRUE,
    p.`isAvailable`,
    0,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `product` AS p;
