import { getGRCommittees } from '@/app/actions/gr';
import CommitteesClient from './CommitteesClient';
export default async function GRCommitteesPage() {
  const committees = await getGRCommittees();
  return <CommitteesClient committees={committees} />;
}
