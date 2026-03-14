'use server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export interface CustomField {
  key: string;
  label_ar: string;
  label_en: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file';
  required: boolean;
  options?: { value: string; label_ar: string; label_en: string }[];
}

export interface FlowStep {
  company_id: string;
  department_id: string;
  action_label_ar: string;
  action_label_en: string;
}

export interface CreateCustomRequestTypeInput {
  name_ar: string;
  name_en: string;
  desc_ar: string;
  desc_en: string;
  icon: string;
  flow_mode: 'free' | 'fixed';
  allowed_creators: 'own_dept' | 'own_company' | 'all';
  must_end_company_id?: string;
  must_end_dept_id?: string;
  requires_ceo: boolean;
  requires_hr: boolean;
  requires_finance: boolean;
  steps: FlowStep[];
  fields: CustomField[];
}

async function getAuthCustom() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees')
    .select('id, company_id, department_id, full_name_ar, full_name_en')
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

// ─── GET LIST ─────────────────────────────────────────────────────────────────

export async function getCustomRequestTypes(companyId?: string) {
  try {
    const service = await createServiceClient();
    let q = service.from('custom_request_types').select('*').eq('is_active', true);
    if (companyId) q = q.eq('company_id', companyId);
    const { data: types } = await q.order('created_at', { ascending: false });
    if (!types || types.length === 0) return [];

    const creatorIds = [...new Set(types.map((t: any) => t.created_by_employee_id).filter(Boolean))] as string[];
    const deptIds    = [...new Set(types.map((t: any) => t.must_end_dept_id).filter(Boolean))] as string[];
    const typeIds    = types.map((t: any) => t.id);

    const [{ data: creators }, { data: endDepts }, { data: allSteps }] = await Promise.all([
      creatorIds.length > 0
        ? service.from('employees').select('id, full_name_ar, full_name_en').in('id', creatorIds)
        : Promise.resolve({ data: [] as any[] }),
      deptIds.length > 0
        ? service.from('departments').select('id, name_ar, name_en').in('id', deptIds)
        : Promise.resolve({ data: [] as any[] }),
      typeIds.length > 0
        ? service.from('custom_request_steps').select('custom_type_id').in('custom_type_id', typeIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const creatorMap = new Map((creators || []).map((e: any) => [e.id, e]));
    const deptMap    = new Map((endDepts  || []).map((d: any) => [d.id, d]));
    const stepCounts = new Map<string, number>();
    for (const s of (allSteps || [])) {
      stepCounts.set(s.custom_type_id, (stepCounts.get(s.custom_type_id) || 0) + 1);
    }

    return types.map((t: any) => ({
      ...t,
      creator:       creatorMap.get(t.created_by_employee_id) || null,
      must_end_dept: deptMap.get(t.must_end_dept_id) || null,
      step_count:    stepCounts.get(t.id) || 0,
    }));
  } catch (e: any) {
    console.error('[getCustomRequestTypes]', e);
    return [];
  }
}

export async function getAllCustomRequestTypes() {
  try {
    const service = await createServiceClient();
    const { data: types } = await service
      .from('custom_request_types')
      .select('*')
      .order('created_at', { ascending: false });
    if (!types || types.length === 0) return [];

    const creatorIds = [...new Set(types.map((t: any) => t.created_by_employee_id).filter(Boolean))] as string[];
    const deptIds    = [...new Set(types.map((t: any) => t.must_end_dept_id).filter(Boolean))] as string[];
    const typeIds    = types.map((t: any) => t.id);

    const [{ data: creators }, { data: endDepts }, { data: allSteps }] = await Promise.all([
      creatorIds.length > 0
        ? service.from('employees').select('id, full_name_ar, full_name_en').in('id', creatorIds)
        : Promise.resolve({ data: [] as any[] }),
      deptIds.length > 0
        ? service.from('departments').select('id, name_ar, name_en').in('id', deptIds)
        : Promise.resolve({ data: [] as any[] }),
      typeIds.length > 0
        ? service.from('custom_request_steps').select('custom_type_id').in('custom_type_id', typeIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const creatorMap = new Map((creators || []).map((e: any) => [e.id, e]));
    const deptMap    = new Map((endDepts  || []).map((d: any) => [d.id, d]));
    const stepCounts = new Map<string, number>();
    for (const s of (allSteps || [])) {
      stepCounts.set(s.custom_type_id, (stepCounts.get(s.custom_type_id) || 0) + 1);
    }

    return types.map((t: any) => ({
      ...t,
      creator:       creatorMap.get(t.created_by_employee_id) || null,
      must_end_dept: deptMap.get(t.must_end_dept_id) || null,
      step_count:    stepCounts.get(t.id) || 0,
    }));
  } catch (e: any) {
    console.error('[getAllCustomRequestTypes]', e);
    return [];
  }
}

// ─── GET SINGLE ───────────────────────────────────────────────────────────────

export async function getCustomRequestType(typeId: string) {
  try {
    const service = await createServiceClient();
    const { data: type } = await service
      .from('custom_request_types')
      .select('*')
      .eq('id', typeId)
      .single();
    if (!type) return null;

    const { data: steps } = await service
      .from('custom_request_steps')
      .select('*')
      .eq('custom_type_id', typeId)
      .order('step_order', { ascending: true });

    const stepDeptIds = [...new Set((steps || []).map((s: any) => s.department_id).filter(Boolean))] as string[];
    const { data: stepDepts } = stepDeptIds.length > 0
      ? await service.from('departments').select('id, name_ar, name_en').in('id', stepDeptIds)
      : { data: [] as any[] };
    const stepDeptMap = new Map((stepDepts || []).map((d: any) => [d.id, d]));

    return {
      ...type,
      steps: (steps || []).map((s: any) => ({ ...s, dept: stepDeptMap.get(s.department_id) || null })),
    };
  } catch (e: any) {
    console.error('[getCustomRequestType]', e);
    return null;
  }
}

// ─── VISIBLE TYPES ────────────────────────────────────────────────────────────

export async function getVisibleCustomTypes(employeeId: string, companyId: string, departmentId: string) {
  try {
    const service = await createServiceClient();
    const { data: types } = await service
      .from('custom_request_types')
      .select('id, code, name_ar, name_en, description_ar, description_en, icon, flow_mode, company_id, created_by_dept_id, allowed_creators, must_end_dept_id, must_end_company_id, custom_fields, requires_ceo, requires_hr, requires_finance')
      .eq('is_active', true);
    if (!types || types.length === 0) return [];

    return types.filter((t: any) => {
      if (t.allowed_creators === 'all') return true;
      if (t.allowed_creators === 'own_company') return t.company_id === companyId;
      if (t.allowed_creators === 'own_dept') return t.created_by_dept_id === departmentId;
      return false;
    });
  } catch (e: any) {
    console.error('[getVisibleCustomTypes]', e);
    return [];
  }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createCustomRequestType(input: CreateCustomRequestTypeInput): Promise<{ error?: string }> {
  try {
    const { service, employee, roles } = await getAuthCustom();
    const canAccess = roles.some(r => ['department_manager', 'ceo', 'super_admin'].includes(r.role));
    if (!canAccess) return { error: 'ليس لديك صلاحية إنشاء أنواع مخصصة' };

    // Generate code
    let code = `CUS-${Date.now().toString().slice(-6)}`;
    try {
      const { data: lastRow } = await service
        .from('custom_request_types')
        .select('code')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastRow?.code) {
        const m = lastRow.code.match(/CUS-(\d+)/);
        code = m ? `CUS-${String(parseInt(m[1]) + 1).padStart(3, '0')}` : code;
      } else {
        code = 'CUS-001';
      }
    } catch {}

    const mustEndDeptId = input.flow_mode === 'fixed' && input.steps.length > 0
      ? input.steps[input.steps.length - 1].department_id
      : input.must_end_dept_id || null;
    const mustEndCompanyId = input.flow_mode === 'fixed' && input.steps.length > 0
      ? input.steps[input.steps.length - 1].company_id
      : input.must_end_company_id || null;

    const { data: created, error } = await service
      .from('custom_request_types')
      .insert({
        code,
        name_ar:               input.name_ar,
        name_en:               input.name_en,
        description_ar:        input.desc_ar || null,
        description_en:        input.desc_en || null,
        icon:                  input.icon || '📝',
        flow_mode:             input.flow_mode,
        created_by_dept_id:    employee.department_id,
        created_by_employee_id: employee.id,
        company_id:            employee.company_id,
        allowed_creators:      input.allowed_creators,
        must_end_dept_id:      mustEndDeptId,
        must_end_company_id:   mustEndCompanyId,
        requires_ceo:          input.requires_ceo,
        requires_hr:           input.requires_hr,
        requires_finance:      input.requires_finance,
        custom_fields:         input.fields,
        is_active:             true,
      })
      .select()
      .single();

    if (error) return { error: error.message };

    if (input.flow_mode === 'fixed' && input.steps.length > 0) {
      const stepRows = input.steps.map((s, i) => ({
        custom_type_id:   created.id,
        step_order:       i + 1,
        department_id:    s.department_id,
        company_id:       s.company_id,
        action_label_ar:  s.action_label_ar || 'مراجعة',
        action_label_en:  s.action_label_en || 'Review',
        is_final:         i === input.steps.length - 1,
      }));
      await service.from('custom_request_steps').insert(stepRows);
    }

    try {
      await service.from('audit_log').insert({
        action: 'create_custom_type', performed_by: employee.id,
        entity_type: 'custom_request_types', entity_id: created.id,
        new_data: { code, name_ar: input.name_ar, name_en: input.name_en },
      });
    } catch {}

    return {};
  } catch (err: any) {
    return { error: err?.message || 'Unknown error' };
  }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateCustomRequestType(typeId: string, input: CreateCustomRequestTypeInput): Promise<{ error?: string }> {
  try {
    const { service, employee, roles } = await getAuthCustom();
    const { data: existing } = await service
      .from('custom_request_types')
      .select('created_by_employee_id')
      .eq('id', typeId)
      .single();

    const isCreator    = existing?.created_by_employee_id === employee.id;
    const isSuperAdmin = roles.some(r => r.role === 'super_admin');
    if (!isCreator && !isSuperAdmin) return { error: 'ليس لديك صلاحية تعديل هذا النوع' };

    const mustEndDeptId = input.flow_mode === 'fixed' && input.steps.length > 0
      ? input.steps[input.steps.length - 1].department_id
      : input.must_end_dept_id || null;
    const mustEndCompanyId = input.flow_mode === 'fixed' && input.steps.length > 0
      ? input.steps[input.steps.length - 1].company_id
      : input.must_end_company_id || null;

    const { error: updateErr } = await service
      .from('custom_request_types')
      .update({
        name_ar:           input.name_ar,
        name_en:           input.name_en,
        description_ar:    input.desc_ar || null,
        description_en:    input.desc_en || null,
        icon:              input.icon || '📝',
        flow_mode:         input.flow_mode,
        allowed_creators:  input.allowed_creators,
        must_end_dept_id:  mustEndDeptId,
        must_end_company_id: mustEndCompanyId,
        requires_ceo:      input.requires_ceo,
        requires_hr:       input.requires_hr,
        requires_finance:  input.requires_finance,
        custom_fields:     input.fields,
        updated_at:        new Date().toISOString(),
      })
      .eq('id', typeId);
    if (updateErr) return { error: updateErr.message };

    // Rebuild steps
    await service.from('custom_request_steps').delete().eq('custom_type_id', typeId);
    if (input.flow_mode === 'fixed' && input.steps.length > 0) {
      const stepRows = input.steps.map((s, i) => ({
        custom_type_id:   typeId,
        step_order:       i + 1,
        department_id:    s.department_id,
        company_id:       s.company_id,
        action_label_ar:  s.action_label_ar || 'مراجعة',
        action_label_en:  s.action_label_en || 'Review',
        is_final:         i === input.steps.length - 1,
      }));
      await service.from('custom_request_steps').insert(stepRows);
    }

    try {
      await service.from('audit_log').insert({
        action: 'update_custom_type', performed_by: employee.id,
        entity_type: 'custom_request_types', entity_id: typeId,
      });
    } catch {}

    return {};
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────

export async function toggleCustomRequestType(typeId: string, isActive: boolean): Promise<{ error?: string }> {
  try {
    const { service, employee, roles } = await getAuthCustom();
    const { data: existing } = await service
      .from('custom_request_types')
      .select('created_by_employee_id')
      .eq('id', typeId)
      .single();

    const isCreator    = existing?.created_by_employee_id === employee.id;
    const isSuperAdmin = roles.some(r => r.role === 'super_admin');
    const isCEO        = roles.some(r => r.role === 'ceo');
    if (!isCreator && !isSuperAdmin && !isCEO) return { error: 'ليس لديك صلاحية' };

    const { error } = await service
      .from('custom_request_types')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', typeId);
    if (error) return { error: error.message };

    try {
      await service.from('audit_log').insert({
        action: isActive ? 'activate_custom_type' : 'deactivate_custom_type',
        performed_by: employee.id, entity_type: 'custom_request_types', entity_id: typeId,
      });
    } catch {}

    return {};
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

// ─── ADVANCE STEP ─────────────────────────────────────────────────────────────

export async function advanceCustomStep(requestId: string, note: string): Promise<{ error: string | null }> {
  if (!note?.trim()) return { error: 'الملاحظات مطلوبة' };
  try {
    const { service, employee } = await getAuthCustom();
    const { data: req } = await service
      .from('requests')
      .select('status, assigned_to, metadata, requester_id')
      .eq('id', requestId)
      .single();
    if (!req) return { error: 'الطلب غير موجود' };

    const metadata    = (req.metadata as any) || {};
    const customTypeId: string | null = metadata.custom_type_id || null;
    const currentStep: number = metadata.current_step || 1;
    const totalSteps:  number = metadata.total_steps  || 1;

    if (!customTypeId) return { error: 'بيانات النوع المخصص مفقودة' };

    const { data: steps } = await service
      .from('custom_request_steps')
      .select('step_order, department_id, company_id, action_label_ar, action_label_en')
      .eq('custom_type_id', customTypeId)
      .order('step_order', { ascending: true });
    if (!steps || steps.length === 0) return { error: 'لم يتم العثور على خطوات' };

    const isLastStep = currentStep >= totalSteps;
    if (isLastStep) {
      // Delegate to completeRequest
      const { completeRequest } = await import('@/app/actions/requests');
      return completeRequest(requestId, note);
    }

    const nextStep = steps.find((s: any) => s.step_order === currentStep + 1);
    if (!nextStep) return { error: 'لم يتم العثور على الخطوة التالية' };

    const { data: nextDept } = await service
      .from('departments')
      .select('head_employee_id')
      .eq('id', nextStep.department_id)
      .single();
    const nextAssignee = nextDept?.head_employee_id;
    if (!nextAssignee) return { error: 'لا يوجد رئيس للقسم في الخطوة التالية' };

    const newMetadata = { ...metadata, current_step: currentStep + 1 };
    const { error: updateErr } = await service.from('requests').update({
      assigned_to:           nextAssignee,
      destination_dept_id:   nextStep.department_id,
      destination_company_id: nextStep.company_id,
      status:                'in_progress',
      metadata:              newMetadata,
    }).eq('id', requestId);
    if (updateErr) return { error: 'فشل التحديث: ' + updateErr.message };

    await service.from('request_actions').insert({
      request_id:    requestId,
      action:        'forwarded',
      actor_id:      employee.id,
      from_person_id: req.assigned_to,
      to_person_id:  nextAssignee,
      from_status:   req.status,
      to_status:     'in_progress',
      note:          `${note} — ${isLastStep ? 'الخطوة النهائية' : `الخطوة ${currentStep + 1} من ${totalSteps}`}`,
    });

    try {
      await service.from('notifications').insert({
        recipient_id: nextAssignee,
        request_id:   requestId,
        channel:      'in_app',
        type:         'request_forwarded',
        title_ar:     `طلب في انتظارك — الخطوة ${currentStep + 1}`,
        title_en:     `Request awaiting you — Step ${currentStep + 1}`,
        body_ar:      `حوّل ${employee.full_name_ar} طلباً إليك`,
        body_en:      `${employee.full_name_en || employee.full_name_ar} forwarded a request to you`,
        action_url:   `/dashboard/requests/${requestId}`,
        is_read:      false,
      });
    } catch {}

    return { error: null };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}
