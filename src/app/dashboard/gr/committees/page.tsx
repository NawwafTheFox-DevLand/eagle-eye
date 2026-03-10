import { getGRCommittees } from '@/app/actions/gr';
import { getSessionEmployee } from '@/app/actions/requests';
import CommitteesClient from './CommitteesClient';
export default async function GRCommitteesPage() {
  const [committees, employee] = await Promise.all([getGRCommittees(), getSessionEmployee()]);
  const roles = employee?.roles?.map((r: any) => r.role) || [];
  const isReadOnly = (roles.includes('super_admin') || roles.includes('ceo')) && !roles.includes('gr_employee') && !roles.includes('gr_manager');
  return <CommitteesClient committees={committees} isReadOnly={isReadOnly} />;
}
