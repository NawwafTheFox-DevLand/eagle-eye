'use server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ─── HELPERS ────────────────────────────────────────────────────────────────

export async function getSessionEmployee() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees')
    .select('id, auth_user_id, company_id, department_id, full_name_ar, full_name_en, employee_code, title_ar, title_en, grade')
    .eq('auth_user_id', user.id)
    .single();
  if (!employee) return null;

  const [{ data: roleRows }, { data: company }] = await Promise.all([
    service.from('user_roles').select('role, company_id').eq('employee_id', employee.id).eq('is_active', true),
    employee.company_id
      ? service.from('companies').select('id, name_ar, name_en, code, is_holding').eq('id', employee.company_id).single()
      : Promise.resolve({ data: null }),
  ]);

  return { ...employee, roles: roleRows || [], company: company || null };
}

async function getAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees')
    .select('id, auth_user_id, company_id, department_id, full_name_ar, full_name_en')
    .eq('auth_user_id', user.id)
    .single();
  if (!employee) throw new Error('Employee not found');

  const { data: roleRows } = await service
    .from('user_roles')
    .select('role, company_id')
    .eq('employee_id', employee.id)
    .eq('is_active', true);

  return { service, employee, roles: roleRows || [] as { role: string; company_id: string | null }[] };
}

export async function getRoleLevel(roles: { role: string }[], isHolding: boolean): Promise<string> {
  if (roles.some(r => r.role === 'super_admin')) return 'super_admin';
  if (roles.some(r => r.role === 'ceo') && isHolding) return 'holding_ceo';
  if (roles.some(r => r.role === 'ceo') && !isHolding) return 'company_ceo';
  if (roles.some(r => r.role === 'department_manager')) return 'dept_head';
  return 'employee';
}

// ─── NOTIFICATION HELPER ─────────────────────────────────────────────────────

async function notify(service: any, params: {
  recipientId: string;
  requestId: string;
  type: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}) {
  try {
    await service.from('notifications').insert({
      recipient_id: params.recipientId,
      request_id: params.requestId,
      channel: 'in_app',
      type: params.type,
      title_ar: params.titleAr,
      title_en: params.titleEn,
      body_ar: params.bodyAr,
      body_en: params.bodyEn,
      action_url: `/dashboard/requests/${params.requestId}`,
      is_read: false,
    });
  } catch { /* best-effort — never fail the main action */ }
}

// ─── CREATE REQUEST ──────────────────────────────────────────────────────────

export async function createRequest(formData: FormData): Promise<{ data: any; error: string | null }> {
  try {
    const { service, employee } = await getAuth();

    const requestType    = formData.get('request_type') as string;
    const subject        = formData.get('subject') as string;
    const description    = formData.get('description') as string;
    const priority       = (formData.get('priority') as string) || 'normal';
    const confidentiality = (formData.get('confidentiality') as string) || 'normal';
    const destCompanyId  = (formData.get('destination_company_id') as string) || null;
    const destDeptId     = (formData.get('destination_dept_id') as string) || null;
    const amount         = formData.get('amount') ? parseFloat(formData.get('amount') as string) : null;
    const currency       = (formData.get('currency') as string) || null;
    const payee          = (formData.get('payee') as string) || null;
    const costCenter     = (formData.get('cost_center') as string) || null;
    const leaveType      = (formData.get('leave_type') as string) || null;
    const leaveStart     = (formData.get('leave_start_date') as string) || null;
    const leaveEnd       = (formData.get('leave_end_date') as string) || null;
    const targetEmployeeIdRaw = (formData.get('target_employee_id') as string) || '';
    const metadataRaw    = (formData.get('metadata') as string) || null;
    let   metadata: Record<string, any> | null = metadataRaw ? JSON.parse(metadataRaw) : null;
    if (targetEmployeeIdRaw) {
      metadata = { ...(metadata ?? {}), target_employee_id: targetEmployeeIdRaw };
    }

    // Get company + dept codes for request number
    const [{ data: comp }, { data: dept }] = await Promise.all([
      employee.company_id
        ? service.from('companies').select('code').eq('id', employee.company_id).single()
        : Promise.resolve({ data: null }),
      employee.department_id
        ? service.from('departments').select('code').eq('id', employee.department_id).single()
        : Promise.resolve({ data: null }),
    ]);

    const companyCode = comp?.code || 'MH';
    const deptCode = dept?.code || 'GEN';

    // Try RPC first, fallback to timestamp-based
    let requestNumber: string;
    const { data: rpcNum, error: rpcErr } = await service.rpc('next_request_number', {
      p_company_code: companyCode,
      p_dept_code: deptCode,
      p_request_type: requestType,
    });
    if (!rpcErr && rpcNum) {
      requestNumber = rpcNum;
    } else {
      requestNumber = `${companyCode}-${deptCode}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    }

    // Lookup type config for gate flags
    const { data: typeConfig } = await service
      .from('request_type_configs')
      .select('requires_ceo, requires_hr, requires_finance')
      .eq('request_type', requestType)
      .single();

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
        destination_company_id: destCompanyId,
        destination_dept_id: destDeptId,
        subject,
        description,
        amount,
        currency,
        payee,
        cost_center: costCenter,
        leave_type: leaveType,
        leave_start_date: leaveStart || null,
        leave_end_date: leaveEnd || null,
        metadata: metadata || null,
        requires_ceo: typeConfig?.requires_ceo ?? false,
        requires_hr: typeConfig?.requires_hr ?? false,
        requires_finance: typeConfig?.requires_finance ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('[createRequest]', error);
      return { data: null, error: 'فشل إنشاء الطلب: ' + error.message };
    }
    return { data: request, error: null };
  } catch (e: any) {
    console.error('[createRequest] caught:', e);
    return { data: null, error: String(e?.message ?? e) };
  }
}

// ─── SUBMIT REQUEST ──────────────────────────────────────────────────────────

async function findHoldingCEO(service: any): Promise<string | null> {
  const { data } = await service.from('companies').select('ceo_employee_id').eq('is_holding', true).maybeSingle();
  return (data as any)?.ceo_employee_id || null;
}

async function findDeptHead(service: any, deptId: string): Promise<string | null> {
  const { data } = await service.from('departments').select('head_employee_id').eq('id', deptId).single();
  return data?.head_employee_id || null;
}

async function findCompanyCEO(service: any, companyId: string): Promise<string | null> {
  const { data } = await service.from('companies').select('ceo_employee_id').eq('id', companyId).single();
  return (data as any)?.ceo_employee_id || null;
}

async function findRoleHolder(service: any, role: string, companyId?: string | null): Promise<string | null> {
  let q = service.from('user_roles').select('employee_id').eq('role', role).eq('is_active', true).limit(1);
  if (companyId) q = q.eq('company_id', companyId);
  const { data } = await q.maybeSingle();
  return (data as any)?.employee_id || null;
}

export async function submitRequest(requestId: string): Promise<{ error: string | null }> {
  try {
    const { service, employee } = await getAuth();

    const { data: request } = await service.from('requests')
      .select('id, request_type, destination_dept_id, destination_company_id, origin_dept_id, origin_company_id, metadata')
      .eq('id', requestId).single();

    if (!request) return { error: 'الطلب غير موجود' };

    // Employee onboarding → delegate to onboarding module
    if (request.request_type === 'employee_onboarding') {
      const { submitOnboardingRequest } = await import('@/app/actions/onboarding');
      return submitOnboardingRequest(requestId);
    }

    // Custom request type handling
    const customTypeId: string | null = (request.metadata as any)?.custom_type_id || null;
    if (customTypeId) {
      const { data: customType } = await service
        .from('custom_request_types')
        .select('flow_mode, requires_ceo, requires_hr, requires_finance')
        .eq('id', customTypeId)
        .single();

      if (customType?.flow_mode === 'fixed') {
        // Get first step
        const { data: firstStep } = await service
          .from('custom_request_steps')
          .select('step_order, department_id, company_id')
          .eq('custom_type_id', customTypeId)
          .order('step_order', { ascending: true })
          .limit(1)
          .single();

        if (!firstStep) return { error: 'لم يتم تكوين خطوات المسار الثابت' };

        const { data: stepDept } = await service
          .from('departments')
          .select('head_employee_id')
          .eq('id', firstStep.department_id)
          .single();

        const firstAssignee = stepDept?.head_employee_id;
        if (!firstAssignee) return { error: 'لا يوجد رئيس للقسم في الخطوة الأولى' };

        const { data: totalStepsCount } = await service
          .from('custom_request_steps')
          .select('step_order', { count: 'exact' })
          .eq('custom_type_id', customTypeId);

        const totalSteps = (totalStepsCount as any[])?.length || 1;
        const now = new Date().toISOString();
        const newMetadata = {
          ...(request.metadata as any),
          current_step: 1,
          total_steps: totalSteps,
        };

        const { error: updateErr } = await service.from('requests').update({
          status: 'in_progress',
          assigned_to: firstAssignee,
          destination_dept_id: firstStep.department_id,
          destination_company_id: firstStep.company_id,
          submitted_at: now,
          requires_ceo: customType.requires_ceo,
          requires_hr: customType.requires_hr,
          requires_finance: customType.requires_finance,
          metadata: newMetadata,
        }).eq('id', requestId);
        if (updateErr) return { error: 'فشل تقديم الطلب: ' + updateErr.message };

        await service.from('request_actions').insert({
          request_id: requestId,
          action: 'submitted',
          actor_id: employee.id,
          to_person_id: firstAssignee,
          from_status: 'draft',
          to_status: 'in_progress',
          note: 'تم تقديم الطلب — الخطوة 1',
        });

        await notify(service, {
          recipientId: firstAssignee,
          requestId,
          type: 'request_submitted',
          titleAr: 'طلب مخصص جديد يحتاج مراجعتك',
          titleEn: 'New custom request awaiting your review',
          bodyAr: `قدّم ${employee.full_name_ar} طلباً مخصصاً`,
          bodyEn: `${employee.full_name_en || employee.full_name_ar} submitted a custom request`,
        });

        return { error: null };
      }
      // free-flow custom type: update gate flags then fall through to standard routing
      await service.from('requests').update({
        requires_ceo: customType?.requires_ceo ?? false,
        requires_hr: customType?.requires_hr ?? false,
        requires_finance: customType?.requires_finance ?? false,
      }).eq('id', requestId);
    }

    // If requester chose a specific person, route directly to them
    const targetEmployeeId: string | null = (request.metadata as any)?.target_employee_id || null;
    if (targetEmployeeId) {
      const now = new Date().toISOString();
      const { error: updateErr } = await service.from('requests').update({
        status: 'in_progress',
        assigned_to: targetEmployeeId,
        submitted_at: now,
      }).eq('id', requestId);
      if (updateErr) return { error: 'فشل تقديم الطلب: ' + updateErr.message };

      const { data: target } = await service.from('employees')
        .select('full_name_ar').eq('id', targetEmployeeId).single();

      await service.from('request_actions').insert({
        request_id: requestId,
        action: 'submitted',
        actor_id: employee.id,
        to_person_id: targetEmployeeId,
        from_status: 'draft',
        to_status: 'in_progress',
        note: 'تم تقديم الطلب إلى ' + ((target as any)?.full_name_ar || ''),
      });

      await notify(service, {
        recipientId: targetEmployeeId,
        requestId,
        type: 'request_submitted',
        titleAr: 'طلب جديد يحتاج مراجعتك',
        titleEn: 'New request awaiting your review',
        bodyAr: `قدّم ${employee.full_name_ar} طلباً جديداً`,
        bodyEn: `${employee.full_name_en || employee.full_name_ar} submitted a new request`,
      });

      return { error: null };
    }

    let assigneeId: string | null = null;

    switch (request.request_type) {
      // These always go to the requester's own dept head
      case 'leave_approval':
      case 'promotion':
      case 'demotion_disciplinary':
        if (employee.department_id) {
          assigneeId = await findDeptHead(service, employee.department_id);
        }
        if (!assigneeId && employee.company_id) {
          assigneeId = await findCompanyCEO(service, employee.company_id);
        }
        break;

      // Fund disbursement → finance_approver in requester's company
      case 'fund_disbursement':
        assigneeId = await findRoleHolder(service, 'finance_approver', employee.company_id);
        if (!assigneeId) assigneeId = await findRoleHolder(service, 'finance_approver');
        if (!assigneeId && employee.company_id) assigneeId = await findCompanyCEO(service, employee.company_id);
        break;

      // Create company → holding CEO
      case 'create_company':
        assigneeId = await findHoldingCEO(service);
        break;

      // Create dept / create position → dest company CEO → holding CEO
      case 'create_department':
      case 'create_position':
        if (request.destination_company_id) {
          assigneeId = await findCompanyCEO(service, request.destination_company_id);
        }
        if (!assigneeId) assigneeId = await findHoldingCEO(service);
        break;

      // General, cross-dept, intercompany → dest dept head → dest co CEO → own CEO
      default:
        if (request.destination_dept_id) {
          assigneeId = await findDeptHead(service, request.destination_dept_id);
        }
        if (!assigneeId && request.destination_company_id) {
          assigneeId = await findCompanyCEO(service, request.destination_company_id);
        }
        if (!assigneeId && employee.department_id) {
          assigneeId = await findDeptHead(service, employee.department_id);
        }
        if (!assigneeId && employee.company_id) {
          assigneeId = await findCompanyCEO(service, employee.company_id);
        }
        break;
    }

    if (!assigneeId) {
      console.error('[submitRequest] no assignee — type:', request.request_type);
      return { error: 'لم يتم العثور على مستلم — تأكد من إعداد الأدوار وتعيين رؤساء الأقسام' };
    }

    const now = new Date().toISOString();
    const { error: updateErr } = await service.from('requests').update({
      status: 'in_progress',
      assigned_to: assigneeId,
      submitted_at: now,
    }).eq('id', requestId);
    if (updateErr) {
      console.error('[submitRequest] update:', updateErr);
      return { error: 'فشل تقديم الطلب: ' + updateErr.message };
    }

    const { error: actionErr } = await service.from('request_actions').insert({
      request_id: requestId,
      action: 'submitted',
      actor_id: employee.id,
      to_person_id: assigneeId,
      from_status: 'draft',
      to_status: 'in_progress',
      note: 'تم تقديم الطلب',
    });
    if (actionErr) {
      console.error('[submitRequest] action:', actionErr);
      return { error: 'فشل تسجيل الإجراء: ' + actionErr.message };
    }

    await notify(service, {
      recipientId: assigneeId,
      requestId,
      type: 'request_submitted',
      titleAr: 'طلب جديد يحتاج مراجعتك',
      titleEn: 'New request awaiting your review',
      bodyAr: `قدّم ${employee.full_name_ar} طلباً جديداً`,
      bodyEn: `${employee.full_name_en || employee.full_name_ar} submitted a new request`,
    });

    return { error: null };
  } catch (e: any) {
    console.error('[submitRequest] caught:', e);
    return { error: String(e?.message ?? e) };
  }
}

// ─── FORWARD REQUEST ─────────────────────────────────────────────────────────

export async function forwardRequest(
  requestId: string,
  note: string,
  targetDeptId: string,
  targetCompanyId: string,
  targetEmployeeId?: string
): Promise<{ error: string | null }> {
  if (!note?.trim()) return { error: 'الملاحظات مطلوبة' };
  try {
    const { service, employee } = await getAuth();

    const { data: req } = await service.from('requests')
      .select('status, assigned_to, origin_company_id, company_exit_stamped_at')
      .eq('id', requestId).single();
    if (!req) return { error: 'الطلب غير موجود' };

    // Intercompany check
    if (targetCompanyId && targetCompanyId !== req.origin_company_id && !req.company_exit_stamped_at) {
      return { error: 'هذا الطلب يحتاج موافقة مدير الشركة قبل تحويله خارج الشركة' };
    }

    let recipientId: string | null = targetEmployeeId || null;
    if (!recipientId && targetDeptId) {
      const { data: dept } = await service.from('departments')
        .select('head_employee_id').eq('id', targetDeptId).single();
      recipientId = dept?.head_employee_id || null;
    }
    if (!recipientId) return { error: 'لم يتم العثور على المستلم' };

    const { error: updateErr } = await service.from('requests').update({
      assigned_to: recipientId,
      destination_company_id: targetCompanyId || null,
      destination_dept_id: targetDeptId || null,
      status: 'in_progress',
    }).eq('id', requestId);
    if (updateErr) return { error: 'فشل التحديث: ' + updateErr.message };

    const { error: actionErr } = await service.from('request_actions').insert({
      request_id: requestId,
      action: 'forwarded',
      actor_id: employee.id,
      from_person_id: req.assigned_to,
      to_person_id: recipientId,
      from_status: req.status,
      to_status: 'in_progress',
      note,
    });
    if (actionErr) return { error: 'فشل تسجيل الإجراء: ' + actionErr.message };

    await notify(service, {
      recipientId,
      requestId,
      type: 'request_forwarded',
      titleAr: 'تم تحويل طلب إليك',
      titleEn: 'A request was forwarded to you',
      bodyAr: `حوّل ${employee.full_name_ar} طلباً إليك`,
      bodyEn: `${employee.full_name_en || employee.full_name_ar} forwarded a request to you`,
    });

    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

// ─── RETURN REQUEST ──────────────────────────────────────────────────────────

export async function returnRequest(requestId: string, note: string): Promise<{ error: string | null }> {
  if (!note?.trim()) return { error: 'الملاحظات مطلوبة' };
  try {
    const { service, employee } = await getAuth();

    const { data: req } = await service.from('requests')
      .select('status, assigned_to').eq('id', requestId).single();
    if (!req) return { error: 'الطلب غير موجود' };

    // Find who most recently sent it to the current holder
    const { data: lastAction } = await service.from('request_actions')
      .select('actor_id')
      .eq('request_id', requestId)
      .eq('to_person_id', req.assigned_to)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const returnToId = lastAction?.actor_id || null;
    if (!returnToId) return { error: 'لا يمكن الإرجاع — أنت أول مستلم' };

    const { error: updateErr } = await service.from('requests').update({
      assigned_to: returnToId,
      status: 'in_progress',
    }).eq('id', requestId);
    if (updateErr) return { error: 'فشل التحديث: ' + updateErr.message };

    const { error: actionErr } = await service.from('request_actions').insert({
      request_id: requestId,
      action: 'returned',
      actor_id: employee.id,
      from_person_id: req.assigned_to,
      to_person_id: returnToId,
      from_status: req.status,
      to_status: 'in_progress',
      note,
    });
    if (actionErr) return { error: 'فشل تسجيل الإجراء: ' + actionErr.message };
    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

// ─── ASK REQUESTER ───────────────────────────────────────────────────────────

export async function askRequester(requestId: string, note: string): Promise<{ error: string | null }> {
  if (!note?.trim()) return { error: 'الملاحظات مطلوبة' };
  try {
    const { service, employee } = await getAuth();
    const { data: req } = await service.from('requests')
      .select('status, assigned_to, requester_id').eq('id', requestId).single();
    if (!req) return { error: 'الطلب غير موجود' };

    const { error: updateErr } = await service.from('requests').update({
      status: 'pending_clarification',
      assigned_to: req.requester_id,
    }).eq('id', requestId);
    if (updateErr) return { error: 'فشل التحديث: ' + updateErr.message };

    const { error: actionErr } = await service.from('request_actions').insert({
      request_id: requestId,
      action: 'asked_requester',
      actor_id: employee.id,
      from_person_id: req.assigned_to,
      to_person_id: req.requester_id,
      from_status: req.status,
      to_status: 'pending_clarification',
      note,
    });
    if (actionErr) return { error: 'فشل تسجيل الإجراء: ' + actionErr.message };

    await notify(service, {
      recipientId: req.requester_id,
      requestId,
      type: 'clarification_requested',
      titleAr: 'مطلوب توضيح لطلبك',
      titleEn: 'Clarification requested on your request',
      bodyAr: `طُلب منك توضيح بخصوص طلبك: ${note}`,
      bodyEn: `Clarification was requested: ${note}`,
    });

    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

// ─── RESUBMIT ────────────────────────────────────────────────────────────────

export async function resubmitRequest(requestId: string, note: string): Promise<{ error: string | null }> {
  if (!note?.trim()) return { error: 'الملاحظات مطلوبة' };
  try {
    const { service, employee } = await getAuth();
    const { data: req } = await service.from('requests').select('status').eq('id', requestId).single();

    const { data: lastAsk } = await service.from('request_actions')
      .select('actor_id')
      .eq('request_id', requestId)
      .eq('action', 'asked_requester')
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();

    const returnToId = lastAsk?.actor_id || null;
    if (!returnToId) return { error: 'لا يمكن تحديد الجهة المعنية' };

    const { error: updateErr } = await service.from('requests').update({
      status: 'in_progress',
      assigned_to: returnToId,
    }).eq('id', requestId);
    if (updateErr) return { error: 'فشل التحديث: ' + updateErr.message };

    const { error: actionErr } = await service.from('request_actions').insert({
      request_id: requestId,
      action: 'resubmitted',
      actor_id: employee.id,
      from_person_id: employee.id,
      to_person_id: returnToId,
      from_status: req?.status || 'pending_clarification',
      to_status: 'in_progress',
      note,
    });
    if (actionErr) return { error: 'فشل تسجيل الإجراء: ' + actionErr.message };

    await notify(service, {
      recipientId: returnToId,
      requestId,
      type: 'request_resubmitted',
      titleAr: 'أُعيد تقديم طلب',
      titleEn: 'Request resubmitted',
      bodyAr: `قدّم ${employee.full_name_ar} التوضيح المطلوب`,
      bodyEn: `${employee.full_name_en || employee.full_name_ar} provided the requested clarification`,
    });

    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

// ─── ASSIGN TO EMPLOYEE ───────────────────────────────────────────────────────

export async function assignToEmployee(requestId: string, employeeId: string, note: string): Promise<{ error: string | null }> {
  if (!note?.trim()) return { error: 'الملاحظات مطلوبة' };
  try {
    const { service, employee, roles } = await getAuth();
    const canAssign = roles.some(r => ['department_manager', 'ceo', 'super_admin'].includes(r.role));
    if (!canAssign) return { error: 'ليس لديك صلاحية التعيين' };

    const { data: req } = await service.from('requests').select('status, assigned_to').eq('id', requestId).single();

    const { error: updateErr } = await service.from('requests').update({
      assigned_to: employeeId,
      status: 'in_progress',
    }).eq('id', requestId);
    if (updateErr) return { error: 'فشل التحديث: ' + updateErr.message };

    const { error: actionErr } = await service.from('request_actions').insert({
      request_id: requestId,
      action: 'assigned',
      actor_id: employee.id,
      from_person_id: req?.assigned_to || null,
      to_person_id: employeeId,
      from_status: req?.status || 'in_progress',
      to_status: 'in_progress',
      note,
    });
    if (actionErr) return { error: 'فشل تسجيل الإجراء: ' + actionErr.message };
    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

// ─── STAMPS ──────────────────────────────────────────────────────────────────

export async function stampCompanyExit(requestId: string, note: string): Promise<{ error: string | null }> {
  if (!note?.trim()) return { error: 'الملاحظات مطلوبة' };
  try {
    const { service, employee } = await getAuth();
    const { data: req } = await service.from('requests').select('origin_company_id, status').eq('id', requestId).single();
    if (!req) return { error: 'الطلب غير موجود' };
    if (req.origin_company_id) {
      const { data: co } = await service.from('companies').select('ceo_employee_id').eq('id', req.origin_company_id).single();
      if ((co as any)?.ceo_employee_id !== employee.id) return { error: 'ليس لديك صلاحية — أنت لست CEO الشركة المرسلة' };
    }
    const now = new Date().toISOString();
    const { error: updateErr } = await service.from('requests').update({
      company_exit_stamped_at: now, company_exit_stamped_by: employee.id,
    }).eq('id', requestId);
    if (updateErr) return { error: updateErr.message };
    await service.from('request_actions').insert({ request_id: requestId, action: 'company_exit_stamped', actor_id: employee.id, from_status: req.status, to_status: req.status, note });
    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

export async function stampFinance(requestId: string, note: string): Promise<{ error: string | null }> {
  if (!note?.trim()) return { error: 'الملاحظات مطلوبة' };
  try {
    const { service, employee, roles } = await getAuth();
    if (!roles.some(r => r.role === 'finance_approver')) return { error: 'ليس لديك صلاحية المالية' };
    const { data: req } = await service.from('requests').select('status').eq('id', requestId).single();
    const now = new Date().toISOString();
    const { error: updateErr } = await service.from('requests').update({
      finance_stamped_at: now, finance_stamped_by: employee.id,
    }).eq('id', requestId);
    if (updateErr) return { error: updateErr.message };
    await service.from('request_actions').insert({ request_id: requestId, action: 'finance_stamped', actor_id: employee.id, from_status: req?.status, to_status: req?.status, note });
    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

export async function stampHR(requestId: string, note: string): Promise<{ error: string | null }> {
  if (!note?.trim()) return { error: 'الملاحظات مطلوبة' };
  try {
    const { service, employee, roles } = await getAuth();
    if (!roles.some(r => r.role === 'hr_approver')) return { error: 'ليس لديك صلاحية الموارد البشرية' };
    const { data: req } = await service.from('requests').select('status').eq('id', requestId).single();
    const now = new Date().toISOString();
    const { error: updateErr } = await service.from('requests').update({
      hr_stamped_at: now, hr_stamped_by: employee.id,
    }).eq('id', requestId);
    if (updateErr) return { error: updateErr.message };
    await service.from('request_actions').insert({ request_id: requestId, action: 'hr_stamped', actor_id: employee.id, from_status: req?.status, to_status: req?.status, note });
    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

export async function stampCEO(requestId: string, note: string): Promise<{ error: string | null }> {
  if (!note?.trim()) return { error: 'الملاحظات مطلوبة' };
  try {
    const { service, employee } = await getAuth();
    const { data: holdingCo } = await service.from('companies').select('ceo_employee_id').eq('is_holding', true).maybeSingle();
    if ((holdingCo as any)?.ceo_employee_id !== employee.id) return { error: 'ليس لديك صلاحية — أنت لست CEO القابضة' };
    const { data: req } = await service.from('requests').select('status').eq('id', requestId).single();
    const now = new Date().toISOString();
    const { error: updateErr } = await service.from('requests').update({
      ceo_stamped_at: now, ceo_stamped_by: employee.id,
    }).eq('id', requestId);
    if (updateErr) return { error: updateErr.message };
    await service.from('request_actions').insert({ request_id: requestId, action: 'ceo_stamped', actor_id: employee.id, from_status: req?.status, to_status: req?.status, note });
    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

// ─── COMPLETE ────────────────────────────────────────────────────────────────

export async function completeRequest(requestId: string, note: string): Promise<{ error: string | null }> {
  if (!note?.trim()) return { error: 'الملاحظات مطلوبة' };
  try {
    const { service, employee, roles } = await getAuth();
    const canComplete = roles.some(r => ['department_manager', 'ceo', 'super_admin'].includes(r.role));
    if (!canComplete) return { error: 'ليس لديك صلاحية إنهاء الطلب' };

    const { data: req } = await service.from('requests')
      .select('status, requires_ceo, requires_hr, requires_finance, ceo_stamped_at, hr_stamped_at, finance_stamped_at, metadata, assigned_to, destination_dept_id')
      .eq('id', requestId).single();
    if (!req) return { error: 'الطلب غير موجود' };

    if (req.requires_finance && !req.finance_stamped_at) return { error: 'يتطلب اعتماد إدارة المالية أولاً' };
    if (req.requires_hr && !req.hr_stamped_at) return { error: 'يتطلب موافقة إدارة الموارد البشرية أولاً' };
    if (req.requires_ceo && !req.ceo_stamped_at) return { error: 'يتطلب موافقة الرئيس التنفيذي للقابضة أولاً' };

    // Custom type: check must_end_dept restriction
    const customTypeId = (req.metadata as any)?.custom_type_id || null;
    if (customTypeId) {
      const { data: ct } = await service
        .from('custom_request_types')
        .select('must_end_dept_id, flow_mode')
        .eq('id', customTypeId)
        .single();
      if (ct?.must_end_dept_id && ct.flow_mode === 'free') {
        // For free flow with must_end_dept, ensure current destination is the required dept
        if (req.destination_dept_id !== ct.must_end_dept_id) {
          const { data: endDept } = await service.from('departments').select('name_ar, name_en').eq('id', ct.must_end_dept_id).single();
          const deptName = endDept ? (endDept.name_ar || endDept.name_en) : ct.must_end_dept_id;
          return { error: `يجب أن يصل الطلب إلى قسم "${deptName}" قبل الإنهاء` };
        }
      }
    }

    const now = new Date().toISOString();
    const { error: updateErr } = await service.from('requests').update({
      status: 'completed', assigned_to: null, completed_at: now,
    }).eq('id', requestId);
    if (updateErr) return { error: 'فشل التحديث: ' + updateErr.message };

    const { error: actionErr } = await service.from('request_actions').insert({
      request_id: requestId, action: 'completed', actor_id: employee.id,
      from_status: req.status, to_status: 'completed', note,
    });
    if (actionErr) return { error: 'فشل تسجيل الإجراء: ' + actionErr.message };

    // Notify requester
    const { data: reqFull } = await service.from('requests').select('requester_id').eq('id', requestId).single();
    if (reqFull?.requester_id) {
      await notify(service, {
        recipientId: reqFull.requester_id,
        requestId,
        type: 'request_completed',
        titleAr: 'تم إنجاز طلبك',
        titleEn: 'Your request has been completed',
        bodyAr: 'تم إنجاز طلبك بنجاح',
        bodyEn: 'Your request has been successfully completed',
      });
    }

    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

// ─── REJECT ──────────────────────────────────────────────────────────────────

export async function rejectRequest(requestId: string, note: string): Promise<{ error: string | null }> {
  if (!note?.trim()) return { error: 'الملاحظات مطلوبة' };
  try {
    const { service, employee } = await getAuth();
    const { data: req } = await service.from('requests').select('status').eq('id', requestId).single();
    const { error: updateErr } = await service.from('requests').update({
      status: 'rejected', assigned_to: null,
    }).eq('id', requestId);
    if (updateErr) return { error: 'فشل التحديث: ' + updateErr.message };
    await service.from('request_actions').insert({
      request_id: requestId, action: 'rejected', actor_id: employee.id,
      from_status: req?.status, to_status: 'rejected', note,
    });

    const { data: reqFull } = await service.from('requests').select('requester_id').eq('id', requestId).single();
    if (reqFull?.requester_id) {
      await notify(service, {
        recipientId: reqFull.requester_id,
        requestId,
        type: 'request_rejected',
        titleAr: 'تم رفض طلبك',
        titleEn: 'Your request was rejected',
        bodyAr: `تم رفض طلبك — ${note}`,
        bodyEn: `Your request was rejected — ${note}`,
      });
    }

    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

// ─── CANCEL ──────────────────────────────────────────────────────────────────

export async function cancelRequest(requestId: string, note: string): Promise<{ error: string | null }> {
  if (!note?.trim()) return { error: 'الملاحظات مطلوبة' };
  try {
    const { service, employee, roles } = await getAuth();
    const { data: req } = await service.from('requests').select('status, requester_id').eq('id', requestId).single();
    if (!req) return { error: 'الطلب غير موجود' };
    const isSuperAdmin = roles.some(r => r.role === 'super_admin');
    if (req.requester_id !== employee.id && !isSuperAdmin) return { error: 'لا يمكنك إلغاء هذا الطلب' };
    const { error: updateErr } = await service.from('requests').update({
      status: 'cancelled', assigned_to: null,
    }).eq('id', requestId);
    if (updateErr) return { error: 'فشل التحديث: ' + updateErr.message };
    await service.from('request_actions').insert({
      request_id: requestId, action: 'cancelled', actor_id: employee.id,
      from_status: req.status, to_status: 'cancelled', note,
    });
    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

// ─── GET DEPT EMPLOYEES ───────────────────────────────────────────────────────

export async function getDepartmentEmployees(departmentId: string): Promise<any[]> {
  try {
    const service = await createServiceClient();
    const { data } = await service.from('employees')
      .select('id, full_name_ar, full_name_en, employee_code, title_ar, title_en')
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .order('full_name_ar');
    return data || [];
  } catch {
    return [];
  }
}
