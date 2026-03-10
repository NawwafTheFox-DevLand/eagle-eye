import { getGRLicenses, getGREntities } from '@/app/actions/gr';
import LicensesClient from './LicensesClient';
export default async function GRLicensesPage() {
  const [licenses, entities] = await Promise.all([getGRLicenses(), getGREntities()]);
  return <LicensesClient licenses={licenses} entities={entities} />;
}
