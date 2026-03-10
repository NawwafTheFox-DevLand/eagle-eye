import { getGRLicenses, getGREntities } from '@/app/actions/gr';
import { getSessionEmployee } from '@/app/actions/requests';
import LicensesClient from './LicensesClient';
export default async function GRLicensesPage() {
  const [licenses, entities, employee] = await Promise.all([getGRLicenses(), getGREntities(), getSessionEmployee()]);
  const roles = employee?.roles?.map((r: any) => r.role) || [];
  const isReadOnly = (roles.includes('super_admin') || roles.includes('ceo')) && !roles.includes('gr_employee') && !roles.includes('gr_manager');
  return <LicensesClient licenses={licenses} entities={entities} isReadOnly={isReadOnly} />;
}
