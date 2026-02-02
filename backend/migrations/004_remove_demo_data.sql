-- The Golden Olive - Cleanup demo data
-- Migration: 004_remove_demo_data
-- Description: Remove demo orders/addresses that were previously inserted

-- Delete any dependent rows first (safe even if tables are empty)
DELETE FROM order_items WHERE order_id IN (9001, 9002, 9003, 9004);
DELETE FROM payments WHERE order_id IN (9001, 9002, 9003, 9004);

-- Delete demo orders by known IDs and/or demo order_number prefix
DELETE FROM orders WHERE id IN (9001, 9002, 9003, 9004);
DELETE FROM orders WHERE order_number LIKE 'TGO-DEMO-%';

-- Delete demo addresses by known IDs (only if not referenced anymore)
DELETE FROM addresses WHERE id IN (9001, 9002, 9003, 9004);

