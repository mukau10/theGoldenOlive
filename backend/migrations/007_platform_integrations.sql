-- Migration: 007_platform_integrations
-- Uber Eats, Takeaway.com, Deliveroo order intake

SET @db := DATABASE();

-- orders.source
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'source'
);
SET @sql := IF(@col_exists = 0,
  "ALTER TABLE orders ADD COLUMN source VARCHAR(30) NOT NULL DEFAULT 'website' AFTER order_number",
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- orders.external_order_id
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'external_order_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN external_order_id VARCHAR(120) NULL AFTER source',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- orders.external_status
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'external_status'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN external_status VARCHAR(50) NULL AFTER external_order_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- orders.external_payload
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'external_payload'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN external_payload JSON NULL AFTER external_status',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Unique external order per platform
SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND INDEX_NAME = 'uniq_source_external_order'
);
SET @sql := IF(@idx_exists = 0,
  'CREATE UNIQUE INDEX uniq_source_external_order ON orders (source, external_order_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_orders_source'
);
SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_orders_source ON orders (source)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Allow external line items without internal product mapping
SET @col_null := (
  SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'product_id'
);
SET @sql := IF(@col_null = 'NO',
  'ALTER TABLE order_items MODIFY COLUMN product_id INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Webhook event log
CREATE TABLE IF NOT EXISTS integration_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform VARCHAR(30) NOT NULL,
    event_type VARCHAR(100),
    external_order_id VARCHAR(120),
    status VARCHAR(30) DEFAULT 'received',
    payload JSON,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_platform (platform),
    INDEX idx_external_order (external_order_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Integration settings
INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('uber_eats_enabled', 'false', 'boolean', 'Uber Eats integratie actief'),
('uber_eats_client_id', '', 'string', 'Uber Eats OAuth client ID'),
('uber_eats_client_secret', '', 'string', 'Uber Eats OAuth client secret'),
('uber_eats_store_id', '', 'string', 'Uber Eats store ID'),
('uber_eats_auto_accept', 'true', 'boolean', 'Uber Eats orders automatisch accepteren'),
('uber_eats_webhook_secret', '', 'string', 'Uber Eats webhook signing secret (client secret)'),

('takeaway_enabled', 'false', 'boolean', 'Takeaway.com / Just Eat integratie actief'),
('takeaway_api_key', '', 'string', 'Takeaway.com / Just Eat API key'),
('takeaway_restaurant_id', '', 'string', 'Takeaway.com restaurant ID'),
('takeaway_auto_accept', 'true', 'boolean', 'Takeaway.com orders automatisch accepteren'),
('takeaway_webhook_secret', '', 'string', 'Takeaway.com webhook secret'),
('takeaway_base_url', 'https://partnerapi.just-eat.be', 'string', 'Takeaway/Just Eat partner API base URL (BE)'),

('deliveroo_enabled', 'false', 'boolean', 'Deliveroo integratie actief'),
('deliveroo_client_id', '', 'string', 'Deliveroo OAuth client ID'),
('deliveroo_client_secret', '', 'string', 'Deliveroo OAuth client secret'),
('deliveroo_site_id', '', 'string', 'Deliveroo site/restaurant ID'),
('deliveroo_auto_accept', 'true', 'boolean', 'Deliveroo orders automatisch accepteren'),
('deliveroo_webhook_secret', '', 'string', 'Deliveroo webhook HMAC secret'),
('deliveroo_base_url', 'https://api.deliveroo.com', 'string', 'Deliveroo API base URL')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
