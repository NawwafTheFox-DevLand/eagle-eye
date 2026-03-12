import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import AuditClient from './AuditClient';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();

  const { data: me } = await service.from('employees').select('id').eq('auth_user_id', user.id).single();
  if (!me) redirect('/login');

  const { data: roleRows } = await service.from('user_roles').select('role')
    .eq('employee_id', me.id).eq('is_active', true);
  if (!(roleRows || []).some((r: any) => r.role === 'super_admin')) redirect('/dashboard');

  const { data: actions } = await service.from('request_actions')
    .select('id, request_id, action, actor_id, from_person_id, to_person_id, from_status, to_status, note, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const allActions = actions || [];

  // Batch-fetch actor names
  const actorIds = [...new Set(allActions.map(a => a.actor_id).filter(Boolean))] as string[];
  const actorMap: Record<string, any> = {};
  if (actorIds.length > 0) {
    const { data: actors } = await service.from('employees')
      .select('id, full_name_ar, full_name_en').in('id', actorIds);
    for (const a of actors || []) actorMap[a.id] = a;
  }

  // Batch-fetch request numbers
  const reqIds = [...new Set(allActions.map(a => a.request_id).filter(Boolean))] as string[];
  const reqMap: Record<string, string> = {};
  if (reqIds.length > 0) {
    const { data: reqs } = await service.from('requests')
      .select('id, request_number').in('id', reqIds);
    for (const r of reqs || []) reqMap[r.id] = r.request_number;
  }

  return <AuditClient actions={allActions} actorMap={actorMap} reqMap={reqMap} />;
}
