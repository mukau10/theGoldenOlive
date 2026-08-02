-- Migration: 009_multi_tenant_saas
-- Shared-schema multi-tenancy + billing-ready companies + memberships + company_settings

-- =====================================================
-- COMPANIES: billing / onboarding fields
-- =====================================================
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'is_active') = 0,
  'ALTER TABLE companies ADD COLUMN is_active BOOLEAN DEFAULT TRUE', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'plan') = 0,
  'ALTER TABLE companies ADD COLUMN plan ENUM(''free'', ''starter'', ''pro'') NOT NULL DEFAULT ''free''', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'billing_status') = 0,
  'ALTER TABLE companies ADD COLUMN billing_status ENUM(''trialing'', ''active'', ''past_due'', ''canceled'') NOT NULL DEFAULT ''trialing''', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'billing_customer_id') = 0,
  'ALTER TABLE companies ADD COLUMN billing_customer_id VARCHAR(120) NULL', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'trial_ends_at') = 0,
  'ALTER TABLE companies ADD COLUMN trial_ends_at TIMESTAMP NULL', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'onboarded_at') = 0,
  'ALTER TABLE companies ADD COLUMN onboarded_at TIMESTAMP NULL', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'owner_user_id') = 0,
  'ALTER TABLE companies ADD COLUMN owner_user_id INT NULL', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'updated_at') = 0,
  'ALTER TABLE companies ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure default company is billing-active pro
UPDATE companies
SET plan = 'pro',
    billing_status = 'active',
    is_active = 1,
    onboarded_at = COALESCE(onboarded_at, NOW())
WHERE id = 1;

-- =====================================================
-- COMPANY MEMBERSHIPS
-- =====================================================
CREATE TABLE IF NOT EXISTS company_memberships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
    permissions JSON NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_company_user (company_id, user_id),
    INDEX idx_user (user_id),
    INDEX idx_company (company_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- COMPANY SETTINGS (per-tenant key/value)
-- =====================================================
CREATE TABLE IF NOT EXISTS company_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description VARCHAR(255) NULL,
    is_encrypted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_company_setting (company_id, setting_key),
    INDEX idx_company (company_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO company_settings (company_id, setting_key, setting_value, setting_type, description)
SELECT 1, setting_key, setting_value, setting_type, description
FROM settings
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- =====================================================
-- ADD company_id COLUMNS (idempotent via information_schema checks in run helper)
-- Applied with stored procedure style statements in companion JS if needed.
-- Direct ALTERs for MySQL 8:
-- =====================================================

-- users.default_company_id
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'default_company_id') = 0,
    'ALTER TABLE users ADD COLUMN default_company_id INT NULL, ADD INDEX idx_default_company (default_company_id)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE users SET default_company_id = 1 WHERE default_company_id IS NULL;

-- Seed memberships for existing users
INSERT INTO company_memberships (company_id, user_id, role, permissions, is_active)
SELECT 1, u.id, u.role, u.permissions, u.is_active
FROM users u
ON DUPLICATE KEY UPDATE role = VALUES(role);

UPDATE companies SET owner_user_id = (SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1)
WHERE id = 1 AND owner_user_id IS NULL;

-- orders.company_id
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'company_id') = 0,
    'ALTER TABLE orders ADD COLUMN company_id INT NOT NULL DEFAULT 1, ADD INDEX idx_orders_company (company_id)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE orders SET company_id = 1 WHERE company_id IS NULL OR company_id = 0;

-- products.company_id
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'company_id') = 0,
    'ALTER TABLE products ADD COLUMN company_id INT NOT NULL DEFAULT 1, ADD INDEX idx_products_company (company_id)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE products SET company_id = 1 WHERE company_id IS NULL OR company_id = 0;

-- categories.company_id
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'company_id') = 0,
    'ALTER TABLE categories ADD COLUMN company_id INT NOT NULL DEFAULT 1, ADD INDEX idx_categories_company (company_id)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE categories SET company_id = 1 WHERE company_id IS NULL OR company_id = 0;

-- discounts.company_id
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'discounts' AND COLUMN_NAME = 'company_id') = 0,
    'ALTER TABLE discounts ADD COLUMN company_id INT NOT NULL DEFAULT 1, ADD INDEX idx_discounts_company (company_id)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE discounts SET company_id = 1 WHERE company_id IS NULL OR company_id = 0;

-- payments.company_id
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'company_id') = 0,
    'ALTER TABLE payments ADD COLUMN company_id INT NOT NULL DEFAULT 1, ADD INDEX idx_payments_company (company_id)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE payments p
JOIN orders o ON o.id = p.order_id
SET p.company_id = o.company_id;

-- integration_events.company_id
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'integration_events' AND COLUMN_NAME = 'company_id') = 0,
    'ALTER TABLE integration_events ADD COLUMN company_id INT NOT NULL DEFAULT 1, ADD INDEX idx_ie_company (company_id)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE integration_events SET company_id = 1 WHERE company_id IS NULL OR company_id = 0;

-- admin_logs.company_id
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_logs' AND COLUMN_NAME = 'company_id') = 0,
    'ALTER TABLE admin_logs ADD COLUMN company_id INT NULL, ADD INDEX idx_al_company (company_id)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE admin_logs SET company_id = 1 WHERE company_id IS NULL;

-- notifications.company_id
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'company_id') = 0,
    'ALTER TABLE notifications ADD COLUMN company_id INT NOT NULL DEFAULT 1, ADD INDEX idx_n_company (company_id)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE notifications SET company_id = 1 WHERE company_id IS NULL OR company_id = 0;

-- restaurant.company_id
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restaurant' AND COLUMN_NAME = 'company_id') = 0,
    'ALTER TABLE restaurant ADD COLUMN company_id INT NOT NULL DEFAULT 1, ADD INDEX idx_rest_company (company_id)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE restaurant SET company_id = 1 WHERE company_id IS NULL OR company_id = 0;

-- Composite uniques for tenant-scoped codes/slugs (drop global unique if present)
-- categories slug
SET @exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND INDEX_NAME = 'slug' AND NON_UNIQUE = 0
);
SET @sql = IF(@exists > 0, 'ALTER TABLE categories DROP INDEX slug', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND INDEX_NAME = 'uniq_company_category_slug'
);
SET @sql = IF(@exists = 0,
  'ALTER TABLE categories ADD UNIQUE KEY uniq_company_category_slug (company_id, slug)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- products slug
SET @exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND INDEX_NAME = 'slug' AND NON_UNIQUE = 0
);
SET @sql = IF(@exists > 0, 'ALTER TABLE products DROP INDEX slug', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND INDEX_NAME = 'uniq_company_product_slug'
);
SET @sql = IF(@exists = 0,
  'ALTER TABLE products ADD UNIQUE KEY uniq_company_product_slug (company_id, slug)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- discounts code
SET @exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'discounts' AND INDEX_NAME = 'code' AND NON_UNIQUE = 0
);
SET @sql = IF(@exists > 0, 'ALTER TABLE discounts DROP INDEX code', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'discounts' AND INDEX_NAME = 'uniq_company_discount_code'
);
SET @sql = IF(@exists = 0,
  'ALTER TABLE discounts ADD UNIQUE KEY uniq_company_discount_code (company_id, code)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- orders: keep order_number globally unique for simplicity (prefixed per company at create time)

INSERT INTO company_settings (company_id, setting_key, setting_value, setting_type, description) VALUES
(1, 'default_company_id', '1', 'number', 'Legacy default company'),
(1, 'onboarding_complete', 'true', 'boolean', 'Onboarding afgerond')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
