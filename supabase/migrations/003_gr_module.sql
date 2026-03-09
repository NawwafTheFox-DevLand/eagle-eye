-- ============================================================
-- Eagle Eye (عين النسر) — Mansour Holding
-- Migration 003: Government Relations Module
-- 8 procedure types: Renewals, Issuance, Cancellation, Inquiries,
-- Violations, Workshops, Investigations, Branch Committees
-- ============================================================

-- ============================================================
-- GR ENUMS
-- ============================================================
CREATE TYPE gr_task_type AS ENUM (
  'annual_renewal', 'issuance', 'cancellation',
  'inquiry', 'violation', 'workshop',
  'investigation', 'committee'
);

CREATE TYPE gr_task_status AS ENUM (
  'draft', 'pending_manager', 'pending_finance', 'pending_banking',
  'in_progress', 'pending_upload', 'pending_hr_clearance',
  'completed', 'cancelled'
);

CREATE TYPE gr_license_type AS ENUM (
  'cr', 'municipal', 'safety', 'industrial', 'operation',
  'environmental', 'trademark', 'scale', 'shomos',
  'chamber', 'national_address', 'zakat', 'saudization',
  'security_contract', 'other'
);

CREATE TYPE gr_license_status AS ENUM ('active', 'expired', 'pending_renewal', 'cancelled');

CREATE TYPE gr_violation_path AS ENUM ('direct_payment', 'objection', 'settlement');
CREATE TYPE gr_violation_result AS ENUM ('approved', 'rejected', 'pending');
CREATE TYPE gr_alert_type AS ENUM ('expiry_90', 'expiry_60', 'expiry_30', 'expiry_7', 'expired', 'deadline');
CREATE TYPE gr_committee_type AS ENUM ('investigation', 'branch_opening', 'branch_closing', 'renovation');

-- ============================================================
-- GR ENTITIES (Legal entities managed by GR)
-- ============================================================
CREATE TABLE gr_entities (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar                   TEXT NOT NULL,
  name_en                   TEXT,
  group_number              INT NOT NULL CHECK (group_number BETWEEN 1 AND 4),
  entity_type               TEXT NOT NULL DEFAULT 'company' CHECK (entity_type IN ('company', 'branch', 'individual')),
  legal_structure            TEXT, -- LLC, simplified JSC, etc.

  -- Core registrations
  cr_number                 TEXT,
  cr_expiry                 DATE,
  municipal_license_number  TEXT,
  municipal_license_expiry  DATE,
  safety_permit_number      TEXT,
  safety_permit_expiry      DATE,
  industrial_license_number TEXT,
  operation_license_number  TEXT,
  environmental_permit_number TEXT,
  zakat_number              TEXT,
  tax_number                TEXT,

  -- Location & Address
  national_address          JSONB, -- {city, district, building_no, postal_code, additional_no, short_address}

  -- Financial
  iban                      TEXT,
  bank_account              TEXT,
  insurance_subscription_no TEXT,

  -- Government files
  labor_office_file_no      TEXT,
  shomos_subscription_no    TEXT,
  shomos_expiry             DATE,
  chamber_membership_no     TEXT,
  sabil_subscription_no     TEXT,
  sabil_expiry              DATE,

  -- Hierarchy
  parent_entity_id          UUID REFERENCES gr_entities(id),
  linked_company_id         UUID REFERENCES companies(id), -- links to main org structure
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gr_entities_group ON gr_entities(group_number);
CREATE INDEX idx_gr_entities_parent ON gr_entities(parent_entity_id);

-- ============================================================
-- GR LICENSES (All licenses & registrations per entity)
-- ============================================================
CREATE TABLE gr_licenses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id           UUID NOT NULL REFERENCES gr_entities(id),
  license_type        gr_license_type NOT NULL,
  license_number      TEXT,
  license_name        TEXT, -- custom label
  issue_date          DATE,
  expiry_date         DATE,
  renewal_alert_days  INT NOT NULL DEFAULT 90,
  status              gr_license_status NOT NULL DEFAULT 'active',
  document_url        TEXT,
  last_renewed_at     TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gr_licenses_entity ON gr_licenses(entity_id);
CREATE INDEX idx_gr_licenses_expiry ON gr_licenses(expiry_date) WHERE status = 'active';
CREATE INDEX idx_gr_licenses_status ON gr_licenses(status);

-- ============================================================
-- GR SCALES (Registered with SASO/Taqees)
-- ============================================================
CREATE TABLE gr_scales (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id               UUID NOT NULL REFERENCES gr_entities(id),
  serial_number           TEXT NOT NULL,
  verification_sticker_no TEXT,
  sticker_expiry          DATE,
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- GR TRADEMARKS
-- ============================================================
CREATE TABLE gr_trademarks (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id           UUID NOT NULL REFERENCES gr_entities(id),
  trademark_name      TEXT NOT NULL,
  trademark_number    TEXT,
  category            TEXT,
  protection_country  TEXT DEFAULT 'SA',
  expiry_date         DATE,
  document_url        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- GR TASKS (Core task for all 8 procedure types)
-- ============================================================
CREATE TABLE gr_tasks (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_number         VARCHAR(30) UNIQUE,
  task_type           gr_task_type NOT NULL,
  entity_id           UUID REFERENCES gr_entities(id),
  license_id          UUID REFERENCES gr_licenses(id),
  title               TEXT NOT NULL,
  description         TEXT,
  status              gr_task_status NOT NULL DEFAULT 'draft',
  priority            priority_level NOT NULL DEFAULT 'normal',

  -- People
  requested_by        UUID REFERENCES employees(id),
  assigned_to         UUID REFERENCES employees(id),
  requesting_dept_id  UUID REFERENCES departments(id),

  -- Timing
  due_date            DATE,
  completed_at        TIMESTAMPTZ,
  is_on_time          BOOLEAN,

  -- Financial
  invoice_amount      DECIMAL(15,2),
  payment_receipt_url TEXT,

  -- Documents
  final_document_url  TEXT,
  external_party      TEXT, -- translation office, consultant, etc.

  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gr_tasks_type ON gr_tasks(task_type);
CREATE INDEX idx_gr_tasks_entity ON gr_tasks(entity_id);
CREATE INDEX idx_gr_tasks_status ON gr_tasks(status);
CREATE INDEX idx_gr_tasks_assigned ON gr_tasks(assigned_to);
CREATE INDEX idx_gr_tasks_due ON gr_tasks(due_date) WHERE status NOT IN ('completed', 'cancelled');

-- GR Task number sequence
CREATE SEQUENCE gr_task_seq START 1;

CREATE OR REPLACE FUNCTION next_gr_task_number(p_type TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'GR-' || upper(substring(p_type, 1, 3)) || '-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('gr_task_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- GR TASK STEPS (Approval chain per task)
-- ============================================================
CREATE TABLE gr_task_steps (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       UUID NOT NULL REFERENCES gr_tasks(id) ON DELETE CASCADE,
  step_order    INT NOT NULL,
  step_name     TEXT NOT NULL,
  actor_role    TEXT NOT NULL, -- gr_employee, gr_manager, finance_supervisor, banking_employee
  actor_id      UUID REFERENCES employees(id),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'returned')),
  notes         TEXT,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gr_task_steps_task ON gr_task_steps(task_id);

-- ============================================================
-- GR VIOLATIONS (37-field model)
-- ============================================================
CREATE TABLE gr_violations (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id                   UUID REFERENCES gr_tasks(id),
  violation_number          TEXT NOT NULL,
  description               TEXT,

  -- Dates & Deadlines
  notice_received_at        DATE,
  notice_date               DATE,
  violation_observed_date   DATE,
  violation_confirmed_date  DATE,
  justification_deadline    DATE,
  objection_deadline        DATE,
  settlement_deadline       DATE,
  payment_deadline          DATE,

  -- Authorities
  issuing_authority         TEXT, -- Ministry of Commerce, Labor Office, etc.
  notified_entity_per_notice TEXT,
  actual_entity_id          UUID REFERENCES gr_entities(id),

  -- Financial
  violation_amount          DECIMAL(15,2),
  payment_reference         TEXT,

  -- Identification
  computer_number           TEXT,
  labor_office_file_no      TEXT,

  -- Resolution
  resolution_path           gr_violation_path,

  -- PATH A: Direct Payment
  direct_payment_reason     TEXT,
  direct_payment_date       DATE,
  direct_payment_employee   UUID REFERENCES employees(id),

  -- PATH B: Objection
  objection_rationale       TEXT,
  objection_date            DATE,
  objection_response_date   DATE,
  objection_result          gr_violation_result,
  post_rejection_payment_date DATE,
  objection_employee        UUID REFERENCES employees(id),

  -- PATH C: Settlement
  settlement_rationale      TEXT,
  settlement_date           DATE,
  settlement_employee_id    UUID REFERENCES employees(id),
  settlement_employee_contract_end DATE,
  settlement_agreement_end  DATE,
  post_settlement_amount    DECIMAL(15,2),
  post_settlement_payment_date DATE,
  settlement_handler_id     UUID REFERENCES employees(id),

  -- Tracking
  data_entry_employee_id    UUID REFERENCES employees(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gr_violations_entity ON gr_violations(actual_entity_id);
CREATE INDEX idx_gr_violations_path ON gr_violations(resolution_path);

-- ============================================================
-- GR WORKSHOPS
-- ============================================================
CREATE TABLE gr_workshops (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id              UUID REFERENCES gr_tasks(id),
  workshop_title       TEXT NOT NULL,
  organizing_authority TEXT,
  workshop_date        DATE,
  attendees            UUID[], -- employee IDs
  summary_points       TEXT[],
  recommendations      TEXT[],
  document_url         TEXT,
  requesting_dept_id   UUID REFERENCES departments(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- GR COMMITTEES (Investigation + Branch)
-- ============================================================
CREATE TABLE gr_committees (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id           UUID REFERENCES gr_tasks(id),
  committee_type    gr_committee_type NOT NULL,
  title             TEXT NOT NULL,
  members           JSONB NOT NULL DEFAULT '[]', -- [{employee_id, role, tasks: [{title, status, notes}]}]
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  decision_summary  TEXT,
  recommendations   TEXT,
  document_url      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- GR ALERTS (Automated expiry & deadline alerts)
-- ============================================================
CREATE TABLE gr_alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id       UUID REFERENCES gr_entities(id),
  license_id      UUID REFERENCES gr_licenses(id),
  violation_id    UUID REFERENCES gr_violations(id),
  alert_type      gr_alert_type NOT NULL,
  alert_date      DATE NOT NULL,
  message_ar      TEXT,
  message_en      TEXT,
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES employees(id),
  acknowledged_at TIMESTAMPTZ,
  task_id         UUID REFERENCES gr_tasks(id), -- linked renewal task if auto-created
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gr_alerts_unack ON gr_alerts(is_acknowledged) WHERE is_acknowledged = false;
CREATE INDEX idx_gr_alerts_date ON gr_alerts(alert_date DESC);

-- ============================================================
-- GR HELPER FUNCTIONS
-- ============================================================

-- Get licenses expiring within N days
CREATE OR REPLACE FUNCTION get_expiring_licenses(days_ahead INT DEFAULT 90)
RETURNS TABLE (
  license_id UUID,
  entity_id UUID,
  entity_name TEXT,
  license_type gr_license_type,
  license_number TEXT,
  expiry_date DATE,
  days_remaining INT
) AS $$
  SELECT
    l.id,
    e.id,
    e.name_ar,
    l.license_type,
    l.license_number,
    l.expiry_date,
    (l.expiry_date - CURRENT_DATE)::INT as days_remaining
  FROM gr_licenses l
  JOIN gr_entities e ON l.entity_id = e.id
  WHERE l.status = 'active'
    AND l.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + days_ahead)
  ORDER BY l.expiry_date ASC
$$ LANGUAGE sql STABLE;

-- Auto-schedule alerts on license insert/update
CREATE OR REPLACE FUNCTION schedule_license_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for active licenses with expiry dates
  IF NEW.status = 'active' AND NEW.expiry_date IS NOT NULL THEN
    -- Delete old unacknowledged alerts for this license
    DELETE FROM gr_alerts WHERE license_id = NEW.id AND is_acknowledged = false;
    
    -- Schedule alerts at 90, 60, 30, 7, 0 days
    INSERT INTO gr_alerts (entity_id, license_id, alert_type, alert_date, message_ar, message_en)
    VALUES
      (NEW.entity_id, NEW.id, 'expiry_90', NEW.expiry_date - 90,
       'تنبيه مبكر: ترخيص يقترب من الانتهاء', 'Early warning: License approaching expiry'),
      (NEW.entity_id, NEW.id, 'expiry_60', NEW.expiry_date - 60,
       'تذكير: ترخيص يقترب من الانتهاء', 'Reminder: License approaching expiry'),
      (NEW.entity_id, NEW.id, 'expiry_30', NEW.expiry_date - 30,
       'عاجل: ترخيص يقترب من الانتهاء', 'Urgent: License approaching expiry'),
      (NEW.entity_id, NEW.id, 'expiry_7', NEW.expiry_date - 7,
       'حرج: ترخيص على وشك الانتهاء', 'Critical: License about to expire'),
      (NEW.entity_id, NEW.id, 'expired', NEW.expiry_date,
       'منتهي: ترخيص انتهت صلاحيته', 'Expired: License has expired');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER license_alert_scheduler
  AFTER INSERT OR UPDATE OF expiry_date, status ON gr_licenses
  FOR EACH ROW EXECUTE FUNCTION schedule_license_alerts();

-- ============================================================
-- GR TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gr_entities FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gr_licenses FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gr_tasks FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gr_violations FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gr_committees FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- GR ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE gr_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE gr_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE gr_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE gr_trademarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gr_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gr_task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE gr_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gr_workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE gr_committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE gr_alerts ENABLE ROW LEVEL SECURITY;

-- GR tables: GR roles + super admin + holding CEO
CREATE POLICY "gr_entities_select" ON gr_entities FOR SELECT USING (
  is_super_admin() OR is_holding_ceo() OR has_role('gr_employee') OR has_role('gr_manager')
);
CREATE POLICY "gr_licenses_select" ON gr_licenses FOR SELECT USING (
  is_super_admin() OR is_holding_ceo() OR has_role('gr_employee') OR has_role('gr_manager')
);
CREATE POLICY "gr_scales_select" ON gr_scales FOR SELECT USING (
  is_super_admin() OR has_role('gr_employee') OR has_role('gr_manager')
);
CREATE POLICY "gr_trademarks_select" ON gr_trademarks FOR SELECT USING (
  is_super_admin() OR has_role('gr_employee') OR has_role('gr_manager')
);
CREATE POLICY "gr_tasks_select" ON gr_tasks FOR SELECT USING (
  is_super_admin() OR is_holding_ceo() OR has_role('gr_employee') OR has_role('gr_manager')
  OR assigned_to = current_employee_id()
  OR requested_by = current_employee_id()
);
CREATE POLICY "gr_task_steps_select" ON gr_task_steps FOR SELECT USING (
  is_super_admin() OR has_role('gr_employee') OR has_role('gr_manager')
  OR actor_id = current_employee_id()
);
CREATE POLICY "gr_violations_select" ON gr_violations FOR SELECT USING (
  is_super_admin() OR is_holding_ceo() OR has_role('gr_employee') OR has_role('gr_manager')
);
CREATE POLICY "gr_workshops_select" ON gr_workshops FOR SELECT USING (
  is_super_admin() OR has_role('gr_employee') OR has_role('gr_manager')
);
CREATE POLICY "gr_committees_select" ON gr_committees FOR SELECT USING (
  is_super_admin() OR has_role('gr_employee') OR has_role('gr_manager')
);
CREATE POLICY "gr_alerts_select" ON gr_alerts FOR SELECT USING (
  is_super_admin() OR has_role('gr_employee') OR has_role('gr_manager')
);

-- GR write policies
CREATE POLICY "gr_tasks_insert" ON gr_tasks FOR INSERT WITH CHECK (
  has_role('gr_employee') OR has_role('gr_manager') OR is_super_admin()
);
CREATE POLICY "gr_tasks_update" ON gr_tasks FOR UPDATE USING (
  has_role('gr_employee') OR has_role('gr_manager') OR is_super_admin()
);
CREATE POLICY "gr_violations_insert" ON gr_violations FOR INSERT WITH CHECK (
  has_role('gr_employee') OR has_role('gr_manager') OR is_super_admin()
);
CREATE POLICY "gr_task_steps_update" ON gr_task_steps FOR UPDATE USING (
  actor_id = current_employee_id() OR has_role('gr_manager') OR is_super_admin()
);
