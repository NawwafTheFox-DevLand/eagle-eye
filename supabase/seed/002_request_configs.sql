INSERT INTO request_type_configs (request_type, name_ar, name_en, icon, is_routine_eligible, requires_evidence, requires_esignature, esignature_type, default_sla_target_hours, default_sla_max_hours, requires_finance_approval, requires_hr_approval, requires_holding_ceo, confidentiality_level) VALUES
('general_internal', 'طلب داخلي عام', 'General Internal Request', 'FileText', true, true, false, NULL, 48, 120, false, false, false, 'normal'),
('intercompany', 'طلب بين الشركات', 'Intercompany Request', 'Building2', false, true, false, NULL, 72, 168, false, false, false, 'normal'),
('cross_department', 'طلب بين الأقسام', 'Cross-Department Request', 'ArrowLeftRight', true, true, false, NULL, 48, 120, false, false, false, 'normal'),
('fund_disbursement', 'طلب صرف مالي', 'Fund Disbursement', 'Banknote', false, true, true, 'workflow_approval', 72, 168, true, false, true, 'normal'),
('leave_approval', 'طلب إجازة', 'Leave Approval', 'CalendarOff', true, true, true, 'internal_acknowledgment', 24, 72, false, true, false, 'normal'),
('promotion', 'طلب ترقية', 'Promotion Request', 'TrendingUp', false, true, true, 'legally_binding', 120, 336, false, true, false, 'confidential'),
('demotion_disciplinary', 'طلب تأديبي / تنزيل', 'Demotion / Disciplinary', 'AlertTriangle', false, true, true, 'legally_binding', 120, 336, false, true, false, 'restricted'),
('create_department', 'إنشاء قسم جديد', 'Create New Department', 'FolderPlus', false, true, false, NULL, 168, 336, false, false, true, 'normal'),
('create_company', 'إنشاء شركة جديدة', 'Create New Company', 'BuildingPlus', false, true, true, 'legally_binding', 336, 720, false, false, true, 'confidential'),
('create_position', 'إنشاء وظيفة جديدة', 'Create New Position', 'UserPlus', false, true, false, NULL, 120, 336, false, true, false, 'normal');
