import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import InboxClient from './InboxClient';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();
  const { data: emp } = await service.from('employees').select('id').eq('auth_user_id', user.id).single();
  if (!emp) redirect('/login');

  const { data: requests } = await service
    .from('requests')
    .select('id, request_number, subject, request_type, status, priority, created_at, requester_id, origin_company_id, parent_request_id, task_type')
    .eq('assigned_to', emp.id)
    .in('status', ['in_progress', 'pending_clarification'])
    .order('created_at', { ascending: false });

  const rows = requests || [];
  if (rows.length === 0) return <InboxClient items={[]} />;

  const requestIds   = rows.map(r => r.id);
  const requesterIds = [...new Set(rows.map(r => r.requester_id).filter(Boolean))];
  const companyIds   = [...new Set(rows.map(r => r.origin_company_id).filter(Boolean))];

  // Get last action per request to find who sent it
  const [{ data: lastActions }, { data: emps }, { data: cos }] = await Promise.all([
    service.from('request_actions')
      .select('request_id, actor_id, created_at')
      .in('request_id', requestIds)
      .order('created_at', { ascending: false }),
    requesterIds.length > 0
      ? service.from('employees').select('id, full_name_ar, full_name_en').in('id', requesterIds)
      : Promise.resolve({ data: [] as any[] }),
    companyIds.length > 0
      ? service.from('companies').select('id, name_ar, name_en').in('id', companyIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  // Find last action per request
  const lastActionMap = new Map<string, any>();
  for (const a of (lastActions || [])) {
    if (!lastActionMap.has(a.request_id)) {
      lastActionMap.set(a.request_id, a);
    }
  }

  // Get unique actor IDs from last actions
  const actorIds = [...new Set([...lastActionMap.values()].map(a => a.actor_id).filter(Boolean))] as string[];
  const allEmpIds = [...new Set([...requesterIds, ...actorIds])] as string[];

  let allEmps: any[] = emps || [];
  if (actorIds.some(id => !requesterIds.includes(id))) {
    const { data: extraEmps } = await service.from('employees').select('id, full_name_ar, full_name_en').in('id', allEmpIds);
    allEmps = extraEmps || [];
  }

  const empMap = new Map(allEmps.map(e => [e.id, e]));
  const coMap  = new Map((cos || []).map(c => [c.id, c]));

  const items = rows.map(r => {
    const lastAction = lastActionMap.get(r.id);
    return {
      ...r,
      requester:      empMap.get(r.requester_id) || null,
      company:        coMap.get(r.origin_company_id) || null,
      sender:         lastAction?.actor_id ? empMap.get(lastAction.actor_id) || null : null,
      last_action_at: lastAction?.created_at ?? r.created_at,
    };
  });

  return <InboxClient items={items} />;
}
