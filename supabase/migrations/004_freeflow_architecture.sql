-- ============================================================
-- Migration 004: Free-flow request architecture
-- Adds statuses, action types, roles, and columns required
-- by the new routing model (no approval chain).
-- ============================================================

-- ── New request statuses ─────────────────────────────────────
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'pending_execution';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'assigned_to_employee';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'forwarded';

-- ── New action types ─────────────────────────────────────────
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'forwarded';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'auto_assigned';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'pending_execution';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'handle_myself';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'assigned_to_employee';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'employee_completed';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'returned_to_employee';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'sent_to_requester';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'assigned';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'ceo_approved';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'hr_approved';

-- ── New system roles ─────────────────────────────────────────
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'requester';
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'handler';

-- ── New columns on requests ──────────────────────────────────
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS assigned_to             UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS execution_started_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS execution_completed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS requires_ceo_approval   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ceo_approved_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hr_approved_at          TIMESTAMPTZ;

-- ── New columns on request_actions ──────────────────────────
ALTER TABLE request_actions
  ADD COLUMN IF NOT EXISTS from_person_id UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS to_person_id   UUID REFERENCES employees(id);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON requests(assigned_to);
