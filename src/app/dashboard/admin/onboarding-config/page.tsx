import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getOnboardingConfig } from '@/app/actions/onboarding';
import OnboardingConfigClient from './OnboardingConfigClient';

export const dynamic = 'force-dynamic';

export default async function OnboardingConfigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();

  // Get employee
  const { data: emp } = await service
    .from('employees')
    .select('id, company_id, department_id')
    .eq('auth_user_id', user.id)
    .single();
  if (!emp) redirect('/login');

  // Get roles
  const { data: roleRows } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', emp.id)
    .eq('is_active', true);
  const roles = (roleRows || []).map((r: any) => r.role as string);

  // Check if head of HR dept
  let isHRHead = false;
  if (emp.department_id) {
    const { data: dept } = await service
      .from('departments')
      .select('code, head_employee_id')
      .eq('id', emp.department_id)
      .single();
    isHRHead = dept?.head_employee_id === emp.id && (dept?.code || '').toUpperCase().includes('HR');
  }

  const isAuthorized = roles.includes('super_admin') || isHRHead;
  if (!isAuthorized) redirect('/dashboard');

  // Fetch configs, all employees, and HR dept IDs in parallel
  const [configs, { data: employees }, { data: hrDepts }] = await Promise.all([
    getOnboardingConfig(),
    service
      .from('employees')
      .select('id, full_name_ar, full_name_en, employee_code, company_id, department_id, title_ar')
      .eq('is_active', true)
      .order('full_name_ar'),
    service
      .from('departments')
      .select('id')
      .eq('code', 'HR10'),
  ]);

  const hrDeptIds = (hrDepts || []).map((d: any) => d.id as string);

  return (
    <OnboardingConfigClient
      configs={configs}
      employees={employees || []}
      hrDeptIds={hrDeptIds}
    />
  );
}
