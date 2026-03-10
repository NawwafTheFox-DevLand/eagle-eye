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

  const requestType = formData.get('request_type') as string;
  const subject = formData.get('subject') as string;
  const description = formData.get('description') as string;
  const priority = formData.get('priority') as string || 'normal';
  const confidentiality = formData.get('confidentiality') as string || 'normal';
  const destinationCompanyId = formData.get('destination_company_id') as string || null;
  const destinationDeptId = formData.get('destination_dept_id') as string || null;
  const amount = formData.get('amount') ? parseFloat(formData.get('amount') as string) : null;
  const currency = formData.get('currency') as string || 'SAR';
  const payee = formData.get('payee') as string || null;
  const costCenter = formData.get('cost_center') as string || null;
  const leaveType = formData.get('leave_type') as string || null;
  const leaveStart = formData.get('leave_start_date') as string || null;
  const leaveEnd = formData.get('leave_end_date') as string || null;
  const effectiveDate = formData.get('effective_date') as string || null;

  const companyCode = company?.code || 'MH';
  const deptCode = department?.code || 'GEN';

  const { data: numData } = await service.rpc('next_request_number', {
    p_company_code: companyCode,
    p_dept_code: deptCode,
    p_request_type: requestType,
  });

  const requestNumber = numData || `${companyCode}-${deptCode}-${Date.now()}`;

  const { data: request, error } = await service
    .from('requests')
    .insert({
      request_number: requestNumber,
      request_type: requestType,
      status: 'draft',
      priority,
      confidentiality,
      requester_id: employee.id,
      origin_company_id: employee.company_id,
      origin_dept_id: employee.department_id,
      destination_company_id: destinationCompanyId || null,
      destination_dept_id: destinationDeptId || null,
      subject,
      description,
      amount,
      currency,
      payee,
      cost_center: costCenter,
      leave_type: leaveType,
      leave_start_date: leaveStart || null,
      leave_end_date: leaveEnd || null,
      effective_date: effectiveDate || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return request;
}

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
    request_id: requestId,
    action: 'submitted',
    actor_id: employeeWithRoles.id,
    actor_role: employeeWithRoles.roles[0]?.role || 'employee',
    from_status: 'draft',
    to_status: 'submitted',
    note: 'تم تقديم الطلب',
  });

  // Auto-create approval steps
  const { data: request } = await service
    .from('requests')
    .select('id, request_type, origin_company_id, origin_dept_id, destination_company_id, destination_dept_id, status')
    .eq('id', requestId)
    .single();

  if (request) {
    await generateApprovalSteps(service, request, employeeWithRoles);
  }
}

async function generateApprovalSteps(service: any, request: any, requester: any) {
  const steps: any[] = [];
  let order = 1;
  const added = new Set<string>();
  added.add(requester.id);

  function addStep(id: string | null | undefined, role: string) {
    if (!id || added.has(id)) return;
    added.add(id);
    steps.push({ request_id: request.id, step_order: order++, approver_id: id, approver_role: role, is_mandatory: true });
  }

  const isManager = requester.roles?.some((r: any) => ['department_manager', 'ceo', 'super_admin'].includes(r.role));

  // Step 1: Origin dept manager
  if (!isManager && request.origin_dept_id) {
    const { data: d } = await service.from('departments').select('head_employee_id').eq('id', request.origin_dept_id).single();
    addStep(d?.head_employee_id, 'department_manager');
  }

  // Step 2: Destination dept manager
  if (request.destination_dept_id && request.destination_dept_id !== request.origin_dept_id) {
    const { data: d } = await service.from('departments').select('head_employee_id').eq('id', request.destination_dept_id).single();
    addStep(d?.head_employee_id, 'department_manager');
  }

  // Step 3: Company CEO
  if (['intercompany','fund_disbursement','promotion','demotion_disciplinary','create_department','create_company','create_position'].includes(request.request_type)) {
    const { data: c } = await service.from('companies').select('ceo_employee_id').eq('id', request.origin_company_id).single();
    addStep(c?.ceo_employee_id, 'ceo');
  }

  // Step 4: Holding Finance (fund_disbursement)
  if (request.request_type === 'fund_disbursement') {
    const q = service.from('departments').select('head_employee_id').eq('code', 'FIN10');
    if (process.env.HOLDING_COMPANY_ID) q.eq('company_id', process.env.HOLDING_COMPANY_ID);
    const { data: d } = await q.limit(1).single();
    addStep(d?.head_employee_id, 'finance_approver');
  }

  // Step 5: Holding HR (leave/promotion/demotion)
  if (['leave_approval','promotion','demotion_disciplinary'].includes(request.request_type)) {
    const q = service.from('departments').select('head_employee_id').eq('code', 'HR10');
    if (process.env.HOLDING_COMPANY_ID) q.eq('company_id', process.env.HOLDING_COMPANY_ID);
    const { data: d } = await q.limit(1).single();
    addStep(d?.head_employee_id, 'hr_approver');
  }

  // Step 6: Holding CEO (financial + structural)
  if (['fund_disbursement','create_company','create_department','create_position'].includes(request.request_type)) {
    const { data: h } = await service.from('companies').select('ceo_employee_id').eq('is_holding', true).single();
    addStep(h?.ceo_employee_id, 'ceo');
  }

  if (steps.length > 0) {
    await service.from('approval_steps').insert(steps);
    await service.from('requests').update({ status: 'under_review' }).eq('id', request.id);
  } else {
    await service.from('requests').update({ status: 'approved' }).eq('id', request.id);
  }
}


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
    request_id: requestId, action: 'approved', actor_id: employee.id,
    actor_role: actorRole,
    rationale: note, from_status: 'under_review', to_status: 'under_review',
  });

  const { data: pendingSteps } = await service.from('approval_steps')
    .select('id, step_order').eq('request_id', requestId).eq('status', 'pending')
    .order('step_order', { ascending: true });

  if (!pendingSteps || pendingSteps.length === 0) {
    await service.from('requests').update({ status: 'approved' }).eq('id', requestId);
    await service.from('request_actions').insert({
      request_id: requestId, action: 'approved', actor_id: employee.id,
      actor_role: actorRole,
      from_status: 'under_review', to_status: 'approved',
      note: 'تمت الموافقة على جميع الخطوات',
    });
  }
}

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

  await service.from('approval_steps').update({ status: 'rejected', completed_at: new Date().toISOString(), note }).eq('id', stepId);
  await service.from('requests').update({ status: 'rejected' }).eq('id', requestId);
  await service.from('request_actions').insert({
    request_id: requestId, action: 'rejected', actor_id: employee.id,
    actor_role: roles?.[0]?.role || 'employee',
    rationale: note, from_status: 'under_review', to_status: 'rejected',
  });
}

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
    request_id: requestId, action: 'sent_back', actor_id: employee.id,
    actor_role: roles?.[0]?.role || 'employee',
    rationale: note, from_status: 'under_review', to_status: 'pending_clarification',
  });
}
