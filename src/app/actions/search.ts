'use server';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from './requests';

const ADMIN_ROLES = new Set(['super_admin', 'ceo', 'company_admin', 'department_manager']);

export async function searchRequests(params: {
  q?: string;
  status?: string;
  request_type?: string;
  priority?: string;
  from_date?: string;
  to_date?: string;
  company_id?: string;
  dept_id?: string;
}) {
  const employee = await getSessionEmployee();
  if (!employee) throw new Error('Not authenticated');

  const service = await createServiceClient();
  const isAdmin = employee.roles?.some((r: any) => ADMIN_ROLES.has(r.role));

  let query = service
    .from('requests')
    .select('id, request_number, subject, request_type, status, priority, created_at, requester_id, origin_company_id, origin_dept_id')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!isAdmin) query = query.eq('requester_id', employee.id);
  if (params.status) query = query.eq('status', params.status);
  if (params.request_type) query = query.eq('request_type', params.request_type);
  if (params.priority) query = query.eq('priority', params.priority);
  if (params.from_date) query = query.gte('created_at', params.from_date);
  if (params.to_date) query = query.lte('created_at', params.to_date + 'T23:59:59');
  if (params.company_id) query = query.eq('origin_company_id', params.company_id);
  if (params.dept_id) query = query.eq('origin_dept_id', params.dept_id);

  if (params.q && params.q.trim()) {
    const term = params.q.trim();
    query = query.or(`request_number.ilike.%${term}%,subject.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const { data: rawRequests } = await query;
  if (!rawRequests || rawRequests.length === 0) return [];

  const requesterIds = [...new Set(rawRequests.map((r: any) => r.requester_id).filter(Boolean))];
  const { data: employees } = requesterIds.length > 0
    ? await service.from('employees').select('id, full_name_ar, full_name_en').in('id', requesterIds)
    : { data: [] as any[] };

  const empMap = new Map((employees || []).map((e: any) => [e.id, e]));
  return rawRequests.map((r: any) => ({
    ...r,
    requester: empMap.get(r.requester_id) ?? null,
  }));
}
