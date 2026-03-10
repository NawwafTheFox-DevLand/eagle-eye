import { getGRViolations, getGREntities } from '@/app/actions/gr';
import ViolationsClient from './ViolationsClient';
export default async function GRViolationsPage() {
  const [violations, entities] = await Promise.all([getGRViolations(), getGREntities()]);
  return <ViolationsClient violations={violations} entities={entities} />;
}
