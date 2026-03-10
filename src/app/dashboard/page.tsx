import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { getDashboardAnalytics } from '@/app/actions/analytics';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const [service, employee, analytics] = await Promise.all([
    createServiceClient(),
    getSessionEmployee(),
    getDashboardAnalytics(),
  ]);

  const [{ count: pendingCount }, { count: myOpenCount }, { data: recentRequests }] = await Promise.all([
    service.from('approval_steps').select('*', { count: 'exact', head: true })
      .eq('approver_id', employee?.id).eq('status', 'pending'),
    service.from('requests').select('*', { count: 'exact', head: true })
      .eq('requester_id', employee?.id)
      .not('status', 'in', '("completed","cancelled","archived","rejected")'),
    service.from('requests')
      .select('id, request_number, subject, request_type, status, created_at, requester:employees!requester_id(full_name_ar)')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  return (
    <DashboardClient
      employee={employee}
      analytics={analytics}
      pendingCount={pendingCount}
      myOpenCount={myOpenCount}
      recentRequests={recentRequests}
    />
  );
}
