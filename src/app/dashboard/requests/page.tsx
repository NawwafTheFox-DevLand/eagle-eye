import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import RequestsClient from './RequestsClient';

export const dynamic = 'force-dynamic';

function getRoleLevel(roles: { role: string }[], isHolding: boolean): string {
  if (roles.some(r => r.role === 'super_admin')) return 'super_admin';
  if (roles.some(r => r.role === 'ceo') && isHolding) return 'holding_ceo';
  if (roles.some(r => r.role === 'ceo') && !isHolding) return 'company_ceo';
  if (roles.some(r => r.role === 'department_manager')) return 'dept_head';
  return 'employee';
}

export default async function RequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();
  const { data: emp } = await service
    .from('employees')
    .select('id, company_id, department_id')
    .eq('auth_user_id', user.id)
    .single();
  if (!emp) redirect('/login');

  const [{ data: roleRows }, { data: company }] = await Promise.all([
    service.from('user_roles').select('role, company_id').eq('employee_id', emp.id).eq('is_active', true),
    emp.company_id
      ? service.from('companies').select('is_holding').eq('id', emp.company_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const roles = roleRows || [];
  const isHolding = (company as any)?.is_holding === true;
  const roleLevel = getRoleLevel(roles, isHolding);

  let query = service
    .from('requests')
    .select('id, request_number, subject, request_type, status, priority, created_at, requester_id, assigned_to, origin_company_id')
    .order('created_at', { ascending: false })
    .limit(200);

  if (roleLevel === 'super_admin' || roleLevel === 'holding_ceo') {
    // see all
  } else if (roleLevel === 'company_ceo' && emp.company_id) {
    query = query.or(`origin_company_id.eq.${emp.company_id},destination_company_id.eq.${emp.company_id}`);
  } else if (roleLevel === 'dept_head' && emp.department_id) {
    query = query.or(`origin_dept_id.eq.${emp.department_id},destination_dept_id.eq.${emp.department_id}`);
  } else {
    query = query.eq('requester_id', emp.id);
  }

  const { data: rawRequests } = await query;
  const rows = rawRequests || [];

  if (rows.length === 0) {
    return (
      <Suspense>
        <RequestsClient requests={[]} currentEmployeeId={emp.id} myActions={[]} />
      </Suspense>
    );
  }

  const requesterIds = [...new Set(rows.map(r => r.requester_id).filter(Boolean))];
  const assignedIds  = [...new Set(rows.map(r => r.assigned_to).filter(Boolean))];
  const companyIds   = [...new Set(rows.map(r => r.origin_company_id).filter(Boolean))];
  const allPersonIds = [...new Set([...requesterIds, ...assignedIds])] as string[];

  const [{ data: persons }, { data: cos }, { data: rawMyActions }] = await Promise.all([
    allPersonIds.length > 0
      ? service.from('employees').select('id, full_name_ar, full_name_en').in('id', allPersonIds)
      : Promise.resolve({ data: [] as any[] }),
    companyIds.length > 0
      ? service.from('companies').select('id, name_ar, name_en').in('id', companyIds)
      : Promise.resolve({ data: [] as any[] }),
    service.from('request_actions').select('request_id, action').eq('actor_id', emp.id),
  ]);

  const empMap = new Map((persons || []).map(p => [p.id, p]));
  const coMap  = new Map((cos || []).map(c => [c.id, c]));

  const requests = rows.map(r => ({
    ...r,
    requester_name_ar: empMap.get(r.requester_id)?.full_name_ar ?? null,
    requester_name_en: empMap.get(r.requester_id)?.full_name_en ?? null,
    assigned_name_ar:  r.assigned_to ? empMap.get(r.assigned_to)?.full_name_ar ?? null : null,
    assigned_name_en:  r.assigned_to ? empMap.get(r.assigned_to)?.full_name_en ?? null : null,
    company_name_ar:   coMap.get(r.origin_company_id)?.name_ar ?? null,
    company_name_en:   coMap.get(r.origin_company_id)?.name_en ?? null,
  }));

  return (
    <Suspense>
      <RequestsClient requests={requests} currentEmployeeId={emp.id} myActions={rawMyActions || []} />
    </Suspense>
  );
}
