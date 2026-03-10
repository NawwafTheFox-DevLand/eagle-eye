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
  const hasAccess = roles?.some(r => ['super_admin', 'ceo', 'gr_manager', 'gr_employee'].includes(r.role));
  if (!hasAccess) throw new Error('GR access required');

  return { service, employee };
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
