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

  // Step 1: fetch pending approval steps for this employee (plain columns, no joins)
  // Get ALL pending steps for requests where this user is an approver
  const { data: mySteps } = await service
    .from('approval_steps')
    .select('id, request_id, step_order, created_at')
    .eq('approver_id', employee.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // For each, check if this user's step is the CURRENT (lowest pending) step
  let steps: typeof mySteps = [];
  if (mySteps && mySteps.length > 0) {
    const requestIds = [...new Set(mySteps.map(s => s.request_id))];
    const { data: allPending } = await service
      .from('approval_steps')
      .select('id, request_id, step_order')
      .in('request_id', requestIds)
      .eq('status', 'pending')
      .order('step_order', { ascending: true });

    // Build map: request_id -> lowest pending step_order
    const lowestStep = new Map<string, number>();
    (allPending || []).forEach(s => {
      if (!lowestStep.has(s.request_id) || s.step_order < lowestStep.get(s.request_id)!) {
        lowestStep.set(s.request_id, s.step_order);
      }
    });

    // Only include steps where user's step_order matches the lowest
    steps = mySteps.filter(s => s.step_order === lowestStep.get(s.request_id));
  }

  let items: PendingItem[] = [];

  if (steps && steps.length > 0) {
    const requestIds = steps.map(s => s.request_id);

    // Step 2: fetch the requests for those steps
    const { data: requests } = await service
      .from('requests')
      .select('id, request_number, subject, request_type, priority, status, created_at, requester_id, origin_company_id')
      .in('id', requestIds);

    if (requests && requests.length > 0) {
      const requesterIds = [...new Set(requests.map(r => r.requester_id).filter(Boolean))];
      const companyIds   = [...new Set(requests.map(r => r.origin_company_id).filter(Boolean))];

      // Step 3: batch-fetch requesters and companies in parallel
      const [{ data: requesters }, { data: companies }] = await Promise.all([
        requesterIds.length > 0
          ? service.from('employees').select('id, full_name_ar, full_name_en').in('id', requesterIds)
          : Promise.resolve({ data: [] as any[] }),
        companyIds.length > 0
          ? service.from('companies').select('id, name_ar, name_en').in('id', companyIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      // Build lookup maps
      const empMap = new Map((requesters || []).map(e => [e.id, e]));
      const coMap  = new Map((companies  || []).map(c => [c.id, c]));
      const reqMap = new Map(requests.map(r => [r.id, r]));

      // Assemble items in original step order
      items = steps.map(step => {
        const req       = reqMap.get(step.request_id);
        const requester = req ? empMap.get(req.requester_id) : null;
        const company   = req ? coMap.get(req.origin_company_id) : null;
        return {
          stepId:          step.id,
          requestId:       req?.id ?? step.request_id,
          requestNumber:   req?.request_number ?? '',
          subject:         req?.subject ?? '',
          requestType:     req?.request_type ?? '',
          priority:        req?.priority ?? 'normal',
          status:          req?.status ?? '',
          createdAt:       req?.created_at ?? step.created_at,
          requesterNameAr: requester?.full_name_ar ?? '',
          requesterNameEn: requester?.full_name_en ?? null,
          companyNameAr:   company?.name_ar ?? '',
          companyNameEn:   company?.name_en ?? null,
        };
      });
    }
  }

  return <ApprovalsClient items={items} />;
}
