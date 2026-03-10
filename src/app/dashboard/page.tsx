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

  const [{ count: pendingCount }, { count: myOpenCount }, { data: rawRequests }] = await Promise.all([
    service.from('approval_steps').select('*', { count: 'exact', head: true })
      .eq('approver_id', employee?.id).eq('status', 'pending'),
    service.from('requests').select('*', { count: 'exact', head: true })
      .eq('requester_id', employee?.id)
      .not('status', 'in', '("completed","cancelled","archived","rejected")'),
    service.from('requests')
      .select('id, request_number, subject, request_type, status, created_at, requester_id')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  // Fetch requester names separately
  let recentRequests = rawRequests || [];
  if (recentRequests.length > 0) {
    const requesterIds = [...new Set(recentRequests.map((r: any) => r.requester_id).filter(Boolean))];
    if (requesterIds.length > 0) {
      const { data: requesters } = await service.from('employees').select('id, full_name_ar').in('id', requesterIds);
      const empMap = new Map((requesters || []).map((e: any) => [e.id, e]));
      recentRequests = recentRequests.map((r: any) => ({
        ...r,
        requester: empMap.get(r.requester_id) || null,
      }));
    }
  }

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
