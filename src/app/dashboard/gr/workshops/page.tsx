import { getGRWorkshops } from '@/app/actions/gr';
import WorkshopsClient from './WorkshopsClient';

export default async function WorkshopsPage() {
  const workshops = await getGRWorkshops();
  return <WorkshopsClient workshops={workshops} />;
}
