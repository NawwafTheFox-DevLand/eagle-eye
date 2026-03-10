'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees')
    .select('id, auth_user_id, company_id')
    .eq('auth_user_id', user.id)
    .single();
  if (!employee) throw new Error('Employee not found');

  const { data: roles } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', employee.id);

  const isAdmin = roles?.some(r => ['super_admin', 'ceo', 'company_admin'].includes(r.role));
  if (!isAdmin) throw new Error('Access denied — admin role required');

  return { employee, service };
}

// ── EMPLOYEES ──

export async function getEmployees(search?: string) {
  const { service } = await requireAdmin();
  let query = service
    .from('employees')
    .select('id, employee_code, full_name_ar, full_name_en, email, is_active, company_id, department_id, grade, title_ar')
    .order('employee_code', { ascending: true })
    .limit(200);

  if (search) {
    query = query.or(`full_name_ar.ilike.%${search}%,full_name_en.ilike.%${search}%,employee_code.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateEmployee(employeeId: string, updates: Record<string, any>) {
  const { service } = await requireAdmin();
  const { error } = await service
    .from('employees')
    .update(updates)
    .eq('id', employeeId);
  if (error) throw new Error(error.message);
}

export async function toggleEmployeeActive(employeeId: string, isActive: boolean) {
  const { service } = await requireAdmin();
  const { error } = await service
    .from('employees')
    .update({ is_active: isActive })
    .eq('id', employeeId);
  if (error) throw new Error(error.message);
}

// ── DEPARTMENTS ──

export async function getDepartments() {
  const { service } = await requireAdmin();
  const { data } = await service
    .from('departments')
    .select('id, code, name_ar, name_en, company_id, head_employee_id, is_active')
    .order('code');
  return data || [];
}

export async function updateDepartmentHead(deptId: string, headEmployeeId: string | null) {
  const { service } = await requireAdmin();
  const { error } = await service
    .from('departments')
    .update({ head_employee_id: headEmployeeId })
    .eq('id', deptId);
  if (error) throw new Error(error.message);
}

// ── ROLES ──

export async function getUserRoles() {
  const { service } = await requireAdmin();
  const { data } = await service
    .from('user_roles')
    .select('id, employee_id, role, company_id, is_active, granted_at')
    .eq('is_active', true)
    .order('granted_at', { ascending: false });
  return data || [];
}

export async function assignRole(employeeId: string, role: string, companyId: string) {
  const { service, employee: admin } = await requireAdmin();

  // Check if role already exists
  const { data: existing } = await service
    .from('user_roles')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('role', role)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single();

  if (existing) throw new Error('This role is already assigned');

  const { error } = await service
    .from('user_roles')
    .insert({
      employee_id: employeeId,
      role,
      company_id: companyId,
      granted_by: admin.id,
      is_active: true,
    });
  if (error) throw new Error(error.message);
}

export async function revokeRole(roleId: string) {
  const { service } = await requireAdmin();
  const { error } = await service
    .from('user_roles')
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq('id', roleId);
  if (error) throw new Error(error.message);
}

// ── DELEGATION ──

export async function getDelegations() {
  const { service } = await requireAdmin();
  const { data } = await service
    .from('delegations')
    .select('id, delegator_id, delegate_id, company_id, start_date, end_date, reason, is_active, created_at')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function createDelegation(delegatorId: string, delegateId: string, companyId: string, startDate: string, endDate: string, reason: string) {
  const { service, employee: admin } = await requireAdmin();
  const { error } = await service
    .from('delegations')
    .insert({
      delegator_id: delegatorId,
      delegate_id: delegateId,
      company_id: companyId,
      start_date: startDate,
      end_date: endDate,
      reason,
      activated_by: admin.id,
      is_active: true,
    });
  if (error) throw new Error(error.message);
}

export async function revokeDelegation(delegationId: string) {
  const { service } = await requireAdmin();
  const { error } = await service
    .from('delegations')
    .update({ is_active: false })
    .eq('id', delegationId);
  if (error) throw new Error(error.message);
}

// ── SLA CONFIG ──

export async function updateSLAConfig(requestType: string, targetHours: number, maxHours: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();
  const { data: emp } = await service
    .from('employees')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!emp) throw new Error('Employee not found');

  const { data: roles } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', emp.id)
    .eq('is_active', true);
  const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
  if (!isSuperAdmin) throw new Error('Only super_admin can edit SLA config');

  const { error } = await service
    .from('request_type_configs')
    .update({ default_sla_target_hours: targetHours, default_sla_max_hours: maxHours })
    .eq('request_type', requestType);
  if (error) throw new Error(error.message);
}

// ── LOOKUP HELPERS ──

export async function getAllCompanies() {
  const { service } = await requireAdmin();
  const { data } = await service.from('companies').select('id, code, name_ar, name_en').eq('is_active', true).order('name_ar');
  return data || [];
}

export async function getAllEmployeesSimple() {
  const { service } = await requireAdmin();
  const { data } = await service
    .from('employees')
    .select('id, employee_code, full_name_ar, full_name_en, company_id, department_id')
    .eq('is_active', true)
    .order('full_name_ar');
  return data || [];
}
