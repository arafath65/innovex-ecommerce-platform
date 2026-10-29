-- CreateTable
CREATE TABLE `product_variant_image` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `variantId` INTEGER NOT NULL,
    `imageUrl` VARCHAR(1000) NOT NULL,
    `altText` VARCHAR(255) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_variant_image_variantId_sortOrder_idx`(`variantId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_variant_image` ADD CONSTRAINT `product_variant_image_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
