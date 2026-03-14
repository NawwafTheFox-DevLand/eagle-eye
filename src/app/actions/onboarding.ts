'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

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

// ─── GET ONBOARDING CONFIG ────────────────────────────────────────────────────

export async function getOnboardingConfig(): Promise<any[]> {
  try {
    const service = await createServiceClient();

    const { data: configs } = await service
      .from('onboarding_config')
      .select('id, task_type, task_name_ar, task_name_en, assigned_employee_id, backup_employee_id, sla_hours, depends_on_task, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order');

    if (!configs || configs.length === 0) return [];

    // Collect all employee IDs
    const empIds = [
      ...new Set([
        ...(configs as any[]).map((c: any) => c.assigned_employee_id).filter(Boolean),
        ...(configs as any[]).map((c: any) => c.backup_employee_id).filter(Boolean),
      ]),
    ] as string[];

    let empMap = new Map<string, any>();
    if (empIds.length > 0) {
      const { data: emps } = await service
        .from('employees')
        .select('id, full_name_ar, full_name_en, employee_code')
        .in('id', empIds);
      empMap = new Map((emps || []).map((e: any) => [e.id, e]));
    }

    return (configs as any[]).map((c: any) => ({
      ...c,
      assigned_employee: c.assigned_employee_id ? empMap.get(c.assigned_employee_id) || null : null,
      backup_employee: c.backup_employee_id ? empMap.get(c.backup_employee_id) || null : null,
    }));
  } catch {
    return [];
  }
}

// ─── UPDATE ONBOARDING CONFIG ─────────────────────────────────────────────────

export async function updateOnboardingConfig(
  configs: { task_type: string; assigned_employee_id: string | null; backup_employee_id: string | null; sla_hours: number }[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('غير مصرح');

    const service = await createServiceClient();

    const { data: emp } = await service
      .from('employees')
      .select('id, department_id')
      .eq('auth_user_id', user.id)
      .single();
    if (!emp) throw new Error('الموظف غير موجود');

    const { data: roleRows } = await service
      .from('user_roles')
      .select('role')
      .eq('employee_id', emp.id)
      .eq('is_active', true);
    const roles = (roleRows || []).map((r: any) => r.role as string);

    const isSuperAdmin = roles.includes('super_admin');

    let isHRDeptManager = false;
    if (!isSuperAdmin && emp.department_id) {
      const { data: dept } = await service
        .from('departments')
        .select('code, head_employee_id')
        .eq('id', emp.department_id)
        .single();
      isHRDeptManager =
        dept?.head_employee_id === emp.id &&
        (dept?.code || '').toUpperCase().includes('HR');
    }

    if (!isSuperAdmin && !isHRDeptManager) throw new Error('غير مصرح');

    const now = new Date().toISOString();

    for (const config of configs) {
      await service
        .from('onboarding_config')
        .update({
          assigned_employee_id: config.assigned_employee_id,
          backup_employee_id: config.backup_employee_id,
          sla_hours: config.sla_hours,
          updated_by: emp.id,
          updated_at: now,
        })
        .eq('task_type', config.task_type);
    }

    // Audit log
    await service.from('audit_log').insert({
      employee_id: emp.id,
      action: 'update',
      entity_type: 'onboarding_config',
      entity_id: 'bulk',
      changes: configs,
      created_at: now,
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── SUBMIT ONBOARDING REQUEST ────────────────────────────────────────────────

export async function submitOnboardingRequest(
  parentRequestId: string,
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'غير مصرح' };

    const service = await createServiceClient();

    const { data: emp } = await service
      .from('employees')
      .select('id, company_id, department_id, full_name_ar, full_name_en')
      .eq('auth_user_id', user.id)
      .single();
    if (!emp) return { error: 'الموظف غير موجود' };

    // Fetch parent request
    const { data: parent } = await service
      .from('requests')
      .select('id, request_number, subject, metadata, requester_id, origin_company_id, origin_dept_id, status')
      .eq('id', parentRequestId)
      .single();
    if (!parent) return { error: 'الطلب غير موجود' };

    // Fetch onboarding config
    const { data: configs } = await service
      .from('onboarding_config')
      .select('id, task_type, task_name_ar, task_name_en, assigned_employee_id, backup_employee_id, sla_hours, depends_on_task, sort_order')
      .eq('is_active', true)
      .order('sort_order');

    if (!configs || configs.length === 0) {
      return { error: 'لم يتم العثور على إعدادات التعيين — يرجى إعداد onboarding_config' };
    }

    // Validate all configs have an assigned employee
    const unassigned = (configs as any[]).find((c: any) => !c.assigned_employee_id);
    if (unassigned) {
      return { error: 'يجب تعيين جميع المسؤولين في إعدادات التوظيف أولاً' };
    }

    const now = new Date().toISOString();
    const today = now.substring(0, 10);
    const createdChildren = new Map<string, { id: string }>();

    for (const config of (configs as any[])) {
      // Check delegation
      let assigneeId: string = config.assigned_employee_id;
      const { data: delegation } = await service
        .from('delegations')
        .select('delegatee_id')
        .eq('delegator_id', config.assigned_employee_id)
        .eq('is_active', true)
        .lte('from_date', today)
        .gte('to_date', today)
        .limit(1)
        .maybeSingle();

      if (delegation?.delegatee_id) {
        assigneeId = delegation.delegatee_id;
      }

      // Get assignee's company/dept
      const { data: assigneeDetails } = await service
        .from('employees')
        .select('company_id, department_id')
        .eq('id', assigneeId)
        .single();

      // Determine status based on dependency
      const hasDependency = !!config.depends_on_task;
      const childStatus = hasDependency ? 'draft' : 'in_progress';

      // Find depends_on_request_id
      let dependsOnId: string | null = null;
      if (config.depends_on_task) {
        dependsOnId = createdChildren.get(config.depends_on_task)?.id || null;
      }

      // Generate request number
      let requestNumber: string;
      const { data: rpcData } = await service.rpc('next_request_number', {
        p_company_id: (parent as any).origin_company_id,
      });
      if (rpcData) {
        requestNumber = rpcData;
      } else {
        requestNumber = 'ONB-' + Date.now();
      }

      const employeeName = (parent as any).metadata?.emp_name_ar || (parent as any).metadata?.employee_name || '';

      // Insert child request
      const { data: inserted, error: insertErr } = await service
        .from('requests')
        .insert({
          request_number: requestNumber,
          request_type: 'employee_onboarding',
          task_type: config.task_type,
          status: childStatus,
          subject: config.task_name_ar + ': ' + employeeName,
          description: 'مهمة ضمن عملية توظيف ' + employeeName,
          requester_id: (parent as any).requester_id,
          assigned_to: childStatus === 'in_progress' ? assigneeId : null,
          origin_company_id: (parent as any).origin_company_id,
          origin_dept_id: (parent as any).origin_dept_id,
          destination_company_id: assigneeDetails?.company_id || null,
          destination_dept_id: assigneeDetails?.department_id || null,
          parent_request_id: parentRequestId,
          depends_on_request_id: dependsOnId,
          metadata: (parent as any).metadata,
          submitted_at: now,
        })
        .select('id')
        .single();

      if (insertErr || !inserted) {
        console.error('[submitOnboardingRequest] child insert error:', insertErr);
        continue;
      }

      const insertedId = (inserted as any).id;
      createdChildren.set(config.task_type, { id: insertedId });

      // Insert request action
      await service.from('request_actions').insert({
        request_id: insertedId,
        action: 'submitted',
        actor_id: emp.id,
        to_person_id: childStatus === 'in_progress' ? assigneeId : null,
        from_status: 'draft',
        to_status: childStatus,
        created_at: now,
      });

      // Notify assignee if in_progress
      if (childStatus === 'in_progress') {
        try {
          await service.from('notifications').insert({
            recipient_id: assigneeId,
            request_id: insertedId,
            channel: 'in_app',
            type: 'assigned',
            title_ar: 'مهمة توظيف جديدة',
            title_en: 'New Onboarding Task',
            body_ar: config.task_name_ar,
            body_en: config.task_name_en,
            action_url: '/dashboard/requests/' + insertedId,
            is_read: false,
          });
        } catch { /* best-effort */ }
      }
    }

    // Update parent request to in_progress
    await service.from('requests').update({
      status: 'in_progress',
      submitted_at: now,
      assigned_to: emp.id,
    }).eq('id', parentRequestId);

    // Insert parent action
    await service.from('request_actions').insert({
      request_id: parentRequestId,
      action: 'submitted',
      actor_id: emp.id,
      from_status: 'draft',
      to_status: 'in_progress',
      note: 'تم إنشاء ' + (configs as any[]).length + ' مهام توظيف تلقائياً',
      created_at: now,
    });

    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── COMPLETE ONBOARDING CHILD ────────────────────────────────────────────────

export async function completeOnboardingChild(
  childRequestId: string,
  note: string,
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'غير مصرح' };

    const service = await createServiceClient();

    const { data: emp } = await service
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    if (!emp) return { error: 'الموظف غير موجود' };

    const now = new Date().toISOString();

    // Complete the child
    await service.from('requests').update({
      status: 'completed',
      assigned_to: null,
      completed_at: now,
    }).eq('id', childRequestId);

    await service.from('request_actions').insert({
      request_id: childRequestId,
      action: 'completed',
      actor_id: emp.id,
      from_status: 'in_progress',
      to_status: 'completed',
      note,
    });

    // Activate dependents
    const { data: dependents } = await service
      .from('requests')
      .select('id, assigned_to, task_type')
      .eq('depends_on_request_id', childRequestId)
      .eq('status', 'draft');

    for (const dep of (dependents || []) as any[]) {
      await service.from('requests').update({
        status: 'in_progress',
        assigned_to: dep.assigned_to,
      }).eq('id', dep.id);

      await service.from('request_actions').insert({
        request_id: dep.id,
        action: 'submitted',
        actor_id: emp.id,
        from_status: 'draft',
        to_status: 'in_progress',
        note: 'تم تفعيل المهمة',
      });

      if (dep.assigned_to) {
        try {
          await service.from('notifications').insert({
            recipient_id: dep.assigned_to,
            request_id: dep.id,
            channel: 'in_app',
            type: 'assigned',
            title_ar: 'تم تفعيل مهمة التوظيف',
            title_en: 'Onboarding Task Activated',
            body_ar: 'يمكنك الآن البدء بالمهمة',
            body_en: 'You can now start this task',
            action_url: '/dashboard/requests/' + dep.id,
            is_read: false,
          });
        } catch { /* best-effort */ }
      }
    }

    // Fetch parent info
    const { data: child } = await service
      .from('requests')
      .select('parent_request_id, metadata, requester_id')
      .eq('id', childRequestId)
      .single();

    const parentId = (child as any)?.parent_request_id;
    if (!parentId) return { error: null };

    // Count siblings
    const { count: totalCount } = await service
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('parent_request_id', parentId);

    const { count: completedCount } = await service
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('parent_request_id', parentId)
      .eq('status', 'completed');

    if ((completedCount ?? 0) >= (totalCount ?? 0)) {
      // All done — complete parent
      await service.from('requests').update({
        status: 'completed',
        completed_at: now,
        assigned_to: null,
      }).eq('id', parentId);

      await service.from('request_actions').insert({
        request_id: parentId,
        action: 'completed',
        actor_id: emp.id,
        from_status: 'in_progress',
        to_status: 'completed',
        note: 'تم إكمال جميع مهام التوظيف',
      });

      // Notify requester
      const { data: parentReq } = await service
        .from('requests')
        .select('requester_id, metadata')
        .eq('id', parentId)
        .single();

      if ((parentReq as any)?.requester_id) {
        try {
          await service.from('notifications').insert({
            recipient_id: (parentReq as any).requester_id,
            request_id: parentId,
            channel: 'in_app',
            type: 'request_completed',
            title_ar: 'تم إكمال طلب التوظيف',
            title_en: 'Onboarding Request Completed',
            body_ar: 'تم إكمال جميع مهام التوظيف بنجاح',
            body_en: 'All onboarding tasks have been completed',
            action_url: '/dashboard/requests/' + parentId,
            is_read: false,
          });
        } catch { /* best-effort */ }
      }
    } else {
      // Update progress in parent metadata
      const { data: parentReq } = await service
        .from('requests')
        .select('metadata')
        .eq('id', parentId)
        .single();

      const existingMeta = (parentReq as any)?.metadata || {};
      await service.from('requests').update({
        metadata: { ...existingMeta, progress: (completedCount ?? 0) + '/' + (totalCount ?? 0) },
      }).eq('id', parentId);
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
    if (!note?.trim()) return { error: 'سبب الإلغاء مطلوب' };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'غير مصرح' };

    const service = await createServiceClient();

    const { data: emp } = await service
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    if (!emp) return { error: 'الموظف غير موجود' };

    // Get parent
    const { data: parent } = await service
      .from('requests')
      .select('id, status, requester_id')
      .eq('id', parentRequestId)
      .single();
    if (!parent) return { error: 'الطلب غير موجود' };

    // Get roles
    const { data: roleRows } = await service
      .from('user_roles')
      .select('role')
      .eq('employee_id', emp.id)
      .eq('is_active', true);
    const roles = (roleRows || []).map((r: any) => r.role as string);
    const isSuperAdmin = roles.includes('super_admin');

    if ((parent as any).requester_id !== emp.id && !isSuperAdmin) {
      return { error: 'غير مصرح — لا يمكنك إلغاء هذا الطلب' };
    }

    // Get active children
    const { data: children } = await service
      .from('requests')
      .select('id, assigned_to, status')
      .eq('parent_request_id', parentRequestId)
      .not('status', 'in', '("completed","cancelled")');

    const now = new Date().toISOString();

    for (const child of (children || []) as any[]) {
      await service.from('requests').update({
        status: 'cancelled',
        assigned_to: null,
      }).eq('id', child.id);

      await service.from('request_actions').insert({
        request_id: child.id,
        action: 'cancelled',
        actor_id: emp.id,
        from_status: child.status,
        to_status: 'cancelled',
        note,
      });
    }

    await service.from('requests').update({
      status: 'cancelled',
      assigned_to: null,
    }).eq('id', parentRequestId);

    await service.from('request_actions').insert({
      request_id: parentRequestId,
      action: 'cancelled',
      actor_id: emp.id,
      from_status: (parent as any).status,
      to_status: 'cancelled',
      note,
    });

    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}
