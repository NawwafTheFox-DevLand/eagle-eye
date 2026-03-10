import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect, notFound } from 'next/navigation';
import RequestDetailClient from './RequestDetailClient';

async function checkRequestAccess(service: any, request: any, employee: any): Promise<boolean> {
  const roles = employee.roles?.map((r: any) => r.role) || [];

  // Super admin always has access
  if (roles.includes('super_admin')) return true;

  // Requester
  if (request.requester_id === employee.id) return true;

  // Assigned employee
  if (request.assigned_to === employee.id) return true;

  // Approver in the chain
  const { data: steps } = await service
    .from('approval_steps')
    .select('id')
    .eq('request_id', request.id)
    .eq('approver_id', employee.id)
    .limit(1);
  if (steps && steps.length > 0) return true;

  // Dept manager of origin or destination dept
  const deptIds = [request.origin_dept_id, request.destination_dept_id].filter(Boolean);
  if (deptIds.length > 0) {
    const { data: managedDepts } = await service
      .from('departments')
      .select('id')
      .in('id', deptIds)
      .eq('head_employee_id', employee.id);
    if (managedDepts && managedDepts.length > 0) return true;
  }

  // Company CEO of origin or destination company
  const companyIds = [request.origin_company_id, request.destination_company_id].filter(Boolean);
  if (companyIds.length > 0) {
    const { data: ceoCompanies } = await service
      .from('companies')
      .select('id')
      .in('id', companyIds)
      .eq('ceo_employee_id', employee.id);
    if (ceoCompanies && ceoCompanies.length > 0) return true;
  }

  // Holding company CEO
  const { data: holding } = await service
    .from('companies')
    .select('ceo_employee_id')
    .eq('is_holding', true)
    .maybeSingle();
  if (holding?.ceo_employee_id === employee.id) return true;

  return false;
}

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [service, employee] = await Promise.all([
    createServiceClient(),
    getSessionEmployee(),
  ]);

  if (!employee) redirect('/login');

  // ── 1. Fetch request (plain columns, no joins) ─────────────────
  const { data: requestRaw } = await service
    .from('requests')
    .select('id, request_number, subject, status, priority, request_type, confidentiality, description, amount, currency, payee, cost_center, budget_source, due_date, leave_type, leave_start_date, leave_end_date, effective_date, compensation_impact, form_data, submitted_at, created_at, requester_id, origin_company_id, origin_dept_id, destination_company_id, destination_dept_id, assigned_to, execution_started_at')
    .eq('id', id)
    .single();

  if (!requestRaw) notFound();

  // ── Access check ───────────────────────────────────────────────
  const hasAccess = await checkRequestAccess(service, requestRaw, employee);
  if (!hasAccess) redirect('/dashboard/requests');

  // ── 2. Fetch actions and steps (plain columns, no joins) ────────
  const [{ data: actionsRaw }, { data: stepsRaw }, { data: evidenceRaw }] = await Promise.all([
    service.from('request_actions')
      .select('id, action, rationale, note, from_status, to_status, created_at, actor_id')
      .eq('request_id', id)
      .order('created_at', { ascending: true }),
    service.from('approval_steps')
      .select('id, step_order, approver_role, status, completed_at, note, approver_id, delegate_id')
      .eq('request_id', id)
      .order('step_order'),
    service.from('evidence')
      .select('id, file_name, file_path, file_size_bytes, mime_type, created_at')
      .eq('request_id', id)
      .order('created_at', { ascending: true }),
  ]);

  // ── 3. Collect all IDs for batch lookups ──────────────────────
  const companyIds = [...new Set([requestRaw.origin_company_id, requestRaw.destination_company_id].filter(Boolean))];
  const deptIds    = [...new Set([requestRaw.origin_dept_id, requestRaw.destination_dept_id].filter(Boolean))];
  const actorIds   = [...new Set((actionsRaw || []).map(a => a.actor_id).filter(Boolean))];
  const approverIds = [...new Set([
    ...(stepsRaw || []).map((s: any) => s.approver_id),
    ...(stepsRaw || []).map((s: any) => s.delegate_id),
  ].filter(Boolean))];
  const allEmpIds  = [...new Set([requestRaw.requester_id, ...actorIds, ...approverIds].filter(Boolean))];

  // ── 4. Batch-fetch all related data in parallel ────────────────
  const [{ data: employees }, { data: companies }, { data: departments }, { data: allCompanies }, { data: allDepartments }] = await Promise.all([
    allEmpIds.length  > 0 ? service.from('employees').select('id, full_name_ar, full_name_en, employee_code').in('id', allEmpIds)  : Promise.resolve({ data: [] as any[] }),
    companyIds.length > 0 ? service.from('companies').select('id, name_ar, name_en, code').in('id', companyIds)                    : Promise.resolve({ data: [] as any[] }),
    deptIds.length    > 0 ? service.from('departments').select('id, name_ar, name_en, code').in('id', deptIds)                     : Promise.resolve({ data: [] as any[] }),
    service.from('companies').select('id, code, name_ar, name_en').eq('is_active', true).order('name_ar'),
    service.from('departments').select('id, code, name_ar, name_en, company_id').eq('is_active', true).order('name_ar'),
  ]);

  // ── 5. Generate signed URLs for evidence files ─────────────────
  const evidence = await Promise.all((evidenceRaw || []).map(async f => {
    const { data } = await service.storage.from('evidence').createSignedUrl(f.file_path, 3600);
    return { ...f, url: data?.signedUrl ?? null };
  }));

  // ── 6. Build lookup maps and assemble objects ──────────────────
  const empMap  = new Map((employees  || []).map(e => [e.id, e]));
  const coMap   = new Map((companies  || []).map(c => [c.id, c]));
  const deptMap = new Map((departments || []).map(d => [d.id, d]));

  const request = {
    ...requestRaw,
    requester:           empMap.get(requestRaw.requester_id)          ?? null,
    origin_company:      coMap.get(requestRaw.origin_company_id)      ?? null,
    origin_dept:         deptMap.get(requestRaw.origin_dept_id)       ?? null,
    destination_company: requestRaw.destination_company_id ? coMap.get(requestRaw.destination_company_id)   ?? null : null,
    destination_dept:    requestRaw.destination_dept_id    ? deptMap.get(requestRaw.destination_dept_id)    ?? null : null,
  };

  const actions = (actionsRaw || []).map(a => ({
    ...a,
    actor: a.actor_id ? empMap.get(a.actor_id) ?? null : null,
  }));

  const approvalSteps = (stepsRaw || []).map(s => ({
    ...s,
    approver: empMap.get(s.approver_id) ?? null,
    delegateOf: s.delegate_id ? empMap.get(s.delegate_id) ?? null : null,
  }));

  // Find the current (lowest order) pending step
  const currentPendingOrder = Math.min(...approvalSteps.filter(s => s.status === 'pending').map(s => s.step_order).concat([999]));
  // Only show action panel if this user's pending step IS the current step
  const pendingStep = approvalSteps.find(s => s.approver_id === employee.id && s.status === 'pending' && s.step_order === currentPendingOrder) ?? null;

  const isAdmin = employee.roles?.some((r: any) => ['super_admin', 'ceo', 'company_admin', 'department_manager'].includes(r.role));
  const currentEmployeeRoles = employee.roles?.map((r: any) => r.role) || [];

  // ── Execution phase detection ──────────────────────────────────
  const EXEC_STATUSES = ['pending_execution', 'in_progress', 'assigned_to_employee'];
  let showExecution = false;
  let isDeptManagerOfDest = false;
  let isAssignedEmployee = false;
  let hasEmployeeCompleted = false;
  let assignedEmployee: any = null;

  if (EXEC_STATUSES.includes(requestRaw.status)) {
    showExecution = true;

    // Is current user the dest dept manager?
    if (requestRaw.destination_dept_id) {
      const { data: destDept } = await service
        .from('departments').select('head_employee_id').eq('id', requestRaw.destination_dept_id).single();
      isDeptManagerOfDest = destDept?.head_employee_id === employee.id;
    }

    // Is current user the assigned employee?
    isAssignedEmployee = requestRaw.assigned_to === employee.id;

    // Did the employee just complete (manager needs final sign-off)?
    if (requestRaw.status === 'in_progress' && isDeptManagerOfDest) {
      const { data: lastAction } = await service
        .from('request_actions').select('action').eq('request_id', id)
        .order('created_at', { ascending: false }).limit(1).single();
      hasEmployeeCompleted = lastAction?.action === 'employee_completed';
    }

    // Fetch assigned employee info for sidebar
    if (requestRaw.assigned_to) {
      const { data: ae } = await service
        .from('employees').select('full_name_ar, full_name_en, employee_code').eq('id', requestRaw.assigned_to).single();
      assignedEmployee = ae ?? null;
    }
  }

  return (
    <RequestDetailClient
      request={request}
      actions={actions}
      approvalSteps={approvalSteps}
      evidence={evidence}
      pendingStep={pendingStep ? { id: pendingStep.id, approverRole: pendingStep.approver_role } : null}
      currentEmployeeId={employee.id}
      currentEmployeeDeptId={employee.department_id}
      isAdmin={!!isAdmin}
      currentEmployeeRoles={currentEmployeeRoles}
      showExecution={showExecution}
      isDeptManagerOfDest={isDeptManagerOfDest}
      isAssignedEmployee={isAssignedEmployee}
      hasEmployeeCompleted={hasEmployeeCompleted}
      assignedEmployee={assignedEmployee}
      companies={allCompanies ?? []}
      departments={allDepartments ?? []}
    />
  );
}
