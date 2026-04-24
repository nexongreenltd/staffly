-- ============================================================
-- Seed Data – Staffly
-- ============================================================

-- Super admin user (password: Admin@123)
INSERT INTO users (id, email, password_hash, role)
VALUES (
  uuid_generate_v4(),
  'superadmin@staffly.io',
  '$2b$10$vhpZfEX9FiIw6uj.falUiOLyyyAwXZcqzH9zxna5I45517v/Mo34G',
  'superadmin'
);

-- Demo company
INSERT INTO companies (id, name, slug, email, timezone)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme Corporation',
  'acme',
  'admin@acme.com',
  'Asia/Dhaka'
);

-- Demo company admin (password: Admin@123)
INSERT INTO users (id, company_id, email, password_hash, role)
VALUES (
  uuid_generate_v4(),
  '00000000-0000-0000-0000-000000000001',
  'admin@acme.com',
  '$2b$10$vhpZfEX9FiIw6uj.falUiOLyyyAwXZcqzH9zxna5I45517v/Mo34G',
  'company_admin'
);

-- Default shift for Acme
INSERT INTO shifts (id, company_id, name, shift_start_time, shift_end_time, grace_minutes, is_default)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'General Shift',
  '09:00:00',
  '18:00:00',
  10,
  TRUE
);

-- Demo department
INSERT INTO departments (id, company_id, name)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Engineering'
);
