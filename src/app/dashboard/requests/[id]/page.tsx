import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect, notFound } from 'next/navigation';
import RequestDetailClient from './RequestDetailClient';

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
    .select('id, request_number, subject, status, priority, request_type, confidentiality, description, amount, currency, payee, cost_center, leave_type, leave_start_date, leave_end_date, submitted_at, created_at, requester_id, origin_company_id, origin_dept_id, destination_company_id, destination_dept_id')
    .eq('id', id)
    .single();

  if (!requestRaw) notFound();

  // ── 2. Fetch actions and steps (plain columns, no joins) ────────
  const [{ data: actionsRaw }, { data: stepsRaw }, { data: evidenceRaw }] = await Promise.all([
    service.from('request_actions')
      .select('id, action, rationale, note, from_status, to_status, created_at, actor_id')
      .eq('request_id', id)
      .order('created_at', { ascending: true }),
    service.from('approval_steps')
      .select('id, step_order, approver_role, status, completed_at, note, approver_id')
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
  const approverIds = [...new Set((stepsRaw || []).map(s => s.approver_id).filter(Boolean))];
  const allEmpIds  = [...new Set([requestRaw.requester_id, ...actorIds, ...approverIds].filter(Boolean))];

  // ── 4. Batch-fetch all related data in parallel ────────────────
  const [{ data: employees }, { data: companies }, { data: departments }] = await Promise.all([
    allEmpIds.length  > 0 ? service.from('employees').select('id, full_name_ar, full_name_en, employee_code').in('id', allEmpIds)  : Promise.resolve({ data: [] as any[] }),
    companyIds.length > 0 ? service.from('companies').select('id, name_ar, name_en, code').in('id', companyIds)                    : Promise.resolve({ data: [] as any[] }),
    deptIds.length    > 0 ? service.from('departments').select('id, name_ar, name_en, code').in('id', deptIds)                     : Promise.resolve({ data: [] as any[] }),
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
  }));

  // Find the current (lowest order) pending step
  const currentPendingOrder = Math.min(...approvalSteps.filter(s => s.status === 'pending').map(s => s.step_order).concat([999]));
  // Only show action panel if this user's pending step IS the current step
  const pendingStep = approvalSteps.find(s => s.approver_id === employee.id && s.status === 'pending' && s.step_order === currentPendingOrder) ?? null;

  return (
    <RequestDetailClient
      request={request}
      actions={actions}
      approvalSteps={approvalSteps}
      evidence={evidence}
      pendingStep={pendingStep ? { id: pendingStep.id } : null}
    />
  );
}
