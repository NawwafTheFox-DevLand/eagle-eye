-- ============================================================
-- Migration 006: Fix ENUM mismatches for ball-model workflow
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add 'in_progress' to request_status (used as the primary active status)
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'in_progress';

-- 2. Add missing action_type values
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'forwarded';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'assigned';

-- 3. Change actor_role column from system_role ENUM to TEXT
--    so we can store contextual roles like 'requester' and 'handler'
ALTER TABLE request_actions
  ALTER COLUMN actor_role TYPE TEXT USING actor_role::TEXT;
