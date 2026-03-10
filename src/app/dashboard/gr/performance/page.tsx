import { getGRPerformanceData } from '@/app/actions/gr';
import PerformanceClient from './PerformanceClient';

export default async function PerformancePage() {
  const data = await getGRPerformanceData();
  return <PerformanceClient data={data} />;
}
