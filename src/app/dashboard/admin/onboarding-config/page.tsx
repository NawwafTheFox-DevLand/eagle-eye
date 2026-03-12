import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import OnboardingConfigClient from './OnboardingConfigClient';

export const dynamic = 'force-dynamic';

export default async function OnboardingConfigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();

  const { data: emp } = await service
    .from('employees')
    .select('id, department_id, company_id')
    .eq('auth_user_id', user.id)
    .single();
  if (!emp) redirect('/login');

  const { data: roleRows } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', emp.id)
    .eq('is_active', true);
  const roles = (roleRows || []).map((r: any) => r.role as string);

  // Determine if HR head (head of a department with 'HR' in the code)
  let isHRHead = false;
  if (emp.department_id) {
    const { data: dept } = await service
      .from('departments')
      .select('code, head_employee_id')
      .eq('id', emp.department_id)
      .single();
    isHRHead = dept?.head_employee_id === emp.id && (dept?.code || '').toUpperCase().includes('HR');
  }

  const isSuperAdmin = roles.includes('super_admin');
  if (!isSuperAdmin && !isHRHead) redirect('/dashboard');

  const { data: configs } = await service
    .from('onboarding_config')
    .select('id, task_type, name_ar, name_en, assignee_dept_code, sla_hours, depends_on, is_active')
    .order('task_type');

  const { data: departments } = await service
    .from('departments')
    .select('id, code, name_ar, name_en')
    .eq('is_active', true)
    .order('code');

  return (
    <OnboardingConfigClient
      configs={configs || []}
      departments={departments || []}
    />
  );
}
