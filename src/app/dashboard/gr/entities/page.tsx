import { getGREntities } from '@/app/actions/gr';
import EntitiesClient from './EntitiesClient';
export default async function GREntitiesPage() {
  const entities = await getGREntities();
  return <EntitiesClient entities={entities} />;
}
