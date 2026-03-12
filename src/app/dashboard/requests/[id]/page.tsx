import { redirect, notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import RequestDetailClient from './RequestDetailClient';

export const dynamic = 'force-dynamic';

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const service = await createServiceClient();

    // Current employee
    const { data: emp } = await service
      .from('employees')
      .select('id, company_id, department_id, full_name_ar, full_name_en')
      .eq('auth_user_id', user.id)
      .single();
    if (!emp) redirect('/login');

    // Request
    const { data: request } = await service
      .from('requests')
      .select('id, request_number, request_type, status, priority, confidentiality, requester_id, assigned_to, origin_company_id, origin_dept_id, destination_company_id, destination_dept_id, subject, description, amount, currency, payee, cost_center, leave_type, leave_start_date, leave_end_date, requires_ceo, requires_hr, requires_finance, ceo_stamped_at, ceo_stamped_by, hr_stamped_at, hr_stamped_by, finance_stamped_at, finance_stamped_by, company_exit_stamped_at, company_exit_stamped_by, submitted_at, completed_at, created_at, updated_at, parent_request_id, task_type, depends_on_request_id, metadata')
      .eq('id', id)
      .single();
    if (!request) notFound();

    // All request_actions for this request
    const { data: rawActions } = await service
      .from('request_actions')
      .select('id, action, actor_id, from_person_id, to_person_id, note, note_visibility, from_status, to_status, created_at')
      .eq('request_id', id)
      .order('created_at', { ascending: true });
    const actions = rawActions || [];

    // Batch lookup: collect all unique person IDs across request + actions
    const personIds = [
      ...new Set([
        request.requester_id,
        request.assigned_to,
        request.ceo_stamped_by,
        request.hr_stamped_by,
        request.finance_stamped_by,
        request.company_exit_stamped_by,
        ...actions.map((a: any) => a.actor_id),
        ...actions.map((a: any) => a.from_person_id),
        ...actions.map((a: any) => a.to_person_id),
      ].filter(Boolean)),
    ] as string[];

    const companyIds = [
      ...new Set([
        request.origin_company_id,
        request.destination_company_id,
      ].filter(Boolean)),
    ] as string[];

    const deptIds = [
      ...new Set([
        request.origin_dept_id,
        request.destination_dept_id,
      ].filter(Boolean)),
    ] as string[];

    // Batch fetch
    const [
      { data: persons },
      { data: companies },
      { data: departments },
      { data: allEvidence },
      { data: allCompanies },
      { data: allDepartments },
      { data: empRoles },
    ] = await Promise.all([
      personIds.length > 0
        ? service.from('employees').select('id, full_name_ar, full_name_en').in('id', personIds)
        : Promise.resolve({ data: [] as any[] }),
      companyIds.length > 0
        ? service.from('companies').select('id, name_ar, name_en, code, ceo_employee_id, is_holding').in('id', companyIds)
        : Promise.resolve({ data: [] as any[] }),
      deptIds.length > 0
        ? service.from('departments').select('id, name_ar, name_en, code, head_employee_id').in('id', deptIds)
        : Promise.resolve({ data: [] as any[] }),
      service.from('evidence').select('id, file_name, file_url, file_type, file_size, uploaded_by, created_at').eq('request_id', id).order('created_at', { ascending: true }),
      service.from('companies').select('id, name_ar, name_en, code, is_holding').order('name_ar'),
      service.from('departments').select('id, name_ar, name_en, code, company_id').eq('is_active', true).order('name_ar'),
      service.from('user_roles').select('role, company_id').eq('employee_id', emp.id).eq('is_active', true),
    ]);

    const empMap  = new Map((persons || []).map((p: any) => [p.id, p]));
    const coMap   = new Map((companies || []).map((c: any) => [c.id, c]));
    const deptMap = new Map((departments || []).map((d: any) => [d.id, d]));

    // ── Onboarding-specific data ──────────────────────────────────────────────
    const isOnboardingParent =
      (request as any).request_type === 'employee_onboarding' && !(request as any).parent_request_id;
    const isOnboardingChild =
      !!(request as any).parent_request_id && !!(request as any).task_type;

    let childRequests: any[] = [];
    let parentRequest: any = null;
    let dependsOnStatus: string | null = null;

    if (isOnboardingParent) {
      const { data: children } = await service
        .from('requests')
        .select('id, task_type, status, assigned_to, subject, created_at, completed_at, depends_on_request_id')
        .eq('parent_request_id', id);
      childRequests = children || [];

      // Collect assignee IDs for child display
      const childAssigneeIds = [...new Set(childRequests.map((c: any) => c.assigned_to).filter(Boolean))];
      if (childAssigneeIds.length > 0) {
        const { data: childAssignees } = await service
          .from('employees')
          .select('id, full_name_ar, full_name_en')
          .in('id', childAssigneeIds);
        (childAssignees || []).forEach((e: any) => empMap.set(e.id, e));
      }
    }

    if (isOnboardingChild) {
      if ((request as any).parent_request_id) {
        const { data: parent } = await service
          .from('requests')
          .select('id, request_number, subject')
          .eq('id', (request as any).parent_request_id)
          .single();
        parentRequest = parent || null;
      }
      if ((request as any).depends_on_request_id) {
        const { data: dep } = await service
          .from('requests')
          .select('status')
          .eq('id', (request as any).depends_on_request_id)
          .single();
        dependsOnStatus = (dep as any)?.status || null;
      }
    }

    // Determine current user powers
    const destDept = request.destination_dept_id ? deptMap.get(request.destination_dept_id) : null;
    const originCo = request.origin_company_id    ? coMap.get(request.origin_company_id)    : null;

    const isDeptHead         = destDept?.head_employee_id === emp.id;
    const isOriginCompanyCEO = (originCo as any)?.ceo_employee_id === emp.id;
    const roles              = empRoles || [];
    const isHoldingCEO       = (companies || []).some((c: any) => c.is_holding && c.ceo_employee_id === emp.id);
    const isFinanceHead      = roles.some((r: any) => r.role === 'finance_approver');
    const isHRHead           = roles.some((r: any) => r.role === 'hr_approver');

    // ── Evidence visibility filter ────────────────────────────────────────────

    const isCurrentHolder  = (request as any).assigned_to === emp.id;
    const isRequester      = (request as any).requester_id === emp.id;
    const isSuperAdmin     = (empRoles || []).some((r: any) => r.role === 'super_admin');
    const isAuditReviewer  = (empRoles || []).some((r: any) => r.role === 'audit_reviewer');

    const originCo2 = coMap.get((request as any).origin_company_id);
    const destCo2   = coMap.get((request as any).destination_company_id);
    const isCompanyCEO =
      (originCo2 as any)?.ceo_employee_id === emp.id ||
      (destCo2   as any)?.ceo_employee_id === emp.id;

    const seesAll = isCurrentHolder || isSuperAdmin || isHoldingCEO || isCompanyCEO || isAuditReviewer;

    let visibleEvidence = allEvidence || [];

    if (!seesAll) {
      const { data: lastInvolvement } = await service
        .from('request_actions')
        .select('created_at')
        .eq('request_id', id)
        .or(`actor_id.eq.${emp.id},to_person_id.eq.${emp.id}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastInvolvement) {
        // Add 5-second buffer to handle timing issues between evidence upload and action creation
        const cutoff = new Date(new Date((lastInvolvement as any).created_at).getTime() + 5000);
        visibleEvidence = (allEvidence || []).filter((e: any) => {
          // Always show viewer's own uploads
          if (e.uploaded_by === emp.id) return true;
          // Show other uploads up to cutoff
          return new Date(e.created_at) <= cutoff;
        });
      } else if (isRequester) {
        // Requester never got the request back — always see own uploads
        visibleEvidence = (allEvidence || []).filter(
          (e: any) => e.uploaded_by === emp.id
        );
      } else {
        // Viewer never touched this request — no evidence
        visibleEvidence = [];
      }
    }

    const evidenceFiltered = !seesAll && visibleEvidence.length !== (allEvidence || []).length;

    // Enrich actions with person names
    const enrichedActions = actions.map((a: any) => ({
      ...a,
      actor:       a.actor_id       ? empMap.get(a.actor_id)       || null : null,
      from_person: a.from_person_id ? empMap.get(a.from_person_id) || null : null,
      to_person:   a.to_person_id   ? empMap.get(a.to_person_id)   || null : null,
    }));

    // Enrich visible evidence
    const enrichedEvidence = visibleEvidence.map((e: any) => ({
      ...e,
      uploader: e.uploaded_by ? empMap.get(e.uploaded_by) || null : null,
    }));

    return (
      <RequestDetailClient
        request={request}
        actions={enrichedActions}
        evidence={enrichedEvidence}
        evidenceFiltered={evidenceFiltered}
        currentEmployeeId={emp.id}
        requesterId={request.requester_id}
        requesterName={empMap.get(request.requester_id) || null}
        assignedName={(request as any).assigned_to ? empMap.get((request as any).assigned_to) || null : null}
        originCompany={coMap.get((request as any).origin_company_id) || null}
        originDept={deptMap.get((request as any).origin_dept_id) || null}
        destCompany={coMap.get((request as any).destination_company_id) || null}
        destDept={destDept || null}
        isDeptHead={isDeptHead}
        isOriginCompanyCEO={isOriginCompanyCEO}
        isHoldingCEO={isHoldingCEO}
        isFinanceHead={isFinanceHead}
        isHRHead={isHRHead}
        allCompanies={allCompanies || []}
        allDepartments={allDepartments || []}
        isOnboardingParent={isOnboardingParent}
        isOnboardingChild={isOnboardingChild}
        childRequests={childRequests}
        childAssigneeMap={Object.fromEntries(empMap)}
        parentRequest={parentRequest}
        dependsOnStatus={dependsOnStatus}
      />
    );
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    return (
      <div className="max-w-3xl mx-auto p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm font-mono">
        <strong>خطأ:</strong> {String(err?.message ?? err)}
      </div>
    );
  }
}
