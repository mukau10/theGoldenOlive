-- The Golden Olive - Delivery Routes Schema
-- Migration: 003_delivery_routes
-- Description: Add restaurant table + geocoordinates for routing

-- =====================================================
-- TABLE: restaurant
-- =====================================================
CREATE TABLE IF NOT EXISTS restaurant (
  id INT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: addresses - add latitude/longitude (idempotent)
-- =====================================================
SET @db := DATABASE();

SET @lat_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'addresses' AND COLUMN_NAME = 'latitude'
);
SET @sql := IF(@lat_exists = 0,
  'ALTER TABLE addresses ADD COLUMN latitude DECIMAL(10,7) NULL AFTER country',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @lng_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'addresses' AND COLUMN_NAME = 'longitude'
);
SET @sql := IF(@lng_exists = 0,
  'ALTER TABLE addresses ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Helpful index for routing lookups
SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'addresses' AND INDEX_NAME = 'idx_lat_lng'
);
SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_lat_lng ON addresses (latitude, longitude)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- DEFAULT RESTAURANT ROW (id=1)
-- NOTE: Update coordinates to your exact location if needed.
-- =====================================================
INSERT INTO restaurant (id, name, address, latitude, longitude)
VALUES (1, 'The Golden Olive', 'Desguinlei 86, 2018 Antwerpen', 51.1989000, 4.4164000)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  address = VALUES(address),
  latitude = VALUES(latitude),
  longitude = VALUES(longitude);

