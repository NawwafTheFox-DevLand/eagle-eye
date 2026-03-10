-- ================================================================
-- 004_department_heads.sql
-- Assigns department heads and user roles based on org structure.
-- REVIEW CAREFULLY before running.
-- Uses employee_code to look up UUIDs — safe to re-run (idempotent).
-- ================================================================

BEGIN;

-- ── HOLDING COMPANY CEO ─────────────────────────────────────────
UPDATE companies
SET ceo_employee_id = (SELECT id FROM employees WHERE employee_code = '1577')
WHERE code = 'MH';


-- ── DEPARTMENT HEADS — HOLDING COMPANY (MH) ─────────────────────

-- H1-FIN10  المالية — بركات الله سعيد خان (مراقب مالي, Grade 9)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '3125')
WHERE code = 'FIN10'
  AND company_id = (SELECT id FROM companies WHERE code = 'MH');

-- H1-HR10  الموارد البشرية — مدير رأس المال البشري (9998)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '9998')
WHERE code = 'HR10'
  AND company_id = (SELECT id FROM companies WHERE code = 'MH');

-- H1-IT10  تقنية المعلومات — شاهد بارويز (مدير التحول الرقمي, Grade 9)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '3164')
WHERE code = 'IT10'
  AND company_id = (SELECT id FROM companies WHERE code = 'MH');

-- H1-GR10  العلاقات الحكومية — عادل عبدالله (مدير علاقات حكومية, Grade 7)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '2725')
WHERE code = 'GR10'
  AND company_id = (SELECT id FROM companies WHERE code = 'MH');

-- H1-LG10  الإدارة القانونية — مها منصور (مدير الشئون القانونية, Grade 9)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '3016')
WHERE code = 'LG10'
  AND company_id = (SELECT id FROM companies WHERE code = 'MH');

-- H1-PC10  المشتريات — داوار علي (منسق مشتريات, Grade 5)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '3156')
WHERE code = 'PC10'
  AND company_id = (SELECT id FROM companies WHERE code = 'MH');

-- H1-AD10  المراجعة الداخلية — منى عيد (مدقق امتثال, Grade 5)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '3130')
WHERE code = 'AD10'
  AND company_id = (SELECT id FROM companies WHERE code = 'MH');

-- H1-Z99  خدمات رئيس مجلس الإدارة — SKIPPED (no manager, reports to chairman)


-- ── DEPARTMENT HEADS — SUBSIDIARIES ─────────────────────────────

-- G1-S99  منصور للذهب — SKIPPED (all Grade 1 Saudization staff)

-- G2-FIN10  مصنع الجودة — المالية — محمد عصمان (محاسب تكاليف, Grade 5)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '3179')
WHERE code = 'FIN10'
  AND company_id = (SELECT id FROM companies WHERE code = 'G2');

-- G3-G31  موطن الذهب — مشتريات — محمد صالح (بائع ذهب, Grade 5)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '9050')
WHERE code = 'G31'
  AND company_id = (SELECT id FROM companies WHERE code = 'G3');

-- M1-M11  التكنولوجيا — التشغيل — سامر حسن (مدير التشغيل, Grade 9)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '3127')
WHERE code = 'M11'
  AND company_id = (SELECT id FROM companies WHERE code = 'M1');

-- R1-R11  الأوتاد — العقار — حامد عائش (مدير العقار, Grade 6)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '3203')
WHERE code = 'R11'
  AND company_id = (SELECT id FROM companies WHERE code = 'R1');

-- R1-R12  الأوتاد — العقار 2 — شيخ علي (منسق عقاري, Grade 5)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '1973')
WHERE code = 'R12'
  AND company_id = (SELECT id FROM companies WHERE code = 'R1');

-- R2-FIN10  اسكان — المالية — المعتز بالله (رئيس حسابات, Grade 8)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '2857')
WHERE code = 'FIN10'
  AND company_id = (SELECT id FROM companies WHERE code = 'R2');

-- R2-R21  اسكان — العمليات — أمين أحمد (مدير العمليات, Grade 9)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '2858')
WHERE code = 'R21'
  AND company_id = (SELECT id FROM companies WHERE code = 'R2');

-- R2-R22  اسكان — المصنع — صابر علي (مدير إنتاج, Grade 6)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '2861')
WHERE code = 'R22'
  AND company_id = (SELECT id FROM companies WHERE code = 'R2');

-- R2-R23  اسكان — الإدارة — عبدالرحمن سعيد (سكرتير, Grade 4)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '2902')
WHERE code = 'R23'
  AND company_id = (SELECT id FROM companies WHERE code = 'R2');

-- R2-S99  اسكان — دعم موارد بشرية — SKIPPED (all Grade 1 Saudization staff)

-- T1-T11  ام بي جي — مبيعات — رايد حيدره (مشرف فرع, Grade 5)
UPDATE departments
SET head_employee_id = (SELECT id FROM employees WHERE employee_code = '3197')
WHERE code = 'T11'
  AND company_id = (SELECT id FROM companies WHERE code = 'T1');


-- ── USER ROLES ──────────────────────────────────────────────────
-- All department heads get 'department_manager'.
-- Special additional roles per spec: finance_approver, hr_approver, gr_manager.
-- Uses NOT EXISTS guard — safe to re-run.
-- If your user_roles table has a unique constraint on (employee_id, role),
-- replace the NOT EXISTS block with ON CONFLICT (employee_id, role) DO NOTHING.

-- Helper macro (repeated per employee):
-- INSERT INTO user_roles (employee_id, role)
-- SELECT e.id, '<role>' FROM employees e WHERE e.employee_code = '<code>'
--   AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = '<role>');

-- 3125 — بركات الله (Finance Controller) → department_manager + finance_approver
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '3125'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'finance_approver' FROM employees e WHERE e.employee_code = '3125'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'finance_approver');

-- 9998 — مدير رأس المال البشري → department_manager + hr_approver
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '9998'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'hr_approver' FROM employees e WHERE e.employee_code = '9998'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'hr_approver');

-- 3164 — شاهد بارويز (IT) → department_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '3164'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

-- 2725 — عادل عبدالله (GR) → department_manager + gr_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '2725'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'gr_manager' FROM employees e WHERE e.employee_code = '2725'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'gr_manager');

-- 3016 — مها منصور (Legal) → department_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '3016'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

-- 3156 — داوار علي (Procurement) → department_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '3156'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

-- 3130 — منى عيد (Audit) → department_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '3130'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

-- 3179 — محمد عصمان (G2 Finance) → department_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '3179'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

-- 9050 — محمد صالح (G3) → department_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '9050'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

-- 3127 — سامر حسن (M1 Operations) → department_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '3127'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

-- 3203 — حامد عائش (R1-R11) → department_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '3203'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

-- 1973 — شيخ علي (R1-R12) → department_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '1973'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

-- 2857 — المعتز بالله (R2 Finance) → department_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '2857'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

-- 2858 — أمين أحمد (R2 Operations) → department_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '2858'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

-- 2861 — صابر علي (R2 Factory) → department_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '2861'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

-- 2902 — عبدالرحمن سعيد (R2 Admin) → department_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '2902'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');

-- 3197 — رايد حيدره (T1 Sales) → department_manager
INSERT INTO user_roles (employee_id, role)
SELECT e.id, 'department_manager' FROM employees e WHERE e.employee_code = '3197'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.employee_id = e.id AND ur.role = 'department_manager');


COMMIT;
