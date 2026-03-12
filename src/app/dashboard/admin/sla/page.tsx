import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import SLAClient from './SLAClient';

export const dynamic = 'force-dynamic';

export default async function AdminSLAPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();

  const { data: me } = await service.from('employees').select('id').eq('auth_user_id', user.id).single();
  if (!me) redirect('/login');

  const { data: roleRows } = await service.from('user_roles').select('role')
    .eq('employee_id', me.id).eq('is_active', true);
  if (!(roleRows || []).some((r: any) => r.role === 'super_admin')) redirect('/dashboard');

  let configs: any[] = [];
  try {
    const { data } = await service.from('sla_configs')
      .select('request_type, target_hours, max_hours').order('request_type');
    configs = data || [];
  } catch {
    // table may not exist
  }

  return <SLAClient configs={configs} />;
}
