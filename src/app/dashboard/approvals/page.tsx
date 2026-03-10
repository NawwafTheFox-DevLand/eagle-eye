import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import ApprovalsClient, { type PendingItem } from './ApprovalsClient';

export default async function ApprovalsPage() {
  const [service, employee] = await Promise.all([
    createServiceClient(),
    getSessionEmployee(),
  ]);

  if (!employee) redirect('/login');

  // ── 1. Pending approval steps ────────────────────────────────
  const { data: mySteps } = await service
    .from('approval_steps')
    .select('id, request_id, step_order, created_at')
    .eq('approver_id', employee.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  let approvalItems: PendingItem[] = [];

  if (mySteps && mySteps.length > 0) {
    const requestIds = [...new Set(mySteps.map(s => s.request_id))];
    const { data: allPending } = await service
      .from('approval_steps')
      .select('id, request_id, step_order')
      .in('request_id', requestIds)
      .eq('status', 'pending')
      .order('step_order', { ascending: true });

    const lowestStep = new Map<string, number>();
    (allPending || []).forEach(s => {
      if (!lowestStep.has(s.request_id) || s.step_order < lowestStep.get(s.request_id)!) {
        lowestStep.set(s.request_id, s.step_order);
      }
    });
    const activeSteps = mySteps.filter(s => s.step_order === lowestStep.get(s.request_id));

    if (activeSteps.length > 0) {
      const reqIds = activeSteps.map(s => s.request_id);
      const { data: requests } = await service
        .from('requests')
        .select('id, request_number, subject, request_type, priority, status, created_at, requester_id, origin_company_id')
        .in('id', reqIds);

      if (requests && requests.length > 0) {
        const requesterIds = [...new Set(requests.map(r => r.requester_id).filter(Boolean))];
        const companyIds   = [...new Set(requests.map(r => r.origin_company_id).filter(Boolean))];
        const [{ data: requesters }, { data: companies }] = await Promise.all([
          requesterIds.length > 0 ? service.from('employees').select('id, full_name_ar, full_name_en').in('id', requesterIds) : Promise.resolve({ data: [] as any[] }),
          companyIds.length   > 0 ? service.from('companies').select('id, name_ar, name_en').in('id', companyIds)            : Promise.resolve({ data: [] as any[] }),
        ]);
        const empMap = new Map((requesters || []).map(e => [e.id, e]));
        const coMap  = new Map((companies  || []).map(c => [c.id, c]));
        const reqMap = new Map(requests.map(r => [r.id, r]));

        approvalItems = activeSteps.map(step => {
          const req       = reqMap.get(step.request_id);
          const requester = req ? empMap.get(req.requester_id) : null;
          const company   = req ? coMap.get(req.origin_company_id) : null;
          return {
            stepId: step.id, requestId: req?.id ?? step.request_id,
            requestNumber: req?.request_number ?? '', subject: req?.subject ?? '',
            requestType: req?.request_type ?? '', priority: req?.priority ?? 'normal',
            status: req?.status ?? '', createdAt: req?.created_at ?? step.created_at,
            requesterNameAr: requester?.full_name_ar ?? '', requesterNameEn: requester?.full_name_en ?? null,
            companyNameAr: company?.name_ar ?? '', companyNameEn: company?.name_en ?? null,
            itemType: 'approval' as const,
          };
        });
      }
    }
  }

  // ── 2. Execution items ───────────────────────────────────────
  // Find requests in execution phase where this user is dest dept manager or assigned employee
  let executionItems: PendingItem[] = [];

  // Check if user is a dept manager
  const isMgr = employee.roles?.some((r: any) => r.role === 'department_manager');

  // Depts this employee manages
  const managedDeptIds: string[] = [];
  if (isMgr) {
    const { data: managedDepts } = await service
      .from('departments').select('id').eq('head_employee_id', employee.id);
    (managedDepts || []).forEach(d => managedDeptIds.push(d.id));
  }

  // Build execution query filters
  const execStatusFilter = ['pending_execution', 'assigned_to_employee', 'in_progress'];

  // Find requests assigned to this user OR destined for their dept
  const [{ data: assignedReqs }, { data: deptReqs }] = await Promise.all([
    // Assigned to this employee
    service.from('requests')
      .select('id, request_number, subject, request_type, priority, status, created_at, requester_id, origin_company_id')
      .in('status', execStatusFilter)
      .eq('assigned_to', employee.id),
    // Destined for a dept this employee manages
    managedDeptIds.length > 0
      ? service.from('requests')
          .select('id, request_number, subject, request_type, priority, status, created_at, requester_id, origin_company_id')
          .in('status', execStatusFilter)
          .in('destination_dept_id', managedDeptIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const allExecReqs = [
    ...(assignedReqs || []),
    ...(deptReqs   || []),
  ].filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i); // dedupe

  if (allExecReqs.length > 0) {
    const requesterIds = [...new Set(allExecReqs.map(r => r.requester_id).filter(Boolean))];
    const companyIds   = [...new Set(allExecReqs.map(r => r.origin_company_id).filter(Boolean))];
    const [{ data: requesters }, { data: companies }] = await Promise.all([
      requesterIds.length > 0 ? service.from('employees').select('id, full_name_ar, full_name_en').in('id', requesterIds) : Promise.resolve({ data: [] as any[] }),
      companyIds.length   > 0 ? service.from('companies').select('id, name_ar, name_en').in('id', companyIds)            : Promise.resolve({ data: [] as any[] }),
    ]);
    const empMap = new Map((requesters || []).map(e => [e.id, e]));
    const coMap  = new Map((companies  || []).map(c => [c.id, c]));

    executionItems = allExecReqs.map(req => {
      const requester = empMap.get(req.requester_id);
      const company   = coMap.get(req.origin_company_id);
      return {
        stepId: req.id, requestId: req.id,
        requestNumber: req.request_number, subject: req.subject,
        requestType: req.request_type, priority: req.priority,
        status: req.status, createdAt: req.created_at,
        requesterNameAr: requester?.full_name_ar ?? '', requesterNameEn: requester?.full_name_en ?? null,
        companyNameAr: company?.name_ar ?? '', companyNameEn: company?.name_en ?? null,
        itemType: 'execution' as const,
      };
    });
  }

  return <ApprovalsClient approvalItems={approvalItems} executionItems={executionItems} />;
}
