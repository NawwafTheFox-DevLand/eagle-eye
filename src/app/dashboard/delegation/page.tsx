import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import DelegationClient from './DelegationClient';

export const dynamic = 'force-dynamic';

export default async function DelegationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();

  // Current employee
  const { data: emp } = await service
    .from('employees')
    .select('id, company_id, department_id')
    .eq('auth_user_id', user.id)
    .single();
  if (!emp) redirect('/login');

  // Roles
  const { data: roleRows } = await service
    .from('user_roles').select('role')
    .eq('employee_id', emp.id).eq('is_active', true);
  const roles = (roleRows || []).map((r: any) => r.role as string);
  const canManage = roles.some(r => ['department_manager', 'ceo', 'super_admin'].includes(r));

  // Department employees (for delegate dropdown) — same dept, active, exclude self
  let deptEmployees: any[] = [];
  if (emp.department_id) {
    const { data } = await service.from('employees')
      .select('id, full_name_ar, full_name_en, employee_code, title_ar, title_en')
      .eq('department_id', emp.department_id)
      .eq('is_active', true)
      .neq('id', emp.id)
      .order('full_name_ar');
    deptEmployees = data || [];
  }

  // My active delegations (as delegator) — correct column names
  const { data: myDelegations } = await service
    .from('delegations')
    .select('id, delegator_id, delegate_id, start_date, end_date, reason, is_active, created_at')
    .eq('delegator_id', emp.id)
    .order('created_at', { ascending: false });

  // Delegations where I am the delegate
  const { data: delegatedToMe } = await service
    .from('delegations')
    .select('id, delegator_id, delegate_id, start_date, end_date, reason, is_active, created_at')
    .eq('delegate_id', emp.id)
    .order('created_at', { ascending: false });

  // Delegation matrix for my department
  let matrix: any[] = [];
  if (emp.department_id) {
    const { data: matrixRows } = await service
      .from('delegation_matrix')
      .select('id, employee_id, priority_rank')
      .eq('department_id', emp.department_id)
      .order('priority_rank', { ascending: true });
    matrix = matrixRows || [];
  }

  // Batch-fetch all employee names referenced
  const allMyDeleg = myDelegations || [];
  const allToMe    = delegatedToMe || [];
  const refIds = [...new Set([
    ...allMyDeleg.map((d: any) => d.delegate_id),
    ...allToMe.map((d: any) => d.delegator_id),
    ...matrix.map((m: any) => m.employee_id),
  ].filter(Boolean))] as string[];

  const empMap: Record<string, any> = {};
  if (refIds.length > 0) {
    const { data: emps } = await service.from('employees')
      .select('id, full_name_ar, full_name_en, employee_code, title_ar, title_en')
      .in('id', refIds);
    for (const e of emps || []) empMap[e.id] = e;
  }

  return (
    <DelegationClient
      myId={emp.id}
      departmentId={emp.department_id}
      canManage={canManage}
      myDelegations={allMyDeleg}
      delegatedToMe={allToMe}
      deptEmployees={deptEmployees}
      matrix={matrix}
      empMap={empMap}
    />
  );
}
