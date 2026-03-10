import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import AutomationClient from './AutomationClient';

export default async function AutomationPage() {
  const [service, employee] = await Promise.all([createServiceClient(), getSessionEmployee()]);
  if (!employee) redirect('/login');

  const isAdmin = employee.roles?.some((r: any) => ['super_admin', 'ceo'].includes(r.role));
  if (!isAdmin) redirect('/dashboard');

  const [{ data: configs }, { data: rules }] = await Promise.all([
    service.from('request_type_configs').select('request_type, name_ar, name_en, is_routine_eligible').eq('is_active', true).order('name_ar'),
    service.from('automation_rules').select('id, request_type, name_ar, name_en, conditions, is_active, created_at').order('created_at', { ascending: false }),
  ]);

  return <AutomationClient configs={configs || []} rules={rules || []} />;
}
