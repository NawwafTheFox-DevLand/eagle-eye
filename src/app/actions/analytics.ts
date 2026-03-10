'use server';

import { createServiceClient } from '@/lib/supabase/server';

export async function getDashboardAnalytics() {
  const service = await createServiceClient();

  const [
    { data: allRequests },
    { data: recentActions },
    { count: totalEmployees },
    { data: departments },
  ] = await Promise.all([
    service.from('requests')
      .select('id, request_type, status, priority, sla_breached, submitted_at, completed_at, created_at, origin_company_id, origin_dept_id, requester_id')
      .order('created_at', { ascending: false })
      .limit(500),
    service.from('request_actions')
      .select('id, action, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    service.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
    service.from('departments').select('id, code, name_ar, name_en, company_id, head_employee_id').eq('is_active', true),
  ]);

  const requests = allRequests || [];
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Status distribution
  const statusCounts: Record<string, number> = {};
  requests.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });

  // Type distribution
  const typeCounts: Record<string, number> = {};
  requests.forEach(r => { typeCounts[r.request_type] = (typeCounts[r.request_type] || 0) + 1; });

  // Monthly trend (last 6 months)
  const monthlyData: { month: string; count: number; completed: number; breached: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const monthReqs = requests.filter(r => {
      const rd = new Date(r.created_at);
      return rd >= d && rd <= monthEnd;
    });
    monthlyData.push({
      month: monthLabel,
      count: monthReqs.length,
      completed: monthReqs.filter(r => ['completed', 'approved'].includes(r.status)).length,
      breached: monthReqs.filter(r => r.sla_breached).length,
    });
  }

  // Priority distribution
  const priorityCounts: Record<string, number> = {};
  requests.forEach(r => { priorityCounts[r.priority] = (priorityCounts[r.priority] || 0) + 1; });

  // Department workload
  const deptWorkload = (departments || []).map(dept => {
    const deptReqs = requests.filter(r => r.origin_dept_id === dept.id);
    return {
      code: dept.code,
      name_ar: dept.name_ar,
      name_en: dept.name_en,
      total: deptReqs.length,
      pending: deptReqs.filter(r => ['submitted', 'under_review', 'pending_clarification'].includes(r.status)).length,
      completed: deptReqs.filter(r => ['completed', 'approved'].includes(r.status)).length,
    };
  }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

  // Avg cycle time (completed requests)
  const completedReqs = requests.filter(r => r.completed_at && r.submitted_at);
  const avgCycleMs = completedReqs.length > 0
    ? completedReqs.reduce((sum, r) => sum + (new Date(r.completed_at).getTime() - new Date(r.submitted_at).getTime()), 0) / completedReqs.length
    : 0;
  const avgCycleHours = Math.round(avgCycleMs / (1000 * 60 * 60));

  return {
    totalRequests: requests.length,
    thisMonthRequests: requests.filter(r => new Date(r.created_at) >= thisMonth).length,
    totalEmployees: totalEmployees || 0,
    totalDepartments: (departments || []).length,
    pendingCount: requests.filter(r => ['submitted', 'under_review', 'pending_clarification'].includes(r.status)).length,
    completedCount: requests.filter(r => ['completed', 'approved'].includes(r.status)).length,
    rejectedCount: statusCounts['rejected'] || 0,
    breachedCount: requests.filter(r => r.sla_breached).length,
    avgCycleHours,
    statusCounts,
    typeCounts,
    priorityCounts,
    monthlyData,
    deptWorkload,
  };
}
