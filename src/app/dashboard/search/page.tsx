import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import SearchClient from './SearchClient';

export const dynamic = 'force-dynamic';

function deriveRoleLevel(roles: string[], isHolding: boolean): string {
  if (roles.includes('super_admin')) return 'super_admin';
  if (roles.includes('ceo') && isHolding) return 'holding_ceo';
  if (roles.includes('ceo')) return 'company_ceo';
  if (roles.includes('department_manager')) return 'dept_head';
  return 'employee';
}

export default async function SearchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();

  const { data: emp } = await service
    .from('employees').select('id, company_id, department_id')
    .eq('auth_user_id', user.id).single();
  if (!emp) redirect('/login');

  const [{ data: roleRows }, { data: company }] = await Promise.all([
    service.from('user_roles').select('role').eq('employee_id', emp.id).eq('is_active', true),
    emp.company_id
      ? service.from('companies').select('is_holding').eq('id', emp.company_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const roles = (roleRows || []).map((r: any) => r.role);
  const isHolding = (company as any)?.is_holding === true;
  const roleLevel = deriveRoleLevel(roles, isHolding);

  // Scoped requests
  const SELECT = 'id, request_number, subject, description, status, request_type, priority, created_at, requester_id, assigned_to, origin_company_id, origin_dept_id';
  let q = service.from('requests').select(SELECT).order('created_at', { ascending: false }).limit(1000);

  if (roleLevel === 'employee') {
    q = q.eq('requester_id', emp.id);
  } else if (roleLevel === 'dept_head' && emp.department_id) {
    q = q.or(`origin_dept_id.eq.${emp.department_id},destination_dept_id.eq.${emp.department_id}`);
  } else if (roleLevel === 'company_ceo' && emp.company_id) {
    q = q.or(`origin_company_id.eq.${emp.company_id},destination_company_id.eq.${emp.company_id}`);
  }

  const { data: requests } = await q;
  const allReqs = requests || [];

  // Requester + assignee names
  const peopleIds = [...new Set([
    ...allReqs.map((r: any) => r.requester_id),
    ...allReqs.map((r: any) => r.assigned_to),
  ].filter(Boolean))] as string[];

  const empMap: Record<string, any> = {};
  if (peopleIds.length > 0) {
    const { data: people } = await service.from('employees')
      .select('id, full_name_ar, full_name_en').in('id', peopleIds);
    for (const p of people || []) empMap[p.id] = p;
  }

  const [{ data: companies }, { data: departments }] = await Promise.all([
    ['super_admin', 'holding_ceo', 'company_ceo'].includes(roleLevel)
      ? service.from('companies').select('id, name_ar, name_en').order('name_ar')
      : Promise.resolve({ data: [] }),
    Promise.resolve({ data: [] }),
  ]);

  return (
    <SearchClient
      requests={allReqs}
      empMap={empMap}
      companies={companies || []}
      roleLevel={roleLevel}
    />
  );
}
