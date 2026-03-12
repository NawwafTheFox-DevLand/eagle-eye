'use server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const GR_ROLES = ['gr_manager', 'gr_employee', 'super_admin', 'ceo'];

async function getGRAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees')
    .select('id, company_id, full_name_ar, full_name_en')
    .eq('auth_user_id', user.id)
    .single();
  if (!employee) throw new Error('Employee not found');

  const { data: roleRows } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', employee.id)
    .eq('is_active', true);

  const roles = (roleRows || []).map((r: any) => r.role as string);
  const hasAccess = roles.some(r => GR_ROLES.includes(r));
  return { service, employee, roles, hasAccess };
}

// ─── ACCESS CHECK ─────────────────────────────────────────────────────────────

export async function getGRAccess(): Promise<boolean> {
  try {
    const { hasAccess } = await getGRAuth();
    return hasAccess;
  } catch {
    return false;
  }
}

// ─── ENTITIES ─────────────────────────────────────────────────────────────────

export async function getGREntities(): Promise<{ data: any[]; error: string | null }> {
  try {
    const { service, employee, hasAccess, roles } = await getGRAuth();
    if (!hasAccess) return { data: [], error: 'غير مصرح' };

    let q = service.from('gr_entities').select(
      'id, name_ar, name_en, entity_type, entity_number, company_id, is_active, contact_name, contact_phone, notes, created_at'
    ).order('name_ar');

    if (!roles.includes('super_admin') && !roles.includes('ceo')) {
      if (employee.company_id) q = q.eq('company_id', employee.company_id);
    }

    const { data, error } = await q;
    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  } catch (e: any) {
    return { data: [], error: String(e?.message ?? e) };
  }
}

// ─── LICENSES ────────────────────────────────────────────────────────────────

export async function getGRLicenses(entityId?: string): Promise<{ data: any[]; error: string | null }> {
  try {
    const { service, employee, hasAccess, roles } = await getGRAuth();
    if (!hasAccess) return { data: [], error: 'غير مصرح' };

    let q = service.from('gr_licenses').select(
      'id, entity_id, license_type, license_number, license_name_ar, license_name_en, issue_date, expiry_date, status, authority, company_id, notes, created_at'
    ).order('expiry_date', { ascending: true });

    if (entityId) q = q.eq('entity_id', entityId);
    else if (!roles.includes('super_admin') && !roles.includes('ceo')) {
      if (employee.company_id) q = q.eq('company_id', employee.company_id);
    }

    const { data, error } = await q;
    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  } catch (e: any) {
    return { data: [], error: String(e?.message ?? e) };
  }
}

// ─── TASKS ────────────────────────────────────────────────────────────────────

export async function getGRTasks(filters?: {
  status?: string;
  entityId?: string;
  assignedToMe?: boolean;
}): Promise<{ data: any[]; error: string | null }> {
  try {
    const { service, employee, hasAccess, roles } = await getGRAuth();
    if (!hasAccess) return { data: [], error: 'غير مصرح' };

    let q = service.from('gr_tasks').select(
      'id, task_type, title_ar, title_en, license_id, entity_id, company_id, status, priority, due_date, assigned_to, created_by, notes, created_at'
    ).order('due_date', { ascending: true });

    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.entityId) q = q.eq('entity_id', filters.entityId);
    if (filters?.assignedToMe) {
      q = q.eq('assigned_to', employee.id);
    } else if (!roles.includes('super_admin') && !roles.includes('ceo')) {
      if (employee.company_id) q = q.eq('company_id', employee.company_id);
    }

    const { data, error } = await q;
    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  } catch (e: any) {
    return { data: [], error: String(e?.message ?? e) };
  }
}

export async function createGRTask(taskData: {
  task_type: string;
  title_ar: string;
  title_en: string;
  license_id?: string;
  entity_id?: string;
  priority?: string;
  due_date?: string;
  notes?: string;
}): Promise<{ error: string | null }> {
  try {
    const { service, employee, hasAccess } = await getGRAuth();
    if (!hasAccess) return { error: 'غير مصرح' };

    const { error } = await service.from('gr_tasks').insert({
      ...taskData,
      company_id: employee.company_id,
      created_by: employee.id,
      assigned_to: employee.id,
      status: 'pending',
      priority: taskData.priority || 'normal',
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

export async function updateGRTaskStatus(
  taskId: string,
  status: string,
  note?: string,
): Promise<{ error: string | null }> {
  try {
    const { service, hasAccess } = await getGRAuth();
    if (!hasAccess) return { error: 'غير مصرح' };

    const { error } = await service.from('gr_tasks').update({
      status,
      ...(note ? { notes: note } : {}),
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    }).eq('id', taskId);
    if (error) return { error: error.message };
    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

// ─── VIOLATIONS ───────────────────────────────────────────────────────────────

export async function getGRViolations(): Promise<{ data: any[]; error: string | null }> {
  try {
    const { service, employee, hasAccess, roles } = await getGRAuth();
    if (!hasAccess) return { data: [], error: 'غير مصرح' };

    let q = service.from('gr_violations').select(
      'id, violation_number, license_id, entity_id, company_id, description, amount, status, violation_date, due_date, created_at'
    ).order('violation_date', { ascending: false });

    if (!roles.includes('super_admin') && !roles.includes('ceo')) {
      if (employee.company_id) q = q.eq('company_id', employee.company_id);
    }

    const { data, error } = await q;
    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  } catch (e: any) {
    return { data: [], error: String(e?.message ?? e) };
  }
}

// ─── COMMITTEES ───────────────────────────────────────────────────────────────

export async function getGRCommittees(): Promise<{ data: any[]; error: string | null }> {
  try {
    const { service, employee, hasAccess, roles } = await getGRAuth();
    if (!hasAccess) return { data: [], error: 'غير مصرح' };

    let q = service.from('gr_committees').select(
      'id, committee_name, purpose, meeting_date, status, company_id, notes, created_at'
    ).order('meeting_date', { ascending: false });

    if (!roles.includes('super_admin') && !roles.includes('ceo')) {
      if (employee.company_id) q = q.eq('company_id', employee.company_id);
    }

    const { data, error } = await q;
    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  } catch (e: any) {
    return { data: [], error: String(e?.message ?? e) };
  }
}

// ─── ALERTS ───────────────────────────────────────────────────────────────────

export async function getGRAlerts(): Promise<{ data: any[]; error: string | null }> {
  try {
    const { service, employee, hasAccess, roles } = await getGRAuth();
    if (!hasAccess) return { data: [], error: 'غير مصرح' };

    let q = service.from('gr_alerts').select(
      'id, license_id, alert_type, alert_date, days_remaining, is_acknowledged, acknowledged_by, acknowledged_at, company_id, created_at'
    ).eq('is_acknowledged', false).order('days_remaining', { ascending: true });

    if (!roles.includes('super_admin') && !roles.includes('ceo')) {
      if (employee.company_id) q = q.eq('company_id', employee.company_id);
    }

    const { data, error } = await q;
    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  } catch (e: any) {
    return { data: [], error: String(e?.message ?? e) };
  }
}

// ─── STATS ────────────────────────────────────────────────────────────────────

export async function getGRStats(): Promise<{
  entities: number;
  licenses: number;
  activeTasks: number;
  openViolations: number;
  pendingAlerts: number;
  error: string | null;
}> {
  const defaultStats = { entities: 0, licenses: 0, activeTasks: 0, openViolations: 0, pendingAlerts: 0, error: null };
  try {
    const { service, employee, hasAccess, roles } = await getGRAuth();
    if (!hasAccess) return { ...defaultStats, error: 'غير مصرح' };

    const companyFilter = (!roles.includes('super_admin') && !roles.includes('ceo') && employee.company_id)
      ? employee.company_id : null;

    const addFilter = (q: any) => companyFilter ? q.eq('company_id', companyFilter) : q;

    const [entities, licenses, tasks, violations, alerts] = await Promise.all([
      addFilter(service.from('gr_entities').select('id', { count: 'exact', head: true }).eq('is_active', true)),
      addFilter(service.from('gr_licenses').select('id', { count: 'exact', head: true })),
      addFilter(service.from('gr_tasks').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_progress'])),
      addFilter(service.from('gr_violations').select('id', { count: 'exact', head: true }).eq('status', 'open')),
      addFilter(service.from('gr_alerts').select('id', { count: 'exact', head: true }).eq('is_acknowledged', false)),
    ]);

    return {
      entities: entities.count ?? 0,
      licenses: licenses.count ?? 0,
      activeTasks: tasks.count ?? 0,
      openViolations: violations.count ?? 0,
      pendingAlerts: alerts.count ?? 0,
      error: null,
    };
  } catch (e: any) {
    return { ...defaultStats, error: String(e?.message ?? e) };
  }
}
