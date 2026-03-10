import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import RequestsClient, { type RequestRow } from './RequestsClient';

function getHighestRole(roles: { role: string }[]): string {
  for (const r of ['super_admin', 'ceo', 'company_admin', 'department_manager']) {
    if (roles.some(ur => ur.role === r)) return r;
  }
  return 'employee';
}

export default async function RequestsPage() {
  const [service, employee] = await Promise.all([
    createServiceClient(),
    getSessionEmployee(),
  ]);

  const role = getHighestRole(employee?.roles || []);
  const isAdmin = role === 'super_admin' || role === 'ceo';
  const isCompanyAdmin = role === 'company_admin';
  const isDeptManager = role === 'department_manager';

  let requestsQuery = service
    .from('requests')
    .select('id, request_number, subject, request_type, status, priority, created_at, requester_id, origin_company_id, origin_dept_id')
    .order('created_at', { ascending: false })
    .limit(200);

  if (isAdmin) {
    // no filter — see all
  } else if (isCompanyAdmin && employee?.company_id) {
    requestsQuery = requestsQuery.or(`origin_company_id.eq.${employee.company_id},destination_company_id.eq.${employee.company_id}`);
  } else if (isDeptManager && employee?.department_id) {
    requestsQuery = requestsQuery.or(`origin_dept_id.eq.${employee.department_id},destination_dept_id.eq.${employee.department_id}`);
  } else if (employee) {
    requestsQuery = requestsQuery.eq('requester_id', employee.id);
  }

  const { data: rawRequests } = await requestsQuery;

  // Fetch filter UI data based on role
  let companies: any[] = [];
  let departments: any[] = [];

  if (isAdmin) {
    const [{ data: co }, { data: depts }] = await Promise.all([
      service.from('companies').select('id, name_ar, name_en').order('name_ar'),
      service.from('departments').select('id, name_ar, name_en, company_id').order('name_ar'),
    ]);
    companies = co || [];
    departments = depts || [];
  } else if (isCompanyAdmin && employee?.company_id) {
    const { data: depts } = await service.from('departments').select('id, name_ar, name_en, company_id').eq('company_id', employee.company_id).order('name_ar');
    departments = depts || [];
  }

  let rows: RequestRow[] = [];

  if (rawRequests && rawRequests.length > 0) {
    const requesterIds = [...new Set(rawRequests.map(r => r.requester_id).filter(Boolean))];
    const companyIds   = [...new Set(rawRequests.map(r => r.origin_company_id).filter(Boolean))];

    const [{ data: employees }, { data: cos }] = await Promise.all([
      requesterIds.length > 0
        ? service.from('employees').select('id, full_name_ar, full_name_en').in('id', requesterIds)
        : Promise.resolve({ data: [] as any[] }),
      companyIds.length > 0
        ? service.from('companies').select('id, name_ar, name_en').in('id', companyIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const empMap = new Map((employees || []).map(e => [e.id, e]));
    const coMap  = new Map((cos  || []).map(c => [c.id, c]));

    rows = rawRequests.map(r => {
      const requester = empMap.get(r.requester_id);
      const company   = coMap.get(r.origin_company_id);
      return {
        id:               r.id,
        request_number:   r.request_number,
        subject:          r.subject,
        request_type:     r.request_type,
        status:           r.status,
        priority:         r.priority,
        created_at:       r.created_at,
        company_id:       r.origin_company_id ?? null,
        dept_id:          r.origin_dept_id ?? null,
        requester_name_ar: requester?.full_name_ar ?? null,
        requester_name_en: requester?.full_name_en ?? null,
        company_name_ar:  company?.name_ar ?? null,
        company_name_en:  company?.name_en ?? null,
      };
    });
  }

  return <RequestsClient requests={rows} role={role} companies={companies} departments={departments} />;
}
