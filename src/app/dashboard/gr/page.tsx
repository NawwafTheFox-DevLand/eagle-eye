import { getGRStats, getGRAlerts } from '@/app/actions/gr';
import GRDashboardClient from './GRDashboardClient';

export default async function GRDashboardPage() {
  const [stats, alerts] = await Promise.all([getGRStats(), getGRAlerts()]);
  return <GRDashboardClient stats={stats} alerts={alerts} />;
}
