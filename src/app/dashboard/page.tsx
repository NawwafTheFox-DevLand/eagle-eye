import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const [service, employee] = await Promise.all([
    createServiceClient(),
    getSessionEmployee(),
  ]);

  const [
    { count: pendingCount },
    { count: myOpenCount },
    { count: completedCount },
    { count: overdueCount },
    { data: recentRequests },
  ] = await Promise.all([
    service.from('approval_steps').select('*', { count: 'exact', head: true })
      .eq('approver_id', employee?.id).eq('status', 'pending'),
    service.from('requests').select('*', { count: 'exact', head: true })
      .eq('requester_id', employee?.id)
      .not('status', 'in', '("completed","cancelled","archived","rejected")'),
    service.from('requests').select('*', { count: 'exact', head: true })
      .eq('status', 'completed'),
    service.from('requests').select('*', { count: 'exact', head: true })
      .eq('sla_breached', true)
      .not('status', 'in', '("completed","cancelled","archived","rejected")'),
    service.from('requests')
      .select('id, request_number, subject, request_type, status, created_at, requester:employees!requester_id(full_name_ar)')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  return (
    <DashboardClient
      employee={employee}
      pendingCount={pendingCount}
      myOpenCount={myOpenCount}
      completedCount={completedCount}
      overdueCount={overdueCount}
      recentRequests={recentRequests}
    />
  );
}
