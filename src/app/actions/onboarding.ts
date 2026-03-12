'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';

async function getAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('غير مصرح');
  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees')
    .select('id, full_name_ar, full_name_en, company_id, department_id')
    .eq('auth_user_id', user.id)
    .single();
  if (!employee) throw new Error('الموظف غير موجود');
  return { service, employee };
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────

export async function getOnboardingConfig(): Promise<any[]> {
  try {
    const { service } = await getAuth();
    const { data } = await service
      .from('onboarding_config')
      .select('id, task_type, name_ar, name_en, assignee_dept_code, sla_hours, depends_on, is_active')
      .order('task_type');
    return data || [];
  } catch {
    return [];
  }
}

export async function updateOnboardingConfig(
  id: string,
  fields: { assignee_dept_code?: string; sla_hours?: number },
): Promise<{ error?: string }> {
  try {
    const { service } = await getAuth();
    const { error } = await service.from('onboarding_config').update(fields).eq('id', id);
    if (error) return { error: error.message };
    return {};
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── SUBMIT (creates 4 child requests) ───────────────────────────────────────

export async function submitOnboardingRequest(
  parentRequestId: string,
): Promise<{ error: string | null }> {
  try {
    const { service, employee } = await getAuth();

    // Get parent request
    const { data: parent } = await service
      .from('requests')
      .select('id, request_number, subject, metadata, requester_id, origin_company_id, origin_dept_id')
      .eq('id', parentRequestId)
      .single();
    if (!parent) return { error: 'الطلب غير موجود' };

    const companyId = (parent as any).origin_company_id;

    // Get company code for request numbers
    const { data: comp } = companyId
      ? await service.from('companies').select('code').eq('id', companyId).single()
      : { data: null };
    const companyCode = (comp as any)?.code || 'MH';

    // Get onboarding config
    const { data: configs } = await service
      .from('onboarding_config')
      .select('id, task_type, name_ar, name_en, assignee_dept_code, sla_hours, depends_on')
      .eq('is_active', true)
      .order('task_type');

    if (!configs || configs.length === 0) {
      return { error: 'لم يتم العثور على إعدادات التعيين — يرجى إعداد onboarding_config' };
    }

    // Get departments by code within the company
    const deptCodes = [...new Set((configs as any[]).map((c: any) => c.assignee_dept_code).filter(Boolean))];
    const { data: depts } = deptCodes.length > 0
      ? await service.from('departments')
          .select('id, code, head_employee_id')
          .eq('company_id', companyId)
          .in('code', deptCodes)
      : { data: [] };

    const deptByCode = new Map(((depts || []) as any[]).map((d: any) => [d.code, d]));

    const now = new Date().toISOString();
    const childIds: Record<string, string> = {}; // task_type → child request id

    // Create each child request
    for (const config of (configs as any[])) {
      const dept = config.assignee_dept_code ? deptByCode.get(config.assignee_dept_code) : null;
      const assigneeId: string | null = dept?.head_employee_id || null;
      const childSubject = `${(parent as any).subject} — ${config.name_ar}`;
      const childNum = `${companyCode}-ONB-${config.task_type.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`;

      const { data: child, error: childErr } = await service
        .from('requests')
        .insert({
          request_number:   childNum,
          request_type:     'employee_onboarding',
          subject:          childSubject,
          status:           assigneeId ? 'in_progress' : 'draft',
          priority:         'normal',
          requester_id:     (parent as any).requester_id,
          origin_company_id: companyId,
          origin_dept_id:   (parent as any).origin_dept_id,
          destination_dept_id: dept?.id || null,
          assigned_to:      assigneeId,
          parent_request_id: parentRequestId,
          task_type:        config.task_type,
          submitted_at:     now,
          metadata:         (parent as any).metadata,
        })
        .select('id')
        .single();

      if (childErr || !child) {
        console.error('[submitOnboardingRequest] child create error:', childErr);
        continue;
      }

      childIds[config.task_type] = (child as any).id;

      await service.from('request_actions').insert({
        request_id:   (child as any).id,
        action:       'submitted',
        actor_id:     employee.id,
        to_person_id: assigneeId,
        from_status:  'draft',
        to_status:    assigneeId ? 'in_progress' : 'draft',
        note:         `مهمة تعيين: ${config.name_ar}`,
      });
    }

    // Second pass: link dependencies (payroll depends on hr_registration etc.)
    for (const config of (configs as any[])) {
      if (config.depends_on && childIds[config.depends_on] && childIds[config.task_type]) {
        await service
          .from('requests')
          .update({ depends_on_request_id: childIds[config.depends_on] })
          .eq('id', childIds[config.task_type]);
      }
    }

    // Update parent to in_progress (tracking container)
    await service.from('requests').update({
      status:      'in_progress',
      submitted_at: now,
      assigned_to: null,
    }).eq('id', parentRequestId);

    await service.from('request_actions').insert({
      request_id:  parentRequestId,
      action:      'submitted',
      actor_id:    employee.id,
      from_status: 'draft',
      to_status:   'in_progress',
      note:        `تم إنشاء ${Object.keys(childIds).length} مهمة تعيين تلقائياً`,
    });

    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── COMPLETE CHILD ───────────────────────────────────────────────────────────

export async function completeOnboardingChild(
  childRequestId: string,
  note: string,
): Promise<{ error: string | null }> {
  try {
    const { service, employee } = await getAuth();

    const { data: child } = await service
      .from('requests')
      .select('id, parent_request_id, task_type, depends_on_request_id, status, assigned_to')
      .eq('id', childRequestId)
      .single();

    if (!child) return { error: 'المهمة غير موجودة' };
    if ((child as any).assigned_to !== employee.id) return { error: 'غير مصرح — أنت لست المعين لهذه المهمة' };
    if ((child as any).status !== 'in_progress') return { error: 'لا يمكن إنجاز هذه المهمة بحالتها الحالية' };

    // Check dependency
    if ((child as any).depends_on_request_id) {
      const { data: dep } = await service
        .from('requests')
        .select('status')
        .eq('id', (child as any).depends_on_request_id)
        .single();
      if ((dep as any)?.status !== 'completed') {
        return { error: 'لا يمكن إنجاز هذه المهمة قبل اكتمال المهمة المتوقفة عليها' };
      }
    }

    const now = new Date().toISOString();

    await service.from('requests').update({
      status:       'completed',
      completed_at: now,
    }).eq('id', childRequestId);

    await service.from('request_actions').insert({
      request_id:  childRequestId,
      action:      'completed',
      actor_id:    employee.id,
      from_status: 'in_progress',
      to_status:   'completed',
      note,
    });

    // Auto-complete parent if all siblings done
    const parentId = (child as any).parent_request_id;
    if (parentId) {
      const { data: siblings } = await service
        .from('requests')
        .select('id, status')
        .eq('parent_request_id', parentId)
        .neq('id', childRequestId);

      const allDone = (siblings || []).every((s: any) =>
        ['completed', 'cancelled'].includes(s.status)
      );

      if (allDone) {
        await service.from('requests').update({
          status:       'completed',
          completed_at: now,
        }).eq('id', parentId);

        await service.from('request_actions').insert({
          request_id:  parentId,
          action:      'completed',
          actor_id:    employee.id,
          from_status: 'in_progress',
          to_status:   'completed',
          note:        'اكتملت جميع مهام التعيين تلقائياً',
        });
      }
    }

    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── CANCEL ONBOARDING ────────────────────────────────────────────────────────

export async function cancelOnboarding(
  parentRequestId: string,
  note: string,
): Promise<{ error: string | null }> {
  try {
    const { service, employee } = await getAuth();

    // Cancel all incomplete children
    const { data: children } = await service
      .from('requests')
      .select('id, status')
      .eq('parent_request_id', parentRequestId);

    for (const child of (children || []) as any[]) {
      if (!['completed', 'cancelled'].includes(child.status)) {
        await service.from('requests').update({ status: 'cancelled' }).eq('id', child.id);
        await service.from('request_actions').insert({
          request_id:  child.id,
          action:      'cancelled',
          actor_id:    employee.id,
          from_status: child.status,
          to_status:   'cancelled',
          note,
        });
      }
    }

    // Cancel parent
    await service.from('requests').update({ status: 'cancelled' }).eq('id', parentRequestId);
    await service.from('request_actions').insert({
      request_id:  parentRequestId,
      action:      'cancelled',
      actor_id:    employee.id,
      from_status: 'in_progress',
      to_status:   'cancelled',
      note,
    });

    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}
