import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import OrgTreeClient from './OrgTreeClient';

export const dynamic = 'force-dynamic';

function deriveScope(roles: string[], isHolding: boolean): string {
  if (roles.includes('super_admin')) return 'super_admin';
  if (roles.includes('ceo') && isHolding) return 'holding_ceo';
  if (roles.includes('ceo')) return 'company_ceo';
  if (roles.includes('department_manager')) return 'dept_head';
  return 'employee';
}

export default async function OrgTreePage() {
  const me = await getSessionEmployee();
  if (!me) redirect('/login');

  // Derive roles directly from the array — no cross-boundary call
  const roleNames: string[] = ((me.roles as any[]) || []).map((r: any) => r.role);
  const hasAccess = roleNames.some(r =>
    ['super_admin', 'ceo', 'department_manager', 'company_admin'].includes(r),
  );
  if (!hasAccess) redirect('/dashboard');

  const isHolding = (me.company as any)?.is_holding === true;
  const roleLevel = deriveScope(roleNames, isHolding);

  const service = await createServiceClient();

  const [{ data: allCompanies }, { data: allDepts }, { data: allEmps }] = await Promise.all([
    service
      .from('companies')
      .select('id, code, name_ar, name_en, is_holding, ceo_employee_id')
      .order('name_ar'),
    service
      .from('departments')
      .select('id, code, name_ar, name_en, company_id, head_employee_id')
      .eq('is_active', true)
      .order('name_ar'),
    service
      .from('employees')
      .select('id, employee_code, full_name_ar, full_name_en, company_id, department_id, title_ar, title_en, grade, is_active')
      .eq('is_active', true)
      .order('full_name_ar'),
  ]);

  // Build ID→employee map
  const empMap: Record<string, any> = {};
  for (const e of allEmps || []) empMap[e.id] = e;

  // Scope filtering
  let companies: any[] = allCompanies || [];
  let depts: any[]     = allDepts || [];
  let emps: any[]      = allEmps || [];

  if (roleLevel === 'company_ceo') {
    companies = companies.filter(c => c.id === me.company_id);
    depts     = depts.filter(d => d.company_id === me.company_id);
    emps      = emps.filter(e => e.company_id === me.company_id);
  } else if (roleLevel === 'dept_head') {
    companies = companies.filter(c => c.id === me.company_id);
    depts     = depts.filter(d => d.id === me.department_id);
    emps      = emps.filter(e => e.department_id === me.department_id);
  }

  return (
    <OrgTreeClient
      companies={companies}
      departments={depts}
      employees={emps}
      empMap={empMap}
      roleLevel={roleLevel}
    />
  );
}
