-- AlterTable
ALTER TABLE `global_product` MODIFY `name` VARCHAR(300) NOT NULL,
    MODIFY `shortDescription` TEXT NULL;

-- AlterTable
ALTER TABLE `product` MODIFY `name` VARCHAR(300) NOT NULL,
    MODIFY `shortDescription` TEXT NULL;
