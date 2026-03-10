import { getGREntities } from '@/app/actions/gr';
import { getSessionEmployee } from '@/app/actions/requests';
import EntitiesClient from './EntitiesClient';
export default async function GREntitiesPage() {
  const [entities, employee] = await Promise.all([getGREntities(), getSessionEmployee()]);
  const roles = employee?.roles?.map((r: any) => r.role) || [];
  const isReadOnly = (roles.includes('super_admin') || roles.includes('ceo')) && !roles.includes('gr_employee') && !roles.includes('gr_manager');
  return <EntitiesClient entities={entities} isReadOnly={isReadOnly} />;
}
