-- ============================================================
-- Eagle Eye (عين النسر) — Mansour Holding
-- Migration 002: Request System — Workflows, Approvals, Evidence
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE request_status AS ENUM (
  'draft', 'submitted', 'under_review', 'pending_clarification',
  'returned', 'resubmitted', 'approved', 'rejected',
  'completed', 'cancelled', 'archived'
);

CREATE TYPE request_type AS ENUM (
  'general_internal', 'intercompany', 'cross_department',
  'fund_disbursement', 'leave_approval', 'promotion',
  'demotion_disciplinary', 'create_department', 'create_company',
  'create_position'
);

CREATE TYPE action_type AS ENUM (
  'submitted', 'reviewed', 'approved', 'rejected',
  'sent_back', 'returned', 'resubmitted', 'completed',
  'cancelled', 'archived', 'delegated', 'escalated', 'overridden'
);

CREATE TYPE confidentiality_level AS ENUM ('normal', 'confidential', 'restricted');
CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE approval_step_status AS ENUM ('pending', 'approved', 'rejected', 'delegated', 'skipped');
CREATE TYPE evidence_type AS ENUM ('typed_rationale', 'document', 'form_data', 'external_link');
CREATE TYPE signature_type AS ENUM ('internal_acknowledgment', 'workflow_approval', 'legally_binding');
CREATE TYPE notification_type AS ENUM (
  'action_required', 'status_update', 'sla_warning', 'sla_breach',
  'escalation', 'delegation', 'system', 'gr_alert'
);

-- ============================================================
-- REQUEST TYPE CONFIGURATION
-- ============================================================
CREATE TABLE request_type_configs (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_type              request_type NOT NULL UNIQUE,
  name_ar                   TEXT NOT NULL,
  name_en                   TEXT NOT NULL,
  description_ar            TEXT,
  description_en            TEXT,
  icon                      TEXT, -- lucide icon name
  is_routine_eligible       BOOLEAN NOT NULL DEFAULT false,
  requires_evidence         BOOLEAN NOT NULL DEFAULT true,
  requires_esignature       BOOLEAN NOT NULL DEFAULT false,
  esignature_type           signature_type,
  default_sla_target_hours  INT NOT NULL DEFAULT 48,
  default_sla_max_hours     INT NOT NULL DEFAULT 120,
  requires_finance_approval BOOLEAN NOT NULL DEFAULT false,
  requires_hr_approval      BOOLEAN NOT NULL DEFAULT false,
  requires_holding_ceo      BOOLEAN NOT NULL DEFAULT false,
  confidentiality_level     confidentiality_level NOT NULL DEFAULT 'normal',
  form_schema               JSONB, -- dynamic form definition
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- REQUESTS
-- ============================================================
CREATE TABLE requests (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number        VARCHAR(30) NOT NULL UNIQUE,
  request_type          request_type NOT NULL,
  status                request_status NOT NULL DEFAULT 'draft',
  is_routine            BOOLEAN NOT NULL DEFAULT false,
  confidentiality       confidentiality_level NOT NULL DEFAULT 'normal',
  priority              priority_level NOT NULL DEFAULT 'normal',

  -- Origin
  requester_id          UUID NOT NULL REFERENCES employees(id),
  origin_company_id     UUID NOT NULL REFERENCES companies(id),
  origin_dept_id        UUID REFERENCES departments(id),

  -- Destination
  destination_company_id UUID REFERENCES companies(id),
  destination_dept_id    UUID REFERENCES departments(id),

  -- Content
  subject               TEXT NOT NULL,
  description           TEXT,
  form_data             JSONB, -- type-specific data

  -- Financial fields
  amount                DECIMAL(15,2),
  currency              VARCHAR(3) DEFAULT 'SAR',
  payee                 TEXT,
  cost_center           TEXT,
  budget_source         TEXT,
  due_date              DATE,

  -- Leave fields
  leave_type            TEXT,
  leave_start_date      DATE,
  leave_end_date        DATE,
  replacement_employee_id UUID REFERENCES employees(id),

  -- HR fields
  current_position_id   UUID REFERENCES positions(id),
  proposed_position_id  UUID REFERENCES positions(id),
  effective_date        DATE,
  compensation_impact   TEXT,

  -- SLA tracking
  sla_target_at         TIMESTAMPTZ,
  sla_max_at            TIMESTAMPTZ,
  sla_breached          BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  submitted_at          TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_requests_requester ON requests(requester_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_type ON requests(request_type);
CREATE INDEX idx_requests_origin_company ON requests(origin_company_id);
CREATE INDEX idx_requests_destination ON requests(destination_company_id);
CREATE INDEX idx_requests_number ON requests(request_number);
CREATE INDEX idx_requests_sla ON requests(sla_max_at) WHERE sla_breached = false AND status NOT IN ('completed', 'cancelled', 'archived', 'rejected');
CREATE INDEX idx_requests_created ON requests(created_at DESC);

-- ============================================================
-- APPROVAL STEPS
-- ============================================================
CREATE TABLE approval_steps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id      UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  step_order      INT NOT NULL,
  approver_id     UUID NOT NULL REFERENCES employees(id),
  approver_role   system_role,
  is_parallel     BOOLEAN NOT NULL DEFAULT false,
  is_mandatory    BOOLEAN NOT NULL DEFAULT true,
  status          approval_step_status NOT NULL DEFAULT 'pending',
  delegate_id     UUID REFERENCES employees(id),
  note            TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, step_order, approver_id)
);

CREATE INDEX idx_approval_steps_request ON approval_steps(request_id);
CREATE INDEX idx_approval_steps_approver ON approval_steps(approver_id) WHERE status = 'pending';
CREATE INDEX idx_approval_steps_pending ON approval_steps(status) WHERE status = 'pending';

-- ============================================================
-- REQUEST ACTIONS (Audit Trail)
-- ============================================================
CREATE TABLE request_actions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id        UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  action            action_type NOT NULL,
  actor_id          UUID NOT NULL REFERENCES employees(id),
  actor_role        system_role,
  note              TEXT,
  note_visible_to   TEXT NOT NULL DEFAULT 'next_party' CHECK (note_visible_to IN ('next_party', 'all_participants')),
  rationale         TEXT,
  from_status       request_status,
  to_status         request_status NOT NULL,

  -- E-signature
  esignature_type   signature_type,
  signature_data    TEXT, -- canvas data or hash
  signed_at         TIMESTAMPTZ,

  -- Metadata
  ip_address        INET,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_request_actions_request ON request_actions(request_id);
CREATE INDEX idx_request_actions_actor ON request_actions(actor_id);
CREATE INDEX idx_request_actions_time ON request_actions(created_at DESC);

-- ============================================================
-- EVIDENCE & ATTACHMENTS
-- ============================================================
CREATE TABLE evidence (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id      UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  action_id       UUID REFERENCES request_actions(id),
  uploader_id     UUID NOT NULL REFERENCES employees(id),
  evidence_type   evidence_type NOT NULL,
  typed_text      TEXT,
  file_path       TEXT,
  file_name       TEXT,
  file_size_bytes BIGINT,
  mime_type       TEXT,
  version         INT NOT NULL DEFAULT 1,
  superseded_by   UUID REFERENCES evidence(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_request ON evidence(request_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  request_id    UUID REFERENCES requests(id),
  channel       TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'both')),
  type          notification_type NOT NULL,
  title_ar      TEXT,
  title_en      TEXT,
  body_ar       TEXT,
  body_en       TEXT,
  action_url    TEXT,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  sent_at       TIMESTAMPTZ,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id) WHERE is_read = false;

-- ============================================================
-- SLA CONFIGURATION
-- ============================================================
CREATE TABLE sla_configs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_type        request_type NOT NULL,
  company_id          UUID REFERENCES companies(id), -- null = global default
  target_hours        INT NOT NULL,
  max_hours           INT NOT NULL,
  escalation_hours    INT NOT NULL,
  escalation_to_role  system_role NOT NULL DEFAULT 'ceo',
  override_reason     TEXT,
  overridden_by       UUID REFERENCES employees(id),
  approved_by_ceo     UUID REFERENCES employees(id),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_type, company_id)
);

-- ============================================================
-- AUTOMATION RULES (Routine request bypass)
-- ============================================================
CREATE TABLE automation_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_type    request_type NOT NULL,
  company_id      UUID REFERENCES companies(id),
  department_id   UUID REFERENCES departments(id),
  name_ar         TEXT NOT NULL,
  name_en         TEXT,
  conditions      JSONB NOT NULL, -- rule conditions
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES employees(id),
  approved_by     UUID REFERENCES employees(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- REQUEST NUMBER GENERATION
-- ============================================================
CREATE SEQUENCE request_seq START 1;

CREATE OR REPLACE FUNCTION next_request_number(
  p_company_code TEXT,
  p_dept_code TEXT,
  p_request_type TEXT DEFAULT 'GEN'
)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_seq TEXT;
  v_type_code TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_seq := lpad(nextval('request_seq')::TEXT, 6, '0');
  
  -- Map request type to short code
  v_type_code := CASE p_request_type
    WHEN 'general_internal' THEN 'GEN'
    WHEN 'intercompany' THEN 'ICR'
    WHEN 'cross_department' THEN 'CDR'
    WHEN 'fund_disbursement' THEN 'FIN'
    WHEN 'leave_approval' THEN 'LVE'
    WHEN 'promotion' THEN 'PRM'
    WHEN 'demotion_disciplinary' THEN 'DSC'
    WHEN 'create_department' THEN 'NDT'
    WHEN 'create_company' THEN 'NCO'
    WHEN 'create_position' THEN 'NPS'
    ELSE 'GEN'
  END;
  
  RETURN p_company_code || '-' || p_dept_code || '-' || v_type_code || '-' || v_year || '-' || v_seq;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON requests 
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Auto-set SLA on submit
CREATE OR REPLACE FUNCTION set_request_sla()
RETURNS TRIGGER AS $$
DECLARE
  v_config request_type_configs%ROWTYPE;
BEGIN
  IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
    NEW.submitted_at := now();
    
    SELECT * INTO v_config FROM request_type_configs 
    WHERE request_type = NEW.request_type AND is_active = true;
    
    IF FOUND THEN
      NEW.sla_target_at := now() + (v_config.default_sla_target_hours || ' hours')::INTERVAL;
      NEW.sla_max_at := now() + (v_config.default_sla_max_hours || ' hours')::INTERVAL;
    END IF;
  END IF;
  
  IF NEW.status IN ('completed', 'rejected', 'cancelled') AND OLD.status NOT IN ('completed', 'rejected', 'cancelled') THEN
    NEW.completed_at := now();
    IF NEW.sla_max_at IS NOT NULL AND now() > NEW.sla_max_at THEN
      NEW.sla_breached := true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER request_sla_trigger BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION set_request_sla();

-- Log every request action
CREATE OR REPLACE FUNCTION log_request_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, actor_id)
  VALUES (
    'request_actions',
    NEW.id,
    'INSERT',
    NULL,
    to_jsonb(NEW),
    NEW.actor_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER request_action_audit AFTER INSERT ON request_actions
  FOR EACH ROW EXECUTE FUNCTION log_request_action();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_type_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

-- Request visibility: requester, approvers, dept manager, CEO, super admin
CREATE POLICY "requests_select" ON requests FOR SELECT USING (
  is_super_admin()
  OR is_holding_ceo()
  -- Requester sees own
  OR requester_id = current_employee_id()
  -- Current approver
  OR id IN (SELECT request_id FROM approval_steps WHERE approver_id = current_employee_id() AND status = 'pending')
  -- Department manager (non-confidential)
  OR (confidentiality = 'normal' AND origin_dept_id IN (
    SELECT department_id FROM user_roles WHERE employee_id = current_employee_id() AND role = 'department_manager' AND is_active = true
  ))
  -- Company CEO
  OR origin_company_id IN (
    SELECT company_id FROM user_roles WHERE employee_id = current_employee_id() AND role = 'ceo' AND is_active = true
  )
  -- Confidential: only direct participants + CEO
  OR (confidentiality IN ('confidential', 'restricted') AND (
    requester_id = current_employee_id()
    OR id IN (SELECT request_id FROM approval_steps WHERE approver_id = current_employee_id())
  ))
);

CREATE POLICY "requests_insert" ON requests FOR INSERT WITH CHECK (
  requester_id = current_employee_id()
);

CREATE POLICY "requests_update" ON requests FOR UPDATE USING (
  is_super_admin()
  OR requester_id = current_employee_id()
  OR id IN (SELECT request_id FROM approval_steps WHERE approver_id = current_employee_id() AND status = 'pending')
);

-- Approval steps: participants + admins
CREATE POLICY "approval_steps_select" ON approval_steps FOR SELECT USING (
  is_super_admin()
  OR approver_id = current_employee_id()
  OR request_id IN (SELECT id FROM requests WHERE requester_id = current_employee_id())
);

-- Request actions: same as request visibility
CREATE POLICY "request_actions_select" ON request_actions FOR SELECT USING (
  is_super_admin()
  OR request_id IN (SELECT id FROM requests) -- inherits request RLS
);
CREATE POLICY "request_actions_insert" ON request_actions FOR INSERT WITH CHECK (
  actor_id = current_employee_id() OR is_super_admin()
);

-- Evidence: follows request visibility
CREATE POLICY "evidence_select" ON evidence FOR SELECT USING (
  is_super_admin()
  OR request_id IN (SELECT id FROM requests)
);
CREATE POLICY "evidence_insert" ON evidence FOR INSERT WITH CHECK (
  uploader_id = current_employee_id()
);

-- Notifications: own only
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (
  recipient_id = current_employee_id()
);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (
  recipient_id = current_employee_id()
);

-- Config tables: read all, modify by admin
CREATE POLICY "rtc_select" ON request_type_configs FOR SELECT USING (true);
CREATE POLICY "sla_select" ON sla_configs FOR SELECT USING (true);
CREATE POLICY "auto_select" ON automation_rules FOR SELECT USING (true);
