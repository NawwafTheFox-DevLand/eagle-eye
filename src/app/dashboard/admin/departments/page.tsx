import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import DepartmentsClient from './DepartmentsClient';

export default async function AdminDepartmentsPage() {
  const [service, employee] = await Promise.all([createServiceClient(), getSessionEmployee()]);
  if (!employee) redirect('/login');

  const isAdmin = employee.roles?.some((r: any) => ['super_admin', 'ceo', 'company_admin'].includes(r.role));
  if (!isAdmin) redirect('/dashboard');

  const [{ data: departments }, { data: companies }, { data: employees }] = await Promise.all([
    service.from('departments').select('id, code, name_ar, name_en, company_id, head_employee_id, is_active').order('code'),
    service.from('companies').select('id, code, name_ar').eq('is_active', true).order('name_ar'),
    service.from('employees').select('id, employee_code, full_name_ar, company_id, department_id').eq('is_active', true).order('full_name_ar'),
  ]);

  return <DepartmentsClient departments={departments || []} companies={companies || []} employees={employees || []} />;
}
