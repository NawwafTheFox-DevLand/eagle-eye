-- ============================================================
-- Eagle Eye — Seed Data: Initial Company + Test User
-- 
-- ⚠️ BEFORE RUNNING: Replace 'YOUR-AUTH-USER-UUID-HERE' 
--    with the actual UUID from Supabase Auth → Users
-- ============================================================

-- 1. Mansour Holding (parent company)
INSERT INTO companies (id, code, name_ar, name_en, is_holding, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'MH',
  'منصور القابضة',
  'Mansour Holding',
  true,
  true
);

-- 2. Subsidiary companies
INSERT INTO companies (id, code, name_ar, name_en, is_holding, parent_id, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'G1', 'منصور للذهب', 'Mansour Gold', false, 'a0000000-0000-0000-0000-000000000001', true),
  ('a0000000-0000-0000-0000-000000000003', 'G2', 'مصنع الجودة الوطنية', 'National Quality Factory', false, 'a0000000-0000-0000-0000-000000000001', true),
  ('a0000000-0000-0000-0000-000000000004', 'G3', 'موطن الذهب', 'Gold Home', false, 'a0000000-0000-0000-0000-000000000001', true),
  ('a0000000-0000-0000-0000-000000000005', 'T1', 'شركة ام بي جي', 'MBG Trading', false, 'a0000000-0000-0000-0000-000000000001', true),
  ('a0000000-0000-0000-0000-000000000006', 'R1', 'شركة الأوتاد', 'Al-Awtad', false, 'a0000000-0000-0000-0000-000000000001', true),
  ('a0000000-0000-0000-0000-000000000007', 'R2', 'شركة اسكان الدولية', 'International Housing', false, 'a0000000-0000-0000-0000-000000000001', true),
  ('a0000000-0000-0000-0000-000000000008', 'M1', 'شركة التكنولوجيا المتعددة', 'Multi-Technology', false, 'a0000000-0000-0000-0000-000000000001', true);

-- 3. Sectors (Holding level)
INSERT INTO sectors (id, code, name_ar, name_en, company_id) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'S', 'قطاع الخدمات المساندة', 'Support Services', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', 'F', 'القطاع المالي', 'Financial Sector', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000003', 'G', 'قطاع الذهب', 'Gold Sector', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000004', 'R', 'قطاع العقار', 'Real Estate Sector', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000005', 'T', 'القطاع التجاري', 'Commercial Sector', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000006', 'M', 'قطاع التصنيع', 'Manufacturing Sector', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000007', 'A', 'قطاع المراجعة الداخلية', 'Internal Audit Sector', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000008', 'Z', 'قطاع الخدمات والإعاشة', 'Services & Catering', 'a0000000-0000-0000-0000-000000000001');

-- 4. Departments (Holding)
INSERT INTO departments (id, code, name_ar, name_en, company_id, sector_id) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'IT10', 'تقنية المعلومات', 'Information Technology', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002', 'HR10', 'الموارد البشرية', 'Human Resources', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000003', 'FIN10', 'المالية', 'Finance', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000004', 'LG10', 'الإدارة القانونية', 'Legal Department', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000005', 'AD10', 'المراجعة الداخلية', 'Internal Audit', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000007'),
  ('c0000000-0000-0000-0000-000000000006', 'PC10', 'المشتريات', 'Procurement', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000007', 'GR10', 'العلاقات الحكومية', 'Government Relations', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000008', 'Z99', 'خدمات رئيس مجلس الإدارة', 'Chairman Services', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000008');

-- 5. Test Employee (Product Owner)
-- ⚠️ REPLACE 'YOUR-AUTH-USER-UUID-HERE' with the UUID from Supabase Auth
INSERT INTO employees (
  id, employee_code, auth_user_id,
  full_name_en, first_name_en, family_name_en,
  full_name_ar, first_name_ar, family_name_ar,
  company_id, department_id, sector_id,
  email, employment_type, is_active
)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  '1577',
  'YOUR-AUTH-USER-UUID-HERE',   -- ← ⚠️ REPLACE THIS
  'Nawwaf Albahar',
  'Nawwaf',
  'Albahar',
  'نواف الباهر',
  'نواف',
  'الباهر',
  'a0000000-0000-0000-0000-000000000001',  -- Mansour Holding
  'c0000000-0000-0000-0000-000000000001',  -- IT Department
  'b0000000-0000-0000-0000-000000000001',  -- Support Services
  'nawwaf@mansourholding.com',
  'full_time',
  true
);

-- 6. Assign roles: Super Admin + CEO of Holding
INSERT INTO user_roles (employee_id, role, company_id, is_active) VALUES 
  ('d0000000-0000-0000-0000-000000000001', 'super_admin', 'a0000000-0000-0000-0000-000000000001', true),
  ('d0000000-0000-0000-0000-000000000001', 'ceo', 'a0000000-0000-0000-0000-000000000001', true);

-- 7. Verify
SELECT e.full_name_en, e.email, c.name_en as company, d.name_en as department, 
       array_agg(ur.role) as roles
FROM employees e
JOIN companies c ON e.company_id = c.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN user_roles ur ON e.id = ur.employee_id
WHERE e.employee_code = '1577'
GROUP BY e.full_name_en, e.email, c.name_en, d.name_en;
