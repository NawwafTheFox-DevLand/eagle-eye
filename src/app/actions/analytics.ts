'use server';

import { createServiceClient } from '@/lib/supabase/server';

export async function getDashboardAnalytics() {
  const service = await createServiceClient();

  const [
    { data: allRequests },
    { data: recentActions },
    { count: totalEmployees },
    { data: departments },
    { data: sentBackActions },
    { data: pendingFinancial },
    { data: evidenceFiles },
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
    service.from('request_actions').select('id, action').eq('action', 'sent_back'),
    service.from('requests').select('id, amount').eq('request_type', 'fund_disbursement').in('status', ['submitted', 'under_review', 'pending_clarification']),
    service.from('evidence').select('request_id'),
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

  const returnCount = (sentBackActions || []).length;
  const approvedCount = statusCounts['approved'] || 0;
  const rejectedCount2 = statusCounts['rejected'] || 0;
  const totalDecided = approvedCount + rejectedCount2;
  const approvalRate = totalDecided > 0 ? Math.round((approvedCount / totalDecided) * 100) : 0;
  const rejectionRate = totalDecided > 0 ? Math.round((rejectedCount2 / totalDecided) * 100) : 0;
  const financialExposure = (pendingFinancial || []).reduce((s: number, r: any) => s + (parseFloat(r.amount) || 0), 0);
  const completedIds = new Set(requests.filter(r => ['completed', 'approved'].includes(r.status)).map(r => r.id));
  const evidenceRequestIds = new Set((evidenceFiles || []).map((e: any) => e.request_id));
  const completedWithEvidence = [...completedIds].filter(id => evidenceRequestIds.has(id)).length;
  const evidenceCompleteness = completedIds.size > 0 ? Math.round((completedWithEvidence / completedIds.size) * 100) : 0;

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
    returnCount,
    approvalRate,
    rejectionRate,
    financialExposure,
    evidenceCompleteness,
  };
}

export async function getScopedAnalytics(filters: {
  companyId?: string;
  departmentId?: string;
  employeeId?: string;
}) {
  const service = await createServiceClient();

  let query = service
    .from('requests')
    .select('id, request_type, status, priority, sla_breached, submitted_at, completed_at, created_at, origin_company_id, origin_dept_id, requester_id, amount')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (filters.employeeId) {
    query = query.eq('requester_id', filters.employeeId);
  } else if (filters.departmentId) {
    query = query.eq('origin_dept_id', filters.departmentId);
  } else if (filters.companyId) {
    query = query.eq('origin_company_id', filters.companyId);
  }

  const { data: allRequests } = await query;
  const requests = allRequests || [];
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch evidence and sent_back actions for this scope
  const requestIds = requests.map(r => r.id);
  const [{ data: scopedEvidence }, { data: scopedSentBack }] = await Promise.all([
    requestIds.length > 0
      ? service.from('evidence').select('request_id').in('request_id', requestIds)
      : Promise.resolve({ data: [] as any[] }),
    requestIds.length > 0
      ? service.from('request_actions').select('request_id').eq('action', 'sent_back').in('request_id', requestIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const statusCounts: Record<string, number> = {};
  requests.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });

  const typeCounts: Record<string, number> = {};
  requests.forEach(r => { typeCounts[r.request_type] = (typeCounts[r.request_type] || 0) + 1; });

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

  // Department workload (shown when not filtered to employee level)
  let deptWorkload: any[] = [];
  if (!filters.employeeId) {
    const deptIds = [...new Set(requests.map(r => r.origin_dept_id).filter(Boolean))];
    if (deptIds.length > 0) {
      const { data: depts } = await service.from('departments').select('id, code, name_ar, name_en').in('id', deptIds);
      deptWorkload = (depts || []).map(dept => {
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
    }
  }

  // Employee performance table (shown when filtered to department level)
  let employeePerformance: any[] = [];
  if (filters.departmentId && !filters.employeeId) {
    const empIds = [...new Set(requests.map(r => r.requester_id).filter(Boolean))];
    if (empIds.length > 0) {
      const { data: emps } = await service.from('employees').select('id, full_name_ar, full_name_en').in('id', empIds);
      employeePerformance = (emps || []).map(emp => {
        const empReqs = requests.filter(r => r.requester_id === emp.id);
        const completedR = empReqs.filter(r => r.completed_at && r.submitted_at);
        const avgMs = completedR.length > 0
          ? completedR.reduce((s, r) => s + (new Date(r.completed_at!).getTime() - new Date(r.submitted_at!).getTime()), 0) / completedR.length
          : 0;
        const approved = empReqs.filter(r => ['approved', 'completed'].includes(r.status)).length;
        const rejected = empReqs.filter(r => r.status === 'rejected').length;
        const decided = approved + rejected;
        return {
          id: emp.id,
          full_name_ar: emp.full_name_ar,
          full_name_en: emp.full_name_en,
          requestCount: empReqs.length,
          avgCycleHours: Math.round(avgMs / (1000 * 60 * 60)),
          approvalRate: decided > 0 ? Math.round((approved / decided) * 100) : null,
          pending: empReqs.filter(r => ['submitted', 'under_review', 'pending_clarification'].includes(r.status)).length,
        };
      }).sort((a, b) => b.requestCount - a.requestCount);
    }
  }

  const completedReqs = requests.filter(r => r.completed_at && r.submitted_at);
  const avgCycleMs = completedReqs.length > 0
    ? completedReqs.reduce((sum, r) => sum + (new Date(r.completed_at!).getTime() - new Date(r.submitted_at!).getTime()), 0) / completedReqs.length
    : 0;
  const avgCycleHours = Math.round(avgCycleMs / (1000 * 60 * 60));

  const approvedCount = statusCounts['approved'] || 0;
  const rejectedCount = statusCounts['rejected'] || 0;
  const totalDecided = approvedCount + rejectedCount;
  const approvalRate = totalDecided > 0 ? Math.round((approvedCount / totalDecided) * 100) : 0;
  const rejectionRate = totalDecided > 0 ? Math.round((rejectedCount / totalDecided) * 100) : 0;

  const financialExposure = requests
    .filter(r => r.request_type === 'fund_disbursement' && ['submitted', 'under_review', 'pending_clarification'].includes(r.status))
    .reduce((s, r) => s + (parseFloat((r as any).amount) || 0), 0);

  const pendingCount = (statusCounts['submitted'] || 0) + (statusCounts['under_review'] || 0) + (statusCounts['pending_clarification'] || 0);

  // Evidence completeness for scoped requests
  const completedIds = new Set(requests.filter(r => ['completed', 'approved'].includes(r.status)).map(r => r.id));
  const evidenceRequestIds = new Set((scopedEvidence || []).map((e: any) => e.request_id));
  const completedWithEvidence = [...completedIds].filter(id => evidenceRequestIds.has(id)).length;
  const evidenceCompleteness = completedIds.size > 0 ? Math.round((completedWithEvidence / completedIds.size) * 100) : 0;

  // Return/clarification count (unique requests that were sent back at least once)
  const returnCount = new Set((scopedSentBack || []).map((a: any) => a.request_id)).size;

  return {
    totalRequests: requests.length,
    thisMonthRequests: requests.filter(r => new Date(r.created_at) >= thisMonth).length,
    pendingCount,
    completedCount: (statusCounts['completed'] || 0) + (statusCounts['approved'] || 0),
    rejectedCount,
    breachedCount: requests.filter(r => r.sla_breached).length,
    avgCycleHours,
    statusCounts,
    typeCounts,
    monthlyData,
    deptWorkload,
    employeePerformance,
    approvalRate,
    rejectionRate,
    financialExposure,
    returnCount,
    evidenceCompleteness,
    totalEmployees: 0,
    totalDepartments: deptWorkload.length,
  };
}
