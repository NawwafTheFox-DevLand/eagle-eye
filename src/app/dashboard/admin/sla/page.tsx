import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import SLAClient from './SLAClient';

export default async function SLAPage() {
  const [service, employee] = await Promise.all([createServiceClient(), getSessionEmployee()]);
  if (!employee) redirect('/login');

  const roles = employee.roles?.map((r: any) => r.role) || [];
  const isAdmin = roles.some((r: string) => ['super_admin', 'ceo'].includes(r));
  if (!isAdmin) redirect('/dashboard');
  const isSuperAdmin = roles.includes('super_admin');

  const [{ data: configs }, { data: requests }] = await Promise.all([
    service.from('request_type_configs')
      .select('request_type, name_ar, name_en, default_sla_target_hours, default_sla_max_hours, is_active')
      .order('name_ar'),
    service.from('requests')
      .select('id, request_type, status, sla_breached, sla_target_at, sla_max_at, submitted_at, completed_at, created_at')
      .not('status', 'in', '("draft","cancelled")')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  return <SLAClient configs={configs || []} requests={requests || []} isSuperAdmin={isSuperAdmin} />;
}
