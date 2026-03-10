'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';

async function getGRAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();
  const { data: employee } = await service.from('employees').select('id').eq('auth_user_id', user.id).single();
  if (!employee) throw new Error('Employee not found');

  const { data: roles } = await service.from('user_roles').select('role').eq('employee_id', employee.id).eq('is_active', true);
  const hasAccess = roles?.some(r => ['super_admin', 'ceo', 'gr_manager', 'gr_employee', 'finance_supervisor', 'banking_employee'].includes(r.role));
  if (!hasAccess) throw new Error('GR access required');

  return { service, employee };
}

const GR_TASK_STEP_TEMPLATES: Record<string, Array<{ step_order: number; step_name: string; step_name_ar: string; actor_role: string }>> = {
  annual_renewal: [
    { step_order: 1, step_name: 'Prepare Renewal Documents',    step_name_ar: 'إعداد وثائق التجديد',          actor_role: 'gr_employee' },
    { step_order: 2, step_name: 'Submit Renewal Application',   step_name_ar: 'تقديم طلب التجديد',           actor_role: 'gr_employee' },
    { step_order: 3, step_name: 'Pay Renewal Fees',             step_name_ar: 'سداد رسوم التجديد',           actor_role: 'banking_employee' },
    { step_order: 4, step_name: 'Upload Payment Receipt',       step_name_ar: 'رفع إيصال الدفع',             actor_role: 'gr_employee' },
    { step_order: 5, step_name: 'Finance Supervisor Approval',  step_name_ar: 'اعتماد مشرف المالية',         actor_role: 'finance_supervisor' },
    { step_order: 6, step_name: 'Await Government Processing',  step_name_ar: 'انتظار معالجة الجهة الحكومية', actor_role: 'gr_employee' },
    { step_order: 7, step_name: 'Follow Up with Authority',     step_name_ar: 'المتابعة مع الجهة',           actor_role: 'gr_employee' },
    { step_order: 8, step_name: 'Receive Renewed License',      step_name_ar: 'استلام الترخيص المجدد',        actor_role: 'gr_employee' },
    { step_order: 9, step_name: 'Archive Documents',            step_name_ar: 'أرشفة الوثائق',               actor_role: 'gr_employee' },
  ],
  issuance: [
    { step_order: 1, step_name: 'Prepare Issuance Documents',   step_name_ar: 'إعداد وثائق الإصدار',         actor_role: 'gr_employee' },
    { step_order: 2, step_name: 'Submit Issuance Application',  step_name_ar: 'تقديم طلب الإصدار',           actor_role: 'gr_employee' },
    { step_order: 3, step_name: 'Pay Issuance Fees',            step_name_ar: 'سداد رسوم الإصدار',           actor_role: 'banking_employee' },
    { step_order: 4, step_name: 'Upload Payment Receipt',       step_name_ar: 'رفع إيصال الدفع',             actor_role: 'gr_employee' },
    { step_order: 5, step_name: 'Finance Supervisor Approval',  step_name_ar: 'اعتماد مشرف المالية',         actor_role: 'finance_supervisor' },
    { step_order: 6, step_name: 'Receive Issued License',       step_name_ar: 'استلام الترخيص الصادر',        actor_role: 'gr_employee' },
    { step_order: 7, step_name: 'Archive Documents',            step_name_ar: 'أرشفة الوثائق',               actor_role: 'gr_employee' },
  ],
  cancellation: [
    { step_order: 1, step_name: 'Prepare Cancellation Request', step_name_ar: 'إعداد طلب الشطب',             actor_role: 'gr_employee' },
    { step_order: 2, step_name: 'Manager Approval',             step_name_ar: 'موافقة المدير',               actor_role: 'gr_manager' },
    { step_order: 3, step_name: 'Submit Cancellation Application', step_name_ar: 'تقديم طلب الشطب للجهة',  actor_role: 'gr_employee' },
    { step_order: 4, step_name: 'Await Government Confirmation', step_name_ar: 'انتظار تأكيد الجهة',        actor_role: 'gr_employee' },
    { step_order: 5, step_name: 'Archive Documents',            step_name_ar: 'أرشفة الوثائق',               actor_role: 'gr_employee' },
  ],
  inquiry: [
    { step_order: 1, step_name: 'Submit Inquiry',               step_name_ar: 'تقديم الاستعلام',             actor_role: 'gr_employee' },
    { step_order: 2, step_name: 'Follow Up',                    step_name_ar: 'المتابعة',                    actor_role: 'gr_employee' },
    { step_order: 3, step_name: 'Receive Response',             step_name_ar: 'استلام الرد',                 actor_role: 'gr_employee' },
  ],
  violation: [
    { step_order: 1, step_name: 'Review Violation Notice',      step_name_ar: 'مراجعة إشعار المخالفة',       actor_role: 'gr_manager' },
    { step_order: 2, step_name: 'Prepare Defense Response',     step_name_ar: 'إعداد رد الاعتراض',           actor_role: 'gr_employee' },
    { step_order: 3, step_name: 'Pay Fine (if applicable)',     step_name_ar: 'سداد الغرامة (إن وجدت)',       actor_role: 'banking_employee' },
    { step_order: 4, step_name: 'Upload Payment Proof',         step_name_ar: 'رفع إثبات الدفع',             actor_role: 'gr_employee' },
    { step_order: 5, step_name: 'Submit Response to Authority', step_name_ar: 'تقديم الرد للجهة الحكومية',   actor_role: 'gr_employee' },
    { step_order: 6, step_name: 'Receive Resolution Decision',  step_name_ar: 'استلام قرار الفصل',            actor_role: 'gr_manager' },
  ],
  workshop: [
    { step_order: 1, step_name: 'Register Participants',        step_name_ar: 'تسجيل المشاركين',             actor_role: 'gr_employee' },
    { step_order: 2, step_name: 'Attend Workshop',              step_name_ar: 'حضور ورشة العمل',             actor_role: 'gr_employee' },
    { step_order: 3, step_name: 'Collect Certificates',         step_name_ar: 'استلام الشهادات',             actor_role: 'gr_employee' },
    { step_order: 4, step_name: 'Archive Certificates',         step_name_ar: 'أرشفة الشهادات',              actor_role: 'gr_employee' },
  ],
  investigation: [
    { step_order: 1, step_name: 'Gather Documentation',         step_name_ar: 'جمع الوثائق والمستندات',      actor_role: 'gr_employee' },
    { step_order: 2, step_name: 'Prepare Investigation File',   step_name_ar: 'إعداد ملف التحقيق',           actor_role: 'gr_manager' },
    { step_order: 3, step_name: 'Submit to Authority',          step_name_ar: 'التقديم للجهة المختصة',       actor_role: 'gr_employee' },
    { step_order: 4, step_name: 'Follow Up',                    step_name_ar: 'المتابعة',                    actor_role: 'gr_employee' },
    { step_order: 5, step_name: 'Receive Decision',             step_name_ar: 'استلام القرار',               actor_role: 'gr_manager' },
  ],
  committee: [
    { step_order: 1, step_name: 'Prepare Committee Agenda',     step_name_ar: 'إعداد جدول أعمال اللجنة',    actor_role: 'gr_manager' },
    { step_order: 2, step_name: 'Notify Members',               step_name_ar: 'إخطار الأعضاء',              actor_role: 'gr_employee' },
    { step_order: 3, step_name: 'Hold Meeting',                 step_name_ar: 'عقد الاجتماع',               actor_role: 'gr_manager' },
    { step_order: 4, step_name: 'Prepare Meeting Minutes',      step_name_ar: 'إعداد محضر الاجتماع',         actor_role: 'gr_employee' },
    { step_order: 5, step_name: 'Archive Minutes',              step_name_ar: 'أرشفة المحضر',               actor_role: 'gr_manager' },
  ],
};

async function generateGRTaskSteps(service: any, taskId: string, taskType: string) {
  const template = GR_TASK_STEP_TEMPLATES[taskType];
  if (!template || template.length === 0) return;
  const rows = template.map(s => ({
    task_id: taskId,
    step_order: s.step_order,
    step_name: s.step_name,
    step_name_ar: s.step_name_ar,
    actor_role: s.actor_role,
    status: s.step_order === 1 ? 'in_progress' : 'pending',
  }));
  await service.from('gr_task_steps').insert(rows);
}

// Entities
export async function getGREntities() {
  const { service } = await getGRAccess();
  const { data } = await service.from('gr_entities').select('*').order('group_number').order('name_ar');
  return data || [];
}

// Licenses
export async function getGRLicenses() {
  const { service } = await getGRAccess();
  const { data } = await service.from('gr_licenses').select('*').order('expiry_date', { ascending: true });
  return data || [];
}

// Tasks
export async function getGRTasks() {
  const { service } = await getGRAccess();
  const { data } = await service.from('gr_tasks').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function createGRTask(taskData: any) {
  const { service, employee } = await getGRAccess();
  const { data: numData } = await service.rpc('next_gr_task_number', { p_type: taskData.task_type });
  const { data, error } = await service.from('gr_tasks').insert({
    ...taskData,
    task_number: numData || `GR-${Date.now()}`,
    requested_by: employee.id,
  }).select().single();
  if (error) throw new Error(error.message);
  // Auto-generate workflow steps
  await generateGRTaskSteps(service, data.id, data.task_type);
  return data;
}

export async function updateGRTaskStatus(taskId: string, status: string) {
  const { service } = await getGRAccess();
  const updates: any = { status };
  if (['completed', 'cancelled'].includes(status)) updates.completed_at = new Date().toISOString();
  const { error } = await service.from('gr_tasks').update(updates).eq('id', taskId);
  if (error) throw new Error(error.message);
}

// Violations
export async function getGRViolations() {
  const { service } = await getGRAccess();
  const { data } = await service.from('gr_violations').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function createGRViolation(violationData: any) {
  const { service, employee } = await getGRAccess();
  const { data, error } = await service.from('gr_violations').insert({
    ...violationData,
    data_entry_employee_id: employee.id,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// Committees
export async function getGRCommittees() {
  const { service } = await getGRAccess();
  const { data } = await service.from('gr_committees').select('*').order('created_at', { ascending: false });
  return data || [];
}

// Alerts
export async function getGRAlerts() {
  const { service } = await getGRAccess();
  const { data } = await service.from('gr_alerts').select('*').eq('is_acknowledged', false).order('alert_date', { ascending: true });
  return data || [];
}

// ── Entity Detail ─────────────────────────────────────────────
export async function getGREntity(id: string) {
  const { service } = await getGRAccess();
  const { data } = await service.from('gr_entities').select('*').eq('id', id).single();
  return data;
}

export async function getEntityScalesAndTrademarks(entityId: string) {
  const { service } = await getGRAccess();
  const [{ data: scales }, { data: trademarks }] = await Promise.all([
    service.from('gr_scales').select('*').eq('entity_id', entityId).order('created_at'),
    service.from('gr_trademarks').select('*').eq('entity_id', entityId).order('created_at'),
  ]);
  return { scales: scales || [], trademarks: trademarks || [] };
}

// ── Task Detail ───────────────────────────────────────────────
export async function getGRTaskDetail(id: string) {
  const { service } = await getGRAccess();
  const [{ data: task }, { data: steps }] = await Promise.all([
    service.from('gr_tasks').select('*').eq('id', id).single(),
    service.from('gr_task_steps').select('*').eq('task_id', id).order('step_order'),
  ]);
  return task ? { task, steps: steps || [] } : null;
}

export async function completeGRTaskStep(stepId: string, notes: string) {
  const { service, employee } = await getGRAccess();
  const { error } = await service.from('gr_task_steps')
    .update({ status: 'completed', actor_id: employee.id, notes, completed_at: new Date().toISOString() })
    .eq('id', stepId);
  if (error) throw new Error(error.message);
}

export async function updateGRTask(taskId: string, updates: Record<string, any>) {
  const { service } = await getGRAccess();
  const { error } = await service.from('gr_tasks').update(updates).eq('id', taskId);
  if (error) throw new Error(error.message);
}

// ── Violation Detail ──────────────────────────────────────────
export async function getGRViolationDetail(id: string) {
  const { service } = await getGRAccess();
  const { data } = await service.from('gr_violations').select('*').eq('id', id).single();
  return data;
}

export async function updateGRViolation(id: string, updates: Record<string, any>) {
  const { service } = await getGRAccess();
  const { error } = await service.from('gr_violations').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Workshops ─────────────────────────────────────────────────
export async function getGRWorkshops() {
  const { service } = await getGRAccess();
  const { data } = await service.from('gr_workshops').select('*').order('workshop_date', { ascending: false });
  return data || [];
}

export async function createGRWorkshop(workshopData: Record<string, any>) {
  const { service } = await getGRAccess();
  const { data, error } = await service.from('gr_workshops').insert(workshopData).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ── Alerts ────────────────────────────────────────────────────
export async function getGRAlertsAll() {
  const { service } = await getGRAccess();
  const { data } = await service.from('gr_alerts').select('*').order('alert_date', { ascending: false }).limit(200);
  return data || [];
}

export async function acknowledgeGRAlert(alertId: string) {
  const { service, employee } = await getGRAccess();
  const { error } = await service.from('gr_alerts')
    .update({ is_acknowledged: true, acknowledged_by: employee.id, acknowledged_at: new Date().toISOString() })
    .eq('id', alertId);
  if (error) throw new Error(error.message);
}

export async function createRenewalTaskFromAlert(alertId: string, entityId: string, licenseId: string) {
  const { service, employee } = await getGRAccess();
  const { data: numData } = await service.rpc('next_gr_task_number', { p_type: 'annual_renewal' });
  const { data: task, error } = await service.from('gr_tasks').insert({
    task_number: numData || `GR-REN-${Date.now()}`,
    task_type: 'annual_renewal', entity_id: entityId, license_id: licenseId,
    title: 'تجديد ترخيص — Annual License Renewal',
    status: 'draft', priority: 'high',
    requested_by: employee.id, assigned_to: employee.id,
  }).select().single();
  if (error) throw new Error(error.message);
  await service.from('gr_alerts').update({ task_id: task.id }).eq('id', alertId);
  return task;
}

// ── Performance ───────────────────────────────────────────────
export async function getGRPerformanceData() {
  const { service } = await getGRAccess();
  const [{ data: tasks }, { data: violations }, { data: employees }] = await Promise.all([
    service.from('gr_tasks').select('id, task_type, status, assigned_to, is_on_time, created_at, completed_at, due_date'),
    service.from('gr_violations').select('id, violation_amount, resolution_path, created_at'),
    service.from('employees').select('id, full_name_ar, full_name_en'),
  ]);
  return { tasks: tasks || [], violations: violations || [], employees: employees || [] };
}

export async function regenerateGRTaskSteps(taskId: string, taskType: string) {
  const { service } = await getGRAccess();
  // Delete existing steps first
  await service.from('gr_task_steps').delete().eq('task_id', taskId);
  await generateGRTaskSteps(service, taskId, taskType);
}

// Dashboard stats
export async function getGRStats() {
  const { service } = await getGRAccess();
  const [{ data: entities }, { data: licenses }, { data: tasks }, { data: violations }, { data: alerts }, { data: committees }] = await Promise.all([
    service.from('gr_entities').select('id, is_active').eq('is_active', true),
    service.from('gr_licenses').select('id, status, expiry_date'),
    service.from('gr_tasks').select('id, status, is_on_time, task_type, completed_at, due_date'),
    service.from('gr_violations').select('id, resolution_path, violation_amount'),
    service.from('gr_alerts').select('id, is_acknowledged, alert_type'),
    service.from('gr_committees').select('id, status'),
  ]);

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const activeLicenses = (licenses || []).filter(l => l.status === 'active');
  const expiringSoon = activeLicenses.filter(l => new Date(l.expiry_date) <= in30);
  const expired = activeLicenses.filter(l => new Date(l.expiry_date) < now);
  const openTasks = (tasks || []).filter(t => !['completed', 'cancelled'].includes(t.status));
  const overdueTasks = openTasks.filter(t => t.due_date && new Date(t.due_date) < now);
  const completedTasks = (tasks || []).filter(t => t.status === 'completed');
  const onTime = completedTasks.filter(t => t.is_on_time);

  return {
    totalEntities: (entities || []).length,
    totalLicenses: activeLicenses.length,
    expiringSoon: expiringSoon.length,
    expired: expired.length,
    openTasks: openTasks.length,
    overdueTasks: overdueTasks.length,
    onTimeRate: completedTasks.length > 0 ? Math.round((onTime.length / completedTasks.length) * 100) : 0,
    unackAlerts: (alerts || []).filter(a => !a.is_acknowledged).length,
    openViolations: (violations || []).filter(v => !v.resolution_path).length,
    totalViolationAmount: (violations || []).reduce((s: number, v: any) => s + (parseFloat(v.violation_amount) || 0), 0),
    activeCommittees: (committees || []).filter(c => c.status === 'active').length,
    tasksByType: (tasks || []).reduce((acc: any, t: any) => { acc[t.task_type] = (acc[t.task_type] || 0) + 1; return acc; }, {}),
  };
}

// ── GR Request Token ──────────────────────────────────────────
export async function generateLicenseToken(licenseId: string, entityId: string): Promise<string> {
  await getGRAccess(); // verify role
  const { createLicenseToken } = await import('@/lib/utils/gr-token');
  return createLicenseToken(licenseId, entityId);
}
