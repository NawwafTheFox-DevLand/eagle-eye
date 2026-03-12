import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import EmployeesClient from './EmployeesClient';

export const dynamic = 'force-dynamic';

export default async function AdminEmployeesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();

  const { data: emp } = await service.from('employees').select('id').eq('auth_user_id', user.id).single();
  if (!emp) redirect('/login');

  const { data: roleRows } = await service.from('user_roles').select('role')
    .eq('employee_id', emp.id).eq('is_active', true);
  if (!(roleRows || []).some((r: any) => r.role === 'super_admin')) redirect('/dashboard');

  const [{ data: employees }, { data: companies }, { data: departments }] = await Promise.all([
    service.from('employees')
      .select('id, employee_code, full_name_ar, full_name_en, company_id, department_id, title_ar, title_en, grade, is_active')
      .order('full_name_ar'),
    service.from('companies').select('id, name_ar, name_en').order('name_ar'),
    service.from('departments').select('id, name_ar, name_en, company_id').order('name_ar'),
  ]);

  const companyMap: Record<string, any> = {};
  for (const c of companies || []) companyMap[c.id] = c;

  const deptMap: Record<string, any> = {};
  for (const d of departments || []) deptMap[d.id] = d;

  return (
    <EmployeesClient
      employees={employees || []}
      companies={companies || []}
      departments={departments || []}
      companyMap={companyMap}
      deptMap={deptMap}
    />
  );
}
