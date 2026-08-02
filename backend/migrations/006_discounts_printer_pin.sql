-- Migration: 006_discounts_printer_pin
-- Discounts, order discount fields, printer & PIN settings

-- =====================================================
-- TABLE: discounts
-- =====================================================
CREATE TABLE IF NOT EXISTS discounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
    value DECIMAL(10, 2) NOT NULL,
    min_order DECIMAL(10, 2) DEFAULT 0.00,
    max_uses INT DEFAULT NULL,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from DATETIME NULL,
    valid_until DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SETTINGS: printer, PIN, protected categories
-- =====================================================
INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('printer_ip', '', 'string', 'IP-adres van externe ticketprinter'),
('printer_port', '9100', 'number', 'Poort van externe ticketprinter (standaard 9100)'),
('printer_enabled', 'false', 'boolean', 'Print tickets via netwerkprinter'),
('admin_pin', '', 'string', 'Pincode voor beheer van beschermde producten (gehashed)'),
('pin_protected_categories', '["mocktails"]', 'json', 'Categorie-slugs die een pincode vereisen om te beheren')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- =====================================================
-- ORDER discount columns (safe add)
-- =====================================================
SET @db := DATABASE();

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'discount_code'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN discount_code VARCHAR(50) NULL AFTER delivery_fee',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'discount_amount'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00 AFTER discount_code',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
