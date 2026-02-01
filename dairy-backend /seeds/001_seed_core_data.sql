-- =====================================================
-- 001_seed_core_data.sql
-- Core seed data for Dairy Management System
-- Safe to run ONLY on fresh databases
-- =====================================================

BEGIN;

-- -------------------------
-- SUPER ADMIN USER
-- -------------------------
-- Password: super123
-- bcrypt hash generated beforehand

INSERT INTO users (username, password_hash, role)
VALUES (
  'superadmin',
  '$2b$10$kIae1SYvLPTKbAAX4HdzzucqB6xneJgxUvilqJpd9inGr0/Xl86HO',
  'super_admin'
)
ON CONFLICT (username) DO NOTHING;

-- -------------------------
-- DEFAULT PRODUCT
-- -------------------------
INSERT INTO products (name, unit, default_price)
VALUES ('Milk', 'liter', 50.00)
ON CONFLICT DO NOTHING;

-- -------------------------
-- OPTIONAL: DEFAULT CUSTOMER
-- -------------------------
INSERT INTO customers (name, phone)
VALUES ('Cash Customer', NULL)
ON CONFLICT DO NOTHING;

COMMIT;
