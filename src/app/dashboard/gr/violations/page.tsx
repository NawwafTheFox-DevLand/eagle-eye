import { getGRViolations, getGREntities } from '@/app/actions/gr';
import { getSessionEmployee } from '@/app/actions/requests';
import ViolationsClient from './ViolationsClient';
export default async function GRViolationsPage() {
  const [violations, entities, employee] = await Promise.all([getGRViolations(), getGREntities(), getSessionEmployee()]);
  const roles = employee?.roles?.map((r: any) => r.role) || [];
  const isReadOnly = (roles.includes('super_admin') || roles.includes('ceo')) && !roles.includes('gr_employee') && !roles.includes('gr_manager');
  return <ViolationsClient violations={violations} entities={entities} isReadOnly={isReadOnly} />;
}
