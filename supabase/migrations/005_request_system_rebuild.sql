-- ============================================================
-- Migration 005: Request system rebuild — new stamp columns
-- Run in Supabase SQL Editor
-- ============================================================

-- Add new stamp columns to requests (replaces old requires_*_approval pattern)
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS requires_ceo              BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_hr               BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_finance          BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ceo_stamped_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ceo_stamped_by            UUID        REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS hr_stamped_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hr_stamped_by             UUID        REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS finance_stamped_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finance_stamped_by        UUID        REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS company_exit_stamped_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS company_exit_stamped_by   UUID        REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS completed_at              TIMESTAMPTZ;

-- Add new action types needed by the ball-model workflow
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'returned';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'asked_requester';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'company_exit_stamped';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'finance_stamped';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'hr_stamped';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'ceo_stamped';

-- Add new evidence columns (if table schema differs from current code)
ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS file_url   TEXT,
  ADD COLUMN IF NOT EXISTS file_type  TEXT,
  ADD COLUMN IF NOT EXISTS file_size  BIGINT,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES employees(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to_status
  ON requests(assigned_to, status)
  WHERE assigned_to IS NOT NULL;
