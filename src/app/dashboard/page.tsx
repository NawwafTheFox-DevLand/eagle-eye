import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const employee = await getSessionEmployee();
  if (!employee) redirect('/login');

  const service = await createServiceClient();
  const roles = (employee.roles as any[]).map((r: any) => r.role as string);

  // ── Level detection ────────────────────────────────────────────────────────

  let level: 'holding' | 'company' | 'department' | 'employee' = 'employee';

  if (roles.includes('super_admin')) {
    level = 'holding';
  } else if (roles.includes('ceo')) {
    level = employee.company?.is_holding ? 'holding' : 'company';
  } else if (roles.includes('department_manager')) {
    level = 'department';
  }

  // ── Personal KPIs (all levels) ────────────────────────────────────────────

  const [{ data: myRequests }, { count: myInboxCount }] = await Promise.all([
    service.from('requests').select('id, status').eq('requester_id', employee.id),
    service.from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', employee.id)
      .in('status', ['in_progress', 'pending_clarification']),
  ]);

  const personalKPIs = {
    myOpen: (myRequests || []).filter((r: any) =>
      !['completed', 'rejected', 'cancelled', 'archived'].includes(r.status)
    ).length,
    myInbox: myInboxCount || 0,
    myCompleted: (myRequests || []).filter((r: any) => r.status === 'completed').length,
    myRejected:  (myRequests || []).filter((r: any) => r.status === 'rejected').length,
  };

  // ── Scope data (dept / company / holding) ─────────────────────────────────

  let scopeData: any = null;

  if (level === 'department' && employee.department_id) {
    const deptId = employee.department_id as string;

    const [
      { data: deptReqs },
      { data: deptEmps },
      { data: deptInfo },
    ] = await Promise.all([
      service.from('requests')
        .select('id, status, requester_id, origin_dept_id, destination_dept_id, assigned_to, submitted_at, completed_at, request_type, created_at')
        .or(`origin_dept_id.eq.${deptId},destination_dept_id.eq.${deptId}`),
      service.from('employees')
        .select('id, employee_code, full_name_ar, full_name_en, title_ar, grade, department_id, company_id')
        .eq('department_id', deptId)
        .eq('is_active', true)
        .order('full_name_ar'),
      service.from('departments')
        .select('id, head_employee_id, name_ar, name_en')
        .eq('id', deptId)
        .single(),
    ]);

    const empIds = (deptEmps || []).map((e: any) => e.id);

    const [
      { data: deptActions },
      { data: assigned },
      { data: recent },
    ] = await Promise.all([
      empIds.length > 0
        ? service.from('request_actions')
            .select('id, request_id, action, actor_id, to_person_id, created_at')
            .in('actor_id', empIds)
            .order('created_at', { ascending: false })
            .limit(500)
        : Promise.resolve({ data: [] }),
      empIds.length > 0
        ? service.from('requests')
            .select('id, assigned_to')
            .in('assigned_to', empIds)
            .in('status', ['in_progress', 'pending_clarification'])
        : Promise.resolve({ data: [] }),
      empIds.length > 0
        ? service.from('request_actions')
            .select('id, request_id, action, actor_id, note, created_at')
            .in('actor_id', empIds)
            .order('created_at', { ascending: false })
            .limit(15)
        : Promise.resolve({ data: [] }),
    ]);

    const actReqIds = [...new Set((recent || []).map((a: any) => a.request_id))];
    const actorIds  = [...new Set((recent || []).map((a: any) => a.actor_id).filter(Boolean))];

    const [{ data: actReqs }, { data: actActors }] = await Promise.all([
      actReqIds.length > 0
        ? service.from('requests').select('id, request_number, subject').in('id', actReqIds)
        : Promise.resolve({ data: [] }),
      actorIds.length > 0
        ? service.from('employees').select('id, full_name_ar').in('id', actorIds)
        : Promise.resolve({ data: [] }),
    ]);

    scopeData = {
      level,
      requests:      deptReqs  || [],
      employees:     deptEmps  || [],
      actions:       deptActions || [],
      assigned:      assigned  || [],
      departments:   deptInfo  ? [deptInfo] : [],
      companies:     [],
      recentActivity: recent   || [],
      actRequests:   actReqs   || [],
      actActors:     actActors || [],
      headEmployeeId: (deptInfo as any)?.head_employee_id || null,
    };

  } else if (level === 'company' && employee.company_id) {
    const companyId = employee.company_id as string;

    const [
      { data: compReqs },
      { data: compEmps },
      { data: compDepts },
    ] = await Promise.all([
      service.from('requests')
        .select('id, status, requester_id, origin_dept_id, destination_dept_id, origin_company_id, destination_company_id, assigned_to, submitted_at, completed_at, request_type, created_at')
        .or(`origin_company_id.eq.${companyId},destination_company_id.eq.${companyId}`),
      service.from('employees')
        .select('id, employee_code, full_name_ar, full_name_en, title_ar, grade, department_id, company_id')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('full_name_ar'),
      service.from('departments')
        .select('id, code, name_ar, name_en, head_employee_id, company_id')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name_ar'),
    ]);

    const empIds = (compEmps || []).map((e: any) => e.id);

    const [
      { data: compActions },
      { data: assigned },
      { data: recent },
    ] = await Promise.all([
      empIds.length > 0
        ? service.from('request_actions')
            .select('id, request_id, action, actor_id, to_person_id, created_at')
            .in('actor_id', empIds)
            .order('created_at', { ascending: false })
            .limit(1000)
        : Promise.resolve({ data: [] }),
      empIds.length > 0
        ? service.from('requests')
            .select('id, assigned_to')
            .in('assigned_to', empIds)
            .in('status', ['in_progress', 'pending_clarification'])
        : Promise.resolve({ data: [] }),
      empIds.length > 0
        ? service.from('request_actions')
            .select('id, request_id, action, actor_id, note, created_at')
            .in('actor_id', empIds)
            .order('created_at', { ascending: false })
            .limit(15)
        : Promise.resolve({ data: [] }),
    ]);

    const actReqIds = [...new Set((recent || []).map((a: any) => a.request_id))];
    const actorIds  = [...new Set((recent || []).map((a: any) => a.actor_id).filter(Boolean))];

    const [{ data: actReqs }, { data: actActors }] = await Promise.all([
      actReqIds.length > 0
        ? service.from('requests').select('id, request_number, subject').in('id', actReqIds)
        : Promise.resolve({ data: [] }),
      actorIds.length > 0
        ? service.from('employees').select('id, full_name_ar').in('id', actorIds)
        : Promise.resolve({ data: [] }),
    ]);

    scopeData = {
      level,
      requests:      compReqs    || [],
      employees:     compEmps    || [],
      actions:       compActions || [],
      assigned:      assigned    || [],
      departments:   compDepts   || [],
      companies:     [],
      recentActivity: recent     || [],
      actRequests:   actReqs     || [],
      actActors:     actActors   || [],
      headEmployeeId: null,
    };

  } else if (level === 'holding') {
    const [
      { data: allReqs },
      { data: allEmps },
      { data: allActs },
      { data: allAssigned },
      { data: allDepts },
      { data: allComps },
      { data: recent },
    ] = await Promise.all([
      service.from('requests')
        .select('id, status, requester_id, origin_dept_id, destination_dept_id, origin_company_id, destination_company_id, assigned_to, submitted_at, completed_at, request_type, created_at'),
      service.from('employees')
        .select('id, employee_code, full_name_ar, full_name_en, title_ar, grade, department_id, company_id')
        .eq('is_active', true)
        .order('full_name_ar'),
      service.from('request_actions')
        .select('id, request_id, action, actor_id, to_person_id, created_at')
        .order('created_at', { ascending: false })
        .limit(2000),
      service.from('requests')
        .select('id, assigned_to')
        .in('status', ['in_progress', 'pending_clarification'])
        .not('assigned_to', 'is', null),
      service.from('departments')
        .select('id, code, name_ar, name_en, head_employee_id, company_id')
        .eq('is_active', true)
        .order('name_ar'),
      service.from('companies')
        .select('id, code, name_ar, name_en, is_holding')
        .eq('is_active', true)
        .order('name_ar'),
      service.from('request_actions')
        .select('id, request_id, action, actor_id, note, created_at')
        .order('created_at', { ascending: false })
        .limit(15),
    ]);

    const actReqIds = [...new Set((recent || []).map((a: any) => a.request_id))];
    const actorIds  = [...new Set((recent || []).map((a: any) => a.actor_id).filter(Boolean))];

    const [{ data: actReqs }, { data: actActors }] = await Promise.all([
      actReqIds.length > 0
        ? service.from('requests').select('id, request_number, subject').in('id', actReqIds)
        : Promise.resolve({ data: [] }),
      actorIds.length > 0
        ? service.from('employees').select('id, full_name_ar').in('id', actorIds)
        : Promise.resolve({ data: [] }),
    ]);

    scopeData = {
      level,
      requests:      allReqs     || [],
      employees:     allEmps     || [],
      actions:       allActs     || [],
      assigned:      allAssigned || [],
      departments:   allDepts    || [],
      companies:     allComps    || [],
      recentActivity: recent     || [],
      actRequests:   actReqs     || [],
      actActors:     actActors   || [],
      headEmployeeId: null,
    };
  }

  return (
    <DashboardClient
      employee={employee}
      level={level}
      personalKPIs={personalKPIs}
      scopeData={scopeData}
    />
  );
}
