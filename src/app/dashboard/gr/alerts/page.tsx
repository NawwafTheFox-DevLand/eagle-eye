import { getGRAlertsAll, getGREntities, getGRLicenses } from '@/app/actions/gr';
import AlertsClient from './AlertsClient';

export default async function AlertsPage() {
  const [alerts, entities, licenses] = await Promise.all([
    getGRAlertsAll(),
    getGREntities(),
    getGRLicenses(),
  ]);
  return <AlertsClient alerts={alerts} entities={entities} licenses={licenses} />;
}
