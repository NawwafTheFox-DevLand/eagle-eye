import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const [service, employee] = await Promise.all([createServiceClient(), getSessionEmployee()]);
  if (!employee) redirect('/login');

  const [{ data: company }, { data: department }, { data: roles }] = await Promise.all([
    service.from('companies').select('name_ar, name_en, code').eq('id', employee.company_id).single(),
    employee.department_id ? service.from('departments').select('name_ar, name_en, code').eq('id', employee.department_id).single() : Promise.resolve({ data: null }),
    service.from('user_roles').select('role').eq('employee_id', employee.id).eq('is_active', true),
  ]);

  const { data: fullEmp } = await service.from('employees')
    .select('employee_code, email, title_ar, grade, nationality, gender, date_of_birth, bank_name, iban')
    .eq('id', employee.id).single();

  return <ProfileClient employee={{ ...employee, ...fullEmp }} company={company} department={department} roles={roles || []} />;
}
