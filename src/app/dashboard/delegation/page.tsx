import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import DelegationClient from './DelegationClient';

export default async function DelegationPage() {
  const [service, employee] = await Promise.all([createServiceClient(), getSessionEmployee()]);
  if (!employee) redirect('/login');

  const isAdmin = employee.roles?.some((r: any) => ['super_admin', 'ceo', 'company_admin'].includes(r.role));

  const [{ data: delegations }, { data: employees }, { data: companies }] = await Promise.all([
    isAdmin
      ? service.from('delegations').select('id, delegator_id, delegate_id, company_id, start_date, end_date, reason, is_active, created_at').order('created_at', { ascending: false })
      : service.from('delegations').select('id, delegator_id, delegate_id, company_id, start_date, end_date, reason, is_active, created_at').or(`delegator_id.eq.${employee.id},delegate_id.eq.${employee.id}`).order('created_at', { ascending: false }),
    service.from('employees').select('id, employee_code, full_name_ar, full_name_en, company_id').eq('is_active', true).order('full_name_ar'),
    service.from('companies').select('id, code, name_ar').eq('is_active', true).order('name_ar'),
  ]);

  return <DelegationClient delegations={delegations || []} employees={employees || []} companies={companies || []} isAdmin={isAdmin} currentEmployeeId={employee.id} />;
}
