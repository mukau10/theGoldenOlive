-- Migration: 008_print_bridge
-- Enterprise print bridge: agents, printers, jobs, rules, tests
-- Note: `companies` may already exist (multi-tenant). Extend safely; do not redefine.

CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    db_name VARCHAR(150) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure default company row exists (compatible with schemas that require db_name)
INSERT INTO companies (id, name, slug, db_name)
SELECT 1, 'The Golden Olive', 'the-golden-olive', 'thegoldenolive'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE id = 1);

CREATE TABLE IF NOT EXISTS printer_agents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    device_id VARCHAR(120) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    api_key_prefix VARCHAR(16) NOT NULL,
    status ENUM('ONLINE', 'OFFLINE', 'DISCONNECTED') NOT NULL DEFAULT 'OFFLINE',
    last_seen TIMESTAMP NULL,
    meta JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_device_id (device_id),
    INDEX idx_company (company_id),
    INDEX idx_status (status),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS printers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    agent_id INT NULL,
    name VARCHAR(150) NOT NULL,
    type ENUM('KITCHEN', 'BAR', 'DELIVERY', 'RECEIPT', 'LABEL') NOT NULL DEFAULT 'RECEIPT',
    ip_address VARCHAR(64) NOT NULL,
    port INT NOT NULL DEFAULT 9100,
    protocol ENUM('ESC_POS', 'RAW_TCP', 'IPP') NOT NULL DEFAULT 'ESC_POS',
    status ENUM('ONLINE', 'OFFLINE', 'UNKNOWN', 'ERROR') NOT NULL DEFAULT 'UNKNOWN',
    is_default BOOLEAN DEFAULT FALSE,
    paper_width INT DEFAULT 42,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_agent (agent_id),
    INDEX idx_type (type),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES printer_agents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS print_jobs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    printer_id INT NOT NULL,
    order_id INT NULL,
    job_type VARCHAR(40) NOT NULL DEFAULT 'ORDER',
    content JSON NOT NULL,
    payload_base64 MEDIUMTEXT NULL,
    status ENUM('PENDING', 'PROCESSING', 'PRINTED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 8,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    printed_at TIMESTAMP NULL,
    INDEX idx_company_status (company_id, status),
    INDEX idx_printer_status (printer_id, status),
    INDEX idx_order (order_id),
    INDEX idx_created (created_at),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS printer_tests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    printer_id INT NOT NULL,
    company_id INT NOT NULL,
    test_type ENUM('CONNECTION', 'PRINT') NOT NULL DEFAULT 'CONNECTION',
    status ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    response_time_ms INT NULL,
    error TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_printer (printer_id),
    INDEX idx_company (company_id),
    FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS printer_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    category VARCHAR(100) NOT NULL,
    printer_id INT NOT NULL,
    priority INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_company_category_printer (company_id, category, printer_id),
    INDEX idx_company_category (company_id, category),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('print_bridge_enabled', 'true', 'boolean', 'Print Bridge queue gebruiken i.p.v. directe cloud TCP'),
('print_bridge_auto_dispatch', 'true', 'boolean', 'Nieuwe bestellingen automatisch naar print queue'),
('default_company_id', '1', 'number', 'Standaard company ID voor single-tenant mode')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
