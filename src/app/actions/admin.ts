'use server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

async function getAdminAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = await createServiceClient();
  const { data: emp } = await service
    .from('employees')
    .select('id, full_name_ar, full_name_en')
    .eq('auth_user_id', user.id)
    .single();
  if (!emp) return null;

  const { data: roleRows } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', emp.id)
    .eq('is_active', true);

  const roles = (roleRows || []).map((r: any) => r.role);
  return { service, employee: emp, isSuperAdmin: roles.includes('super_admin') };
}

// ─── DEPARTMENT HEAD ──────────────────────────────────────────────────────────

export async function updateDepartmentHead(
  departmentId: string,
  employeeId: string | null,
): Promise<{ error?: string }> {
  const auth = await getAdminAuth();
  if (!auth) return { error: 'غير مصرح' };
  if (!auth.isSuperAdmin) return { error: 'غير مصرح — مطلوب صلاحية super_admin' };

  const { service, employee } = auth;

  const { data: dept } = await service
    .from('departments').select('head_employee_id, company_id').eq('id', departmentId).single();
  const oldHeadId = dept?.head_employee_id ?? null;
  const companyId = (dept as any)?.company_id ?? null;

  const { error: updateErr } = await service
    .from('departments').update({ head_employee_id: employeeId ?? null }).eq('id', departmentId);
  if (updateErr) return { error: updateErr.message };

  if (employeeId) {
    const { data: existingRole } = await service
      .from('user_roles').select('id, is_active')
      .eq('employee_id', employeeId).eq('role', 'department_manager').maybeSingle();

    if (!existingRole) {
      await service.from('user_roles').insert({
        employee_id: employeeId, role: 'department_manager', company_id: companyId,
        is_active: true, granted_by: employee.id,
      });
    } else if (!existingRole.is_active) {
      await service.from('user_roles').update({ is_active: true, company_id: companyId })
        .eq('employee_id', employeeId).eq('role', 'department_manager');
    }
  }

  try {
    await service.from('audit_log').insert({
      action: 'dept_head_changed', entity_type: 'department', entity_id: departmentId, actor_id: employee.id,
      details: { old_head: oldHeadId, new_head: employeeId },
    });
  } catch { /* best-effort */ }

  return {};
}

// ─── TOGGLE EMPLOYEE ACTIVE ───────────────────────────────────────────────────

export async function toggleEmployeeActive(
  employeeId: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const auth = await getAdminAuth();
  if (!auth?.isSuperAdmin) return { error: 'غير مصرح' };
  const { service, employee } = auth;

  const { error } = await service.from('employees').update({ is_active: isActive }).eq('id', employeeId);
  if (error) return { error: error.message };

  try {
    await service.from('audit_log').insert({
      action: isActive ? 'employee_activated' : 'employee_deactivated',
      entity_type: 'employee', entity_id: employeeId, actor_id: employee.id,
      details: { is_active: isActive },
    });
  } catch { /* best-effort */ }

  return {};
}

// ─── ASSIGN ROLE ──────────────────────────────────────────────────────────────

export async function assignRole(
  employeeId: string,
  role: string,
  companyId: string,
): Promise<{ error?: string }> {
  const auth = await getAdminAuth();
  if (!auth?.isSuperAdmin) return { error: 'غير مصرح' };
  const { service, employee } = auth;

  const { data: existing } = await service.from('user_roles').select('id, is_active')
    .eq('employee_id', employeeId).eq('role', role).maybeSingle();

  if (existing?.is_active) return { error: isArabicEnv() ? 'هذا الدور موجود بالفعل' : 'Role already assigned' };

  if (existing && !existing.is_active) {
    const { error } = await service.from('user_roles').update({ is_active: true, company_id: companyId || null }).eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await service.from('user_roles').insert({
      employee_id: employeeId, role, company_id: companyId || null, is_active: true, granted_by: employee.id,
    });
    if (error) return { error: error.message };
  }

  try {
    await service.from('audit_log').insert({
      action: 'role_assigned', entity_type: 'user_role', actor_id: employee.id,
      details: { employee_id: employeeId, role, company_id: companyId },
    });
  } catch { /* best-effort */ }

  return {};
}

// ─── REVOKE ROLE ──────────────────────────────────────────────────────────────

export async function revokeRole(roleId: string): Promise<{ error?: string }> {
  const auth = await getAdminAuth();
  if (!auth?.isSuperAdmin) return { error: 'غير مصرح' };
  const { service, employee } = auth;

  const { error } = await service.from('user_roles').update({ is_active: false }).eq('id', roleId);
  if (error) return { error: error.message };

  try {
    await service.from('audit_log').insert({
      action: 'role_revoked', entity_type: 'user_role', entity_id: roleId, actor_id: employee.id,
    });
  } catch { /* best-effort */ }

  return {};
}

// ─── UPDATE SLA CONFIG ────────────────────────────────────────────────────────

export async function updateSLAConfig(
  requestType: string,
  targetHours: number,
  maxHours: number,
): Promise<{ error?: string }> {
  const auth = await getAdminAuth();
  if (!auth?.isSuperAdmin) return { error: 'غير مصرح' };
  const { service, employee } = auth;

  const { error } = await service.from('sla_configs')
    .update({ target_hours: targetHours, max_hours: maxHours })
    .eq('request_type', requestType);
  if (error) return { error: error.message };

  try {
    await service.from('audit_log').insert({
      action: 'sla_updated', entity_type: 'sla_config', actor_id: employee.id,
      details: { request_type: requestType, target_hours: targetHours, max_hours: maxHours },
    });
  } catch { /* best-effort */ }

  return {};
}

// helper — server-side env has no browser API; default to Arabic
function isArabicEnv() { return false; }

// ─── DELEGATION ───────────────────────────────────────────────────────────────

async function getDelegationAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = await createServiceClient();
  const { data: emp } = await service
    .from('employees').select('id, department_id').eq('auth_user_id', user.id).single();
  if (!emp) return null;
  const { data: roleRows } = await service
    .from('user_roles').select('role').eq('employee_id', emp.id).eq('is_active', true);
  const roles = (roleRows || []).map((r: any) => r.role as string);
  return { service, emp, roles, isSuperAdmin: roles.includes('super_admin') };
}

export async function createDelegation(params: {
  delegateId: string;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<{ error?: string }> {
  const auth = await getDelegationAuth();
  if (!auth) return { error: 'غير مصرح' };
  const { service, emp, roles, isSuperAdmin } = auth;

  const canManage = roles.some(r => ['department_manager', 'ceo', 'super_admin'].includes(r));
  if (!canManage) return { error: 'غير مصرح — مطلوب صلاحية مدير قسم أو أعلى' };

  // Verify delegate is in same department (unless super_admin)
  if (!isSuperAdmin && emp.department_id) {
    const { data: delegate } = await service
      .from('employees').select('department_id').eq('id', params.delegateId).single();
    if ((delegate as any)?.department_id !== emp.department_id)
      return { error: 'يجب أن يكون المفوض إليه من نفس القسم' };
  }

  const { error } = await service.from('delegations').insert({
    delegator_id: emp.id,
    delegate_id: params.delegateId,
    start_date: params.startDate,
    end_date: params.endDate,
    reason: params.reason,
    is_active: true,
    created_by: emp.id,
  });
  if (error) return { error: error.message };

  try {
    await service.from('audit_log').insert({
      action: 'delegation_created', entity_type: 'delegation', actor_id: emp.id,
      details: { delegate_id: params.delegateId, start_date: params.startDate, end_date: params.endDate },
    });
  } catch { /* best-effort */ }

  return {};
}

export async function revokeDelegation(delegationId: string): Promise<{ error?: string }> {
  const auth = await getDelegationAuth();
  if (!auth) return { error: 'غير مصرح' };
  const { service, emp, isSuperAdmin } = auth;

  const { data: delegation } = await service
    .from('delegations').select('delegator_id').eq('id', delegationId).single();
  if (!delegation || ((delegation as any).delegator_id !== emp.id && !isSuperAdmin))
    return { error: 'لا يمكنك إلغاء هذا التفويض' };

  const { error } = await service.from('delegations').update({ is_active: false }).eq('id', delegationId);
  if (error) return { error: error.message };

  try {
    await service.from('audit_log').insert({
      action: 'delegation_revoked', entity_type: 'delegation', entity_id: delegationId, actor_id: emp.id,
    });
  } catch { /* best-effort */ }

  return {};
}

// ─── DELEGATION MATRIX ────────────────────────────────────────────────────────

export async function addToMatrix(departmentId: string, employeeId: string): Promise<{ error?: string }> {
  const auth = await getDelegationAuth();
  if (!auth) return { error: 'غير مصرح' };
  const { service, emp, roles } = auth;

  const canManage = roles.some(r => ['department_manager', 'ceo', 'super_admin'].includes(r));
  if (!canManage) return { error: 'غير مصرح' };

  const { data: top } = await service.from('delegation_matrix')
    .select('priority_rank').eq('department_id', departmentId)
    .order('priority_rank', { ascending: false }).limit(1).maybeSingle();
  const nextRank = ((top as any)?.priority_rank ?? 0) + 1;

  const { error } = await service.from('delegation_matrix').insert({
    department_id: departmentId,
    employee_id: employeeId,
    priority_rank: nextRank,
    created_by: emp.id,
  });
  if (error) return { error: error.message };
  return {};
}

export async function removeFromMatrix(matrixEntryId: string): Promise<{ error?: string }> {
  const auth = await getDelegationAuth();
  if (!auth) return { error: 'غير مصرح' };
  const { service, roles } = auth;

  const canManage = roles.some(r => ['department_manager', 'ceo', 'super_admin'].includes(r));
  if (!canManage) return { error: 'غير مصرح' };

  const { data: entry } = await service.from('delegation_matrix')
    .select('department_id, priority_rank').eq('id', matrixEntryId).single();
  if (!entry) return { error: 'العنصر غير موجود' };

  const { error: delErr } = await service.from('delegation_matrix').delete().eq('id', matrixEntryId);
  if (delErr) return { error: delErr.message };

  // Re-rank remaining entries to close the gap
  const { data: remaining } = await service.from('delegation_matrix')
    .select('id').eq('department_id', (entry as any).department_id)
    .order('priority_rank', { ascending: true });
  for (let i = 0; i < (remaining || []).length; i++) {
    await service.from('delegation_matrix').update({ priority_rank: i + 1 }).eq('id', remaining![i].id);
  }
  return {};
}

export async function moveMatrixUp(matrixEntryId: string): Promise<{ error?: string }> {
  const auth = await getDelegationAuth();
  if (!auth) return { error: 'غير مصرح' };
  const { service } = auth;

  const { data: entry } = await service.from('delegation_matrix')
    .select('id, department_id, priority_rank').eq('id', matrixEntryId).single();
  if (!entry || (entry as any).priority_rank <= 1) return {};

  const { data: above } = await service.from('delegation_matrix')
    .select('id').eq('department_id', (entry as any).department_id)
    .eq('priority_rank', (entry as any).priority_rank - 1).maybeSingle();
  if (!above) return {};

  await service.from('delegation_matrix').update({ priority_rank: (entry as any).priority_rank }).eq('id', (above as any).id);
  await service.from('delegation_matrix').update({ priority_rank: (entry as any).priority_rank - 1 }).eq('id', entry.id);
  return {};
}

export async function moveMatrixDown(matrixEntryId: string): Promise<{ error?: string }> {
  const auth = await getDelegationAuth();
  if (!auth) return { error: 'غير مصرح' };
  const { service } = auth;

  const { data: entry } = await service.from('delegation_matrix')
    .select('id, department_id, priority_rank').eq('id', matrixEntryId).single();
  if (!entry) return {};

  const { data: below } = await service.from('delegation_matrix')
    .select('id').eq('department_id', (entry as any).department_id)
    .eq('priority_rank', (entry as any).priority_rank + 1).maybeSingle();
  if (!below) return {};

  await service.from('delegation_matrix').update({ priority_rank: (entry as any).priority_rank }).eq('id', (below as any).id);
  await service.from('delegation_matrix').update({ priority_rank: (entry as any).priority_rank + 1 }).eq('id', entry.id);
  return {};
}
