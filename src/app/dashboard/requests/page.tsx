import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import RequestsClient, { type RequestRow } from './RequestsClient';

const ADMIN_ROLES = ['super_admin', 'ceo'];

export default async function RequestsPage() {
  const [service, employee] = await Promise.all([
    createServiceClient(),
    getSessionEmployee(),
  ]);

  const isAdmin = employee?.roles?.some((r: any) => ADMIN_ROLES.includes(r.role));

  // Fetch requests (plain columns, no joins)
  let requestsQuery = service
    .from('requests')
    .select('id, request_number, subject, request_type, status, priority, created_at, requester_id, origin_company_id')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!isAdmin && employee) {
    requestsQuery = requestsQuery.eq('requester_id', employee.id);
  }

  const { data: rawRequests } = await requestsQuery;

  let rows: RequestRow[] = [];

  if (rawRequests && rawRequests.length > 0) {
    const requesterIds = [...new Set(rawRequests.map(r => r.requester_id).filter(Boolean))];
    const companyIds   = [...new Set(rawRequests.map(r => r.origin_company_id).filter(Boolean))];

    const [{ data: employees }, { data: companies }] = await Promise.all([
      requesterIds.length > 0
        ? service.from('employees').select('id, full_name_ar, full_name_en').in('id', requesterIds)
        : Promise.resolve({ data: [] as any[] }),
      companyIds.length > 0
        ? service.from('companies').select('id, name_ar, name_en').in('id', companyIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const empMap = new Map((employees || []).map(e => [e.id, e]));
    const coMap  = new Map((companies  || []).map(c => [c.id, c]));

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
        requester_name_ar: requester?.full_name_ar ?? null,
        requester_name_en: requester?.full_name_en ?? null,
        company_name_ar:  company?.name_ar ?? null,
        company_name_en:  company?.name_en ?? null,
      };
    });
  }

  return <RequestsClient requests={rows} />;
}
