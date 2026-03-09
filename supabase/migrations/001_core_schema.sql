-- ============================================================
-- Eagle Eye (عين النسر) — Mansour Holding
-- Migration 001: Core Schema — Organizations & People
-- Created: March 2026 | Nuke & Rebuild
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE system_role AS ENUM (
  'super_admin',
  'company_admin',
  'ceo',
  'department_manager',
  'employee',
  'finance_approver',
  'hr_approver',
  'audit_reviewer',
  'delegated_approver',
  'gr_employee',
  'gr_manager'
);

CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'subcontractor');
CREATE TYPE gender_type AS ENUM ('male', 'female');
CREATE TYPE entity_status AS ENUM ('active', 'inactive', 'archived');

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

-- Companies (Holding + Subsidiaries)
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          VARCHAR(10) NOT NULL UNIQUE,
  name_ar       TEXT NOT NULL,
  name_en       TEXT,
  is_holding    BOOLEAN NOT NULL DEFAULT false,
  parent_id     UUID REFERENCES companies(id),
  ceo_employee_id UUID, -- FK added after employees table
  admin_employee_id UUID,
  logo_url      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_parent ON companies(parent_id);
CREATE INDEX idx_companies_code ON companies(code);

-- Sectors (business groups within holding)
CREATE TABLE sectors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          VARCHAR(10) NOT NULL,
  name_ar       TEXT NOT NULL,
  name_en       TEXT,
  company_id    UUID NOT NULL REFERENCES companies(id),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Departments
CREATE TABLE departments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             VARCHAR(20) NOT NULL,
  name_ar          TEXT NOT NULL,
  name_en          TEXT,
  company_id       UUID NOT NULL REFERENCES companies(id),
  sector_id        UUID REFERENCES sectors(id),
  head_employee_id UUID, -- FK added after employees
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

CREATE INDEX idx_departments_company ON departments(company_id);

-- Positions
CREATE TABLE positions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                   VARCHAR(20) NOT NULL,
  title_ar               TEXT NOT NULL,
  title_en               TEXT,
  department_id          UUID NOT NULL REFERENCES departments(id),
  company_id             UUID NOT NULL REFERENCES companies(id),
  grade                  VARCHAR(20),
  has_approval_authority BOOLEAN NOT NULL DEFAULT false,
  is_active              BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, department_id, code)
);

-- Locations
CREATE TABLE locations (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code      VARCHAR(10) NOT NULL UNIQUE,
  name_ar   TEXT NOT NULL,
  name_en   TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE sub_locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(10) NOT NULL,
  name_ar     TEXT NOT NULL,
  name_en     TEXT,
  location_id UUID NOT NULL REFERENCES locations(id),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(location_id, code)
);

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE employees (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code     VARCHAR(20) NOT NULL UNIQUE,
  auth_user_id      UUID UNIQUE, -- links to Supabase auth.users

  -- Names
  full_name_en      TEXT,
  first_name_en     TEXT,
  second_name_en    TEXT,
  third_name_en     TEXT,
  family_name_en    TEXT,
  full_name_ar      TEXT,
  first_name_ar     TEXT,
  second_name_ar    TEXT,
  third_name_ar     TEXT,
  family_name_ar    TEXT,

  -- Organization
  company_id        UUID NOT NULL REFERENCES companies(id),
  department_id     UUID REFERENCES departments(id),
  position_id       UUID REFERENCES positions(id),
  sector_id         UUID REFERENCES sectors(id),
  direct_manager_id UUID REFERENCES employees(id),

  -- Employment
  employment_type   employment_type NOT NULL DEFAULT 'full_time',
  grade             VARCHAR(20),
  title_ar          TEXT,
  title_en          TEXT,

  -- Personal
  date_of_birth     DATE,
  gender            gender_type,
  nationality       TEXT,
  national_id       VARCHAR(30),
  religion          TEXT,
  social_status     TEXT,
  email             TEXT,

  -- Location
  location_id       UUID REFERENCES locations(id),
  sub_location_id   UUID REFERENCES sub_locations(id),

  -- Finance
  bank_name         TEXT,
  iban              VARCHAR(50),
  cost_center_code  VARCHAR(30),
  cost_center_name  TEXT,

  -- Status
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_auth ON employees(auth_user_id);
CREATE INDEX idx_employees_manager ON employees(direct_manager_id);
CREATE INDEX idx_employees_code ON employees(employee_code);

-- Add deferred FK on companies
ALTER TABLE companies ADD CONSTRAINT fk_companies_ceo
  FOREIGN KEY (ceo_employee_id) REFERENCES employees(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE companies ADD CONSTRAINT fk_companies_admin
  FOREIGN KEY (admin_employee_id) REFERENCES employees(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE departments ADD CONSTRAINT fk_departments_head
  FOREIGN KEY (head_employee_id) REFERENCES employees(id) DEFERRABLE INITIALLY DEFERRED;

-- ============================================================
-- ROLES & PERMISSIONS
-- ============================================================
CREATE TABLE user_roles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role          system_role NOT NULL,
  company_id    UUID REFERENCES companies(id),
  department_id UUID REFERENCES departments(id),
  granted_by    UUID REFERENCES employees(id),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ,
  UNIQUE(employee_id, role, company_id)
);

CREATE INDEX idx_user_roles_employee ON user_roles(employee_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- ============================================================
-- DELEGATION (OUT-OF-OFFICE)
-- ============================================================
CREATE TABLE delegations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delegator_id  UUID NOT NULL REFERENCES employees(id),
  delegate_id   UUID NOT NULL REFERENCES employees(id),
  company_id    UUID NOT NULL REFERENCES companies(id),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  reason        TEXT,
  activated_by  UUID NOT NULL REFERENCES employees(id),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_date <= end_date),
  CHECK (delegator_id != delegate_id)
);

CREATE INDEX idx_delegations_active ON delegations(delegator_id) WHERE is_active = true;

-- ============================================================
-- AUDIT LOG (Master data changes)
-- ============================================================
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  actor_id    UUID REFERENCES employees(id),
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_time ON audit_log(created_at DESC);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get current employee ID from auth context
CREATE OR REPLACE FUNCTION current_employee_id()
RETURNS UUID AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current user has a specific role
CREATE OR REPLACE FUNCTION has_role(p_role system_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE employee_id = current_employee_id()
      AND role = p_role
      AND is_active = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user is CEO of holding
CREATE OR REPLACE FUNCTION is_holding_ceo()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN companies c ON ur.company_id = c.id
    WHERE ur.employee_id = current_employee_id()
      AND ur.role = 'ceo'
      AND c.is_holding = true
      AND ur.is_active = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT has_role('super_admin')
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_locations ENABLE ROW LEVEL SECURITY;

-- Companies: everyone can read active companies
CREATE POLICY "companies_select" ON companies FOR SELECT USING (true);
CREATE POLICY "companies_modify" ON companies FOR ALL USING (is_super_admin());

-- Departments: read all, modify by admin
CREATE POLICY "departments_select" ON departments FOR SELECT USING (true);
CREATE POLICY "departments_modify" ON departments FOR ALL USING (
  is_super_admin() OR has_role('company_admin')
);

-- Employees: see own company + holding CEO sees all
CREATE POLICY "employees_select" ON employees FOR SELECT USING (
  is_super_admin()
  OR is_holding_ceo()
  OR company_id IN (
    SELECT ur.company_id FROM user_roles ur
    WHERE ur.employee_id = current_employee_id() AND ur.is_active = true
  )
  OR id = current_employee_id()
);
CREATE POLICY "employees_modify" ON employees FOR ALL USING (
  is_super_admin() OR has_role('company_admin')
);

-- User roles: see own, admins see all
CREATE POLICY "user_roles_select" ON user_roles FOR SELECT USING (
  employee_id = current_employee_id()
  OR is_super_admin()
  OR has_role('company_admin')
);

-- Locations: everyone reads
CREATE POLICY "locations_select" ON locations FOR SELECT USING (true);
CREATE POLICY "sub_locations_select" ON sub_locations FOR SELECT USING (true);

-- Sectors: everyone reads
CREATE POLICY "sectors_select" ON sectors FOR SELECT USING (true);

-- Positions: everyone reads
CREATE POLICY "positions_select" ON positions FOR SELECT USING (true);

-- Delegations: see relevant
CREATE POLICY "delegations_select" ON delegations FOR SELECT USING (
  delegator_id = current_employee_id()
  OR delegate_id = current_employee_id()
  OR is_super_admin()
  OR has_role('company_admin')
);

-- Audit log: admin/CEO only
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (
  is_super_admin() OR is_holding_ceo() OR has_role('company_admin')
);
