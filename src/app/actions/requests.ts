'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function getSessionEmployee() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees')
    .select('id, auth_user_id, company_id, department_id, full_name_ar, full_name_en')
    .eq('auth_user_id', user.id)
    .single();
  if (!employee) return null;

  const [{ data: roles }, { data: company }] = await Promise.all([
    service.from('user_roles').select('role').eq('employee_id', employee.id),
    service.from('companies').select('name_ar, name_en').eq('id', employee.company_id).single(),
  ]);

  return { ...employee, roles: roles || [], company: company || null };
}

// ── Notifications helper ──────────────────────────────────────
async function createNotification(service: any, opts: {
  recipientId: string;
  requestId: string;
  type: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}) {
  await service.from('notifications').insert({
    recipient_id: opts.recipientId,
    request_id:   opts.requestId,
    channel:      'in_app',
    type:         opts.type,
    title_ar:     opts.titleAr,
    title_en:     opts.titleEn,
    body_ar:      opts.bodyAr,
    body_en:      opts.bodyEn,
    action_url:   `/dashboard/requests/${opts.requestId}`,
    sent_at:      new Date().toISOString(),
  });
}

// ── Create Request ────────────────────────────────────────────
export async function createRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();

  const { data: employee } = await service
    .from('employees')
    .select('id, auth_user_id, company_id, department_id')
    .eq('auth_user_id', user.id)
    .single();

  if (!employee) throw new Error('Employee not found');

  const [{ data: company }, { data: department }] = await Promise.all([
    service.from('companies').select('code').eq('id', employee.company_id).single(),
    service.from('departments').select('code').eq('id', employee.department_id).single(),
  ]);

  const requestType         = formData.get('request_type') as string;
  const subject             = formData.get('subject') as string;
  const description         = formData.get('description') as string;
  const priority            = formData.get('priority') as string || 'normal';
  const confidentiality     = formData.get('confidentiality') as string || 'normal';
  const destinationCompanyId = formData.get('destination_company_id') as string || null;
  const destinationDeptId   = formData.get('destination_dept_id') as string || null;
  const amount              = formData.get('amount') ? parseFloat(formData.get('amount') as string) : null;
  const currency            = formData.get('currency') as string || 'SAR';
  const payee               = formData.get('payee') as string || null;
  const costCenter          = formData.get('cost_center') as string || null;
  const budgetSource        = formData.get('budget_source') as string || null;
  const dueDate             = formData.get('due_date') as string || null;
  const leaveType           = formData.get('leave_type') as string || null;
  const leaveStart          = formData.get('leave_start_date') as string || null;
  const leaveEnd            = formData.get('leave_end_date') as string || null;
  const effectiveDate       = formData.get('effective_date') as string || null;
  const compensationImpact  = formData.get('compensation_impact') as string || null;

  // Collect type-specific data into form_data JSONB
  const formDataFields: Record<string, string> = {};
  for (const key of ['justification', 'policy_reference', 'proposed_dept_code',
    'reporting_line', 'business_reason', 'legal_name', 'proposed_code',
    'position_title', 'position_code', 'grade', 'position_company', 'position_dept',
    'current_role', 'proposed_role', 'proposed_change', 'owner_employee',
    'short_name', 'parent_company', 'proposed_ceo']) {
    const val = formData.get(key) as string;
    if (val) formDataFields[key] = val;
  }

  const companyCode = company?.code || 'MH';
  const deptCode    = department?.code || 'GEN';

  const { data: numData } = await service.rpc('next_request_number', {
    p_company_code: companyCode,
    p_dept_code:    deptCode,
    p_request_type: requestType,
  });

  const requestNumber = numData || `${companyCode}-${deptCode}-${Date.now()}`;

  const { data: request, error } = await service
    .from('requests')
    .insert({
      request_number:        requestNumber,
      request_type:          requestType,
      status:                'draft',
      priority,
      confidentiality,
      requester_id:          employee.id,
      origin_company_id:     employee.company_id,
      origin_dept_id:        employee.department_id,
      destination_company_id: destinationCompanyId || null,
      destination_dept_id:   destinationDeptId || null,
      subject,
      description,
      amount,
      currency,
      payee,
      cost_center:           costCenter,
      budget_source:         budgetSource,
      due_date:              dueDate || null,
      leave_type:            leaveType,
      leave_start_date:      leaveStart || null,
      leave_end_date:        leaveEnd || null,
      effective_date:        effectiveDate || null,
      compensation_impact:   compensationImpact,
      form_data:             Object.keys(formDataFields).length > 0 ? formDataFields : null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return request;
}

// ── Submit Request ────────────────────────────────────────────
export async function submitRequest(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();

  const { data: employee } = await service
    .from('employees')
    .select('id, auth_user_id')
    .eq('auth_user_id', user.id)
    .single();

  if (!employee) throw new Error('Employee not found');

  const { data: roles } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', employee.id);

  const employeeWithRoles = { ...employee, roles: roles || [] };

  await service
    .from('requests')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', requestId);

  await service.from('request_actions').insert({
    request_id:  requestId,
    action:      'submitted',
    actor_id:    employeeWithRoles.id,
    actor_role:  employeeWithRoles.roles[0]?.role || 'employee',
    from_status: 'draft',
    to_status:   'submitted',
    note:        'تم تقديم الطلب',
  });

  const { data: request } = await service
    .from('requests')
    .select('id, request_type, origin_company_id, origin_dept_id, destination_company_id, destination_dept_id, status, subject')
    .eq('id', requestId)
    .single();

  if (request) {
    await generateApprovalSteps(service, request, employeeWithRoles);

    // Notify first pending approver
    const { data: firstStep } = await service
      .from('approval_steps')
      .select('approver_id')
      .eq('request_id', requestId)
      .eq('status', 'pending')
      .order('step_order', { ascending: true })
      .limit(1)
      .single();

    if (firstStep) {
      await createNotification(service, {
        recipientId: firstStep.approver_id,
        requestId,
        type:    'action_required',
        titleAr: 'طلب موافقة جديد',
        titleEn: 'New Approval Required',
        bodyAr:  `طلب جديد يحتاج موافقتك: ${request.subject}`,
        bodyEn:  `A new request requires your approval: ${request.subject}`,
      });
    }
  }
}

// ── Resolve delegate ──────────────────────────────────────────
async function resolveDelegate(service: any, employeeId: string): Promise<{ effectiveId: string; originalId: string | null }> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await service
    .from('delegations')
    .select('delegate_id')
    .eq('delegator_id', employeeId)
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .maybeSingle();
  return data?.delegate_id
    ? { effectiveId: data.delegate_id, originalId: employeeId }
    : { effectiveId: employeeId, originalId: null };
}

// ── Approval step generator ───────────────────────────────────
async function generateApprovalSteps(service: any, request: any, requester: any) {
  const steps: any[] = [];
  let order = 1;
  const added = new Set<string>();
  added.add(requester.id);

  async function addStep(id: string | null | undefined, role: string) {
    if (!id) return;
    const { effectiveId, originalId } = await resolveDelegate(service, id);
    if (added.has(id) || added.has(effectiveId)) return;
    added.add(id);
    added.add(effectiveId);
    steps.push({
      request_id: request.id,
      step_order: order++,
      approver_id: effectiveId,
      delegate_id: originalId,
      approver_role: role,
      is_mandatory: true,
    });
  }

  const isManager = requester.roles?.some((r: any) => ['department_manager', 'ceo', 'super_admin'].includes(r.role));

  // Step 1: Origin dept manager
  if (!isManager && request.origin_dept_id) {
    const { data: d } = await service.from('departments').select('head_employee_id').eq('id', request.origin_dept_id).single();
    await addStep(d?.head_employee_id, 'department_manager');
  }

  // Step 2: Destination dept manager (if different dept)
  if (request.destination_dept_id && request.destination_dept_id !== request.origin_dept_id) {
    const { data: d } = await service.from('departments').select('head_employee_id').eq('id', request.destination_dept_id).single();
    await addStep(d?.head_employee_id, 'department_manager');
  }

  // Step 3: Company CEO (intercompany + financial + HR + structural)
  if (['intercompany', 'fund_disbursement', 'promotion', 'demotion_disciplinary', 'create_department', 'create_company', 'create_position'].includes(request.request_type)) {
    const { data: c } = await service.from('companies').select('ceo_employee_id').eq('id', request.origin_company_id).single();
    await addStep(c?.ceo_employee_id, 'ceo');
  }

  // Step 4: Holding Finance (fund_disbursement only)
  if (request.request_type === 'fund_disbursement') {
    let q = service.from('departments').select('head_employee_id').eq('code', 'FIN10');
    if (process.env.HOLDING_COMPANY_ID) q = q.eq('company_id', process.env.HOLDING_COMPANY_ID);
    const { data: d } = await q.limit(1).single();
    await addStep(d?.head_employee_id, 'finance_approver');
  }

  // Step 5: Holding HR (leave, promotion, demotion)
  if (['leave_approval', 'promotion', 'demotion_disciplinary'].includes(request.request_type)) {
    let q = service.from('departments').select('head_employee_id').eq('code', 'HR10');
    if (process.env.HOLDING_COMPANY_ID) q = q.eq('company_id', process.env.HOLDING_COMPANY_ID);
    const { data: d } = await q.limit(1).single();
    await addStep(d?.head_employee_id, 'hr_approver');
  }

  // Step 6: Holding CEO (financial + structural)
  if (['fund_disbursement', 'create_company', 'create_department', 'create_position'].includes(request.request_type)) {
    const { data: h } = await service.from('companies').select('ceo_employee_id').eq('is_holding', true).single();
    await addStep(h?.ceo_employee_id, 'ceo');
  }

  if (steps.length > 0) {
    await service.from('approval_steps').insert(steps);
    await service.from('requests').update({ status: 'under_review' }).eq('id', request.id);
  } else {
    await service.from('requests').update({ status: 'approved' }).eq('id', request.id);
  }
}

// ── Approve ───────────────────────────────────────────────────
export async function approveRequest(requestId: string, note: string, stepId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees')
    .select('id, auth_user_id')
    .eq('auth_user_id', user.id)
    .single();
  if (!employee) throw new Error('Employee not found');

  const { data: roles } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', employee.id);

  const actorRole = roles?.[0]?.role || 'employee';

  await service.from('approval_steps')
    .update({ status: 'approved', completed_at: new Date().toISOString(), note })
    .eq('id', stepId);

  await service.from('request_actions').insert({
    request_id:  requestId,
    action:      'approved',
    actor_id:    employee.id,
    actor_role:  actorRole,
    rationale:   note,
    from_status: 'under_review',
    to_status:   'under_review',
  });

  // Check if more steps remain
  const { data: pendingSteps } = await service
    .from('approval_steps')
    .select('id, step_order, approver_id')
    .eq('request_id', requestId)
    .eq('status', 'pending')
    .order('step_order', { ascending: true });

  if (!pendingSteps || pendingSteps.length === 0) {
    // All approved — finalise
    await service.from('requests').update({ status: 'approved' }).eq('id', requestId);
    await service.from('request_actions').insert({
      request_id:  requestId,
      action:      'approved',
      actor_id:    employee.id,
      actor_role:  actorRole,
      from_status: 'under_review',
      to_status:   'approved',
      note:        'تمت الموافقة على جميع الخطوات',
    });

    // Notify requester
    const { data: req } = await service.from('requests').select('requester_id, subject').eq('id', requestId).single();
    if (req) {
      await createNotification(service, {
        recipientId: req.requester_id,
        requestId,
        type:    'status_update',
        titleAr: 'تمت الموافقة على طلبك',
        titleEn: 'Your Request Was Approved',
        bodyAr:  `تمت الموافقة على طلبك: ${req.subject}`,
        bodyEn:  `Your request has been approved: ${req.subject}`,
      });
    }
  } else {
    // Notify next approver
    await createNotification(service, {
      recipientId: pendingSteps[0].approver_id,
      requestId,
      type:    'action_required',
      titleAr: 'طلب يحتاج موافقتك',
      titleEn: 'Approval Required',
      bodyAr:  'انتقل دور الموافقة إليك على طلب جديد',
      bodyEn:  'A request has been forwarded for your approval',
    });
  }
}

// ── Reject ────────────────────────────────────────────────────
export async function rejectRequest(requestId: string, note: string, stepId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees')
    .select('id, auth_user_id')
    .eq('auth_user_id', user.id)
    .single();
  if (!employee) throw new Error('Employee not found');

  const { data: roles } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', employee.id);

  await service.from('approval_steps')
    .update({ status: 'rejected', completed_at: new Date().toISOString(), note })
    .eq('id', stepId);
  await service.from('requests').update({ status: 'rejected' }).eq('id', requestId);
  await service.from('request_actions').insert({
    request_id:  requestId,
    action:      'rejected',
    actor_id:    employee.id,
    actor_role:  roles?.[0]?.role || 'employee',
    rationale:   note,
    from_status: 'under_review',
    to_status:   'rejected',
  });

  // Notify requester
  const { data: req } = await service.from('requests').select('requester_id, subject').eq('id', requestId).single();
  if (req) {
    await createNotification(service, {
      recipientId: req.requester_id,
      requestId,
      type:    'status_update',
      titleAr: 'تم رفض طلبك',
      titleEn: 'Your Request Was Rejected',
      bodyAr:  `تم رفض طلبك: ${req.subject}`,
      bodyEn:  `Your request was rejected: ${req.subject}`,
    });
  }
}

// ── Send Back ─────────────────────────────────────────────────
export async function sendBackRequest(requestId: string, note: string, stepId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees')
    .select('id, auth_user_id')
    .eq('auth_user_id', user.id)
    .single();
  if (!employee) throw new Error('Employee not found');

  const { data: roles } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', employee.id);

  await service.from('requests').update({ status: 'pending_clarification' }).eq('id', requestId);
  await service.from('request_actions').insert({
    request_id:  requestId,
    action:      'sent_back',
    actor_id:    employee.id,
    actor_role:  roles?.[0]?.role || 'employee',
    rationale:   note,
    from_status: 'under_review',
    to_status:   'pending_clarification',
  });

  // Notify requester
  const { data: req } = await service.from('requests').select('requester_id, subject').eq('id', requestId).single();
  if (req) {
    await createNotification(service, {
      recipientId: req.requester_id,
      requestId,
      type:    'action_required',
      titleAr: 'يحتاج طلبك إلى توضيح',
      titleEn: 'Clarification Required on Your Request',
      bodyAr:  `طُلب منك توضيح على طلبك: ${req.subject}`,
      bodyEn:  `Clarification was requested on: ${req.subject}`,
    });
  }
}

// ── Cancel Request ────────────────────────────────────────────
export async function cancelRequest(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees')
    .select('id, auth_user_id')
    .eq('auth_user_id', user.id)
    .single();
  if (!employee) throw new Error('Employee not found');

  const { data: roles } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', employee.id);

  // Verify requester owns this request
  const { data: req } = await service
    .from('requests')
    .select('requester_id, status, subject')
    .eq('id', requestId)
    .single();

  if (!req) throw new Error('Request not found');
  if (req.requester_id !== employee.id) throw new Error('Not authorised');
  if (['approved', 'rejected', 'completed', 'cancelled', 'archived'].includes(req.status)) {
    throw new Error('Cannot cancel a request in this status');
  }

  await service.from('requests').update({ status: 'cancelled' }).eq('id', requestId);
  await service.from('request_actions').insert({
    request_id:  requestId,
    action:      'cancelled',
    actor_id:    employee.id,
    actor_role:  roles?.[0]?.role || 'employee',
    from_status: req.status,
    to_status:   'cancelled',
    note:        'تم إلغاء الطلب من قبل مقدمه',
  });

  // Cancel any pending approval steps
  await service
    .from('approval_steps')
    .update({ status: 'skipped' })
    .eq('request_id', requestId)
    .eq('status', 'pending');
}

// ── Resubmit Request ──────────────────────────────────────────
export async function resubmitRequest(requestId: string, note: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees')
    .select('id, auth_user_id')
    .eq('auth_user_id', user.id)
    .single();
  if (!employee) throw new Error('Employee not found');

  const { data: roles } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', employee.id);

  const { data: req } = await service
    .from('requests')
    .select('requester_id, status, subject')
    .eq('id', requestId)
    .single();

  if (!req) throw new Error('Request not found');
  if (req.requester_id !== employee.id) throw new Error('Not authorised');
  if (req.status !== 'pending_clarification') throw new Error('Request is not awaiting clarification');

  await service.from('requests').update({ status: 'under_review' }).eq('id', requestId);
  await service.from('request_actions').insert({
    request_id:  requestId,
    action:      'resubmitted',
    actor_id:    employee.id,
    actor_role:  roles?.[0]?.role || 'employee',
    from_status: 'pending_clarification',
    to_status:   'under_review',
    note,
  });

  // Notify next pending approver
  const { data: nextStep } = await service
    .from('approval_steps')
    .select('approver_id')
    .eq('request_id', requestId)
    .eq('status', 'pending')
    .order('step_order', { ascending: true })
    .limit(1)
    .single();

  if (nextStep) {
    await createNotification(service, {
      recipientId: nextStep.approver_id,
      requestId,
      type:    'action_required',
      titleAr: 'تمت إعادة تقديم الطلب',
      titleEn: 'Request Resubmitted',
      bodyAr:  `أُعيد تقديم الطلب بعد التوضيح: ${req.subject}`,
      bodyEn:  `A request was resubmitted after clarification: ${req.subject}`,
    });
  }
}

// ── Complete Request ──────────────────────────────────────────
export async function completeRequest(requestId: string, note: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees')
    .select('id, auth_user_id')
    .eq('auth_user_id', user.id)
    .single();
  if (!employee) throw new Error('Employee not found');

  const { data: roles } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', employee.id);

  const isAdmin = roles?.some((r: any) => ['super_admin', 'ceo', 'company_admin', 'department_manager'].includes(r.role));

  const { data: req } = await service
    .from('requests')
    .select('requester_id, status, subject')
    .eq('id', requestId)
    .single();

  if (!req) throw new Error('Request not found');

  // Also allow the requester to mark complete
  const isRequesterOrAdmin = isAdmin || req.requester_id === employee.id;
  if (!isRequesterOrAdmin) throw new Error('Not authorised');

  if (req.status !== 'approved') throw new Error('Request must be approved before completing');

  await service.from('requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', requestId);
  await service.from('request_actions').insert({
    request_id:  requestId,
    action:      'completed',
    actor_id:    employee.id,
    actor_role:  roles?.[0]?.role || 'employee',
    from_status: 'approved',
    to_status:   'completed',
    note,
  });

  // Notify requester
  await createNotification(service, {
    recipientId: req.requester_id,
    requestId,
    type:    'status_update',
    titleAr: 'اكتمل تنفيذ طلبك',
    titleEn: 'Your Request Has Been Completed',
    bodyAr:  `تم تنفيذ طلبك بنجاح: ${req.subject}`,
    bodyEn:  `Your request has been completed: ${req.subject}`,
  });
}
