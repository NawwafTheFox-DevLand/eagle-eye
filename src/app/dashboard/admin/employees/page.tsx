import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import EmployeesClient from './EmployeesClient';

export default async function AdminEmployeesPage() {
  const [service, employee] = await Promise.all([createServiceClient(), getSessionEmployee()]);
  if (!employee) redirect('/login');

  const isAdmin = employee.roles?.some((r: any) => ['super_admin', 'ceo', 'company_admin'].includes(r.role));
  if (!isAdmin) redirect('/dashboard');

  const [{ data: employees }, { data: companies }, { data: departments }] = await Promise.all([
    service.from('employees')
      .select('id, employee_code, full_name_ar, full_name_en, email, is_active, company_id, department_id, grade, title_ar')
      .order('employee_code').limit(200),
    service.from('companies').select('id, code, name_ar').eq('is_active', true).order('name_ar'),
    service.from('departments').select('id, code, name_ar, company_id').eq('is_active', true).order('name_ar'),
  ]);

  return <EmployeesClient employees={employees || []} companies={companies || []} departments={departments || []} />;
}
