import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { getDashboardAnalytics } from '@/app/actions/analytics';
import DashboardClient from './DashboardClient';

function getHighestRole(roles: { role: string }[]): string {
  for (const r of ['super_admin', 'ceo', 'company_admin', 'department_manager']) {
    if (roles.some(ur => ur.role === r)) return r;
  }
  return 'employee';
}

export default async function DashboardPage() {
  const [service, employee, analytics] = await Promise.all([
    createServiceClient(),
    getSessionEmployee(),
    getDashboardAnalytics(),
  ]);

  if (!employee) {
    return null;
  }

  const role = getHighestRole(employee.roles || []);
  const isCEO = role === 'super_admin' || role === 'ceo';
  const isCompanyAdmin = role === 'company_admin';
  const isDeptManager = role === 'department_manager';

  // Personal counts
  const [{ count: pendingCount }, { count: myOpenCount }, { data: rawRequests }] = await Promise.all([
    service.from('approval_steps').select('*', { count: 'exact', head: true })
      .eq('approver_id', employee.id).eq('status', 'pending'),
    service.from('requests').select('*', { count: 'exact', head: true })
      .eq('requester_id', employee.id)
      .not('status', 'in', '("completed","cancelled","archived","rejected")'),
    service.from('requests')
      .select('id, request_number, subject, request_type, status, created_at, requester_id')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  // Enrich recent requests with requester names
  let recentRequests = rawRequests || [];
  if (recentRequests.length > 0) {
    const requesterIds = [...new Set(recentRequests.map((r: any) => r.requester_id).filter(Boolean))];
    if (requesterIds.length > 0) {
      const { data: requesters } = await service.from('employees').select('id, full_name_ar, full_name_en').in('id', requesterIds);
      const empMap = new Map((requesters || []).map((e: any) => [e.id, e]));
      recentRequests = recentRequests.map((r: any) => ({ ...r, requester: empMap.get(r.requester_id) || null }));
    }
  }

  // Fetch scope data based on role
  let companies: any[] = [];
  let departments: any[] = [];
  let scopeEmployees: any[] = [];
  let upcomingApprovals: any[] = [];

  if (isCEO) {
    const [{ data: co }, { data: depts }, { data: emps }] = await Promise.all([
      service.from('companies').select('id, name_ar, name_en, code').order('name_ar'),
      service.from('departments').select('id, name_ar, name_en, company_id, code').eq('is_active', true).order('name_ar'),
      service.from('employees').select('id, full_name_ar, full_name_en, department_id').eq('is_active', true).order('full_name_ar'),
    ]);
    companies = co || [];
    departments = depts || [];
    scopeEmployees = emps || [];

    // CEO upcoming approvals: CEO's steps that are not the current (min) pending step
    const { data: myPendingSteps } = await service
      .from('approval_steps')
      .select('id, request_id, step_order, approver_role')
      .eq('approver_id', employee.id)
      .eq('status', 'pending');

    if (myPendingSteps && myPendingSteps.length > 0) {
      const requestIds = [...new Set(myPendingSteps.map(s => s.request_id))];
      const { data: allPendingSteps } = await service
        .from('approval_steps')
        .select('request_id, step_order, approver_role')
        .in('request_id', requestIds)
        .eq('status', 'pending');

      const minByRequest: Record<string, number> = {};
      (allPendingSteps || []).forEach(s => {
        if (!minByRequest[s.request_id] || s.step_order < minByRequest[s.request_id]) {
          minByRequest[s.request_id] = s.step_order;
        }
      });

      const upcomingSteps = myPendingSteps.filter(s => (minByRequest[s.request_id] ?? 0) < s.step_order);

      if (upcomingSteps.length > 0) {
        const upcomingReqIds = [...new Set(upcomingSteps.map(s => s.request_id))];
        const { data: upcomingReqs } = await service
          .from('requests')
          .select('id, request_number, subject')
          .in('id', upcomingReqIds);

        const reqMap = new Map((upcomingReqs || []).map(r => [r.id, r]));
        upcomingApprovals = upcomingSteps.map(s => {
          const req = reqMap.get(s.request_id);
          const currentMin = minByRequest[s.request_id];
          const currentStep = (allPendingSteps || []).find(ps => ps.request_id === s.request_id && ps.step_order === currentMin);
          return {
            requestId: s.request_id,
            requestNumber: req?.request_number || '',
            subject: req?.subject || '',
            currentStepRole: currentStep?.approver_role || '',
            stepsRemaining: s.step_order - currentMin,
          };
        });
      }
    }

  } else if (isCompanyAdmin && employee.company_id) {
    const [{ data: depts }, { data: emps }] = await Promise.all([
      service.from('departments').select('id, name_ar, name_en, company_id, code').eq('company_id', employee.company_id).eq('is_active', true).order('name_ar'),
      service.from('employees').select('id, full_name_ar, full_name_en, department_id').eq('company_id', employee.company_id).eq('is_active', true).order('full_name_ar'),
    ]);
    departments = depts || [];
    scopeEmployees = emps || [];

  } else if (isDeptManager && employee.department_id) {
    const { data: emps } = await service
      .from('employees')
      .select('id, full_name_ar, full_name_en, department_id')
      .eq('department_id', employee.department_id)
      .eq('is_active', true)
      .order('full_name_ar');
    scopeEmployees = emps || [];
  }

  return (
    <DashboardClient
      employee={employee}
      analytics={analytics}
      pendingCount={pendingCount}
      myOpenCount={myOpenCount}
      recentRequests={recentRequests}
      role={role}
      companies={companies}
      departments={departments}
      scopeEmployees={scopeEmployees}
      upcomingApprovals={upcomingApprovals}
    />
  );
}
