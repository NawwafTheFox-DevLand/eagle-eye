import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import RolesClient from './RolesClient';

export default async function AdminRolesPage() {
  const [service, employee] = await Promise.all([createServiceClient(), getSessionEmployee()]);
  if (!employee) redirect('/login');

  const isAdmin = employee.roles?.some((r: any) => ['super_admin', 'ceo'].includes(r.role));
  if (!isAdmin) redirect('/dashboard');

  const [{ data: roles }, { data: employees }, { data: companies }] = await Promise.all([
    service.from('user_roles').select('id, employee_id, role, company_id, is_active, granted_at').eq('is_active', true).order('granted_at', { ascending: false }),
    service.from('employees').select('id, employee_code, full_name_ar, company_id').eq('is_active', true).order('full_name_ar'),
    service.from('companies').select('id, code, name_ar').eq('is_active', true).order('name_ar'),
  ]);

  return <RolesClient roles={roles || []} employees={employees || []} companies={companies || []} />;
}
