'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function getSessionEmployee() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('employees')
    .select('*, company:companies(*), department:departments(*), roles:user_roles(*)')
    .eq('auth_user_id', user.id)
    .single();
  return data;
}

export async function createRequest(formData: FormData) {
  const supabase = await createClient();
  const employee = await getSessionEmployee();
  if (!employee) throw new Error('Not authenticated');

  const requestType = formData.get('request_type') as string;
  const subject = formData.get('subject') as string;
  const description = formData.get('description') as string;
  const priority = formData.get('priority') as string || 'normal';
  const confidentiality = formData.get('confidentiality') as string || 'normal';
  const destinationCompanyId = formData.get('destination_company_id') as string || null;
  const destinationDeptId = formData.get('destination_dept_id') as string || null;

  // Financial fields
  const amount = formData.get('amount') ? parseFloat(formData.get('amount') as string) : null;
  const currency = formData.get('currency') as string || 'SAR';
  const payee = formData.get('payee') as string || null;
  const costCenter = formData.get('cost_center') as string || null;

  // Leave fields
  const leaveType = formData.get('leave_type') as string || null;
  const leaveStart = formData.get('leave_start_date') as string || null;
  const leaveEnd = formData.get('leave_end_date') as string || null;

  // HR fields
  const effectiveDate = formData.get('effective_date') as string || null;

  // Generate request number via service client (bypasses RLS for function call)
  const service = await createServiceClient();
  const companyCode = employee.company?.code || 'MH';
  const deptCode = employee.department?.code || 'GEN';

  const { data: numData } = await service.rpc('next_request_number', {
    p_company_code: companyCode,
    p_dept_code: deptCode,
    p_request_type: requestType,
  });

  const requestNumber = numData || `${companyCode}-${deptCode}-${Date.now()}`;

  const { data: request, error } = await supabase
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
  const employee = await getSessionEmployee();
  if (!employee) throw new Error('Not authenticated');

  // Update status to submitted
  const { error: updateErr } = await supabase
    .from('requests')
    .update({ status: 'submitted' })
    .eq('id', requestId)
    .eq('requester_id', employee.id);

  if (updateErr) throw new Error(updateErr.message);

  // Log the action
  await supabase.from('request_actions').insert({
    request_id: requestId,
    action: 'submitted',
    actor_id: employee.id,
    actor_role: employee.roles?.[0]?.role || 'employee',
    from_status: 'draft',
    to_status: 'submitted',
    note: 'تم تقديم الطلب',
  });

  // Auto-create approval steps based on request type
  const { data: request } = await supabase
    .from('requests')
    .select('*, origin_company:companies(*), origin_dept:departments(*)')
    .eq('id', requestId)
    .single();

  if (request) {
    await generateApprovalSteps(supabase, request, employee);
  }
}

async function generateApprovalSteps(supabase: any, request: any, requester: any) {
  const steps: any[] = [];
  let order = 1;

  // Step 1: Department manager (if requester is not a manager/CEO)
  const isManager = requester.roles?.some((r: any) => ['department_manager', 'ceo', 'super_admin'].includes(r.role));
  if (!isManager && request.origin_dept_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('head_employee_id')
      .eq('id', request.origin_dept_id)
      .single();
    if (dept?.head_employee_id && dept.head_employee_id !== requester.id) {
      steps.push({ request_id: request.id, step_order: order++, approver_id: dept.head_employee_id, approver_role: 'department_manager', is_mandatory: true });
    }
  }

  // Step 2: Company CEO (for non-routine or intercompany)
  if (['intercompany', 'fund_disbursement', 'promotion', 'demotion_disciplinary', 'create_department', 'create_company', 'create_position'].includes(request.request_type)) {
    const { data: company } = await supabase
      .from('companies')
      .select('ceo_employee_id')
      .eq('id', request.origin_company_id)
      .single();
    if (company?.ceo_employee_id && company.ceo_employee_id !== requester.id) {
      steps.push({ request_id: request.id, step_order: order++, approver_id: company.ceo_employee_id, approver_role: 'ceo', is_mandatory: true });
    }
  }

  // Step 3: Finance approval for fund disbursement
  if (request.request_type === 'fund_disbursement') {
    const { data: finDept } = await supabase
      .from('departments')
      .select('head_employee_id')
      .eq('code', 'FIN10')
      .eq('company_id', 'a0000000-0000-0000-0000-000000000001')
      .single();
    if (finDept?.head_employee_id) {
      steps.push({ request_id: request.id, step_order: order++, approver_id: finDept.head_employee_id, approver_role: 'finance_approver', is_mandatory: true });
    }
  }

  // Step 4: HR approval for leave/promotion/demotion
  if (['leave_approval', 'promotion', 'demotion_disciplinary'].includes(request.request_type)) {
    const { data: hrDept } = await supabase
      .from('departments')
      .select('head_employee_id')
      .eq('code', 'HR10')
      .eq('company_id', 'a0000000-0000-0000-0000-000000000001')
      .single();
    if (hrDept?.head_employee_id) {
      steps.push({ request_id: request.id, step_order: order++, approver_id: hrDept.head_employee_id, approver_role: 'hr_approver', is_mandatory: true });
    }
  }

  if (steps.length > 0) {
    await supabase.from('approval_steps').insert(steps);
    // Move to under_review
    await supabase.from('requests').update({ status: 'under_review' }).eq('id', request.id);
  }
}

export async function approveRequest(requestId: string, note: string, stepId: string) {
  const supabase = await createClient();
  const employee = await getSessionEmployee();
  if (!employee) throw new Error('Not authenticated');

  // Complete this approval step
  await supabase
    .from('approval_steps')
    .update({ status: 'approved', completed_at: new Date().toISOString(), note })
    .eq('id', stepId)
    .eq('approver_id', employee.id);

  // Log action
  await supabase.from('request_actions').insert({
    request_id: requestId,
    action: 'approved',
    actor_id: employee.id,
    actor_role: employee.roles?.[0]?.role || 'employee',
    rationale: note,
    from_status: 'under_review',
    to_status: 'under_review',
  });

  // Check if all steps are done
  const { data: pendingSteps } = await supabase
    .from('approval_steps')
    .select('id')
    .eq('request_id', requestId)
    .eq('status', 'pending');

  if (!pendingSteps || pendingSteps.length === 0) {
    await supabase.from('requests').update({ status: 'approved' }).eq('id', requestId);
    await supabase.from('request_actions').insert({
      request_id: requestId, action: 'approved', actor_id: employee.id,
      actor_role: employee.roles?.[0]?.role || 'employee',
      from_status: 'under_review', to_status: 'approved',
      note: 'تمت الموافقة على جميع الخطوات',
    });
  }
}

export async function rejectRequest(requestId: string, note: string, stepId: string) {
  const supabase = await createClient();
  const employee = await getSessionEmployee();
  if (!employee) throw new Error('Not authenticated');

  await supabase
    .from('approval_steps')
    .update({ status: 'rejected', completed_at: new Date().toISOString(), note })
    .eq('id', stepId);

  await supabase.from('requests').update({ status: 'rejected' }).eq('id', requestId);

  await supabase.from('request_actions').insert({
    request_id: requestId, action: 'rejected', actor_id: employee.id,
    actor_role: employee.roles?.[0]?.role || 'employee',
    rationale: note, from_status: 'under_review', to_status: 'rejected',
  });
}

export async function sendBackRequest(requestId: string, note: string, stepId: string) {
  const supabase = await createClient();
  const employee = await getSessionEmployee();
  if (!employee) throw new Error('Not authenticated');

  await supabase.from('requests').update({ status: 'pending_clarification' }).eq('id', requestId);

  await supabase.from('request_actions').insert({
    request_id: requestId, action: 'sent_back', actor_id: employee.id,
    actor_role: employee.roles?.[0]?.role || 'employee',
    rationale: note, from_status: 'under_review', to_status: 'pending_clarification',
  });
}
