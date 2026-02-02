-- The Golden Olive - Admin Dashboard Extensions
-- Migration: 002_admin_extensions
-- Description: Add tables for order history, admin logs, and role management

-- =====================================================
-- TABLE: order_status_history
-- Tracks all status changes for orders
-- =====================================================
CREATE TABLE IF NOT EXISTS order_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_order (order_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: admin_logs
-- Audit trail for all admin actions
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: notifications
-- Admin notifications for new orders, etc.
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: Column additions are handled in seed.js to avoid MySQL syntax issues

-- =====================================================
-- INSERT ADDITIONAL SETTINGS
-- =====================================================
INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('restaurant_name', 'The Golden Olive', 'string', 'Restaurant naam'),
('restaurant_address', 'Vlaamsekaai 65, 2000 Antwerpen', 'string', 'Restaurant adres'),
('restaurant_phone', '+32 494 19 43 97', 'string', 'Restaurant telefoonnummer'),
('restaurant_email', 'info@thegoldenolive.be', 'string', 'Restaurant email'),
('auto_accept_orders', 'false', 'boolean', 'Automatisch orders accepteren'),
('notification_sound', 'true', 'boolean', 'Geluid bij nieuwe orders'),
('print_auto', 'false', 'boolean', 'Automatisch printen'),
('tax_rate', '21', 'number', 'BTW percentage')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- Staff user is created in seed.js after column additions
