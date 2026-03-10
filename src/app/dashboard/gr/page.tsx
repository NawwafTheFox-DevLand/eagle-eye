import { getGRStats, getGRAlerts } from '@/app/actions/gr';
import { getSessionEmployee } from '@/app/actions/requests';
import GRDashboardClient from './GRDashboardClient';

export default async function GRDashboardPage() {
  const [stats, alerts, employee] = await Promise.all([getGRStats(), getGRAlerts(), getSessionEmployee()]);
  const roles = employee?.roles?.map((r: any) => r.role) || [];
  const isReadOnly = (roles.includes('super_admin') || roles.includes('ceo')) && !roles.includes('gr_employee') && !roles.includes('gr_manager');
  return <GRDashboardClient stats={stats} alerts={alerts} isReadOnly={isReadOnly} />;
}
