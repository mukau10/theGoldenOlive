-- The Golden Olive - Add customer VAT number
-- Migration: 005_customer_vat_number
-- Description: Store customer VAT number on orders (for invoices)

SET @db := DATABASE();

SET @vat_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'customer_vat_number'
);

SET @sql := IF(@vat_exists = 0,
  'ALTER TABLE orders ADD COLUMN customer_vat_number VARCHAR(50) NULL AFTER customer_phone',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_customer_vat_number'
);
SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_customer_vat_number ON orders (customer_vat_number)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

