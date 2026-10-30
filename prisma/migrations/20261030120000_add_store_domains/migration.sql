CREATE TABLE `store_domain` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `storeId` INTEGER NOT NULL,
  `hostname` VARCHAR(253) NOT NULL,
  `status` ENUM('PENDING', 'VERIFIED', 'ACTIVE', 'DISABLED') NOT NULL DEFAULT 'PENDING',
  `isPrimary` BOOLEAN NOT NULL DEFAULT false,
  `verificationToken` VARCHAR(128) NULL,
  `verifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `store_domain_hostname_key` (`hostname`),
  INDEX `store_domain_storeId_status_idx` (`storeId`, `status`),
  INDEX `store_domain_storeId_isPrimary_idx` (`storeId`, `isPrimary`),
  CONSTRAINT `store_domain_storeId_fkey`
    FOREIGN KEY (`storeId`) REFERENCES `store` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
