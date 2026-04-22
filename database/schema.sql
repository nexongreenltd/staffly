-- ============================================================
-- Staffly – PostgreSQL Schema
-- Multi-tenant: every table carries company_id
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------
-- COMPANIES (Tenants)
-- --------------------------------------------------------
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(30),
  address       TEXT,
  logo_url      TEXT,
  timezone      VARCHAR(60) NOT NULL DEFAULT 'UTC',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  subscription  VARCHAR(30) NOT NULL DEFAULT 'trial',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------
-- USERS (Auth accounts — super admin + company admins + employees)
-- --------------------------------------------------------
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,  -- NULL for super admin
  employee_id   UUID,                                              -- FK set after employees table
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(30) NOT NULL DEFAULT 'employee',          -- superadmin | company_admin | employee
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email   ON users(email);

-- --------------------------------------------------------
-- DEPARTMENTS
-- --------------------------------------------------------
CREATE TABLE departments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          VARCHAR(150) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_departments_company ON departments(company_id);

-- --------------------------------------------------------
-- SHIFTS
-- --------------------------------------------------------
CREATE TABLE shifts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name              VARCHAR(100) NOT NULL,
  shift_start_time  TIME NOT NULL,
  shift_end_time    TIME NOT NULL,
  grace_minutes     INT NOT NULL DEFAULT 10,
  overnight         BOOLEAN NOT NULL DEFAULT FALSE,  -- crosses midnight
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shifts_company ON shifts(company_id);

-- --------------------------------------------------------
-- EMPLOYEES
-- --------------------------------------------------------
CREATE TABLE employees (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id         UUID REFERENCES departments(id) ON DELETE SET NULL,
  shift_id              UUID REFERENCES shifts(id) ON DELETE SET NULL,
  employee_code         VARCHAR(50) NOT NULL,
  first_name            VARCHAR(100) NOT NULL,
  last_name             VARCHAR(100) NOT NULL,
  email                 VARCHAR(255),
  phone                 VARCHAR(30),
  designation           VARCHAR(150),
  joining_date          DATE,
  status                VARCHAR(30) NOT NULL DEFAULT 'active',   -- active | inactive | terminated
  biometric_status      VARCHAR(30) NOT NULL DEFAULT 'pending',  -- pending | enrolled | disabled
  face_id               VARCHAR(100),
  card_number           VARCHAR(100),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, employee_code)
);

CREATE INDEX idx_employees_company    ON employees(company_id);
CREATE INDEX idx_employees_status     ON employees(company_id, status);
CREATE INDEX idx_employees_biometric  ON employees(company_id, biometric_status);

-- Back-reference from users
ALTER TABLE users ADD CONSTRAINT fk_users_employee
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;

-- --------------------------------------------------------
-- DEVICES (ZKTeco + compatible biometric terminals)
-- --------------------------------------------------------
CREATE TABLE devices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  ip_address      VARCHAR(45) NOT NULL,
  port            INT NOT NULL DEFAULT 4370,
  location        VARCHAR(200),
  model           VARCHAR(100) DEFAULT 'ZKTeco K40',
  serial_number   VARCHAR(100),
  firmware_version VARCHAR(50),
  status          VARCHAR(30) NOT NULL DEFAULT 'inactive',  -- active | inactive | error
  last_synced_at  TIMESTAMPTZ,
  last_error      TEXT,
  sync_interval   INT NOT NULL DEFAULT 5,                   -- minutes
  is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_company ON devices(company_id);
CREATE INDEX idx_devices_status  ON devices(company_id, status);

-- --------------------------------------------------------
-- EMPLOYEE–DEVICE MAPPING  (device_user_id ↔ employee)
-- --------------------------------------------------------
CREATE TABLE device_employee_map (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  device_id        UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  device_user_id   INT NOT NULL,          -- UID slot on the physical device
  synced_at        TIMESTAMPTZ,
  UNIQUE(device_id, device_user_id),
  UNIQUE(device_id, employee_id)
);

CREATE INDEX idx_dev_emp_map_company  ON device_employee_map(company_id);
CREATE INDEX idx_dev_emp_map_device   ON device_employee_map(device_id);
CREATE INDEX idx_dev_emp_map_employee ON device_employee_map(employee_id);

-- --------------------------------------------------------
-- ATTENDANCE LOGS (raw punches from devices)
-- --------------------------------------------------------
CREATE TABLE attendance_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  device_id       UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES employees(id) ON DELETE SET NULL,
  device_user_id  INT NOT NULL,
  punch_time      TIMESTAMPTZ NOT NULL,
  punch_type      INT NOT NULL DEFAULT 0,   -- 0=check-in, 1=check-out, 4=OT-in, 5=OT-out
  verify_type     INT NOT NULL DEFAULT 1,   -- 0=password, 1=fingerprint, 4=card, 8=face
  raw_record      JSONB,
  is_processed    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_att_logs_company      ON attendance_logs(company_id);
CREATE INDEX idx_att_logs_employee     ON attendance_logs(company_id, employee_id);
CREATE INDEX idx_att_logs_punch_time   ON attendance_logs(company_id, punch_time);
CREATE INDEX idx_att_logs_processed    ON attendance_logs(is_processed) WHERE is_processed = FALSE;
-- Prevent duplicates from device re-sync
CREATE UNIQUE INDEX idx_att_logs_dedup
  ON attendance_logs(device_id, device_user_id, punch_time);

-- --------------------------------------------------------
-- DAILY ATTENDANCE (processed, one row per employee per day)
-- --------------------------------------------------------
CREATE TABLE daily_attendance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id        UUID REFERENCES shifts(id) ON DELETE SET NULL,
  date            DATE NOT NULL,
  check_in        TIMESTAMPTZ,
  check_out       TIMESTAMPTZ,
  working_hours   NUMERIC(5,2),            -- decimal hours
  late_minutes    INT DEFAULT 0,
  early_out_min   INT DEFAULT 0,
  overtime_min    INT DEFAULT 0,
  status          VARCHAR(30) NOT NULL DEFAULT 'absent', -- present | late | absent | half_day | holiday | weekend | on_leave
  is_manual       BOOLEAN NOT NULL DEFAULT FALSE,
  manual_reason   TEXT,
  corrected_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, employee_id, date)
);

CREATE INDEX idx_daily_att_company  ON daily_attendance(company_id);
CREATE INDEX idx_daily_att_employee ON daily_attendance(company_id, employee_id);
CREATE INDEX idx_daily_att_date     ON daily_attendance(company_id, date);
CREATE INDEX idx_daily_att_status   ON daily_attendance(company_id, date, status);

-- --------------------------------------------------------
-- HOLIDAYS
-- --------------------------------------------------------
CREATE TABLE holidays (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  date        DATE NOT NULL,
  is_optional BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holidays_company ON holidays(company_id, date);

-- --------------------------------------------------------
-- LEAVE TYPES
-- --------------------------------------------------------
CREATE TABLE leave_types (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  days_allowed INT NOT NULL DEFAULT 0,
  is_paid     BOOLEAN NOT NULL DEFAULT TRUE
);

-- --------------------------------------------------------
-- LEAVE REQUESTS
-- --------------------------------------------------------
CREATE TABLE leave_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id   UUID REFERENCES leave_types(id) ON DELETE SET NULL,
  from_date       DATE NOT NULL,
  to_date         DATE NOT NULL,
  days            INT NOT NULL,
  reason          TEXT,
  status          VARCHAR(30) NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  approved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leave_req_company  ON leave_requests(company_id);
CREATE INDEX idx_leave_req_employee ON leave_requests(employee_id);

-- --------------------------------------------------------
-- AUDIT LOGS
-- --------------------------------------------------------
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity      VARCHAR(100),
  entity_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_company   ON audit_logs(company_id);
CREATE INDEX idx_audit_user      ON audit_logs(user_id);
CREATE INDEX idx_audit_entity    ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_created   ON audit_logs(created_at);

-- --------------------------------------------------------
-- AUTO-UPDATE updated_at trigger
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['companies','users','employees','devices','shifts','daily_attendance']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;
