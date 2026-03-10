import { getGREntity, getGRLicenses, getGRTasks, getEntityScalesAndTrademarks } from '@/app/actions/gr';
import { notFound } from 'next/navigation';
import EntityDetailClient from './EntityDetailClient';

export default async function EntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [entity, allLicenses, allTasks, { scales, trademarks }] = await Promise.all([
    getGREntity(id),
    getGRLicenses(),
    getGRTasks(),
    getEntityScalesAndTrademarks(id),
  ]);

  if (!entity) notFound();

  const licenses = allLicenses.filter((l: any) => l.entity_id === id);
  const tasks = allTasks.filter((t: any) => t.entity_id === id);

  return (
    <EntityDetailClient
      entity={entity}
      licenses={licenses}
      tasks={tasks}
      scales={scales}
      trademarks={trademarks}
    />
  );
}
