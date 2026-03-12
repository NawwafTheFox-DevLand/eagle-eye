import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();

  const { data: emp } = await service
    .from('employees')
    .select('id, full_name_ar, full_name_en, employee_code, company_id, department_id, title_ar, title_en, grade, is_active')
    .eq('auth_user_id', user.id)
    .single();

  if (!emp) redirect('/login');

  const [{ data: company }, { data: department }] = await Promise.all([
    emp.company_id
      ? service.from('companies').select('name_ar, name_en, code').eq('id', emp.company_id).single()
      : Promise.resolve({ data: null }),
    emp.department_id
      ? service.from('departments').select('name_ar, name_en, code').eq('id', emp.department_id).single()
      : Promise.resolve({ data: null }),
  ]);

  return <ProfileClient employee={emp} company={company} department={department} userEmail={user.email ?? ''} />;
}
