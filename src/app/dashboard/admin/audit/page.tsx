import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import AuditClient from './AuditClient';

export default async function AuditPage() {
  const [service, employee] = await Promise.all([createServiceClient(), getSessionEmployee()]);
  if (!employee) redirect('/login');

  const roles = employee.roles?.map((r: any) => r.role) || [];
  const canAccess = roles.some((r: string) => ['super_admin', 'ceo', 'audit_reviewer'].includes(r));
  if (!canAccess) redirect('/dashboard');

  const { data: actions } = await service
    .from('request_actions')
    .select('id, request_id, action, rationale, note, from_status, to_status, created_at, actor_id')
    .order('created_at', { ascending: false })
    .limit(500);

  const actorIds = [...new Set((actions || []).map((a: any) => a.actor_id).filter(Boolean))];
  const requestIds = [...new Set((actions || []).map((a: any) => a.request_id).filter(Boolean))];

  const [actorsResult, requestsResult] = await Promise.all([
    actorIds.length > 0
      ? service.from('employees').select('id, full_name_ar, full_name_en, employee_code').in('id', actorIds)
      : Promise.resolve({ data: [] as any[] }),
    requestIds.length > 0
      ? service.from('requests').select('id, request_number, subject').in('id', requestIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  return (
    <AuditClient
      actions={actions || []}
      actors={actorsResult.data || []}
      requests={requestsResult.data || []}
    />
  );
}
