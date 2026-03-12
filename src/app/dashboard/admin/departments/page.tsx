import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import DepartmentsClient from './DepartmentsClient';

export const dynamic = 'force-dynamic';

export default async function AdminDepartmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();

  // Verify super_admin
  const { data: emp } = await service
    .from('employees')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!emp) redirect('/login');

  const { data: roleRows } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', emp.id)
    .eq('is_active', true);

  const roles = (roleRows || []).map((r: any) => r.role);
  if (!roles.includes('super_admin')) redirect('/dashboard');

  const [{ data: companies }, { data: depts }, { data: employees }] = await Promise.all([
    service.from('companies').select('id, code, name_ar, name_en').order('name_ar'),
    service.from('departments').select('id, code, name_ar, name_en, company_id, head_employee_id, is_active').order('name_ar'),
    service.from('employees').select('id, employee_code, full_name_ar, full_name_en, company_id, department_id, title_ar, title_en, is_active').eq('is_active', true).order('full_name_ar'),
  ]);

  const empMap: Record<string, any> = {};
  for (const e of employees || []) empMap[e.id] = e;

  return (
    <DepartmentsClient
      companies={companies || []}
      departments={depts || []}
      employees={employees || []}
      empMap={empMap}
    />
  );
}
